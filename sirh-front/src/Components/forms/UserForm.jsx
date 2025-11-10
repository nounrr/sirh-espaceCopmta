import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createUser, updateUser } from '../../Redux/Slices/userSlice';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { fetchDepartments } from '../../Redux/Slices/departementSlice';
import { fetchSocietes } from '../../Redux/Slices/societeSlice'; // Ajouter l'importation pour fetchSocietes
import { fetchUsers } from '../../Redux/Slices/userSlice'; // Ajouter l'importation pour fetchSocietes
import { Icon } from '@iconify/react/dist/iconify.js';
import Swal from 'sweetalert2';

const UserForm = ({ initialValues = {}, isEdit = false, onSuccess }) => {
  const dispatch = useDispatch();
  const { status } = useSelector(state => state.users);
  const { items: departments } = useSelector(state => state.departments);
  const { items: societes } = useSelector(state => state.societes); // Récupérer les sociétés depuis le store
  const { user } = useSelector(state => state.auth); // Récupérer l'utilisateur connecté
  const userRoles = user?.roles || [];

  React.useEffect(() => {
    dispatch(fetchDepartments());
    dispatch(fetchSocietes()); // Dispatch pour récupérer les sociétés
  }, [dispatch]);

  const validationSchema = Yup.object({
    cin: Yup.string().nullable('Le CIN est requis').max(20, 'Le CIN ne doit pas dépasser 20 caractères'),
    sex: Yup.string().nullable('Le sexe est requis').oneOf(['H', 'F'], 'Valeur de sexe invalide'),
date_sortie: Yup.date().nullable(),
cnss: Yup.string().nullable().max(30, 'Le numéro CNSS ne doit pas dépasser 30 caractères'),
solde_conge: Yup.number()
  .nullable()
  .min(0, 'Le solde ne peut pas être négatif')
  .max(365, 'Le solde ne peut pas dépasser 365 jours'),
dateEmbauche: Yup.date().nullable('La date d\'embauche est requise'),
    rib: Yup.string().nullable('Le RIB est requis').max(32, 'Le RIB ne doit pas dépasser 32 caractères'),
    situationFamiliale: Yup.string()
      .nullable('La situation familiale est requise')
      .oneOf(['Célibataire', 'Marié', 'Divorcé'], 'Situation familiale invalide'),
    nbEnfants: Yup.number()
      .nullable('Le nombre d\'enfants est requis')
      .min(0, 'Le nombre d\'enfants ne peut pas être négatif'),
    adresse: Yup.string()
      .nullable('L\'adresse est requise')
      .max(255, 'L\'adresse ne doit pas dépasser 255 caractères'),
    name: Yup.string()
      .nullable('Le nom est requis')
      .max(50, 'Le nom ne doit pas dépasser 50 caractères'),
    prenom: Yup.string()
      .nullable('Le prénom est requis')
      .max(50, 'Le prénom ne doit pas dépasser 50 caractères'),
    tel: Yup.string()
      .nullable('Le numéro de téléphone est requis')
      .max(20, 'Le numéro de téléphone ne doit pas dépasser 20 caractères'),
      information_supplementaire: Yup.string().nullable(),
      information_supplementaire2: Yup.string().nullable(),
    email: Yup.string()
      .nullable('L\'email est requis')
      .email('Email invalide'),
    password: isEdit ? Yup.string() : Yup.string()
      .nullable('Le mot de passe est requis')
      .min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
    role: Yup.string()
      .oneOf(['Employe', 'Chef_Dep', 'RH', 'Chef_Projet', 'Chef_Chant', 'Gest_RH', 'Gest_Projet', ''], 'Rôle invalide')
      .test('role-validation', 'Rôle invalide', function(value) {
        if (isEdit) {
          // In edit mode, allow empty value to keep existing role
          return true;
        }
        // In create mode, require a valid role
        return ['Employe', 'Chef_Dep', 'RH', 'Chef_Projet', 'Chef_Chant', 'Gest_RH', 'Gest_Projet'].includes(value);
      }),
    typeContrat: Yup.string()
      .nullable('Le type de contrat est requis')
      .oneOf(['Permanent', 'Temporaire'], 'Type de contrat invalide'),
date_naissance: Yup.date().nullable('La date de naissance est requise'),
    statut: isEdit ? Yup.string()
      .nullable('Le statut est requis')
      .oneOf(['Actif', 'Inactif', 'Congé', 'Malade'], 'Statut invalide') : Yup.string(),
    departement_id: Yup.string().nullable('Le département est requis'),
    societe_id: Yup.string().when('typeContrat', {
      is: 'Permanent',
      then: schema => schema.nullable('La société est requise pour un contrat permanent'),
      otherwise: schema => schema.nullable(),
    }),
    picture: Yup.mixed()
      .nullable()
      .test('fileSize', 'Le fichier est trop volumineux (max 2MB)', value => {
        if (!value || typeof value === 'string') return true;
        return value.size <= 2048 * 1024;
      })
      .test('fileType', 'Format de fichier non supporté', value => {
        if (!value || typeof value === 'string') return true;
        return ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'].includes(value.type);
      }),
  });



  const handleSubmit = async (values, { setSubmitting, resetForm, setStatus }) => {
    try {
      // Nettoyer les erreurs précédentes
      setStatus(null);
      
      const formattedData = {
        cin: values.cin,
        rib: values.rib,
        sex: values.sex,
        dateEmbauche: values.dateEmbauche,
        fonction:values.fonction,
        date_naissance: values.date_naissance ,
        situationFamiliale: values.situationFamiliale,
        nbEnfants: values.nbEnfants,
        adresse: values.adresse,
        name: values.name,
        prenom: values.prenom,
        information_supplementaire: values.information_supplementaire || null,
  information_supplementaire2: values.information_supplementaire2 || null,
        tel: values.tel,
        email: values.email,
        ...(values.password ? { password: values.password } : {}),
        role: isEdit ? (values.role || initialValues.role) : values.role,
        typeContrat: values.typeContrat,
        statut: isEdit ? values.statut : 'Actif',
        departement_id: values.departement_id ? parseInt(values.departement_id, 10) : null,
        societe_id: values.societe_id ? parseInt(values.societe_id, 10) : null,
        date_sortie: values.date_sortie || null,
        cnss: values.cnss || null,
        solde_conge: values.solde_conge !== '' ? values.solde_conge : null,
      };
  console.log('Valeur de date_naissance:', formattedData);
      if (isEdit) {
        if (values.picture && values.picture instanceof File) {
          formattedData.picture = values.picture;
        } else if (values.picture === null) {
          formattedData.picture = null;
        }
      } else {
        if (values.picture) {
          formattedData.picture = values.picture;
        }
      }
  
      let response;
      
      if (isEdit) {
        response = await dispatch(updateUser({ id: initialValues.id, ...formattedData })).unwrap();
      } else {
        response = await dispatch(createUser(formattedData)).unwrap();
      }
  
      Swal.fire({
        icon: 'success',
        title: isEdit ? 'Utilisateur modifié avec succès' : 'Utilisateur ajouté avec succès',
        timer: 2000,
        showConfirmButton: false,
      });

      // Réinitialiser le formulaire après succès pour éviter les problèmes DOM
      setTimeout(() => {
        resetForm();
        if (onSuccess) {
          dispatch(fetchUsers());
          onSuccess();
        }
      }, 100);
  
    } catch (error) {
      console.error('Error submitting form:', error);
  
      let errorMessage = 'Une erreur est survenue lors de l\'opération.';
  
      if (error?.payload?.message) {
        errorMessage = error.payload.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
  
      Swal.fire({
        icon: 'error',
        title: 'Erreur de soumission',
        text: errorMessage,
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33',
      });
  
    } finally {
      setSubmitting(false);
    }
  };
  


  // Add a function to normalize the role value
  const normalizeRole = (role) => {
    if (!role) return '';
    
    // Map of possible role variations to their standardized form
    const roleMap = {
      'CHEF_DEP': 'Chef_Dep',
      'chef_dep': 'Chef_Dep',
      'Chef_Département': 'Chef_Dep',
      'EMPLOYE': 'Employe',
      'employe': 'Employe',
      'RH': 'RH',
      'rh': 'RH',
      'CHEF_PROJET': 'Chef_Projet',
      'chef_projet': 'Chef_Projet',
      'CHEF_CHANT': 'Chef_Chant',
      'chef_chant': 'Chef_Chant',
      'GEST_RH': 'Gest_RH',
      'gest_rh': 'Gest_RH',
      'GEST_PROJET': 'Gest_Projet',
      'gest_projet': 'Gest_Projet'
    };
    
    // Return standardized form if found, otherwise return original role
    return roleMap[role.toUpperCase()] || role;
  };

  return (
    <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <div className="container-fluid px-4">
        {/* En-tête */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="card-body p-4" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <div className="d-flex align-items-center gap-3">
                  <div className="p-3 rounded-circle bg-white bg-opacity-20">
                    <Icon icon={isEdit ? "fluent:person-edit-24-filled" : "fluent:person-add-24-filled"} style={{ fontSize: '2rem' }} />
                  </div>
                  <div>
                    <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>
                      {isEdit ? 'Modifier l\'employé' : 'Ajouter un employé'}
                    </h1>
                    <p className="mb-0 opacity-90">
                      {isEdit ? 'Modifiez les informations de l\'employé' : 'Saisissez les informations du nouvel employé'}
                    </p>
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
              <div className="card-body p-4">
                <Formik
                  key={`user-form-${isEdit ? initialValues.id : 'new'}-${Date.now()}`}
                  initialValues={{
                    cin: '',
                    sex: '',
                    dateEmbauche: '',      
                    fonction:'',   
                    date_naissance: '',
                    rib: '',
                    situationFamiliale: 'Célibataire',
                    nbEnfants: 0,
                    adresse: '',
                    name: '',
                    prenom: '',
                    tel: '',
                    email: '',
                    information_supplementaire: '',
                    information_supplementaire2: '',
                    password: undefined,
                    role: isEdit ? normalizeRole(initialValues.role) : 'Employe',
                    typeContrat: 'Permanent',
                    statut: 'Actif',
                    departement_id: '',
                    picture: null,
                    date_sortie: '',
                    cnss: '',
                    solde_conge: '',
                    ...initialValues
                  }}
                  validationSchema={validationSchema}
                  onSubmit={handleSubmit}
                  enableReinitialize={true}
                >
                  {({ isSubmitting, setFieldValue }) => (
                    <Form className="space-y-4">
                      {/* Informations personnelles */}
                      <div className="mb-4">
                        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                          <Icon icon="fluent:person-24-filled" className="text-primary" />
                          Informations personnelles
                        </h5>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="name" className="form-label fw-semibold">
                                <Icon icon="fluent:text-align-left-24-filled" className="me-1" />
                                Nom
                              </label>
                              <Field
                                type="text"
                                name="name"
                                id="name"
                                className="form-control rounded-3"
                                placeholder="Entrez le nom"
                              />
                              <ErrorMessage name="name" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="prenom" className="form-label fw-semibold">
                                <Icon icon="fluent:text-align-left-24-filled" className="me-1" />
                                Prénom
                              </label>
                              <Field
                                type="text"
                                name="prenom"
                                id="prenom"
                                className="form-control rounded-3"
                                placeholder="Entrez le prénom"
                              />
                              <ErrorMessage name="prenom" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                        </div>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="cin" className="form-label fw-semibold">
                                <Icon icon="fluent:card-24-filled" className="me-1" />
                                CIN
                              </label>
                              <Field
                                type="text"
                                name="cin"
                                id="cin"
                                className="form-control rounded-3"
                                placeholder="Entrez le CIN"
                              />
                              <ErrorMessage name="cin" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="rib" className="form-label fw-semibold">
                                <Icon icon="fluent:credit-card-24-filled" className="me-1" />
                                RIB
                              </label>
                              <Field
                                type="text"
                                name="rib"
                                id="rib"
                                className="form-control rounded-3"
                                placeholder="Entrez le RIB"
                              />
                              <ErrorMessage name="rib" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                        </div>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="sex" className="form-label fw-semibold">
                                <Icon icon="fluent:person-circle-24-filled" className="me-1" />
                                Sexe
                              </label>
                              <Field as="select" name="sex" id="sex" className="form-select rounded-3">
                                <option value="">Sélectionner le sexe</option>
                                <option value="H">Homme</option>
                                <option value="F">Femme</option>
                              </Field>
                              <ErrorMessage name="sex" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="date_naissance" className="form-label fw-semibold">
                                <Icon icon="fluent:calendar-24-filled" className="me-1" />
                                Date de Naissance
                              </label>
                              <Field
                                type="date"
                                name="date_naissance"
                                id="date_naissance"
                                className="form-control rounded-3"
                                key="date_naissance-field"
                              />
                              <ErrorMessage name="date_naissance" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Informations familiales */}
                      <div className="mb-4">
                        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                          <Icon icon="fluent:people-24-filled" className="text-success" />
                          Informations familiales
                        </h5>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="situationFamiliale" className="form-label fw-semibold">
                                <Icon icon="fluent:heart-24-filled" className="me-1" />
                                Situation Familiale
                              </label>
                              <Field
                                as="select"
                                name="situationFamiliale"
                                id="situationFamiliale"
                                className="form-select rounded-3"
                              >
                                <option value="Célibataire">Célibataire</option>
                                <option value="Marié">Marié</option>
                                <option value="Divorcé">Divorcé</option>
                              </Field>
                              <ErrorMessage name="situationFamiliale" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="nbEnfants" className="form-label fw-semibold">
                                <Icon icon="fluent:people-community-24-filled" className="me-1" />
                                Nombre d'enfants
                              </label>
                              <Field
                                type="number"
                                name="nbEnfants"
                                id="nbEnfants"
                                className="form-control rounded-3"
                                placeholder="0"
                              />
                              <ErrorMessage name="nbEnfants" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                        </div>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="adresse" className="form-label fw-semibold">
                                <Icon icon="fluent:location-24-filled" className="me-1" />
                                Adresse
                              </label>
                              <Field
                                type="text"
                                name="adresse"
                                id="adresse"
                                className="form-control rounded-3"
                                placeholder="Entrez l'adresse"
                              />
                              <ErrorMessage name="adresse" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="tel" className="form-label fw-semibold">
                                <Icon icon="fluent:phone-24-filled" className="me-1" />
                                Téléphone
                              </label>
                              <Field
                                type="text"
                                name="tel"
                                id="tel"
                                className="form-control rounded-3"
                                placeholder="Entrez le numéro de téléphone"
                              />
                              <ErrorMessage name="tel" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Informations professionnelles */}
                      <div className="mb-4">
                        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                          <Icon icon="fluent:briefcase-24-filled" className="text-warning" />
                          Informations professionnelles
                        </h5>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="email" className="form-label fw-semibold">
                                <Icon icon="fluent:mail-24-filled" className="me-1" />
                                Email
                              </label>
                              <Field
                                type="email"
                                name="email"
                                id="email"
                                className="form-control rounded-3"
                                placeholder="exemple@email.com"
                              />
                              <ErrorMessage name="email" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="fonction" className="form-label fw-semibold">
                                <Icon icon="fluent:person-star-24-filled" className="me-1" />
                                Fonction
                              </label>
                              <Field
                                type="text"
                                name="fonction"
                                id="fonction"
                                className="form-control rounded-3"
                                placeholder="Entrez la fonction"
                              />
                              <ErrorMessage name="fonction" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                        </div>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="dateEmbauche" className="form-label fw-semibold">
                                <Icon icon="fluent:calendar-add-24-filled" className="me-1" />
                                Date d'embauche
                              </label>
                              <Field
                                type="date"
                                name="dateEmbauche"
                                id="dateEmbauche"
                                className="form-control rounded-3"
                                key="dateEmbauche-field"
                              />
                              <ErrorMessage name="dateEmbauche" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="date_sortie" className="form-label fw-semibold">
                                <Icon icon="fluent:calendar-cancel-24-filled" className="me-1" />
                                Date de Sortie
                              </label>
                              <Field 
                                type="date" 
                                name="date_sortie" 
                                id="date_sortie" 
                                className="form-control rounded-3"
                                key="date_sortie-field"
                              />
                              <ErrorMessage name="date_sortie" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                        </div>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="cnss" className="form-label fw-semibold">
                                <Icon icon="fluent:shield-24-filled" className="me-1" />
                                Numéro CNSS
                              </label>
                              <Field type="text" name="cnss" id="cnss" className="form-control rounded-3" placeholder="Entrez le numéro CNSS" />
                              <ErrorMessage name="cnss" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="solde_conge" className="form-label fw-semibold">
                                <Icon icon="fluent:calendar-clock-24-filled" className="me-1" />
                                Solde Congé (jours)
                              </label>
                              <Field type="number" name="solde_conge" id="solde_conge" className="form-control rounded-3" placeholder="Nombre de jours" />
                              <ErrorMessage name="solde_conge" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Informations système */}
                      <div className="mb-4">
                        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                          <Icon icon="fluent:settings-24-filled" className="text-info" />
                          Informations système
                        </h5>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="role" className="form-label fw-semibold">
                                <Icon icon="fluent:person-star-24-filled" className="me-1" />
                                Rôle
                              </label>
                              <Field
                                as="select"
                                name="role"
                                id="role"
                                className="form-select rounded-3"
                                key="role-field"
                              >
                                <option value="">Sélectionner un rôle</option>
                                <option value="Employe">Employé</option>
                                <option value="Chef_Dep">Chef de Département</option>
                                <option value="Chef_Chant">Chef de Chantier</option>
                                <option value="Chef_Projet">Chef de Projet</option>
                                <option value="Gest_RH">Gestionnaire RH</option>
                                <option value="Gest_Projet">Gestionnaire de Projet</option>
                                {userRoles.includes('RH') && (
                                  <option value="RH">RH</option>
                                )}
                              </Field>
                              <ErrorMessage name="role" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="typeContrat" className="form-label fw-semibold">
                                <Icon icon="fluent:document-text-24-filled" className="me-1" />
                                Type de Contrat
                              </label>
                              <Field
                                as="select"
                                name="typeContrat"
                                id="typeContrat"
                                className="form-select rounded-3"
                              >
                                <option value="Permanent">Permanent</option>
                                <option value="Temporaire">Temporaire</option>
                              </Field>
                              <ErrorMessage name="typeContrat" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                        </div>
                        {isEdit && (
                          <div className="row">
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label htmlFor="statut" className="form-label fw-semibold">
                                  <Icon icon="fluent:status-24-filled" className="me-1" />
                                  Statut
                                </label>
                                <Field
                                  as="select"
                                  name="statut"
                                  id="statut"
                                  className="form-select rounded-3"
                                >
                                  <option value="Actif">Actif</option>
                                  <option value="Inactif">Inactif</option>
                                  <option value="Congé">Congé</option>
                                  <option value="Malade">Malade</option>
                                </Field>
                                <ErrorMessage name="statut" component="div" className="text-danger small mt-1" />
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="departement_id" className="form-label fw-semibold">
                                <Icon icon="fluent:building-24-filled" className="me-1" />
                                Département
                              </label>
                              <Field
                                as="select"
                                name="departement_id"
                                id="departement_id"
                                className="form-select rounded-3"
                                key="departement_id-field"
                              >
                                <option value="">Sélectionner un département</option>
                                {departments.map(dept => (
                                  <option key={dept.id} value={dept.id}>{dept.nom}</option>
                                ))}
                              </Field>
                              <ErrorMessage name="departement_id" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="societe_id" className="form-label fw-semibold">
                                <Icon icon="fluent:organization-24-filled" className="me-1" />
                                Société
                              </label>
                              <Field
                                as="select"
                                name="societe_id"
                                id="societe_id"
                                className="form-select rounded-3"
                                key="societe_id-field"
                              >
                                <option value="">Sélectionner une société</option>
                                {societes.map(soc => (
                                  <option key={soc.id} value={soc.id}>{soc.nom}</option>
                                ))}
                              </Field>
                              <ErrorMessage name="societe_id" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sécurité */}
                      <div className="mb-4">
                        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                          <Icon icon="fluent:shield-lock-24-filled" className="text-danger" />
                          Sécurité
                        </h5>
                        {!isEdit && (
                          <div className="mb-3">
                            <label htmlFor="password" className="form-label fw-semibold">
                              <Icon icon="fluent:password-24-filled" className="me-1" />
                              Mot de passe
                            </label>
                            <Field type="password" name="password" className="form-control rounded-3" placeholder="Entrez le mot de passe" />
                            <ErrorMessage name="password" component="div" className="text-danger small mt-1" />
                          </div>
                        )}
                        {isEdit && (
                          <div className="mb-3">
                            <label htmlFor="password" className="form-label fw-semibold">
                              <Icon icon="fluent:password-24-filled" className="me-1" />
                              Nouveau mot de passe (laisser vide si inchangé)
                            </label>
                            <Field type="password" name="password" className="form-control rounded-3" placeholder="Nouveau mot de passe" />
                            <ErrorMessage name="password" component="div" className="text-danger small mt-1" />
                          </div>
                        )}
                      </div>

                      {/* Informations supplémentaires */}
                      <div className="mb-4">
                        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                          <Icon icon="fluent:document-add-24-filled" className="text-secondary" />
                          Informations supplémentaires
                        </h5>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="information_supplementaire" className="form-label fw-semibold">
                                <Icon icon="fluent:note-24-filled" className="me-1" />
                                Information supplémentaire
                              </label>
                              <Field
                                as="textarea"
                                name="information_supplementaire"
                                id="information_supplementaire"
                                className="form-control rounded-3"
                                rows={3}
                                placeholder="Informations supplémentaires..."
                              />
                              <ErrorMessage name="information_supplementaire" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor="information_supplementaire2" className="form-label fw-semibold">
                                <Icon icon="fluent:note-24-filled" className="me-1" />
                                Information supplémentaire 2
                              </label>
                              <Field
                                as="textarea"
                                name="information_supplementaire2"
                                id="information_supplementaire2"
                                className="form-control rounded-3"
                                rows={3}
                                placeholder="Autres informations..."
                              />
                              <ErrorMessage name="information_supplementaire2" component="div" className="text-danger small mt-1" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Photo de profil */}
                      <div className="mb-4">
                        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                          <Icon icon="fluent:image-24-filled" className="text-primary" />
                          Photo de profil
                        </h5>
                        <div className="mb-3">
                          <label htmlFor="picture" className="form-label fw-semibold">
                            <Icon icon="fluent:camera-24-filled" className="me-1" />
                            Photo de Profil
                          </label>
                          <input
                            type="file"
                            name="picture"
                            id="picture"
                            className="form-control rounded-3"
                            onChange={(event) => {
                              setFieldValue("picture", event.currentTarget.files[0]);
                            }}
                          />
                          <ErrorMessage name="picture" component="div" className="text-danger small mt-1" />
                          <small className="text-muted">Formats acceptés: JPG, PNG, GIF (max 2MB)</small>
                        </div>
                      </div>

                      {/* Boutons d'action */}
                      <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                        <button
                          type="submit"
                          className="btn btn-primary btn-lg d-flex align-items-center gap-2"
                          disabled={isSubmitting || status === 'loading'}
                        >
                          {isSubmitting || status === 'loading' ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            <Icon icon={isEdit ? "fluent:checkmark-24-filled" : "fluent:add-24-filled"} />
                          )}
                          {isEdit ? 'Modifier' : 'Ajouter'}
                        </button>
                      </div>
                    </Form>
                  )}
                </Formik>
              </div>
            </div>
          </div>
        </div>

        {/* CSS pour les animations */}
        <style jsx>{`
          .card {
            transition: all 0.3s ease;
          }
          .form-control:focus, .form-select:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
          }
          .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
          }
          .btn-primary:hover {
            background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
            transform: translateY(-1px);
          }
        `}</style>
      </div>
    </div>
  );
};

export default UserForm;