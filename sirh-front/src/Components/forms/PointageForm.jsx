import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createPointage, updatePointage } from '../../Redux/Slices/pointageSlice';
import { fetchUsers } from '../../Redux/Slices/userSlice';
import { fetchSocietes } from '../../Redux/Slices/societeSlice'; // Ajout de l'import pour fetchSocietes
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';

const validationSchema = Yup.object().shape({
  user_id: Yup.string().required('L\'employé est requis'),
  societe_id: Yup.string().required('La société est requise'),
  date: Yup.date().required('La date est requise'),
  heureEntree: Yup.string()
    .nullable()
    .test('time-format', 'Format d\'heure invalide (HH:MM)', function(value) {
      if (!value) return true;
      return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
    }),
  heureSortie: Yup.string()
    .nullable()
    .test('time-format', 'Format d\'heure invalide (HH:MM)', function(value) {
      if (!value) return true;
      return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
    }),
  statutJour: Yup.string()
    .required('Le statut est requis')
    .notOneOf(['Congé', 'Maladie', 'Autre'], 'Les statuts Congé, Maladie et Autre ne peuvent pas être enregistrés'),
  overtimeHours: Yup.number().min(0, 'Les heures supplémentaires doivent être positives').nullable(),
});


const PointageForm = ({ initialValues = {}, isEdit = false, onSuccess }) => {
  const dispatch = useDispatch();
  const { status } = useSelector(state => state.pointages);
  const { items: users, status: usersStatus } = useSelector(state => state.users);
  const { items: societes, status: societesStatus } = useSelector(state => state.societes);
  const [absencesValidees, setAbsencesValidees] = useState([]);

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchSocietes());
    // Filtrer les absences validées
    const absences = users.filter(user => user.pointages.some(pointage => pointage.statutJour === 'absent'));
setAbsencesValidees(absences);

  }, [dispatch, societes]);

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
  try {
    const { statutJour } = values;

    const invalidStatuts = ['Congé', 'Maladie', 'Autre'];
    
    // Si le statut est "Congé", "Maladie" ou "Autre", ne pas enregistrer
    if (invalidStatuts.includes(statutJour)) {
      console.warn('Statut non enregistré :', statutJour);
      setSubmitting(false);
      return;
    }

    const formattedValues = {
      ...values,
      heureEntree: values.heureEntree ? values.heureEntree.slice(0, 5) : null,
      heureSortie: values.heureSortie ? values.heureSortie.slice(0, 5) : null,
    };

    try {
      if (isEdit) {
        await dispatch(updatePointage(formattedValues)).unwrap();
      } else {
        await dispatch(createPointage(formattedValues)).unwrap();
      }

      Swal.fire('Succès!', 'Pointage enregistré avec succès.', 'success');

    } catch (error) {
      console.warn('Erreur ignorée :', error.message);
      
      Swal.fire({
        icon: 'info',
        title: 'Enregistrement partiel',
        text: 'Certaines données n\'ont pas été enregistrées, mais le processus continue.',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }

    resetForm();
    if (onSuccess) onSuccess();

  } catch (error) {
    console.error('Erreur globale ignorée :', error.message);
  } finally {
    setSubmitting(false);
  }
};


  
  
  
  

  return (
    <div className="card">
      <div className="card-body">
        <Formik
          initialValues={{
            user_id: initialValues.user_id || '',
            societe_id: initialValues.societe_id || '',
            date: initialValues.date || '',
            heureEntree: initialValues.heureEntree || '',
            heureSortie: initialValues.heureSortie || '',
            statutJour: initialValues.statutJour || 'present',
            overtimeHours: initialValues.overtimeHours || 0,
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched, values, setFieldValue }) => (
            <Form>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Employé</label>
                  <Field
                    as="select"
                    name="user_id"
                    className={`form-select ${errors.user_id && touched.user_id ? 'is-invalid' : ''}`}
                  >
                    <option value="">Sélectionner un employé</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} {user.prenom}
                      </option>
                    ))}
                  </Field>
                  <ErrorMessage name="user_id" component="div" className="invalid-feedback" />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Société</label>
                  <Field
                    as="select"
                    name="societe_id"
                    className={`form-select ${errors.societe_id && touched.societe_id ? 'is-invalid' : ''}`}
                  >
                    <option value="">Sélectionner une société</option>
                    {societes.map((societe) => (
                      <option key={societe.id} value={societe.id}>
                        {societe.nom}
                      </option>
                    ))}
                  </Field>
                  <ErrorMessage name="societe_id" component="div" className="invalid-feedback" />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Date</label>
                  <Field
                    type="date"
                    name="date"
                    className={`form-control ${errors.date && touched.date ? 'is-invalid' : ''}`}
                  />
                  <ErrorMessage name="date" component="div" className="invalid-feedback" />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Heure d'entrée</label>
                  <Field
                    type="time"
                    name="heureEntree"
                    className={`form-control ${errors.heureEntree && touched.heureEntree ? 'is-invalid' : ''}`}
                    placeholder="HH:MM"
                    step="60"
                    disabled={values.statutJour === 'absent'}
                  />
                  <ErrorMessage name="heureEntree" component="div" className="invalid-feedback" />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Heure de sortie</label>
                  <Field
                    type="time"
                    name="heureSortie"
                    className={`form-control ${errors.heureSortie && touched.heureSortie ? 'is-invalid' : ''}`}
                    placeholder="HH:MM"
                    step="60"
                    disabled={values.statutJour === 'absent'}
                  />
                  <ErrorMessage name="heureSortie" component="div" className="invalid-feedback" />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Statut</label>
                  <Field
                    as="select"
                    name="statutJour"
                    className={`form-select ${errors.statutJour && touched.statutJour ? 'is-invalid' : ''}`}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setFieldValue('statutJour', newStatus);
                      if (newStatus === 'absent') {
                        setFieldValue('heureEntree', null);
                        setFieldValue('heureSortie', null);
                      }
                    }}
                  >
                    <option value="present">Présent</option>
                    <option value="absent">Absent</option>
                    <option value="retard">Retard</option>
                  </Field>
                  <ErrorMessage name="statutJour" component="div" className="invalid-feedback" />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Heures supplémentaires</label>
                  <Field
                    type="number"
                    name="overtimeHours"
                    min="0"
                    step="0.5"
                    className={`form-control ${errors.overtimeHours && touched.overtimeHours ? 'is-invalid' : ''}`}
                  />
                  <ErrorMessage name="overtimeHours" component="div" className="invalid-feedback" />
                </div>

                {/* Affichage des absences validées */}
                <div className="col-12">
                  <h3>Absences Validées</h3>
                  {absencesValidees.map((absence) => (
                    <div key={absence.id} className="card mb-3">
                      <div className="card-body">
                        <h5 className="card-title">{absence.nom}</h5>
                        <p className="card-text">Date: {absence.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <Link to="/pointages" className="btn btn-secondary">
                  Annuler
                </Link>
                <button type="submit" className="btn btn-primary">
                  {isEdit ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default PointageForm;