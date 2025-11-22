import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createAbsenceRequest, fetchAbsenceRequests, updateAbsenceRequest } from '../../Redux/Slices/absenceRequestSlice';
import { fetchClients } from '../../Redux/Slices/clientsSlice';
import { Formik, Form, Field, ErrorMessage,useFormikContext } from 'formik';
import * as Yup from 'yup';
import Swal from 'sweetalert2';
import { Icon } from '@iconify/react';
import LeaveValidationWidget from '../LeaveValidationWidget';
import api from '../../config/axios';


function TodayDateSetter() {
  // Ce composant se charge de mettre à jour les dates si type=AttestationTravail ou demande document
  const { values, setFieldValue } = useFormikContext();
  useEffect(() => {
    if (values.type === "AttestationTravail" || values.type === "demande document") {
      const today = new Date().toISOString().split('T')[0];
      setFieldValue('dateDebut', today);
      setFieldValue('dateFin', today);
    }
  }, [values.type, setFieldValue]);
  return null;
}


const AbsenceRequestForm = ({ initialValues = {}, isEdit = false, onSuccess }) => {
  const dispatch = useDispatch();
  const { status } = useSelector(state => state.absenceRequests);
  const clientsState = useSelector(state => state.clients);
  const { user, isLoading: authLoading } = useSelector(state => state.auth);
  const role = useSelector(state => state.auth.roles);

  const handleDownloadDocument = async (doc) => {
    try {
      const downloadPath = `absences/document/${doc.id}/download`;
      const response = await api.get(downloadPath, {
        responseType: 'blob',
      });
      
      const contentType = response.headers['content-type'];
      if (contentType && (contentType.includes('application/json') || contentType.includes('text/html'))) {
        const text = await response.data.text();
        try {
            const json = JSON.parse(text);
            throw new Error(json.message || 'Erreur lors du téléchargement');
        } catch (e) {
            throw new Error('Le serveur a renvoyé une erreur (HTML/JSON) au lieu du fichier.');
        }
      }

      let finalFileName = doc.original_name || 'document';
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          finalFileName = filenameMatch[1];
        }
      }

      if (finalFileName && !finalFileName.includes('.')) {
          const mime = response.headers['content-type'];
          if (mime) {
              const mimeMap = {
                  'application/pdf': 'pdf',
                  'image/jpeg': 'jpg',
                  'image/png': 'png',
                  'application/msword': 'doc',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
                  'application/vnd.ms-excel': 'xls',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
                  'text/csv': 'csv',
                  'application/zip': 'zip'
              };
              const ext = mimeMap[mime] || mime.split('/')[1];
              if (ext && ext.length < 5) {
                  finalFileName = `${finalFileName}.${ext}`;
              }
          }
      }

      const blob = new Blob([response.data], { type: contentType });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = finalFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download error:', error);
      let message = 'Impossible de télécharger le document.';
      if (error.message) message = error.message;
      Swal.fire('Erreur', message, 'error');
    }
  };

  // Debug initialValues
  useEffect(() => {
    console.log('Initial values:', initialValues);
    console.log('Is edit mode:', isEdit);
    console.log('Current user:', user);
  }, [initialValues, isEdit, user]);

  useEffect(() => {
    if (!isEdit && !user) {
      Swal.fire('Erreur', 'Vous devez être connecté pour créer une demande d\'absence', 'error');
    }
  }, [user, isEdit]);

  // Charger la liste des clients uniquement si le type est 'demande document'
  useEffect(() => {
    if (typeof window !== 'undefined' && clientsState.status === 'idle') {
      // Précharger un minimum pour première ouverture
      dispatch(fetchClients({ page: 1, perPage: 50 }));
    }
  }, []);

  // Vérification des permissions pour l'édition
  useEffect(() => {
    const isRH = role && (role.includes('RH') || role.includes('Gest_RH'));
    const isOwner = user && initialValues && (String(user.id) === String(initialValues.user_id));

    if (isEdit && !isRH && !isOwner) {
      Swal.fire({
        title: 'Accès refusé',
        text: 'Vous n\'avez pas la permission de modifier cette demande.',
        icon: 'error',
        confirmButtonText: 'Retour'
      }).then(() => {
        if (onSuccess) onSuccess();
      });
    }
  }, [isEdit, role, user, initialValues, onSuccess]);

  const validationSchema = Yup.object({
    type: Yup.string()
      .required('Le type d\'absence est requis')
      .oneOf(['Congé', 'maladie', 'autre', 'AttestationTravail','demande document'], 'Type d\'absence invalide'),
    statut: Yup.string()
      .oneOf(['en_attente', 'rejeté', 'validé', 'approuvé', 'annulé','En demande'], 'Statut invalide'),
    dateDebut: Yup.date().when('type',{
      is: (val) => val === 'AttestationTravail' || val === 'demande document',
      then: (schema) => schema.nullable(),
      otherwise: (schema) => schema.required('La date de début est requise')
    }),
    dateFin: Yup.date().when('type',{
      is: (val) => val === 'AttestationTravail' || val === 'demande document',
      then: (schema) => schema.nullable(),
      otherwise: (schema) => schema.required('La date de fin est requise').min(Yup.ref('dateDebut'), 'La date de fin doit être postérieure à la date de début')
    }),
    motif: Yup.string().nullable(),
    justification: Yup.mixed()
      .test('fileSizeJustif', 'Pièce justificative trop volumineuse (max 5MB)', value => {
        if (!value || typeof value === 'string') return true;
        return value.size <= 5120 * 1024;
      })
      .test('fileTypeJustif', 'Formats autorisés: jpg, png, pdf, doc, docx, xls, xlsx, csv', value => {
        if (!value || typeof value === 'string') return true;
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel.sheet.macroEnabled.12',
          'text/csv'
        ];
        return allowedTypes.includes(value.type);
      })
      .nullable(),
    documents: Yup.array()
      .of(
        Yup.mixed()
          .test('fileSizeMulti', 'Fichier trop volumineux (max 8MB)', value => {
            if (!value || typeof value === 'string') return true;
            return value.size <= 8192 * 1024;
          })
          .test('fileTypeMulti', 'Formats autorisés: jpg, png, pdf, doc, docx, xls, xlsx, csv, zip', value => {
            if (!value || typeof value === 'string') return true;
            const allowedTypes = [
              'image/jpeg',
              'image/png',
              'application/pdf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-excel.sheet.macroEnabled.12',
              'text/csv',
              'application/zip',
              'application/x-zip-compressed'
            ];
            return allowedTypes.includes(value.type);
          })
      )
      .nullable()
  });

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      if (isEdit) {
        // For update
        const userId = initialValues?.user_id;
        if (!userId) {
          throw new Error('Impossible de déterminer l\'utilisateur pour la mise à jour');
        }
        
        // Create FormData
        const formData = new FormData();
        
  // Add required fields with fallback to initialValues
        formData.append('user_id', String(userId));
        formData.append('type', values.type || initialValues.type);
        if(values.type === 'AttestationTravail') {
          formData.append('dateDebut', '');
          formData.append('dateFin', '');
        } else {
          formData.append('dateDebut', new Date(values.dateDebut || initialValues.dateDebut).toISOString().split('T')[0]);
          formData.append('dateFin', new Date(values.dateFin || initialValues.dateFin).toISOString().split('T')[0]);
        }
  // statut par défaut: toujours 'en_attente' (En attente)
  const defaultStatutUpdate = 'en_attente';
  formData.append('statut', values.statut || initialValues.statut || defaultStatutUpdate);
        
        // Add optional fields if they exist
        if (values.motif || initialValues.motif) {
          formData.append('motif', values.motif || initialValues.motif);
        }

        // Client associé uniquement pour 'demande document'
        const selectedClientIdUpd = values.client_id || initialValues.client_id;
        if ((values.type || initialValues.type) === 'demande document' && selectedClientIdUpd) {
          formData.append('client_id', String(selectedClientIdUpd));
        }

        // Handle justification file
        if (values.justification instanceof File) {
          console.log('Adding file to FormData:', values.justification);
          formData.append('justification', values.justification);
        } else if (values.justification === null || values.justification === '') {
          formData.append('justification', '');
        } else if (values.justification && !(values.justification instanceof File)) {
          formData.append('justification', values.justification);
        }

        // Multiple documents (only for demande document)
        if ((values.type || initialValues.type) === 'demande document' && Array.isArray(values.documents)) {
          values.documents.forEach((f) => {
            if (f instanceof File) {
              formData.append('documents[]', f);
            }
          });
        }

        // Log FormData contents
        console.log('FormData contents for update:');
        for (let [key, value] of formData.entries()) {
          if (value instanceof File) {
            console.log(`${key}: File(${value.name}, ${value.type}, ${value.size} bytes)`);
          } else {
            console.log(`${key}: ${value}`);
          }
        }

        console.log('Sending request (FormData) update');

        const response = await dispatch(
          updateAbsenceRequest({ id: initialValues.id, data: formData })
        ).unwrap();

        if (response && response.error) {
          throw new Error(response.error);
        }

        resetForm();
        if (onSuccess) {
          onSuccess();
          dispatch(fetchAbsenceRequests())
        };
      } else {
        // For create
        if (!user) {
          throw new Error('Utilisateur non authentifié');
        }

        const formData = new FormData();
        
  // Add required fields
        formData.append('user_id', String(user.id));
        formData.append('type', values.type);
        if(values.type === 'AttestationTravail') {
          formData.append('dateDebut', '');
          formData.append('dateFin', '');
        } else {
          formData.append('dateDebut', new Date(values.dateDebut).toISOString().split('T')[0]);
          formData.append('dateFin', new Date(values.dateFin).toISOString().split('T')[0]);
        }
  // statut par défaut selon type
  formData.append('statut', 'en_attente');
        // Client associé uniquement pour 'demande document'
        if (values.type === 'demande document' && values.client_id) {
          formData.append('client_id', String(values.client_id));
        }
        
        // Add optional fields if they exist
        if (values.motif) {
          formData.append('motif', values.motif);
        }

        if (values.justification instanceof File) {
          console.log('Adding file to FormData:', values.justification);
          formData.append('justification', values.justification);
        } else if (values.justification === null || values.justification === '') {
          formData.append('justification', '');
        } else if (values.justification) {
          formData.append('justification', values.justification);
        }

        // Multiple documents for 'demande document'
        if (values.type === 'demande document' && Array.isArray(values.documents)) {
          values.documents.forEach((f) => {
            if (f instanceof File) {
              formData.append('documents[]', f);
            }
          });
        }

        const response = await dispatch(createAbsenceRequest(formData)).unwrap();

        if (response && response.error) {
          throw new Error(response.error);
        }

        resetForm();
        if (onSuccess) {onSuccess()
          dispatch(fetchAbsenceRequests())
        };
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      let errorMessage = 'Une erreur est survenue lors de la mise à jour de la demande d\'absence.';
      
      if (error.error) {
        errorMessage = Object.entries(error.error)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('\n');
      } else if (error.message) {
        errorMessage = error.message;
      }

      Swal.fire('Erreur!', errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExistingDocument = async (docId) => {
    const result = await Swal.fire({
      title: 'Supprimer ce document?',
      text: "Cette action est irréversible.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`absences/document/${docId}`);
        Swal.fire('Supprimé!', 'Le document a été supprimé.', 'success');
        // Refresh the list or update local state if possible
        // Since we don't have easy access to refresh the parent's data without a full reload or prop callback,
        // we might just reload the page or ask the user to refresh.
        // Better: call onSuccess to close/refresh if that's what it does, or dispatch fetchAbsenceRequests.
        dispatch(fetchAbsenceRequests());
        // if (onSuccess) onSuccess(); // Don't close/navigate away on document delete, just refresh
      } catch (error) {
        console.error('Delete error:', error);
        Swal.fire('Erreur', 'Impossible de supprimer le document.', 'error');
      }
    }
  };

  return (
    <div className="card border-0 shadow-lg rounded-4">
      <div className="card-body p-4">
        <Formik
          enableReinitialize={true}
          initialValues={{
            type: 'Congé',
            dateDebut: '',
            dateFin: '',
            motif: '',
            justification: null,
            client_id: initialValues.client_id || '',
            statut: initialValues.statut ?? 'en_attente',
            ...initialValues,
            documents: [] // Always start with empty array for new documents
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, setFieldValue, values }) => (
            <Form>
              <TodayDateSetter />

              {/* Informations de l'employé */}
              {!isEdit && user && role && !role.includes('Employe') && (
                <div className="mb-4">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <Icon icon="mdi:account" className="text-primary" style={{ fontSize: '1.3rem' }} />
                    <h5 className="fw-bold mb-0">Informations de l'employé</h5>
                  </div>
                  <div className="card border-2 border-dashed" style={{ borderColor: '#667eea' }}>
                    <div className="card-body p-3">
                      <label className="form-label fw-semibold d-flex align-items-center gap-2">
                        <Icon icon="mdi:account-circle" className="text-primary" />
                        Employé
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-lg"
                        value={`${user.name} ${user.prenom}`}
                        disabled
                        style={{ borderRadius: '12px', backgroundColor: '#f8f9fa' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Type de demande et statut */}
              <div className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <Icon icon="mdi:clipboard-text" className="text-primary" style={{ fontSize: '1.3rem' }} />
                  <h5 className="fw-bold mb-0">Type de demande</h5>
                </div>
                
                <div className="row g-3">
                  <div className="col-md-4">
                    <label htmlFor="type" className="form-label fw-semibold d-flex align-items-center gap-2">
                      <Icon icon="mdi:format-list-bulleted" className="text-primary" />
                      Type de demande <span className="text-danger">*</span>
                    </label>
                    <Field as="select" name="type" className="form-select form-select-lg" style={{ borderRadius: '12px' }}>
                      <option value="Congé">Congé</option>
                      <option value="maladie">Maladie</option>
                      <option value="AttestationTravail">Attestation de travail</option>
                      <option value="demande document">Demande de document</option>
                      <option value="autre">Autre</option>
                    </Field>
                    <ErrorMessage name="type" component="div" className="invalid-feedback d-flex align-items-center gap-1 mt-2" />
                  </div>
                  {isEdit && role && !role.includes('Employe') && (
                    <div className="col-md-4">
                      <label htmlFor="statut" className="form-label fw-semibold d-flex align-items-center gap-2">
                        <Icon icon="mdi:check-circle" className="text-success" />
                        Statut
                      </label>
                      <Field as="select" name="statut" className="form-select form-select-lg" style={{ borderRadius: '12px' }}>
                        <option value="en_attente">En attente</option>
                        <option value="En demande">En demande</option>
                        <option value="rejeté">Rejeté</option>
                        <option value="validé">Validé</option>
                        <option value="annulé">Annulé</option>
                        {isEdit && role && role.includes('RH') && (
                          <option value="approuvé">Approuvé</option>
                        )}
                      </Field>
                      <ErrorMessage name="statut" component="div" className="invalid-feedback d-flex align-items-center gap-1 mt-2" />
                    </div>
                  )}
                  {values.type !== "AttestationTravail" && values.type !== 'demande document' && (
                    <div className={isEdit && role && !role.includes('Employe') ? "col-md-4" : "col-md-8"}>
                      <label htmlFor="justification" className="form-label fw-semibold d-flex align-items-center gap-2">
                        <Icon icon="mdi:paperclip" className="text-primary" />
                        Pièce justificative
                      </label>
                      <input
                        type="file"
                        name="justification"
                        id="justification"
                        className="form-control form-control-lg"
                        onChange={(event) => {
                          setFieldValue("justification", event.currentTarget.files[0]);
                        }}
                        style={{ borderRadius: '12px' }}
                      />
                      {values.justification && typeof values.justification === 'string' && (
                        <div className="mt-2">
                          <div className="alert alert-info d-flex align-items-center gap-2">
                            <Icon icon="mdi:file-check" />
                            <small>Fichier actuel: {values.justification}</small>
                          </div>
                        </div>
                      )}
                      <small className="text-muted mt-1 d-block">
                        Formats acceptés: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX, CSV (max 5MB)
                      </small>
                      <ErrorMessage name="justification" component="div" className="invalid-feedback d-flex align-items-center gap-1 mt-2" />
                    </div>
                  )}
                  {values.type === 'demande document' && (
                    <div className="col-md-8">
                      <label className="form-label fw-semibold d-flex align-items-center gap-2">
                        <Icon icon="mdi:folder-multiple" className="text-primary" />
                        Documents
                      </label>

                      {/* Existing Documents */}
                      {isEdit && initialValues.documents && initialValues.documents.length > 0 && (
                        <div className="mb-3">
                          <h6 className="text-muted small fw-bold text-uppercase">Documents existants</h6>
                          <ul className="list-group list-group-flush">
                            {initialValues.documents.map((doc, i) => (
                              <li key={doc.id || i} className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 bg-transparent">
                                <div className="d-flex align-items-center gap-2 text-truncate">
                                  <Icon icon="mdi:file-check" className="text-success" />
                                  <span className="small">{doc.original_name}</span>
                                </div>
                                <div className="d-flex gap-2">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-light text-primary"
                                    onClick={() => handleDownloadDocument(doc)}
                                    title="Télécharger"
                                  >
                                    <Icon icon="mdi:download" />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-light text-danger"
                                    onClick={() => handleDeleteExistingDocument(doc.id)}
                                    title="Supprimer"
                                  >
                                    <Icon icon="mdi:delete" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* New Documents Input */}
                      <label className="form-label small text-muted">Ajouter des documents</label>
                      <div className="d-flex align-items-center gap-3 mb-2">
                        <label className="btn btn-outline-primary d-flex align-items-center gap-2" style={{ borderRadius: '12px', cursor: 'pointer' }}>
                          <Icon icon="mdi:paperclip-plus" style={{ fontSize: '1.2rem' }} />
                          <span>Ajouter des fichiers</span>
                          <input
                            type="file"
                            multiple
                            className="d-none"
                            onChange={(e) => {
                              const newFiles = Array.from(e.currentTarget.files || []);
                              if (newFiles.length > 0) {
                                setFieldValue('documents', [...(values.documents || []), ...newFiles]);
                                e.currentTarget.value = ''; // Reset to allow adding more
                              }
                            }}
                          />
                        </label>
                        <small className="text-muted">
                          Formats: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX, CSV, ZIP (max 8MB)
                        </small>
                      </div>
                      
                      {/* New Documents List */}
                      {Array.isArray(values.documents) && values.documents.length > 0 && (
                        <div className="mt-3 p-3 bg-light rounded-3">
                          <h6 className="text-muted small fw-bold text-uppercase mb-2">Fichiers à envoyer ({values.documents.length})</h6>
                          <ul className="list-group">
                            {values.documents.map((f, i) => (
                              <li key={i} className="list-group-item d-flex align-items-center justify-content-between border-0 bg-white mb-1 rounded shadow-sm p-2">
                                <div className="d-flex align-items-center gap-2 text-truncate">
                                  <Icon icon="mdi:file-document-outline" className="text-primary" />
                                  <span className="small text-dark">{f.name}</span>
                                  <span className="badge bg-secondary rounded-pill" style={{ fontSize: '0.6rem' }}>
                                    {(f.size / 1024 / 1024).toFixed(2)} MB
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-light text-danger"
                                  onClick={() => {
                                    const newDocs = [...values.documents];
                                    newDocs.splice(i, 1);
                                    setFieldValue('documents', newDocs);
                                  }}
                                  title="Supprimer"
                                >
                                  <Icon icon="mdi:delete" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Période d'absence */}
              {values.type !== "AttestationTravail" && values.type !== 'demande document' && (
                <div className="mb-4">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <Icon icon="mdi:calendar-range" className="text-primary" style={{ fontSize: '1.3rem' }} />
                    <h5 className="fw-bold mb-0">Période d'absence</h5>
                  </div>
                  
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label htmlFor="dateDebut" className="form-label fw-semibold d-flex align-items-center gap-2">
                        <Icon icon="mdi:calendar-start" className="text-success" />
                        Date de début <span className="text-danger">*</span>
                      </label>
                      <Field
                        type="date"
                        name="dateDebut"
                        id="dateDebut"
                        className="form-control form-control-lg"
                        style={{ borderRadius: '12px' }}
                      />
                      <ErrorMessage name="dateDebut" component="div" className="invalid-feedback d-flex align-items-center gap-1 mt-2" />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="dateFin" className="form-label fw-semibold d-flex align-items-center gap-2">
                        <Icon icon="mdi:calendar-end" className="text-warning" />
                        Date de fin <span className="text-danger">*</span>
                      </label>
                      <Field
                        type="date"
                        name="dateFin"
                        id="dateFin"
                        className="form-control form-control-lg"
                        style={{ borderRadius: '12px' }}
                      />
                      <ErrorMessage name="dateFin" component="div" className="invalid-feedback d-flex align-items-center gap-1 mt-2" />
                    </div>
                  </div>
                </div>
              )}

              {/* Widget de validation des congés */}
              {values.type === "Congé" && values.dateDebut && values.dateFin && (
                <div className="mb-4">
                  <LeaveValidationWidget
                    userId={user?.id}
                    leaveType="Congé"
                    startDate={values.dateDebut}
                    endDate={values.dateFin}
                  />
                </div>
              )}

              {values.type === "AttestationTravail" || values.type === 'demande document' ? (
                <>
                  <Field type="hidden" name="dateDebut" />
                  <Field type="hidden" name="dateFin" />
                </>
              ) : null}
              {values.type === 'demande document' && (
                <div className="mb-4">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <Icon icon="mdi:account" className="text-primary" style={{ fontSize: '1.3rem' }} />
                    <h5 className="fw-bold mb-0">Client concerné</h5>
                  </div>
                  <label htmlFor="client_id" className="form-label fw-semibold d-flex align-items-center gap-2">
                    <Icon icon="mdi:account-circle" className="text-primary" />
                    Sélectionner le client
                  </label>
                  <Field as="select" name="client_id" id="client_id" className="form-select form-select-lg" style={{ borderRadius: '12px' }}>
                    <option value="">-- Sélectionner --</option>
                    {Array.isArray(clientsState.items) && clientsState.items.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} {c.prenom || ''}</option>
                    ))}
                  </Field>
                  <ErrorMessage name="client_id" component="div" className="invalid-feedback d-flex align-items-center gap-1 mt-2" />
                </div>
              )}

              {/* Motif */}
              <div className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <Icon icon="mdi:text-box" className="text-primary" style={{ fontSize: '1.3rem' }} />
                  <h5 className="fw-bold mb-0">Motif de la demande</h5>
                </div>
                
                <label htmlFor="motif" className="form-label fw-semibold d-flex align-items-center gap-2">
                  <Icon icon="mdi:message-text" className="text-primary" />
                  Motif
                </label>
                <Field
                  as="textarea"
                  name="motif"
                  id="motif"
                  className="form-control"
                  rows="4"
                  placeholder="Décrivez le motif de votre demande d'absence..."
                  style={{ borderRadius: '12px', resize: 'vertical' }}
                />
                <ErrorMessage name="motif" component="div" className="invalid-feedback d-flex align-items-center gap-1 mt-2" />
              </div>

              {/* Actions */}
              <div className="d-flex justify-content-end gap-3 pt-3 border-top">
                <button 
                  type="button" 
                  onClick={onSuccess}
                  className="btn btn-outline-secondary d-flex align-items-center gap-2 px-4 py-2"
                  style={{ 
                    borderRadius: '12px',
                    fontSize: '1.1rem'
                  }}
                >
                  <Icon icon="mdi:cancel" />
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="btn btn-primary d-flex align-items-center gap-2 px-4 py-2"
                  style={{ 
                    borderRadius: '12px',
                    background: isSubmitting ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    fontSize: '1.1rem'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Icon icon={isEdit ? "mdi:content-save" : "mdi:send"} />
                      {isEdit ? 'Mettre à jour' : 'Soumettre la demande'}
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

export default AbsenceRequestForm;