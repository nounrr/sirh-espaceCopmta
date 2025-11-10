import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { createClient, updateClient, fetchClients } from '../Redux/Slices/clientsSlice';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import Swal from 'sweetalert2';
import { Icon } from '@iconify/react/dist/iconify.js';
import api from '../config/axios';
import { API_ENDPOINTS } from '../config/api';

// Validation: include most fields as optional; business identifiers typed correctly
const schema = Yup.object({
  name: Yup.string().required('Nom requis'),
  email: Yup.string().email('Email invalide').required('Email requis'),
  raison_sociale: Yup.string().nullable(),
  rc: Yup.string().nullable(),
  ice: Yup.string().nullable(),
  identifiant_fiscale: Yup.string().nullable(),
  domaine_activite: Yup.string().nullable(),
  revenu_mensuel_net: Yup.number().typeError('Nombre invalide').nullable(),
  chiffre_affaires_dernier_ex: Yup.number().typeError('Nombre invalide').nullable(),
  exercice_annee: Yup.number().integer('Année invalide').min(1900).max(3000).nullable(),
  forme_juridique: Yup.string().nullable(),
  date_creation: Yup.date().nullable(),
  capital_social: Yup.number().typeError('Nombre invalide').nullable(),
  associes: Yup.string().nullable(),
  statut_juridique: Yup.string().nullable(),
  regime_fiscal: Yup.string().nullable(),
  date_debut_collaboration: Yup.date().nullable(),
  type_mission: Yup.string().nullable(),
  representant: Yup.string().nullable(),
  montant_total: Yup.number().typeError('Nombre invalide').nullable(),
  // Contact / divers
  tel: Yup.string().nullable(),
  adresse: Yup.string().nullable(),
  cin: Yup.string().nullable(),
  rib: Yup.string().nullable(),
  // Pour clients: uniquement Actif / Inactif
  statut: Yup.string().oneOf(['Actif','Inactif']).nullable(),
});

const ClientFormPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { items: clients } = useSelector(s => s.clients);
  const [fetched, setFetched] = useState(null);
  const existing = isEdit ? (clients.find(c => c.id === parseInt(id)) || fetched) : null;

  // helper to format any date-like value to yyyy-MM-dd
  const toDateInput = (v) => {
    if (!v) return '';
    try {
      if (typeof v === 'string') return v.substring(0, 10);
      if (v instanceof Date && !isNaN(v)) return v.toISOString().substring(0, 10);
      return '';
    } catch { return ''; }
  };

  const initial = existing ? {
    // Base
    name: existing.name || '', email: existing.email || '', tel: existing.tel || '', adresse: existing.adresse || '', cin: existing.cin || '', rib: existing.rib || '',
    statut: existing.statut || 'Actif', typeContrat: 'Client',
    // Identité société
    raison_sociale: existing.raison_sociale || '', rc: existing.rc || '', ice: existing.ice || '', identifiant_fiscale: existing.identifiant_fiscale || '', domaine_activite: existing.domaine_activite || '',
    // Financier / légal
    revenu_mensuel_net: existing.revenu_mensuel_net ?? '', chiffre_affaires_dernier_ex: existing.chiffre_affaires_dernier_ex ?? '', exercice_annee: existing.exercice_annee ?? '', forme_juridique: existing.forme_juridique || '',
    date_creation: toDateInput(existing.date_creation), capital_social: existing.capital_social ?? '', associes: existing.associes || '', statut_juridique: existing.statut_juridique || '', regime_fiscal: existing.regime_fiscal || '',
    // Collaboration
    date_debut_collaboration: toDateInput(existing.date_debut_collaboration), type_mission: existing.type_mission || '', representant: existing.representant || '', montant_total: existing.montant_total ?? '',
    // Sortie
    date_sortie: toDateInput(existing.date_sortie),
  } : {
    // Base
    name: '', email: '', tel: '', adresse: '', cin: '', rib: '',
    statut: 'Actif', typeContrat: 'Client',
    // Identité société
    raison_sociale: '', rc: '', ice: '', identifiant_fiscale: '', domaine_activite: '',
    // Financier / légal
    revenu_mensuel_net: '', chiffre_affaires_dernier_ex: '', exercice_annee: '', forme_juridique: '',
    date_creation: '', capital_social: '', associes: '', statut_juridique: '', regime_fiscal: '',
    // Collaboration
    date_debut_collaboration: '', type_mission: '', representant: '', montant_total: '',
    // Sortie
    date_sortie: '',
    // Fixed contract type
    // typeContrat stays 'Client'
  };

  // If opening edit page directly, fetch the client data when not in store
  useEffect(() => {
    const run = async () => {
      if (isEdit && !clients.find(c => c.id === parseInt(id))) {
        try {
          const res = await api.get(API_ENDPOINTS.CLIENTS.BY_ID(id));
          setFetched(res.data);
        } catch (e) {
          Swal.fire('Erreur', 'Impossible de charger le client', 'error');
        }
      }
    };
    run();
  }, [isEdit, id, clients]);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      const payload = { ...values, typeContrat: 'Client' };
      if (isEdit) {
        await dispatch(updateClient({ id: existing.id, ...payload })).unwrap();
        Swal.fire('Succès','Client mis à jour','success');
      } else {
        await dispatch(createClient(payload)).unwrap();
        Swal.fire('Succès','Client créé','success');
      }
      await dispatch(fetchClients());
      navigate('/clients');
    } catch (e) {
      Swal.fire('Erreur', e?.message || 'Opération échouée','error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className='container-fluid py-4' style={{ background:'linear-gradient(135deg,#f5f7fa,#c3cfe2)', minHeight:'100vh' }}>
      <div className='container-fluid px-4'>
        {/* En-tête */}
        <div className='row mb-4'>
          <div className='col-12'>
            <div className='card border-0 shadow-lg rounded-4 overflow-hidden'>
              <div className='card-body p-4' style={{ background:'linear-gradient(135deg,#5a9bd4,#726bda)', color:'white' }}>
                <div className='d-flex align-items-center gap-3'>
                  <div className='p-3 rounded-circle bg-white bg-opacity-25'>
                    <Icon icon={isEdit? 'fluent:person-edit-24-filled':'fluent:person-add-24-filled'} style={{ fontSize:'2rem' }} />
                  </div>
                  <div>
                    <h1 className='fw-bold mb-1' style={{ fontSize:'clamp(1.3rem,4vw,2rem)' }}>{isEdit?'Modifier le client':'Ajouter un client'}</h1>
                    <p className='mb-0 opacity-90'>{isEdit?'Mettre à jour les informations du client':'Créer un nouveau client'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className='row'>
          <div className='col-12'>
            <div className='card border-0 shadow-lg rounded-4'>
              <div className='card-body p-4'>
                <Formik initialValues={initial} validationSchema={schema} onSubmit={handleSubmit} enableReinitialize>
                  {({ isSubmitting, values, setFieldValue }) => (
                    <Form className='space-y-4'>
                      {/* Identité du client */}
                      <div className='mb-4'>
                        <h5 className='fw-bold mb-3 d-flex align-items-center gap-2'>
                          <Icon icon='fluent:person-24-filled' className='text-primary' />
                          Identité du client
                        </h5>
                        <div className='row'>
                          <div className='col-md-6 mb-3'>
                            <label className='form-label fw-semibold'>Nom Societe</label>
                            <Field name='name' className='form-control rounded-3' />
                            <ErrorMessage name='name' component='div' className='text-danger small mt-1' />
                          </div>
                          <div className='col-md-6 mb-3'>
                            <label className='form-label fw-semibold'>Email</label>
                            <Field type='email' name='email' className='form-control rounded-3' />
                            <ErrorMessage name='email' component='div' className='text-danger small mt-1' />
                          </div>
                        </div>
                        <div className='row'>
                          <div className='col-md-6 mb-3'>
                            <label className='form-label fw-semibold'>Téléphone</label>
                            <Field name='tel' className='form-control rounded-3' />
                          </div>
                          <div className='col-md-6 mb-3'>
                            <label className='form-label fw-semibold'>Adresse</label>
                            <Field name='adresse' className='form-control rounded-3' />
                          </div>
                        </div>
                      </div>

                      {/* Informations entreprise */}
                      <div className='mb-4'>
                        <h5 className='fw-bold mb-3 d-flex align-items-center gap-2'>
                          <Icon icon='fluent:building-24-filled' className='text-success' />
                          Informations entreprise
                        </h5>
                        <div className='row'>
                          <div className='col-md-6 mb-3'>
                            <label className='form-label fw-semibold'>Raison sociale</label>
                            <Field name='raison_sociale' className='form-control rounded-3' />
                          </div>
                          <div className='col-md-3 mb-3'>
                            <label className='form-label fw-semibold'>RC</label>
                            <Field name='rc' className='form-control rounded-3' />
                          </div>
                          <div className='col-md-3 mb-3'>
                            <label className='form-label fw-semibold'>ICE</label>
                            <Field name='ice' className='form-control rounded-3' />
                          </div>
                        </div>
                        <div className='row'>
                          <div className='col-md-4 mb-3'>
                            <label className='form-label fw-semibold'>Identifiant fiscal</label>
                            <Field name='identifiant_fiscale' className='form-control rounded-3' />
                          </div>
                          <div className='col-md-4 mb-3'>
                            <label className='form-label fw-semibold'>Domaine d'activité</label>
                            <Field name='domaine_activite' className='form-control rounded-3' />
                          </div>
                          <div className='col-md-4 mb-3'>
                            <label className='form-label fw-semibold'>Forme juridique</label>
                            <Field name='forme_juridique' className='form-control rounded-3' />
                          </div>
                        </div>
                        <div className='row'>
                          <div className='col-md-4 mb-3'>
                            <label className='form-label fw-semibold'>Date de création</label>
                            <Field type='date' name='date_creation' className='form-control rounded-3' />
                          </div>
                          <div className='col-md-4 mb-3'>
                            <label className='form-label fw-semibold'>Capital social</label>
                            <Field name='capital_social' className='form-control rounded-3' />
                          </div>
                          <div className='col-md-4 mb-3'>
                            <label className='form-label fw-semibold'>Exercice (année)</label>
                            <Field name='exercice_annee' className='form-control rounded-3' />
                          </div>
                        </div>
                        <div className='row'>
                          <div className='col-md-6 mb-3'>
                            <label className='form-label fw-semibold'>Associés</label>
                            <Field as='textarea' name='associes' rows={2} className='form-control rounded-3' />
                          </div>
                          <div className='col-md-3 mb-3'>
                            <label className='form-label fw-semibold'>Statut juridique</label>
                            <Field name='statut_juridique' className='form-control rounded-3' />
                          </div>
                          <div className='col-md-3 mb-3'>
                            <label className='form-label fw-semibold'>Régime fiscal</label>
                            <Field name='regime_fiscal' className='form-control rounded-3' />
                          </div>
                        </div>
                        <div className='row'>
                          <div className='col-md-6 mb-3'>
                            <label className='form-label fw-semibold'>Revenu mensuel net</label>
                            <Field name='revenu_mensuel_net' className='form-control rounded-3' />
                          </div>
                          <div className='col-md-6 mb-3'>
                            <label className='form-label fw-semibold'>CA dernier exercice</label>
                            <Field name='chiffre_affaires_dernier_ex' className='form-control rounded-3' />
                          </div>
                        </div>
                      </div>

                      {/* Collaboration */}
                      <div className='mb-4'>
                        <h5 className='fw-bold mb-3 d-flex align-items-center gap-2'>
                          <Icon icon='fluent:handshake-24-regular' className='text-warning' />
                          Collaboration
                        </h5>
                        <div className='row'>
                          <div className='col-md-4 mb-3'>
                            <label className='form-label fw-semibold'>Date début collaboration</label>
                            <Field type='date' name='date_debut_collaboration' className='form-control rounded-3' />
                          </div>
                          <div className='col-md-4 mb-3'>
                            <label className='form-label fw-semibold'>Type de mission</label>
                            <Field name='type_mission' className='form-control rounded-3' />
                          </div>
                          <div className='col-md-4 mb-3'>
                            <label className='form-label fw-semibold'>Représentant</label>
                            <Field name='representant' className='form-control rounded-3' />
                          </div>
                        </div>
                        <div className='row'>
                          <div className='col-md-3 mb-3'>
                            <label className='form-label fw-semibold'>Montant total</label>
                            <Field name='montant_total' className='form-control rounded-3' />
                          </div>
                          <div className='col-md-3 mb-3'>
                            <label className='form-label fw-semibold'>Date sortie (si inactif)</label>
                            <Field type='date' name='date_sortie' className='form-control rounded-3' />
                          </div>
                          {/* Type de contrat forcé côté back, champ caché */}
                          <Field type='hidden' name='typeContrat' value='Client' />
                          <div className='col-md-3 mb-3'>
                            <label className='form-label fw-semibold'>Statut</label>
                            <Field as='select' name='statut' className='form-select rounded-3' onChange={(e)=>{
                              const v = e.target.value; setFieldValue('statut', v);
                              if (v === 'Actif') setFieldValue('date_sortie','');
                            }}>
                              <option value='Actif'>Actif</option>
                              <option value='Inactif'>Inactif</option>
                            </Field>
                          </div>
                        </div>
                      </div>

                      {/* Boutons */}
                      <div className='d-flex justify-content-end gap-2 pt-3 border-top'>
                        <button type='submit' className='btn btn-primary btn-lg d-flex align-items-center gap-2' disabled={isSubmitting}>
                          {isSubmitting && <span className='spinner-border spinner-border-sm' />} 
                          {isEdit ? 'Mettre à jour' : 'Créer'}
                        </button>
                        <button type='button' className='btn btn-outline-secondary btn-lg' onClick={()=>navigate('/clients')}>Annuler</button>
                      </div>
                    </Form>
                  )}
                </Formik>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ClientFormPage;
