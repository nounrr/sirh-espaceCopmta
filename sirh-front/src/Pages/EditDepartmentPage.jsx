import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchDepartments, updateDepartment } from '../Redux/Slices/departementSlice';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { Icon } from '@iconify/react';
import Swal from 'sweetalert2';

const EditDepartmentPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { items: departments, status: loading } = useSelector((state) => state.departments);
  const [lastSaved, setLastSaved] = useState(null);

  // Trouver le département avant de l'utiliser dans les useEffect
  const department = departments.find(dept => dept.id === parseInt(id));

  useEffect(() => {
    dispatch(fetchDepartments());
  }, [dispatch]);

  // Effet pour surveiller les changements du département dans le store
  useEffect(() => {
    // Ce useEffect se déclenche quand le département change dans le store
    // permettant de refléter les changements en temps réel
    if (department) {
      console.log('Département mis à jour dans le store:', department);
    }
  }, [department]);

  if (loading === 'loading') {
    return (
      <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="text-muted">Chargement du département...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
        <div className="container-fluid px-4">
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="card border-0 shadow-lg rounded-4">
                <div className="card-body p-4 text-center">
                  <div className="mb-4">
                    <Icon icon="mdi:alert-circle" style={{ fontSize: '4rem', color: '#dc3545' }} />
                  </div>
                  <h4 className="fw-bold mb-3 text-danger">Département non trouvé</h4>
                  <p className="text-muted mb-4">Le département que vous recherchez n'existe pas ou a été supprimé.</p>
                  <button 
                    className="btn btn-primary d-flex align-items-center gap-2 mx-auto px-4"
                    onClick={() => navigate('/departments')}
                    style={{ 
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none'
                    }}
                  >
                    <Icon icon="mdi:arrow-left" />
                    Retour à la liste
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const validationSchema = Yup.object({
    nom: Yup.string()
      .required('Le nom du département est requis')
      .min(2, 'Le nom doit contenir au moins 2 caractères')
      .max(50, 'Le nom ne peut pas dépasser 50 caractères')
  });

  const handleSubmit = async (values, { setSubmitting, setFieldValue, resetForm }) => {
    try {
      const result = await dispatch(updateDepartment({ 
        id: department.id, 
        nom: values.nom 
      })).unwrap();
      
      if (result) {
        // Le département est automatiquement mis à jour dans le store Redux
        setLastSaved(new Date());
        
        // Réinitialiser le formulaire avec les nouvelles valeurs
        resetForm({
          values: {
            nom: result.nom || values.nom
          }
        });
        
        Swal.fire({
          title: 'Succès!',
          text: 'Le département a été modifié avec succès.',
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Retour à la liste',
          cancelButtonText: 'Continuer à modifier',
          timer: 3000,
          timerProgressBar: true
        }).then((result) => {
          fetchDepartments(); // Recharger les départements après la modification
          if (result.isConfirmed) {
            navigate('/departments');
          }
          // Si cancelButtonText est cliqué ou si timer expire, on reste sur la page
        });
      }
    } catch (error) {
      console.error('Update error:', error);
      Swal.fire({
        title: 'Erreur!',
        text: error.message || 'Une erreur est survenue lors de la modification.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-fluid py-3 py-md-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <div className="container-fluid px-2 px-md-4">
        {/* Bouton de retour */}
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
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="card-body p-3 p-md-4" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <div className="d-flex align-items-center gap-2 gap-md-3">
                  <div className="p-2 p-md-3 rounded-circle bg-white bg-opacity-20">
                    <Icon icon="mdi:office-building-outline" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }} />
                  </div>
                  <div className="flex-grow-1 min-width-0">
                    <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>Modifier le département</h1>
                    <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-1 gap-md-3">
                      <p className="mb-0 opacity-90 text-truncate">Mise à jour des informations</p>
                      {lastSaved && (
                        <small className="bg-white bg-opacity-20 px-2 py-1 rounded-pill d-none d-md-inline-block">
                          <Icon icon="mdi:check-circle" className="me-1" />
                          Sauvegardé à {lastSaved.toLocaleTimeString()}
                        </small>
                      )}
                    </div>
                    {lastSaved && (
                      <small className="bg-white bg-opacity-20 px-2 py-1 rounded-pill d-block d-md-none mt-1">
                        <Icon icon="mdi:check-circle" className="me-1" />
                        Sauvegardé {lastSaved.toLocaleTimeString()}
                      </small>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body p-3 p-md-4">
                <Formik
                  initialValues={{
                    nom: department.nom || ''
                  }}
                  enableReinitialize={true}
                  validationSchema={validationSchema}
                  onSubmit={handleSubmit}
                >
                  {({ isSubmitting, errors, touched }) => (
                    <Form>
                      {/* Informations du département */}
                      <div className="mb-4">
                        <div className="d-flex align-items-center gap-2 mb-3">
                          <Icon icon="mdi:office-building" className="text-primary d-none d-sm-block" style={{ fontSize: '1.3rem' }} />
                          <h5 className="fw-bold mb-0 fs-6 fs-sm-5">Informations du département</h5>
                        </div>
                        
                        <div className="col-12">
                          <label className="form-label fw-semibold d-flex align-items-center gap-2">
                            <Icon icon="mdi:text" className="text-primary d-none d-sm-inline" />
                            <span className="text-truncate">Nom du département</span> <span className="text-danger">*</span>
                          </label>
                          <Field
                            type="text"
                            name="nom"
                            className={`form-control form-control-lg ${errors.nom && touched.nom ? 'is-invalid' : ''}`}
                            placeholder="Entrez le nom"
                            style={{ borderRadius: '12px' }}
                          />
                          {errors.nom && touched.nom && (
                            <div className="invalid-feedback d-flex align-items-center gap-1 mt-2">
                              <Icon icon="mdi:alert-circle" />
                              <span className="text-truncate">{errors.nom}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 gap-sm-3 pt-3 border-top">
                        <button
                          type="button"
                          className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2 px-3 px-sm-4"
                          onClick={() => navigate('/departments')}
                          style={{ borderRadius: '12px' }}
                        >
                          <Icon icon="mdi:close" />
                          Annuler
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="btn btn-primary d-flex align-items-center justify-content-center gap-2 px-3 px-sm-4 py-2"
                          style={{ 
                            borderRadius: '12px',
                            background: isSubmitting ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            fontSize: '1rem',
                            minHeight: '45px'
                          }}
                        >
                          {isSubmitting ? (
                            <>
                              <div className="spinner-border spinner-border-sm">
                                <span className="visually-hidden">Loading...</span>
                              </div>
                              <span className="d-none d-sm-inline">Enregistrement...</span>
                              <span className="d-inline d-sm-none">Sauvegarde...</span>
                            </>
                          ) : (
                            <>
                              <Icon icon="mdi:content-save" />
                              Enregistrer
                            </>
                          )}
                        </button>
                      </div>
                    </Form>
                  )}
                </Formik>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS pour les animations */}
      <style>{`
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
        
        /* Media queries pour mobile */
        @media (max-width: 576px) {
          .text-truncate {
            max-width: 200px;
          }
          .btn {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      `}</style>
    </div>
  );
};

export default EditDepartmentPage; 