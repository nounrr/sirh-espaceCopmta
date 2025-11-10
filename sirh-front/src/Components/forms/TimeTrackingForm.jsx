import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createPointage, updatePointage } from '../../redux/slices/pointageSlice';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

const TimeTrackingForm = ({ initialValues = {}, isEdit = false, onSuccess }) => {
  const dispatch = useDispatch();
  const { status } = useSelector(state => state.pointages);
  const { items: users } = useSelector(state => state.users);

  const validationSchema = Yup.object({
    employe_id: Yup.string().required('L\'employé est requis'),
    date: Yup.date().required('La date est requise'),
    heureEntree: Yup.string().nullable(),
    heureSortie: Yup.string().nullable(),
    statutJour: Yup.string()
      .required('Le statut est requis')
      .oneOf(['present', 'absent', 'retard'], 'Statut invalide'),
    overtimeHours: Yup.number().nullable().min(0, 'Les heures supplémentaires ne peuvent pas être négatives'),
  });

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      if (isEdit) {
        await dispatch(updatePointage({ id: initialValues.id, ...values }));
      } else {
        await dispatch(createPointage(values));
      }
      resetForm();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Formik
      initialValues={{
        employe_id: '',
        date: '',
        heureEntree: '',
        heureSortie: '',
        statutJour: 'present',
        overtimeHours: '',
        ...initialValues
      }}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ isSubmitting }) => (
        <Form className="space-y-4">
          <div>
            <label htmlFor="employe_id" className="block text-sm font-medium text-gray-700">
              Employé
            </label>
            <Field
              as="select"
              name="employe_id"
              id="employe_id"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Sélectionner un employé</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.prenom}
                </option>
              ))}
            </Field>
            <ErrorMessage name="employe_id" component="div" className="text-red-500 text-sm mt-1" />
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Date
            </label>
            <Field
              type="date"
              name="date"
              id="date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <ErrorMessage name="date" component="div" className="text-red-500 text-sm mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="heureEntree" className="block text-sm font-medium text-gray-700">
                Heure d'entrée
              </label>
              <Field
                type="time"
                name="heureEntree"
                id="heureEntree"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <ErrorMessage name="heureEntree" component="div" className="text-red-500 text-sm mt-1" />
            </div>

            <div>
              <label htmlFor="heureSortie" className="block text-sm font-medium text-gray-700">
                Heure de sortie
              </label>
              <Field
                type="time"
                name="heureSortie"
                id="heureSortie"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <ErrorMessage name="heureSortie" component="div" className="text-red-500 text-sm mt-1" />
            </div>
          </div>

          <div>
            <label htmlFor="statutJour" className="block text-sm font-medium text-gray-700">
              Statut
            </label>
            <Field
              as="select"
              name="statutJour"
              id="statutJour"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="present">Présent</option>
              <option value="absent">Absent</option>
              <option value="retard">Retard</option>
            </Field>
            <ErrorMessage name="statutJour" component="div" className="text-red-500 text-sm mt-1" />
          </div>

          <div>
            <label htmlFor="overtimeHours" className="block text-sm font-medium text-gray-700">
              Heures supplémentaires
            </label>
            <Field
              type="number"
              name="overtimeHours"
              id="overtimeHours"
              min="0"
              step="0.5"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <ErrorMessage name="overtimeHours" component="div" className="text-red-500 text-sm mt-1" />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || status === 'loading'}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting || status === 'loading' ? 'Envoi en cours...' : isEdit ? 'Modifier' : 'Créer'}
          </button>
        </Form>
      )}
    </Formik>
  );
};

export default TimeTrackingForm; 