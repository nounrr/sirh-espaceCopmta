import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createProject } from '../../Redux/Slices/projectSlice';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Swal from 'sweetalert2';

const CreateProjectPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFinPrevu, setDateFinPrevu] = useState('');
  const [dateFinReel, setDateFinReel] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!titre.trim()) {
      newErrors.titre = 'Le titre est requis';
    } else if (titre.trim().length < 3) {
      newErrors.titre = 'Le titre doit contenir au moins 3 caractères';
    } else if (titre.trim().length > 100) {
      newErrors.titre = 'Le titre ne peut pas dépasser 100 caractères';
    }
    
    if (!description.trim()) {
      newErrors.description = 'La description est requise';
    } else if (description.trim().length < 10) {
      newErrors.description = 'La description doit contenir au moins 10 caractères';
    }
    
    if (dateDebut && dateFinPrevu && new Date(dateDebut) > new Date(dateFinPrevu)) {
      newErrors.dateFinPrevu = 'La date de fin prévue doit être postérieure à la date de début';
    }
    
    if (dateFinReel && dateDebut && new Date(dateFinReel) < new Date(dateDebut)) {
      newErrors.dateFinReel = 'La date de fin réelle doit être postérieure à la date de début';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field, value) => {
    // Update the field value
    switch(field) {
      case 'titre': setTitre(value); break;
      case 'description': setDescription(value); break;
      case 'dateDebut': setDateDebut(value); break;
      case 'dateFinPrevu': setDateFinPrevu(value); break;
      case 'dateFinReel': setDateFinReel(value); break;
    }
    
    // Clear specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await dispatch(createProject({
        titre: titre.trim(),
        description: description.trim(),
        date_debut: dateDebut || null,
        date_fin_prevu: dateFinPrevu || null,
        date_fin_reel: dateFinReel || null,
      })).unwrap();
      
      Swal.fire({
        icon: 'success',
        title: 'Projet créé avec succès !',
        text: 'Vous allez être redirigé vers la liste des projets.',
        timer: 2000,
        showConfirmButton: false
      });
      
      setTimeout(() => navigate('/projets'), 2000);
    } catch (err) {
      setErrors({ submit: err?.message || 'Erreur lors de la création du projet' });
      Swal.fire({
        icon: 'error',
        title: 'Erreur lors de la création',
        text: err?.message || 'Une erreur est survenue lors de la création du projet.',
        confirmButtonText: 'Réessayer'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <div className="container-fluid px-4">
        {/* Bouton de retour simple */}
        <button 
          className="btn d-flex align-items-center gap-2 mb-3"
          onClick={() => navigate(-1)}
          type="button"
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
        <div className="row justify-content-center mb-4">
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="card-body p-4" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <div className="d-flex align-items-center gap-3">
                  <div className="p-3 rounded-circle bg-white bg-opacity-20">
                    <Icon icon="mdi:folder-plus-outline" style={{ fontSize: '2rem' }} />
                  </div>
                  <div>
                    <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>Créer un nouveau projet</h1>
                    <p className="mb-0 opacity-90">Définissez les paramètres de votre projet</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire de création */}
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  {/* Informations générales */}
                  <div className="mb-4">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <Icon icon="mdi:information" className="text-primary" style={{ fontSize: '1.3rem' }} />
                      <h5 className="fw-bold mb-0">Informations générales</h5>
                    </div>
                    
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-semibold d-flex align-items-center gap-2">
                          <Icon icon="mdi:text" className="text-primary" />
                          Titre du projet <span className="text-danger">*</span>
                        </label>
                        <input 
                          className={`form-control form-control-lg ${errors.titre ? 'is-invalid' : titre.trim() ? 'is-valid' : ''}`}
                          value={titre} 
                          onChange={e => handleFieldChange('titre', e.target.value)}
                          placeholder="Ex: Application mobile, Site web e-commerce..."
                          disabled={loading}
                          maxLength="100"
                          style={{ borderRadius: '12px', fontSize: '1.1rem' }}
                        />
                        {errors.titre && (
                          <div className="invalid-feedback d-flex align-items-center gap-1 mt-2">
                            <Icon icon="mdi:alert-circle" />
                            {errors.titre}
                          </div>
                        )}
                        <small className="text-muted mt-1 d-block">
                          {titre.length}/100 caractères
                        </small>
                      </div>
                      
                      <div className="col-12">
                        <label className="form-label fw-semibold d-flex align-items-center gap-2">
                          <Icon icon="mdi:text-box" className="text-primary" />
                          Description <span className="text-danger">*</span>
                        </label>
                        <textarea 
                          className={`form-control ${errors.description ? 'is-invalid' : description.trim() ? 'is-valid' : ''}`}
                          value={description} 
                          onChange={e => handleFieldChange('description', e.target.value)}
                          rows={4}
                          placeholder="Décrivez les objectifs, les fonctionnalités principales et les livrables attendus..."
                          disabled={loading}
                          style={{ borderRadius: '12px', resize: 'vertical' }}
                        />
                        {errors.description && (
                          <div className="invalid-feedback d-flex align-items-center gap-1 mt-2">
                            <Icon icon="mdi:alert-circle" />
                            {errors.description}
                          </div>
                        )}
                        <small className="text-muted mt-1 d-block">
                          Minimum 10 caractères
                        </small>
                      </div>
                    </div>
                  </div>

                  {/* Planning */}
                  <div className="mb-4">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <Icon icon="mdi:calendar-range" className="text-primary" style={{ fontSize: '1.3rem' }} />
                      <h5 className="fw-bold mb-0">Planning du projet</h5>
                    </div>
                    
                    <div className="row g-3">
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold d-flex align-items-center gap-2">
                          <Icon icon="mdi:calendar-start" className="text-success" />
                          Date de début
                        </label>
                        <input 
                          type="date" 
                          className="form-control"
                          value={dateDebut} 
                          onChange={e => handleFieldChange('dateDebut', e.target.value)}
                          disabled={loading}
                          style={{ borderRadius: '10px' }}
                        />
                        <small className="text-muted mt-1 d-block">
                          Date de lancement du projet
                        </small>
                      </div>
                      
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold d-flex align-items-center gap-2">
                          <Icon icon="mdi:calendar-end" className="text-warning" />
                          Date de fin prévue
                        </label>
                        <input 
                          type="date" 
                          className={`form-control ${errors.dateFinPrevu ? 'is-invalid' : ''}`}
                          value={dateFinPrevu} 
                          onChange={e => handleFieldChange('dateFinPrevu', e.target.value)}
                          disabled={loading}
                          style={{ borderRadius: '10px' }}
                        />
                        {errors.dateFinPrevu && (
                          <div className="invalid-feedback small">
                            {errors.dateFinPrevu}
                          </div>
                        )}
                        <small className="text-muted mt-1 d-block">
                          Deadline planifiée
                        </small>
                      </div>
                      
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold d-flex align-items-center gap-2">
                          <Icon icon="mdi:calendar-check" className="text-info" />
                          Date de fin réelle
                        </label>
                        <input 
                          type="date" 
                          className={`form-control ${errors.dateFinReel ? 'is-invalid' : ''}`}
                          value={dateFinReel} 
                          onChange={e => handleFieldChange('dateFinReel', e.target.value)}
                          disabled={loading}
                          style={{ borderRadius: '10px' }}
                        />
                        {errors.dateFinReel && (
                          <div className="invalid-feedback small">
                            {errors.dateFinReel}
                          </div>
                        )}
                        <small className="text-muted mt-1 d-block">
                          Optionnel : si déjà terminé
                        </small>
                      </div>
                    </div>
                  </div>

                  {/* Aperçu du projet */}
                  {(titre.trim() || description.trim()) && (
                    <div className="mb-4">
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <Icon icon="mdi:eye" className="text-primary" style={{ fontSize: '1.3rem' }} />
                        <h5 className="fw-bold mb-0">Aperçu du projet</h5>
                      </div>
                      
                      <div className="card border-2 border-dashed" style={{ borderColor: '#667eea' }}>
                        <div className="card-body p-3">
                          {titre.trim() && (
                            <h6 className="fw-bold text-primary mb-2 d-flex align-items-center gap-2">
                              <Icon icon="mdi:folder" />
                              {titre}
                            </h6>
                          )}
                          {description.trim() && (
                            <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>
                              {description}
                            </p>
                          )}
                          <div className="d-flex flex-wrap gap-2 small text-muted">
                            {dateDebut && (
                              <span className="d-flex align-items-center gap-1">
                                <Icon icon="mdi:calendar-start" className="text-success" />
                                Début: {new Date(dateDebut).toLocaleDateString()}
                              </span>
                            )}
                            {dateFinPrevu && (
                              <span className="d-flex align-items-center gap-1">
                                <Icon icon="mdi:calendar-end" className="text-warning" />
                                Fin prévue: {new Date(dateFinPrevu).toLocaleDateString()}
                              </span>
                            )}
                            {dateFinReel && (
                              <span className="d-flex align-items-center gap-1">
                                <Icon icon="mdi:calendar-check" className="text-info" />
                                Fin réelle: {new Date(dateFinReel).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Erreur de soumission */}
                  {errors.submit && (
                    <div className="alert alert-danger d-flex align-items-center gap-3 mb-4" role="alert">
                      <Icon icon="mdi:alert-circle" style={{ fontSize: '1.5rem' }} />
                      <div>
                        <h6 className="mb-1">Erreur lors de la création</h6>
                        <p className="mb-0">{errors.submit}</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                    <button
                      type="button"
                      className="btn btn-outline-secondary d-flex align-items-center gap-2 px-4"
                      onClick={() => navigate('/projets')}
                      disabled={loading}
                      style={{ borderRadius: '10px' }}
                    >
                      <Icon icon="mdi:arrow-left" />
                      Retour à la liste
                    </button>
                    
                    <button 
                      type="submit" 
                      className="btn btn-primary d-flex align-items-center gap-2 px-4 py-2"
                      disabled={loading || !titre.trim() || !description.trim()}
                      style={{ 
                        borderRadius: '10px',
                        background: loading ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        fontSize: '1.1rem'
                      }}
                    >
                      {loading ? (
                        <>
                          <div className="spinner-border spinner-border-sm" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          Création en cours...
                        </>
                      ) : (
                        <>
                          <Icon icon="mdi:plus-circle" />
                          Créer le projet
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS pour les animations */}
      <style jsx>{`
        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          transition: transform 0.2s ease;
        }
        .form-control:focus, .form-select:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
        .card {
          transition: all 0.3s ease;
        }
        .card:hover {
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default CreateProjectPage;
