import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchClients, deleteClients } from '../Redux/Slices/clientsSlice';
import { Icon } from '@iconify/react/dist/iconify.js';
import Swal from 'sweetalert2';
import api from '../config/axios';

const ClientsListPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: clients, meta, status, error } = useSelector((s) => s.clients);
  const roles = useSelector((s) => s.auth.roles || []);
  const canManage = roles.includes('RH') || roles.includes('Gest_RH');

  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // default 10 per user request

  useEffect(() => { dispatch(fetchClients({ page: currentPage, perPage: itemsPerPage, search })); }, [dispatch, currentPage, itemsPerPage, search]);

  const filtered = clients.filter(c => {
    const term = search.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(term) ||
      (c.prenom || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.rc || '').toLowerCase().includes(term) ||
      (c.ice || '').toLowerCase().includes(term) ||
      (c.raison_sociale || '').toLowerCase().includes(term)
    );
  });

  // Server returns already paginated slice, keep client filters for search (still sent server-side too)
  const currentItems = filtered;
  const totalPages = meta?.last_page || 1;

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const result = await Swal.fire({
      title: 'Confirmer suppression',
      text: `Supprimer ${selectedIds.length} client(s) ?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Oui', cancelButtonText: 'Annuler'
    });
    if (result.isConfirmed) {
      try {
        await dispatch(deleteClients(selectedIds)).unwrap();
        setSelectedIds([]);
        Swal.fire('Supprimé', 'Clients supprimés', 'success');
      } catch (e) { Swal.fire('Erreur', 'Suppression échouée', 'error'); }
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData(); form.append('file', file);
    try {
      await api.post('/import-clients', form); // Placeholder if future import route
      Swal.fire('Import', 'Fichier importé (endpoint à implémenter)', 'info');
    } catch (err) { Swal.fire('Erreur', 'Import non disponible', 'error'); }
  };

  if (status === 'loading') {
    return <div className='container-fluid py-4'><div className='text-center py-5'><div className='spinner-border text-primary' /><p className='mt-3'>Chargement des clients...</p></div></div>;
  }

  return (
    <div className='container-fluid py-4' style={{ background: 'linear-gradient(135deg,#f5f7fa,#c3cfe2)', minHeight: '100vh' }}>
      <div className='container-fluid px-4'>
        <div className='row mb-4'>
          <div className='col-12'>
            <div className='card border-0 shadow-lg rounded-4 overflow-hidden'>
              <div className='card-body p-4' style={{ background: 'linear-gradient(135deg,#5a9bd4,#726bda)', color: 'white' }}>
                <div className='d-flex justify-content-between align-items-center'>
                  <div className='d-flex align-items-center gap-3'>
                    <div className='p-3 rounded-circle bg-white bg-opacity-25'>
                      <Icon icon='fluent:person-briefcase-24-filled' style={{ fontSize: '2rem' }} />
                    </div>
                    <div>
                      <h1 className='fw-bold mb-1' style={{ fontSize: 'clamp(1.3rem,4vw,2rem)' }}>Gestion des Clients</h1>
                      <p className='mb-0 opacity-90'>Liste et gestion des clients</p>
                    </div>
                  </div>
                  {canManage && (
                    <div className='d-flex flex-wrap gap-2'>
                      <Link to='/clients/add' className='btn btn-light d-flex align-items-center gap-2'>
                        <Icon icon='fluent:person-add-24-filled' /> Nouveau
                      </Link>
                      {selectedIds.length > 0 && (
                        <button className='btn btn-outline-light d-flex align-items-center gap-2' onClick={handleBulkDelete}>
                          <Icon icon='fluent:delete-24-filled' /> Supprimer ({selectedIds.length})
                        </button>
                      )}
                      <button className='btn btn-outline-light d-flex align-items-center gap-2' onClick={() => document.getElementById('clientImport').click()}>
                        <Icon icon='fluent:arrow-upload-24-filled' /> Importer
                      </button>
                      <input id='clientImport' type='file' className='d-none' accept='.xlsx,.xls,.csv' onChange={handleImport} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='row mb-3'>
          <div className='col-12'>
            <div className='card border-0 shadow-sm rounded-4'>
              <div className='card-body p-3'>
                <div className='row g-3'>
                  <div className='col-md-4'>
                    <div className='position-relative'>
                      <Icon icon='fluent:search-24-filled' className='position-absolute start-0 top-50 translate-middle-y ms-3 text-secondary' />
                      <input className='form-control ps-5' placeholder='Rechercher...' value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
                    </div>
                  </div>
                  <div className='col-md-2'>
                    <select className='form-select' value={itemsPerPage} onChange={(e)=>{ const v=e.target.value==='all'?(meta?.total||50):parseInt(e.target.value); setItemsPerPage(v); setCurrentPage(1); }}>
                      <option value='5'>5</option>
                      <option value='10'>10</option>
                      <option value='25'>25</option>
                      <option value='50'>50</option>
                      <option value='all'>Tous</option>
                    </select>
                  </div>
                  <div className='col-md-2'>
                    <button className='btn btn-outline-danger w-100' onClick={()=>{ setSearch(''); setItemsPerPage(10); setCurrentPage(1); setSelectedIds([]); }}>
                      <Icon icon='fluent:arrow-reset-24-filled' />
                    </button>
                  </div>
                  {error && <div className='col-12'><div className='alert alert-danger py-2 mb-0'>Erreur: {error?.message || 'Chargement clients'}</div></div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='row'>
          <div className='col-12'>
            <div className='card border-0 shadow-lg rounded-4'>
              <div className='card-body p-4'>
                <h5 className='fw-bold mb-3'>Clients ({currentItems.length}{meta?.total?` / ${meta.total}`:''})</h5>
                <div className='table-responsive'>
                  <table className='table table-hover align-middle'>
                    <thead className='table-light'>
                      <tr>
                        <th><input type='checkbox' checked={selectedIds.length===currentItems.length && currentItems.length>0} onChange={()=>{ if(selectedIds.length===currentItems.length){ setSelectedIds([]);} else { setSelectedIds(currentItems.map(c=>c.id)); } }} /></th>
                        <th>Client</th>
                        <th>Email</th>
                        <th>Raison sociale</th>
                        <th>RC</th>
                        <th>ICE</th>
                        <th>Statut</th>
                        {canManage && <th className='text-center'>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map(c => (
                        <tr key={c.id}>
                          <td><input type='checkbox' checked={selectedIds.includes(c.id)} onChange={()=>toggleSelect(c.id)} /></td>
                          <td className='fw-semibold'>{c.name} {c.prenom}</td>
                          <td>{c.email}</td>
                          <td>{c.raison_sociale || '—'}</td>
                          <td>{c.rc || '—'}</td>
                          <td>{c.ice || '—'}</td>
                          <td><span className={`badge ${c.statut==='Actif'?'bg-success':'bg-secondary'}`}>{c.statut}</span></td>
                          {canManage && (
                            <td className='text-center'>
                              <div className='d-flex justify-content-center gap-2'>
                                <button className='btn p-0 border-0' style={{ width:32,height:32,borderRadius:'50%',background:'#e3f2fd'}} onClick={()=>navigate(`/clients/${c.id}/edit`)}>
                                  <Icon icon='lucide:edit' style={{ fontSize:14,color:'#1976d2'}} />
                                </button>
                                <button className='btn p-0 border-0' style={{ width:32,height:32,borderRadius:'50%',background:'#ffebee'}} onClick={async()=>{
                                  const r = await Swal.fire({ title:'Supprimer?', text:'Action irréversible', icon:'warning', showCancelButton:true });
                                  if(r.isConfirmed){ await dispatch(deleteClients([c.id])); }
                                }}>
                                  <Icon icon='mingcute:delete-2-line' style={{ fontSize:14,color:'#d32f2f'}} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filtered.length===0 && <div className='text-center py-5 text-muted'>Aucun client trouvé</div>}
                <div className='d-flex justify-content-between align-items-center mt-3'>
                  <div className='d-flex align-items-center gap-2'>
                    <span className='text-muted'>Page {currentPage}/{totalPages} {meta?.total?`(Total: ${meta.total})`:''}</span>
                  </div>
                  <div className='d-flex gap-2'>
                    <button className='btn btn-sm btn-outline-secondary' disabled={currentPage===1} onClick={()=>setCurrentPage(p=>p-1)}>Précédent</button>
                    <button className='btn btn-sm btn-outline-secondary' disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>p+1)}>Suivant</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ClientsListPage;
