import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createDepartment } from '../../Redux/Slices/departementSlice';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as Yup from 'yup';
import { Icon } from '@iconify/react';

const BulkAddDepartmentForm = ({ onSuccess }) => {
  const dispatch = useDispatch();
  const { status } = useSelector(state => state.departments);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const initialValues = {
    departments: [{ nom: '' }]
  };

  const validationSchema = Yup.object({
    departments: Yup.array().of(
      Yup.object().shape({
        nom: Yup.string()
          .required('Le nom du département est requis')
          .min(2, 'Le nom doit contenir au moins 2 caractères')
          .max(50, 'Le nom ne peut pas dépasser 50 caractères')
      })
    )
  });

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    let success = 0;
    let errors = 0;

    for (const dept of values.departments) {
      try {
        await dispatch(createDepartment(dept));
        success++;
      } catch (error) {
        errors++;
      }
    }

    setSuccessCount(success);
    setErrorCount(errors);
    resetForm();
    if (onSuccess) onSuccess();
    setSubmitting(false);
  };

  return (
    <div className="card border-0 shadow-lg rounded-4">
      <div className="card-body p-3 p-md-4">
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, isSubmitting, errors, touched }) => (
            <Form>
              {/* Liste des départements */}
              <div className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <Icon icon="mdi:office-building-plus" className="text-primary d-none d-sm-block" style={{ fontSize: '1.3rem' }} />
                  <h5 className="fw-bold mb-0 fs-6 fs-sm-5">Départements à créer</h5>
                </div>
                
                <FieldArray name="departments">
                  {({ push, remove }) => (
                    <>
                      {values.departments.map((_, index) => (
                        <div key={index} className="mb-3">
                          <div className="row align-items-end g-2 g-md-3">
                            <div className="col-12 col-sm-8 col-md-9 col-lg-10">
                              <label className="form-label fw-semibold d-flex align-items-center gap-2">
                                <Icon icon="mdi:text" className="text-primary d-none d-sm-inline" />
                                <span className="text-truncate">Département {index + 1}</span> <span className="text-danger">*</span>
                              </label>
                              <Field
                                type="text"
                                name={`departments.${index}.nom`}
                                className={`form-control form-control-lg ${errors.departments?.[index]?.nom && touched.departments?.[index]?.nom ? 'is-invalid' : ''}`}
                                placeholder="Nom du département"
                                style={{ borderRadius: '12px' }}
                              />
                              {errors.departments?.[index]?.nom && touched.departments?.[index]?.nom && (
                                <div className="invalid-feedback d-flex align-items-center gap-1 mt-1">
                                  <Icon icon="mdi:alert-circle" />
                                  <span className="text-truncate">{errors.departments[index].nom}</span>
                                </div>
                              )}
                            </div>
                            <div className="col-12 col-sm-4 col-md-3 col-lg-2 d-flex justify-content-center justify-content-sm-end">
                              {index > 0 && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger d-flex align-items-center justify-content-center gap-2 px-2 px-sm-3"
                                  onClick={() => remove(index)}
                                  style={{ borderRadius: '12px', minWidth: '100px', height: '46px' }}
                                >
                                  <Icon icon="mdi:trash-can" />
                                  <span className="d-none d-md-inline">Supprimer</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Bouton ajouter */}
                      <div className="mb-4 d-flex justify-content-center justify-content-sm-start">
                        <button
                          type="button"
                          className="btn btn-outline-primary d-flex align-items-center justify-content-center gap-2 px-3 px-md-4"
                          onClick={() => push({ nom: '' })}
                          style={{ borderRadius: '12px', minWidth: '180px' }}
                        >
                          <Icon icon="mdi:plus" />
                          <span className="d-none d-md-inline">Ajouter un autre département</span>
                          <span className="d-inline d-md-none">Ajouter département</span>
                        </button>
                      </div>
                    </>
                  )}
                </FieldArray>
              </div>

              {/* Résultats */}
              {(successCount > 0 || errorCount > 0) && (
                <div className="mb-4">
                  <div className={`alert ${errorCount > 0 ? 'alert-warning' : 'alert-success'} d-flex align-items-center gap-2`}>
                    <Icon icon={errorCount > 0 ? "mdi:alert" : "mdi:check-circle"} style={{ fontSize: '1.5rem' }} />
                    <div>
                      <strong>{successCount}</strong> département(s) créé(s) avec succès.
                      {errorCount > 0 && (
                        <div className="mt-1">
                          <strong>{errorCount}</strong> département(s) n'a(ont) pas pu être créé(s).
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="d-flex justify-content-center justify-content-sm-end pt-3 border-top">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary d-flex align-items-center justify-content-center gap-2 px-3 px-md-4 py-2"
                  style={{ 
                    borderRadius: '12px',
                    background: isSubmitting ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    fontSize: '1rem',
                    minWidth: '180px',
                    minHeight: '45px'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner-border spinner-border-sm">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <span className="d-none d-md-inline">Création en cours...</span>
                      <span className="d-inline d-md-none">Création...</span>
                    </>
                  ) : (
                    <>
                      <Icon icon="mdi:content-save-all" />
                      <span className="d-none d-md-inline">Créer tous les départements</span>
                      <span className="d-inline d-md-none">Créer tout</span>
                    </>
                  )}
                </button>
              </div>
            </Form>
          )}
        </Formik>
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
            max-width: 180px;
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

export default BulkAddDepartmentForm; 