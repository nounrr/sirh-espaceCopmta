import React, { useEffect } from 'react';
import { Modal, Button, Form as BootstrapForm } from 'react-bootstrap';
import { Formik, Form as FormikForm, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

const SocieteSchema = Yup.object().shape({
  nom: Yup.string()
    .required('Le nom de la société est requis.')
    .min(2, 'Le nom doit contenir au moins 2 caractères.')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères.')
});

const SocieteFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const initialValues = {
    nom: initialData?.nom || '',
  };

  return (
    <Modal show={isOpen} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{initialData ? 'Modifier la Société' : 'Ajouter une Société'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Formik
          initialValues={initialValues}
          validationSchema={SocieteSchema}
          onSubmit={(values, { setSubmitting }) => {
            onSubmit(values);
            setSubmitting(false);
            // onClose(); // La fermeture est gérée par la page parente après succès/échec de l'API
          }}
          enableReinitialize // Important pour mettre à jour les valeurs initiales lorsque initialData change
        >
          {({ isSubmitting, errors, touched }) => (
            <FormikForm>
              <BootstrapForm.Group className="mb-3">
                <BootstrapForm.Label htmlFor="societeNom">Nom de la Société</BootstrapForm.Label>
                <Field
                  type="text"
                  name="nom"
                  id="societeNom"
                  placeholder="Entrez le nom de la société"
                  as={BootstrapForm.Control}
                  isInvalid={!!errors.nom && touched.nom}
                />
                <ErrorMessage name="nom" component={BootstrapForm.Control.Feedback} type="invalid" />
              </BootstrapForm.Group>
              <div className="d-flex justify-content-end">
                <Button variant="secondary" onClick={onClose} className="me-2" disabled={isSubmitting}>
                  Annuler
                </Button>
                <Button variant="primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Enregistrement...' : (initialData ? 'Enregistrer les modifications' : 'Ajouter')}
                </Button>
              </div>
            </FormikForm>
          )}
        </Formik>
      </Modal.Body>
    </Modal>
  );
};

export default SocieteFormModal;