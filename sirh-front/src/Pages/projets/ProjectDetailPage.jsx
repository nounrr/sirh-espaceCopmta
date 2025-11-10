

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjects } from '../../Redux/Slices/projectSlice';
import { fetchTodoLists, createTodoList } from '../../Redux/Slices/todoListSlice';
import TodoListPopup from '../todo/TodoListPopup';
import { fetchUsers } from '../../Redux/Slices/userSlice';
import { Icon } from '@iconify/react';
import { fetchTaskComments, addTaskComment } from '../../Redux/Slices/taskCommentsSlice';


// Composant pour afficher les commentaires d'une tâche
const TaskCommentsModal = ({ show, onClose, task, users }) => {
  const dispatch = useDispatch();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { commentsByTask } = useSelector(state => state.taskComments);
  const comments = commentsByTask[task?.id] || [];
  
  useEffect(() => {
    if (task?.id) {
      dispatch(fetchTaskComments(task.id));
    }
  }, [dispatch, task?.id]);
  
  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return 'Utilisateur inconnu';
    return `${user.prenom || ''} ${user.nom || user.name || ''}`.trim();
  };
  
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !task?.id) return;
    
    setSubmitting(true);
    try {
      await dispatch(addTaskComment({ taskId: task.id, comment: newComment.trim() })).unwrap();
      setNewComment('');
    } catch (error) {
      console.error('Erreur lors de l\'ajout du commentaire:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (!show || !task) return null;
  
  return (
    <div 
      className="modal fade show d-block" 
      tabIndex="-1" 
      style={{ 
        background: 'rgba(0,0,0,0.4)', 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        zIndex: 1060, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backdropFilter: 'blur(2px)'
      }}
      onClick={onClose}
    >
      <div 
        className="modal-dialog modal-dialog-centered modal-dialog-scrollable" 
        style={{ maxWidth: 500, width: '95%' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-content rounded-4 shadow-lg border-0">
          <div className="modal-header bg-gradient text-white rounded-top-4" style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '1rem 1.5rem'
          }}>
            <div className="d-flex align-items-center gap-2">
              <div className="p-2 rounded-circle bg-white bg-opacity-20">
                <Icon icon="mdi:comment-multiple-outline" style={{ fontSize: '1.3rem' }} />
              </div>
              <h5 className="modal-title fw-bold mb-0">Commentaires de la tâche</h5>
            </div>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              aria-label="Close" 
              onClick={onClose}
              style={{ filter: 'brightness(0) invert(1)' }}
            ></button>
          </div>
          
          <div className="modal-body p-0">
            {/* Détails de la tâche */}
            <div className="p-3 bg-light border-bottom">
              <div className="d-flex align-items-start gap-2">
                <Icon 
                  icon={
                    task.status === 'Terminée' ? 'mdi:check-circle' : 
                    task.status === 'En cours' ? 'mdi:clock-outline' : 'mdi:progress-clock'
                  } 
                  style={{ 
                    fontSize: '1.4rem',
                    color: task.status === 'Terminée' ? '#28a745' : 
                           task.status === 'En cours' ? '#ffc107' : '#6c757d'
                  }} 
                />
                <div className="flex-grow-1">
                  <h6 className="fw-bold mb-1">{task.description}</h6>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <span className="badge bg-secondary-subtle text-secondary py-1 px-2 d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                      <Icon icon="mdi:tag" style={{ fontSize: '0.8rem' }} />
                      {task.status}
                    </span>
                    {task.assigned_to && (
                      <span className="badge bg-primary-subtle text-primary py-1 px-2 d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                        <Icon icon="mdi:account" style={{ fontSize: '0.8rem' }} />
                        {getUserName(task.assigned_to)}
                      </span>
                    )}
                    {task.due_date && (
                      <span className="badge bg-danger-subtle text-danger py-1 px-2 d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                        <Icon icon="mdi:calendar-alert" style={{ fontSize: '0.8rem' }} />
                        Échéance: {new Date(task.due_date).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Liste des commentaires */}
            <div className="p-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {comments.length === 0 ? (
                <div className="text-center py-4">
                  <Icon icon="mdi:comment-off-outline" style={{ fontSize: '2.5rem', color: '#e9ecef' }} />
                  <p className="text-muted mt-2 mb-0">Aucun commentaire pour cette tâche</p>
                  <small className="text-muted">Soyez le premier à commenter!</small>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {comments.map(comment => (
                    <div key={comment.id} className="card shadow-sm border-0">
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <div className="bg-primary bg-opacity-10 rounded-circle p-2 d-flex align-items-center justify-content-center">
                              <Icon icon="mdi:account-circle" style={{ fontSize: '1.2rem', color: '#0d6efd' }} />
                            </div>
                            <div>
                              <h6 className="fw-bold mb-0">{getUserName(comment.user_id)}</h6>
                              <small className="text-muted">
                                {new Date(comment.created_at).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </small>
                            </div>
                          </div>
                        </div>
                        <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{comment.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Formulaire pour ajouter un commentaire */}
            <div className="p-3 border-top bg-light">
              <form onSubmit={handleSubmitComment}>
                <div className="d-flex flex-column gap-2">
                  <textarea
                    className="form-control"
                    placeholder="Écrivez votre commentaire ici..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    rows="3"
                    disabled={submitting}
                    style={{ 
                      borderRadius: '12px',
                      resize: 'none',
                      fontSize: '0.95rem'
                    }}
                  ></textarea>
                  <div className="d-flex justify-content-end">
                    <button
                      type="submit"
                      className="btn btn-primary d-flex align-items-center gap-2"
                      disabled={!newComment.trim() || submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Icon icon="mdi:send" />
                          Envoyer
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal amélioré pour créer une todo avec meilleur UX
const AddTodoModal = ({ show, onClose, projectId, onSuccess }) => {
  const dispatch = useDispatch();
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!title.trim()) {
      newErrors.title = 'Le titre est requis';
    } else if (title.trim().length < 3) {
      newErrors.title = 'Le titre doit contenir au moins 3 caractères';
    } else if (title.trim().length > 100) {
      newErrors.title = 'Le titre ne peut pas dépasser 100 caractères';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setSubmitting(true);
    dispatch(createTodoList({ title: title.trim(), project_id: Number(projectId) }))
      .unwrap()
      .then(() => {
        setSubmitting(false);
        setTitle('');
        setErrors({});
        if (onSuccess) onSuccess();
      })
      .catch((err) => {
        setSubmitting(false);
        setErrors({ submit: err?.message || 'Erreur lors de la création' });
      });
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    if (errors.title) {
      setErrors(prev => ({ ...prev, title: null }));
    }
  };

  if (!show) return null;

  return (
    <div 
      className="modal fade show d-block" 
      tabIndex="-1" 
      style={{ 
        background: 'rgba(0,0,0,0.4)', 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        zIndex: 1050, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backdropFilter: 'blur(2px)'
      }}
      onClick={onClose}
    >
      <div 
        className="modal-dialog modal-dialog-centered" 
        style={{ maxWidth: 550, width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content rounded-4 shadow-lg border-0" style={{ overflow: 'hidden' }}>
          <div className="modal-header bg-gradient text-white rounded-top-4 position-relative" style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '1.5rem'
          }}>
            <div className="d-flex align-items-center gap-2">
              <div className="p-2 rounded-circle bg-white bg-opacity-20">
                <Icon icon="mdi:clipboard-plus" style={{ fontSize: '1.5rem' }} />
              </div>
              <h5 className="modal-title fw-bold mb-0">Créer une nouvelle To-Do List</h5>
            </div>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              aria-label="Close" 
              onClick={onClose}
              style={{ filter: 'brightness(0) invert(1)' }}
            ></button>
          </div>
          <div className="modal-body p-4">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="form-label fw-semibold d-flex align-items-center gap-2 mb-2 text-dark">
                  <Icon icon="mdi:text" className="text-primary" />
                  Titre de la liste
                </label>
                <input
                  className={`form-control form-control-lg ${errors.title ? 'is-invalid' : title.trim() ? 'is-valid' : ''}`}
                  type="text"
                  placeholder="Ex: Développement fonctionnalités, Tests, Documentation..."
                  value={title}
                  onChange={handleTitleChange}
                  disabled={submitting}
                  maxLength="100"
                  style={{ 
                    borderRadius: '12px',
                    border: errors.title ? '2px solid #dc3545' : '2px solid #e9ecef',
                    fontSize: '1.1rem',
                    padding: '12px 16px',
                    color: '#333',
                    backgroundColor: '#fff'
                  }}
                />
                {errors.title && (
                  <div className="invalid-feedback d-flex align-items-center gap-1 mt-2">
                    <Icon icon="mdi:alert-circle" />
                    {errors.title}
                  </div>
                )}
                <small className="text-muted mt-1 d-block">
                  {title.length}/100 caractères
                </small>
              </div>

              {errors.submit && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mb-3" role="alert">
                  <Icon icon="mdi:alert-circle" />
                  {errors.submit}
                </div>
              )}

              <div className="d-flex justify-content-between align-items-center">
                <button
                  type="button"
                  className="btn btn-outline-secondary px-4 py-2"
                  onClick={onClose}
                  disabled={submitting}
                  style={{ borderRadius: '10px' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2"
                  disabled={submitting || !title.trim()}
                  style={{ 
                    borderRadius: '10px',
                    background: submitting ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {submitting ? (
                    <>
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      Création...
                    </>
                  ) : (
                    <>
                      <Icon icon="mdi:plus" />
                      Créer la liste
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};




const ProjectDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [popupList, setPopupList] = useState(null);
  const { items: projects, status } = useSelector(state => state.projects);
  const { items: todoLists, loading: todoLoading, error: todoError } = useSelector(state => state.todoLists);
  // Removed unused tasks selector (full screen refactor cleanup)
  const { items: users } = useSelector(state => state.users);
  // Removed unused commentsByTask selector (handled locally in modal)
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const project = projects.find(p => String(p.id) === String(id));

  // Fonction pour obtenir le nom complet de l'utilisateur assigné
  const getAssignedUserName = (assignedToId) => {
    if (!assignedToId) return 'Non assigné';
    const user = users.find(u => u.id === assignedToId);
    if (!user) return 'Utilisateur inconnu';
    
    const nom = user.nom || user.name || '';
    const prenom = user.prenom || user.first_name || '';
    
    if (nom && prenom) {
      return `${prenom} ${nom}`;
    } else if (nom) {
      return nom;
    } else if (prenom) {
      return prenom;
    } else {
      return `User ${user.id}`;
    }
  };

  // État pour les filtres et la recherche
  const [taskFilter, setTaskFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    if (!project) dispatch(fetchProjects());
    dispatch(fetchTodoLists());
    dispatch(fetchUsers());
  }, [dispatch, project]);


  // Full width layout: remove Bootstrap .container to avoid boxed width
  if (status === 'loading' || todoLoading) return <div className="w-100 px-4 py-4">Chargement...</div>;
  if (!project) return <div className="w-100 px-4 py-4"><div className="alert alert-warning">Projet introuvable.</div></div>;

  // Adapter: filter todo lists by project id (assuming todoList.project_id)
  const projectTodoLists = todoLists.filter(list => String(list.project_id) === String(id));

  return (
    <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      {/* Replaced inner .container by full-width wrapper to avoid boxed layout */}
      <div className="w-100 px-3 px-md-4">
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
       
        {/* En-tête du projet avec design amélioré */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="card-body p-4" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div className="p-3 rounded-circle bg-white bg-opacity-20">
                        <Icon icon="mdi:folder-outline" style={{ fontSize: '2rem' }} />
                      </div>
                      <div>
                        <h1 className="fw-bold mb-1" style={{ fontSize: '2.5rem' }}>{project.titre}</h1>
                        <p className="lead mb-0 opacity-90">{project.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex align-items-center gap-2 justify-content-md-end">
                        <Icon icon="mdi:calendar-start" />
                        <span><strong>Début:</strong> {project.date_debut || 'Non défini'}</span>
                      </div>
                      <div className="d-flex align-items-center gap-2 justify-content-md-end">
                        <Icon icon="mdi:calendar-end" />
                        <span><strong>Fin prévue:</strong> {project.date_fin_prevu || 'Non défini'}</span>
                      </div>
                      {project.date_fin_reel && (
                        <div className="d-flex align-items-center gap-2 justify-content-md-end">
                          <Icon icon="mdi:calendar-check" />
                          <span><strong>Fin réelle:</strong> {project.date_fin_reel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section des listes de tâches */}
        <div className="card border-0 shadow-lg rounded-4">
          <div className="card-header bg-white border-0 p-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <div className="p-2 rounded-circle" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <Icon icon="mdi:clipboard-list" className="text-white" style={{ fontSize: '1.5rem' }} />
                </div>
                <div>
                  <h4 className="mb-1 fw-bold">Listes de tâches</h4>
                  <p className="text-muted small mb-0">Gérez et suivez l'avancement de vos tâches</p>
                </div>
              </div>
              <button 
                className="btn btn-primary d-flex align-items-center gap-2 px-4 py-2 rounded-pill shadow-sm"
                onClick={() => setShowAddTodo(true)}
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                <Icon icon="mdi:plus" style={{ fontSize: '1.2rem' }} />
                <span className="fw-semibold">Nouvelle To-Do</span>
              </button>
            </div>
            
            {/* Barre de recherche et filtres */}
            {projectTodoLists.length > 0 && (
              <div className="mt-3 pt-3 border-top">
                <div className="row g-2">
                  <div className="col-md-8">
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0">
                        <Icon icon="mdi:magnify" style={{ fontSize: '1.2rem', color: '#6c757d' }} />
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="Rechercher dans les tâches..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ borderRadius: '0 8px 8px 0' }}
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <select
                      className="form-select"
                      value={taskFilter}
                      onChange={e => setTaskFilter(e.target.value)}
                      style={{ borderRadius: '8px' }}
                    >
                      <option value="all">Toutes les tâches</option>
                      <option value="non-commencees">Non commencées</option>
                      <option value="en-cours">En cours</option>
                      <option value="terminees">Terminées</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card-body p-4">
            {todoError && (
              <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
                <Icon icon="mdi:alert-circle" style={{ fontSize: '1.2rem' }} />
                <span>{todoError}</span>
              </div>
            )}
            
            {projectTodoLists.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-4">
                  <Icon icon="mdi:clipboard-list-outline" style={{ fontSize: '4rem', color: '#e9ecef' }} />
                </div>
                <h5 className="text-muted mb-3">Aucune liste de tâches</h5>
                <p className="text-muted mb-4">Commencez par créer votre première liste de tâches pour organiser votre projet.</p>
                <button 
                  className="btn btn-primary d-flex align-items-center gap-2 mx-auto px-4 py-2 rounded-pill"
                  onClick={() => setShowAddTodo(true)}
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none'
                  }}
                >
                  <Icon icon="mdi:plus" />
                  Créer ma première liste
                </button>
              </div>
            ) : (
              <div className="row g-4">
                {projectTodoLists
                  .map(list => {
                    // Filtrer les tâches selon les critères de recherche et de filtre
                    const filteredTasks = list.tasks.filter(task => {
                      // Appliquer le filtre de statut
                      if (taskFilter === 'non-commencees' && task.status !== 'Non commencée') return false;
                      if (taskFilter === 'en-cours' && task.status !== 'En cours') return false;
                      if (taskFilter === 'terminees' && task.status !== 'Terminée') return false;
                      
                      // Appliquer la recherche textuelle
                      if (searchQuery) {
                        const query = searchQuery.toLowerCase();
                        const matchesDescription = task.description?.toLowerCase().includes(query);
                        const assignedUser = users.find(u => u.id === task.assigned_to);
                        const assignedName = assignedUser 
                          ? `${assignedUser.prenom || ''} ${assignedUser.nom || assignedUser.name || ''}`.toLowerCase()
                          : '';
                        const matchesUser = assignedName.includes(query);
                        
                        return matchesDescription || matchesUser;
                      }
                      
                      return true;
                    });
                    
                    // Retourner une liste modifiée avec seulement les tâches filtrées
                    return {
                      ...list,
                      filteredTasks,
                      originalTaskCount: list.tasks.length,
                      hasFilteredTasks: filteredTasks.length > 0
                    };
                  })
                  // Ne montrer que les listes qui ont des tâches correspondant aux critères de recherche
                  .filter(list => !searchQuery || list.hasFilteredTasks)
                  .map(list => {
                  // Exclure les tâches annulées du calcul
                  const activeTasks = list.tasks.filter(t => t.status !== 'Annulé');
                  const total = activeTasks.length;
                  const done = activeTasks.filter(t => t.status === 'Terminée').length;
                  const sumProgress = activeTasks.reduce((acc, t) => {
                    if (t.status === 'Terminée') return acc + 100;
                    if (t.status === 'En cours') return acc + Math.min(100, Math.max(0, Number(t.pourcentage) || 0));
                    return acc;
                  }, 0);
                  const percent = total === 0 ? 0 : Math.round(sumProgress / total);
                  let status = 'Non commencée';
                  let badgeClass = 'bg-secondary-subtle text-secondary';
                  let icon = 'mdi:progress-clock';
                  let cardStyle = {};
                  
                  if (total > 0 && done === total) {
                    status = 'Terminée';
                    badgeClass = 'bg-success-subtle text-success';
                    icon = 'mdi:check-circle-outline';
                    cardStyle = { borderLeft: '4px solid #28a745' };
                  } else if (list.tasks.some(t => t.status === 'En cours' || t.status === 'Terminée')) {
                    status = 'En cours';
                    badgeClass = 'bg-warning-subtle text-warning';
                    icon = 'mdi:clock-outline';
                    cardStyle = { borderLeft: '4px solid #ffc107' };
                  } else {
                    cardStyle = { borderLeft: '4px solid #6c757d' };
                  }

                  return (
                    <div key={list.id} className="col-12 col-md-6 col-xl-4">
                      <div
                        className="card h-100 shadow-sm border-0 position-relative overflow-hidden"
                        style={{ 
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          ...cardStyle,
                          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
                        }}
                        onClick={() => setPopupList(list)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                          e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.1), 0 5px 15px rgba(0,0,0,0.07)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0) scale(1)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        }}
                      >
                        {/* Indicateur de statut en haut */}
                        <div 
                          className="position-absolute top-0 start-0 w-100"
                          style={{ 
                            height: '4px',
                            background: percent === 100 
                              ? 'linear-gradient(90deg, #28a745 0%, #20c997 100%)' 
                              : percent > 0 
                              ? 'linear-gradient(90deg, #ffc107 0%, #fd7e14 100%)'
                              : 'linear-gradient(90deg, #6c757d 0%, #495057 100%)'
                          }}
                        />

                        <div className="card-body p-4">
                          {/* En-tête de la carte */}
                          <div className="d-flex align-items-start justify-content-between mb-3">
                            <div className="d-flex align-items-center gap-3 flex-grow-1">
                              <div 
                                className="p-2 rounded-circle d-flex align-items-center justify-content-center"
                                style={{ 
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  minWidth: '40px',
                                  height: '40px'
                                }}
                              >
                                <Icon icon="mdi:clipboard-check" className="text-white" style={{ fontSize: '1.2rem' }} />
                              </div>
                              <div className="flex-grow-1">
                                <h6 className="fw-bold text-dark mb-1" style={{ fontSize: '1.1rem', lineHeight: '1.3' }}>
                                  {list.title}
                                </h6>
                                <div className="d-flex align-items-center gap-2">
                                  <span className={`badge d-flex align-items-center gap-1 px-2 py-1 ${badgeClass}`} style={{ fontSize: '0.7rem', fontWeight: '500' }}>
                                    <Icon icon={icon} style={{ fontSize: '0.8rem' }} />
                                    {status}
                                  </span>
                                  <span className="badge bg-light text-dark border" style={{ fontSize: '0.7rem' }}>
                                    <Icon icon="mdi:format-list-bulleted" className="me-1" style={{ fontSize: '0.8rem' }} />
                                    {total} tâche{total > 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Statistiques et progression */}
                          <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="small text-muted fw-semibold">Progression</span>
                              <span className="small fw-bold text-primary">{done}/{total}</span>
                            </div>
                            <div className="progress mb-2" style={{ height: '10px', borderRadius: '5px', backgroundColor: '#e9ecef' }}>
                              <div
                                className="progress-bar"
                                role="progressbar"
                                style={{ 
                                  width: `${percent}%`,
                                  background: percent === 100 
                                    ? 'linear-gradient(90deg, #28a745 0%, #20c997 100%)' 
                                    : percent > 0 
                                    ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                                    : 'linear-gradient(90deg, #6c757d 0%, #495057 100%)',
                                  transition: 'width 0.8s ease',
                                  borderRadius: '5px'
                                }}
                                aria-valuenow={percent}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              />
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="small text-muted">{percent}% terminé</span>
                              {percent === 100 && (
                                <span className="badge bg-success-subtle text-success d-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                                  <Icon icon="mdi:check-circle" />
                                  Complète !
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Tâches récentes */}
                          {list.filteredTasks && list.filteredTasks.length > 0 ? (
                            <div className="mb-3">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-muted small fw-semibold d-flex align-items-center gap-1">
                                  <Icon icon="mdi:clock-fast" style={{ fontSize: '0.9rem' }} />
                                  {searchQuery ? (
                                    <>Résultats ({list.filteredTasks.length}/{list.originalTaskCount})</>
                                  ) : (
                                    taskFilter !== 'all' ? (
                                      <>Tâches filtrées ({list.filteredTasks.length})</>
                                    ) : (
                                      <>Tâches récentes</>
                                    )
                                  )}
                                </span>
                                <button 
                                  className="btn btn-sm btn-outline-primary rounded-pill px-2 py-0 d-flex align-items-center gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPopupList(list);
                                  }}
                                  style={{ fontSize: '0.7rem', border: '1px solid #667eea' }}
                                  title="Ouvrir la gestion des tâches"
                                >
                                  <Icon icon="mdi:plus" style={{ fontSize: '0.8rem' }} />
                                  Ajouter
                                </button>
                              </div>
                              <div className="d-flex flex-column gap-2">
                                {list.filteredTasks.slice(0, 2).map(task => (
                                  <div 
                                    key={task.id} 
                                    className="border rounded-3 px-3 py-2 position-relative"
                                    style={{ 
                                      background: task.status === 'Terminée' ? '#f8f9fa' : '#fff',
                                      borderColor: task.status === 'Terminée' ? '#28a745' : task.status === 'En cours' ? '#ffc107' : '#e9ecef',
                                      borderWidth: '1px',
                                      borderLeftWidth: '3px'
                                    }}
                                  >
                                    <div className="d-flex justify-content-between align-items-start gap-2">
                                      <span 
                                        className="flex-grow-1 small"
                                        style={{ 
                                          fontSize: '0.85rem',
                                          lineHeight: '1.3',
                                          textDecoration: task.status === 'Terminée' ? 'line-through' : 'none',
                                          color: task.status === 'Terminée' ? '#6c757d' : '#333'
                                        }}
                                      >
                                        {task.description}
                                      </span>
                                      <span 
                                        className={`badge ${
                                          task.status === 'Terminée' ? 'bg-success' : 
                                          task.status === 'En cours' ? 'bg-warning' : 'bg-secondary'
                                        }`} 
                                        style={{ fontSize: '0.6rem', flexShrink: 0 }}
                                      >
                                        {task.status === 'Terminée' ? '✓' : task.status === 'En cours' ? '⏳' : '⏸'}
                                      </span>
                                    </div>
                                    {task.assigned_to && users.find(u => u.id === task.assigned_to) && (
                                      <div className="mt-1">
                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                          <div className="d-flex align-items-center gap-2 flex-wrap">
                                            {/* Assignation avec nom et prénom complet */}
                                            <small className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-2 py-1 d-flex align-items-center gap-1" style={{ fontSize: '0.65rem' }}>
                                              <Icon icon="mdi:account-circle" style={{ fontSize: '0.7rem' }} />
                                              {getAssignedUserName(task.assigned_to)}
                                            </small>
                                            
                                            {/* Date de création */}
                                            {task.created_at && (
                                              <small className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-2 py-1 d-flex align-items-center gap-1" style={{ fontSize: '0.65rem' }}>
                                                <Icon icon="mdi:clock-plus" style={{ fontSize: '0.7rem' }} />
                                                {new Date(task.created_at).toLocaleDateString('fr-FR')}
                                              </small>
                                            )}
                                            
                                            {/* Date d'échéance */}
                                            {task.due_date && (
                                              <small className="badge bg-info bg-opacity-10 text-info rounded-pill px-2 py-1 d-flex align-items-center gap-1" style={{ fontSize: '0.65rem' }}>
                                                <Icon icon="mdi:calendar" style={{ fontSize: '0.7rem' }} />
                                                {new Date(task.due_date).toLocaleDateString('fr-FR')}
                                              </small>
                                            )}
                                            
                                            {/* Bouton de commentaires */}
                                            <button 
                                              className="badge bg-purple bg-opacity-10 text-purple border-0 rounded-pill px-2 py-1 d-flex align-items-center gap-1" 
                                              style={{ 
                                                fontSize: '0.65rem',
                                                background: 'rgba(102, 16, 242, 0.1)',
                                                color: '#6610f2',
                                                cursor: 'pointer'
                                              }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedTask(task);
                                                setShowCommentsModal(true);
                                              }}
                                            >
                                              <Icon icon="mdi:comment-multiple-outline" style={{ fontSize: '0.7rem' }} />
                                              Commentaires
                                            </button>
                                          </div>
                                          
                                          {/* Statut compact */}
                                          <span 
                                            className={`badge ${
                                              task.status === 'Terminée' ? 'bg-success' : 
                                              task.status === 'En cours' ? 'bg-warning text-dark' : 'bg-secondary'
                                            }`} 
                                            style={{ 
                                              fontSize: '0.6rem', 
                                              flexShrink: 0,
                                              width: 'fit-content',
                                              padding: '0.25rem 0.5rem'
                                            }}
                                          >
                                            {task.status === 'Terminée' ? '✓' : task.status === 'En cours' ? '⏳' : '⏸'}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {list.filteredTasks.length > 2 && (
                                  <div className="text-center py-1">
                                    <small className="text-muted d-flex align-items-center justify-content-center gap-1">
                                      <Icon icon="mdi:dots-horizontal" />
                                      {list.filteredTasks.length - 2} autre{list.filteredTasks.length - 2 > 1 ? 's' : ''} tâche{list.filteredTasks.length - 2 > 1 ? 's' : ''}
                                    </small>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="mb-3 text-center py-3">
                              <Icon icon="mdi:clipboard-text-outline" style={{ fontSize: '2rem', color: '#e9ecef' }} />
                              {searchQuery || taskFilter !== 'all' ? (
                                <p className="small text-muted mb-0 mt-2">
                                  Aucune tâche ne correspond aux critères
                                  <button 
                                    className="btn btn-link btn-sm p-0 ms-2 text-primary"
                                    onClick={() => {
                                      setSearchQuery('');
                                      setTaskFilter('all');
                                    }}
                                  >
                                    Réinitialiser les filtres
                                  </button>
                                </p>
                              ) : (
                                <p className="small text-muted mb-0 mt-2">Aucune tâche pour le moment</p>
                              )}
                            </div>
                          )}

                          {/* Action principale */}
                          <div className="text-center pt-2 border-top">
                            <div className="d-flex align-items-center justify-content-center gap-1">
                              <Icon icon="mdi:cursor-pointer" className="text-primary" style={{ fontSize: '0.9rem' }} />
                              <span className="small text-muted">Cliquer pour gérer les tâches</span>
                            </div>
                          </div>
                        </div>

                        {/* Effet de survol */}
                        <div 
                          className="position-absolute top-0 end-0 m-2 opacity-0"
                          style={{ 
                            transition: 'opacity 0.3s ease',
                            pointerEvents: 'none'
                          }}
                          ref={(el) => {
                            if (el && el.parentElement) {
                              el.parentElement.addEventListener('mouseenter', () => {
                                el.style.opacity = '1';
                              });
                              el.parentElement.addEventListener('mouseleave', () => {
                                el.style.opacity = '0';
                              });
                            }
                          }}
                        >
                          <div 
                            className="badge bg-primary text-white d-flex align-items-center gap-1 px-2 py-1"
                            style={{ fontSize: '0.7rem' }}
                          >
                            <Icon icon="mdi:open-in-new" />
                            Ouvrir
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {popupList && (
        <TodoListPopup 
          list={popupList} 
          onClose={() => {
            setPopupList(null);
            // Recharger les listes pour s'assurer que les changements sont visibles
            dispatch(fetchTodoLists());
          }}
          onTaskChange={() => {
            // Recharger les listes immédiatement quand une tâche change
            dispatch(fetchTodoLists());
          }}
        />
      )}
      {showAddTodo && (
        <AddTodoModal
          show={showAddTodo}
          onClose={() => setShowAddTodo(false)}
          projectId={id}
          onSuccess={() => {
            setShowAddTodo(false);
            dispatch(fetchTodoLists());
          }}
        />
      )}

      {/* Modal pour afficher les commentaires */}
      {showCommentsModal && selectedTask && (
        <TaskCommentsModal
          show={showCommentsModal}
          onClose={() => {
            setShowCommentsModal(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          users={users}
        />
      )}
    </div>
  );
};

export default ProjectDetailPage;
