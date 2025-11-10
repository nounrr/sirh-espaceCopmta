import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateDepartment } from '../../Redux/Slices/departementSlice';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Icon } from '@iconify/react';
import Swal from 'sweetalert2';

const UpdateDepartmentForm = ({ department, onSuccess }) => {
  const dispatch = useDispatch();
  const { status } = useSelector(state => state.departements);
  const validationSchema = Yup.object({
    nom: Yup.string()
      .required('Le nom du département est requis')
      .min(2, 'Le nom doit contenir au moins 2 caractères')
      .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
    description: Yup.string()
      .max(500, 'La description ne peut pas dépasser 500 caractères'),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      // Create the department update data
      const departmentUpdate = {
        id: department.id,
        nom: values.nom,
        description: values.description || null
      };

      await dispatch(updateDepartment(departmentUpdate)).unwrap();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error updating department:', error);
      Swal.fire(
        'Erreur!',
        'Une erreur est survenue lors de la mise à jour du département.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card border-0 shadow-lg rounded-4">
      <div className="card-body p-4">
        <Formik
          initialValues={{
            nom: department.nom || '',
            description: department.description || '',
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form>
              {/* Informations du département */}
              <div className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <Icon icon="mdi:office-building" className="text-primary" style={{ fontSize: '1.3rem' }} />
                  <h5 className="fw-bold mb-0">Informations du département</h5>
                </div>
                
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-semibold d-flex align-items-center gap-2">
                      <Icon icon="mdi:text" className="text-primary" />
                      Nom du département <span className="text-danger">*</span>
                    </label>
                    <Field
                      type="text"
                      name="nom"
                      className="form-control form-control-lg"
                      placeholder="Entrez le nom du département"
                      style={{ borderRadius: '12px' }}
                    />
                    <ErrorMessage name="nom" component="div" className="invalid-feedback d-flex align-items-center gap-1 mt-2" />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold d-flex align-items-center gap-2">
                      <Icon icon="mdi:text-box" className="text-primary" />
                      Description
                    </label>
                    <Field
                      as="textarea"
                      name="description"
                      className="form-control"
                      placeholder="Entrez la description du département"
                      rows="4"
                      style={{ borderRadius: '12px', resize: 'vertical' }}
                    />
                    <ErrorMessage name="description" component="div" className="invalid-feedback d-flex align-items-center gap-1 mt-2" />
                    <small className="text-muted mt-1 d-block">
                      Optionnel - Maximum 500 caractères
                    </small>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="d-flex justify-content-end gap-3 pt-3 border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary d-flex align-items-center gap-2 px-4"
                  onClick={() => onSuccess()}
                  disabled={isSubmitting || status === 'loading'}
                  style={{ borderRadius: '12px' }}
                >
                  <Icon icon="mdi:close" />
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary d-flex align-items-center gap-2 px-4 py-2"
                  disabled={isSubmitting || status === 'loading'}
                  style={{ 
                    borderRadius: '12px',
                    background: isSubmitting ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    fontSize: '1.1rem'
                  }}
                >
                  {isSubmitting || status === 'loading' ? (
                    <>
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      Enregistrement...
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

export default UpdateDepartmentForm; 