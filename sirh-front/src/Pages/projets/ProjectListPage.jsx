


import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjects, deleteProject, updateProject } from '../../Redux/Slices/projectSlice';
import { fetchTodoLists } from '../../Redux/Slices/todoListSlice';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Swal from 'sweetalert2';

const ProjectListPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: projects, status } = useSelector(state => state.projects);
  const { items: todoLists = [] } = useSelector(state => state.todoLists || {});
  const [editProject, setEditProject] = useState(null);
  const [showDeleteId, setShowDeleteId] = useState(null);
  const [editForm, setEditForm] = useState({ 
    titre: '', 
    description: '', 
    date_debut: '', 
    date_fin_prevu: '', 
    date_fin_reel: '',
    pourcentage_progression: 0
  });
  const [errors, setErrors] = useState({});
  const [isHovered, setIsHovered] = useState(null);

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchTodoLists());
  }, [dispatch]);

  const validateForm = () => {
    const newErrors = {};
    if (!editForm.titre.trim()) {
      newErrors.titre = 'Le titre est requis';
    } else if (editForm.titre.trim().length < 3) {
      newErrors.titre = 'Le titre doit contenir au moins 3 caractères';
    }
    
    if (!editForm.description.trim()) {
      newErrors.description = 'La description est requise';
    }
    
    if (editForm.date_debut && editForm.date_fin_prevu && new Date(editForm.date_debut) > new Date(editForm.date_fin_prevu)) {
      newErrors.date_fin_prevu = 'La date de fin prévue doit être postérieure à la date de début';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditClick = (project) => {
    setEditProject(project.id);
    setEditForm({
      titre: project.titre || '',
      description: project.description || '',
      date_debut: project.date_debut || '',
      date_fin_prevu: project.date_fin_prevu || '',
      date_fin_reel: project.date_fin_reel || '',
      pourcentage_progression: project.pourcentage_progression || 0,
    });
    setErrors({});
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm({ ...editForm, [name]: value });
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleEditSave = async (id) => {
    if (!validateForm()) return;
    
    try {
      await dispatch(updateProject({ id, ...editForm })).unwrap();
      setEditProject(null);
      setErrors({});
      Swal.fire({
        icon: 'success',
        title: 'Projet modifié avec succès !',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur lors de la modification',
        toast: true,
        position: 'top-end',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Supprimer ce projet ?',
      text: 'Cette action supprimera également toutes les tâches associées. Cette action est irréversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      customClass: {
        confirmButton: 'btn btn-danger',
        cancelButton: 'btn btn-secondary'
      }
    });
    
    if (result.isConfirmed) {
      try {
        await dispatch(deleteProject(id)).unwrap();
        setShowDeleteId(null);
        Swal.fire({
          icon: 'success',
          title: 'Projet supprimé',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Erreur lors de la suppression',
          toast: true,
          position: 'top-end',
          timer: 2000,
          showConfirmButton: false
        });
      }
    }
  };

  const getProjectStatus = (project) => {
    const now = new Date();
    const startDate = project.date_debut ? new Date(project.date_debut) : null;
    const endDate = project.date_fin_prevu ? new Date(project.date_fin_prevu) : null;
    const realEndDate = project.date_fin_reel ? new Date(project.date_fin_reel) : null;

    if (realEndDate) {
      return { status: 'Terminé', color: '#28a745', icon: 'mdi:check-circle' };
    } else if (startDate && now < startDate) {
      return { status: 'À venir', color: '#6c757d', icon: 'mdi:clock-outline' };
    } else if (endDate && now > endDate) {
      return { status: 'En retard', color: '#dc3545', icon: 'mdi:alert-circle' };
    } else if (startDate && now >= startDate) {
      return { status: 'En cours', color: '#ffc107', icon: 'mdi:play-circle' };
    } else {
      return { status: 'Non commencé', color: '#6c757d', icon: 'mdi:pause-circle' };
    }
  };

  // Nouveau calcul de progression: moyenne non pondérée des progressions des listes.
  // Progression d'une liste = moyenne des progressions des tâches (Terminée=100, En cours=pourcentage borné 0..100, autres=0)
  const computeListPercent = (list) => {
    // Exclure les tâches annulées du calcul
    const tasks = (list?.tasks || []).filter(t => t.status !== 'Annulé');
    if (tasks.length === 0) return 0;
    const sum = tasks.reduce((acc, t) => {
      if (t.status === 'Terminée') return acc + 100;
      if (t.status === 'En cours') return acc + Math.min(100, Math.max(0, Number(t.pourcentage) || 0));
      return acc;
    }, 0);
    return Math.round(sum / tasks.length);
  };

  const projectProgressMap = useMemo(() => {
    const map = {};
    projects.forEach(project => {
      const lists = todoLists.filter(l => l.project_id === project.id);
      if (lists.length === 0) {
        // Fallback: si aucune liste, conserver éventuelle progression manuelle sinon 0
        if (project.pourcentage_progression !== null && project.pourcentage_progression !== undefined) {
          map[project.id] = Math.max(0, Math.min(100, project.pourcentage_progression));
        } else {
          map[project.id] = 0;
        }
        return;
      }
  const listPercents = lists.map(computeListPercent);
      const avg = listPercents.reduce((a, b) => a + b, 0) / listPercents.length;
      map[project.id] = Math.round(avg);
    });
    return map;
  }, [projects, todoLists]);

  return (
    <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <div className="container-fluid px-4">
        {/* Bouton de retour simple */}
        <button 
          className="btn d-flex align-items-center gap-2 mb-3"
          onClick={() => navigate(-1)}
          style={{ 
            background: 'none',
            border: 'none',
            color: '#6c757d',
            padding: '0.5rem 0'
          }}
        >
          <Icon icon="mdi:arrow-left" />
          Retour
        </button>

        {/* En-tête de la page */}
        <div className="card border-0 shadow-lg rounded-4 mb-4 overflow-hidden">
          <div className="card-body p-4" style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <div className="p-3 rounded-circle bg-white bg-opacity-20">
                  <Icon icon="mdi:folder-multiple-outline" style={{ fontSize: '2rem' }} />
                </div>
                <div>
                  <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>Gestion des Projets</h1>
                  <p className="mb-0 opacity-90">Gérez et suivez l'avancement de tous vos projets</p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-3">
                <span className="badge d-flex align-items-center gap-1 px-3 py-2" style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '25px',
                  fontWeight: '600'
                }}>
                  <Icon icon="mdi:folder" />
                  {projects.length} projet{projects.length > 1 ? 's' : ''}
                </span>
                <button 
                  className="btn btn-primary d-flex align-items-center gap-2 px-4 py-2 rounded-pill shadow-sm"
                  onClick={() => navigate('/projets/creer')}
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  <Icon icon="mdi:plus" style={{ fontSize: '1.2rem' }} />
                  <span className="fw-semibold">Nouveau Projet</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Gestion des états de chargement */}
        {status === 'loading' && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="mt-3 text-muted">Chargement des projets...</p>
          </div>
        )}

        {status === 'failed' && (
          <div className="alert alert-danger d-flex align-items-center gap-3" role="alert">
            <Icon icon="mdi:alert-circle" style={{ fontSize: '1.5rem' }} />
            <div>
              <h6 className="mb-1">Erreur de chargement</h6>
              <p className="mb-0">Impossible de charger les projets. Veuillez réessayer.</p>
            </div>
          </div>
        )}

        {/* Liste des projets */}
        {status === 'succeeded' && (
          <>
            {projects.length === 0 ? (
              <div className="card border-0 shadow-lg rounded-4">
                <div className="card-body text-center py-5">
                  <div className="mb-4">
                    <Icon icon="mdi:folder-plus-outline" style={{ fontSize: '4rem', color: '#e9ecef' }} />
                  </div>
                  <h5 className="text-muted mb-3">Aucun projet trouvé</h5>
                  <p className="text-muted mb-4">Commencez par créer votre premier projet pour organiser vos tâches.</p>
                  <button 
                    className="btn btn-primary d-flex align-items-center gap-2 mx-auto px-4 py-2 rounded-pill"
                    onClick={() => navigate('/projets/create')}
                    style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none'
                    }}
                  >
                    <Icon icon="mdi:plus" />
                    Créer un projet
                  </button>
                </div>
              </div>
            ) : (
              <div className="row g-4">
                {projects.map(project => {
                  const projectStatus = getProjectStatus(project);
                  const progress = projectProgressMap[project.id] ?? 0;
                  
                  return (
                    <div className="col-12 col-md-6 col-xl-4" key={project.id}>
                      <div
                        className="card h-100 border-0 shadow-sm position-relative"
                        style={{
                          borderLeft: `4px solid ${projectStatus.color}`,
                          cursor: editProject === project.id ? 'default' : 'pointer',
                          transition: 'all 0.3s ease',
                          transform: isHovered === project.id ? 'translateY(-5px)' : 'translateY(0)',
                          background: editProject === project.id ? '#f8f9fa' : '#ffffff'
                        }}
                        onMouseEnter={() => setIsHovered(project.id)}
                        onMouseLeave={() => setIsHovered(null)}
                        onClick={editProject === project.id ? undefined : () => navigate(`/projets/${project.id}`)}
                      >
                        {/* Badge de statut */}
                        <div className="position-absolute top-0 end-0 m-3" style={{ zIndex: 2 }}>
                          <span 
                            className="badge d-flex align-items-center gap-1 px-2 py-1 rounded-pill"
                            style={{ 
                              backgroundColor: `${projectStatus.color}20`,
                              color: projectStatus.color,
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}
                          >
                            <Icon icon={projectStatus.icon} style={{ fontSize: '0.9rem' }} />
                            {projectStatus.status}
                          </span>
                        </div>

                        <div className="card-body p-4 d-flex flex-column h-100">
                          {editProject === project.id ? (
                            /* Mode édition */
                            <div className="h-100 d-flex flex-column">
                              <div className="mb-3">
                                <label className="form-label fw-semibold d-flex align-items-center gap-2 mb-2">
                                  <Icon icon="mdi:text" className="text-primary" />
                                  Titre du projet
                                </label>
                                <input 
                                  className={`form-control ${errors.titre ? 'is-invalid' : editForm.titre.trim() ? 'is-valid' : ''}`}
                                  name="titre" 
                                  value={editForm.titre} 
                                  onChange={handleEditChange}
                                  placeholder="Nom du projet"
                                  style={{ borderRadius: '8px' }}
                                />
                                {errors.titre && (
                                  <div className="invalid-feedback d-flex align-items-center gap-1">
                                    <Icon icon="mdi:alert-circle" />
                                    {errors.titre}
                                  </div>
                                )}
                              </div>

                              <div className="mb-3">
                                <label className="form-label fw-semibold d-flex align-items-center gap-2 mb-2">
                                  <Icon icon="mdi:text-box" className="text-primary" />
                                  Description
                                </label>
                                <textarea 
                                  className={`form-control ${errors.description ? 'is-invalid' : editForm.description.trim() ? 'is-valid' : ''}`}
                                  name="description" 
                                  value={editForm.description} 
                                  onChange={handleEditChange}
                                  rows={3}
                                  placeholder="Description du projet"
                                  style={{ borderRadius: '8px', resize: 'none' }}
                                />
                                {errors.description && (
                                  <div className="invalid-feedback d-flex align-items-center gap-1">
                                    <Icon icon="mdi:alert-circle" />
                                    {errors.description}
                                  </div>
                                )}
                              </div>

                              <div className="row g-2 mb-3">
                                <div className="col-12">
                                  <label className="form-label fw-semibold small d-flex align-items-center gap-1">
                                    <Icon icon="mdi:calendar-start" className="text-success" />
                                    Date de début
                                  </label>
                                  <input 
                                    type="date" 
                                    className="form-control form-control-sm" 
                                    name="date_debut" 
                                    value={editForm.date_debut} 
                                    onChange={handleEditChange}
                                    style={{ borderRadius: '6px' }}
                                  />
                                </div>
                                <div className="col-12">
                                  <label className="form-label fw-semibold small d-flex align-items-center gap-1">
                                    <Icon icon="mdi:calendar-end" className="text-warning" />
                                    Date de fin prévue
                                  </label>
                                  <input 
                                    type="date" 
                                    className={`form-control form-control-sm ${errors.date_fin_prevu ? 'is-invalid' : ''}`}
                                    name="date_fin_prevu" 
                                    value={editForm.date_fin_prevu} 
                                    onChange={handleEditChange}
                                    style={{ borderRadius: '6px' }}
                                  />
                                  {errors.date_fin_prevu && (
                                    <div className="invalid-feedback small">
                                      {errors.date_fin_prevu}
                                    </div>
                                  )}
                                </div>
                                <div className="col-12">
                                  <label className="form-label fw-semibold small d-flex align-items-center gap-1">
                                    <Icon icon="mdi:calendar-check" className="text-info" />
                                    Date de fin réelle
                                  </label>
                                  <input 
                                    type="date" 
                                    className="form-control form-control-sm" 
                                    name="date_fin_reel" 
                                    value={editForm.date_fin_reel} 
                                    onChange={handleEditChange}
                                    style={{ borderRadius: '6px' }}
                                  />
                                </div>
                                <div className="col-12">
                                  <label className="form-label fw-semibold small d-flex align-items-center gap-1">
                                    <Icon icon="mdi:percent" className="text-primary" />
                                    Progression (%)
                                  </label>
                                  <input 
                                    type="number" 
                                    min="0" 
                                    max="100" 
                                    className="form-control form-control-sm" 
                                    name="pourcentage_progression" 
                                    value={editForm.pourcentage_progression} 
                                    onChange={handleEditChange}
                                    placeholder="0-100"
                                    style={{ borderRadius: '6px' }}
                                  />
                                  <small className="text-muted">Progression manuelle du projet (0-100%)</small>
                                </div>
                              </div>

                              <div className="d-flex gap-2 justify-content-end mt-auto">
                                <button 
                                  className="btn btn-success btn-sm d-flex align-items-center gap-1 px-3" 
                                  onClick={e => { e.stopPropagation(); handleEditSave(project.id); }}
                                  style={{ borderRadius: '8px' }}
                                >
                                  <Icon icon="mdi:check" />
                                  Enregistrer
                                </button>
                                <button 
                                  className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 px-3" 
                                  onClick={e => { e.stopPropagation(); setEditProject(null); setErrors({}); }}
                                  style={{ borderRadius: '8px' }}
                                >
                                  <Icon icon="mdi:close" />
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Mode affichage */
                            <>
                              <div className="mb-3">
                                <h5 className="card-title fw-bold text-primary mb-2 d-flex align-items-center gap-2">
                                  <Icon icon="mdi:folder" />
                                  {project.titre}
                                </h5>
                                <p className="card-text text-muted mb-0" style={{ 
                                  minHeight: '60px',
                                  fontSize: '0.9rem',
                                  lineHeight: '1.4'
                                }}>
                                  {project.description || 'Aucune description disponible'}
                                </p>
                              </div>

                              {/* Informations sur les dates */}
                              <div className="mb-3">
                                <div className="d-flex flex-column gap-1 small">
                                  <div className="d-flex align-items-center gap-2">
                                    <Icon icon="mdi:calendar-start" className="text-success" />
                                    <span><strong>Début:</strong> {project.date_debut ? new Date(project.date_debut).toLocaleDateString() : 'Non défini'}</span>
                                  </div>
                                  <div className="d-flex align-items-center gap-2">
                                    <Icon icon="mdi:calendar-end" className="text-warning" />
                                    <span><strong>Fin prévue:</strong> {project.date_fin_prevu ? new Date(project.date_fin_prevu).toLocaleDateString() : 'Non défini'}</span>
                                  </div>
                                  {project.date_fin_reel && (
                                    <div className="d-flex align-items-center gap-2">
                                      <Icon icon="mdi:calendar-check" className="text-info" />
                                      <span><strong>Fin réelle:</strong> {new Date(project.date_fin_reel).toLocaleDateString()}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Barre de progression */}
                              {progress !== null && progress !== undefined && (
                                <div className="mb-3">
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="small text-muted fw-semibold">
                                      {`Progression (méthode listes)`}
                                    </span>
                                    <span className="small fw-bold">{Math.round(progress)}%</span>
                                  </div>
                                  <div className="progress" style={{ height: '6px', borderRadius: '3px' }}>
                                    <div
                                      className="progress-bar"
                                      role="progressbar"
                                      style={{ 
                                        width: `${progress}%`,
                                        background: progress === 100 
                                          ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' 
                                          : progress > 75 
                                          ? 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)'
                                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        transition: 'width 0.6s ease'
                                      }}
                                      aria-valuenow={progress}
                                      aria-valuemin={0}
                                      aria-valuemax={100}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="d-flex gap-2 justify-content-between align-items-center mt-auto">
                                <button 
                                  className="btn btn-primary btn-sm d-flex align-items-center gap-1 px-3 rounded-pill"
                                  onClick={e => { e.stopPropagation(); navigate(`/projets/${project.id}`); }}
                                  style={{ 
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    border: 'none',
                                    fontSize: '0.8rem'
                                  }}
                                >
                                  <Icon icon="mdi:eye" />
                                  Voir détails
                                </button>
                                
                                <div className="d-flex gap-1">
                                  <button 
                                    className="btn btn-outline-primary btn-sm rounded-circle p-1 d-flex align-items-center justify-content-center" 
                                    onClick={e => { e.stopPropagation(); handleEditClick(project); }}
                                    title="Modifier le projet"
                                    style={{ width: '30px', height: '30px' }}
                                  >
                                    <Icon icon="lucide:edit" style={{ fontSize: '0.9rem' }} />
                                  </button>
                                  <button 
                                    className="btn btn-outline-danger btn-sm rounded-circle p-1 d-flex align-items-center justify-content-center" 
                                    onClick={e => { e.stopPropagation(); handleDelete(project.id); }}
                                    title="Supprimer le projet"
                                    style={{ width: '30px', height: '30px' }}
                                  >
                                    <Icon icon="mingcute:delete-2-line" style={{ fontSize: '0.9rem' }} />
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* CSS pour les animations */}
      <style jsx>{`
        .card:hover {
          box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
        }
        .btn:hover {
          transform: translateY(-1px);
          transition: transform 0.2s ease;
        }
        .form-control:focus, .form-select:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
      `}</style>
    </div>
  );
};

export default ProjectListPage;
