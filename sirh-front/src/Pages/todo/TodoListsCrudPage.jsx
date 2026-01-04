import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { fetchTodoLists, createTodoList, updateTodoList, deleteTodoList, resetCreationStatus } from '../../Redux/Slices/todoListSlice';
import StyledTable from '../../Components/Common/StyledTable';

const TodoListsCrudPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: lists, loading, creationStatus, creationError } = useSelector((s) => s.todoLists);
  const { items: projects } = useSelector((s) => s.projects);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editProjectId, setEditProjectId] = useState('');

  useEffect(() => {
    dispatch(fetchTodoLists());
  }, [dispatch]);

  useEffect(() => {
    if (creationStatus === 'success') {
      setShowAdd(false);
      setNewTitle('');
      setNewProjectId('');
      dispatch(resetCreationStatus());
    }
  }, [creationStatus, dispatch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lists;
    return lists.filter(l => (l.title || '').toLowerCase().includes(q));
  }, [lists, search]);

  const startEdit = (list) => {
    setEditingId(list.id);
    setEditTitle(list.title || '');
    setEditProjectId(String(list.project_id || ''));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditProjectId('');
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const payload = { title: newTitle.trim() };
    if (newProjectId) payload.project_id = Number(newProjectId);
    await dispatch(createTodoList(payload));
  };

  const submitUpdate = async (id) => {
    if (!editTitle.trim()) return;
    const payload = { id, title: editTitle.trim() };
    if (editProjectId) payload.project_id = Number(editProjectId); else payload.project_id = null;
    await dispatch(updateTodoList(payload));
    cancelEdit();
  };

  const confirmDelete = async (id) => {
    if (window.confirm('Supprimer cette liste ?')) {
      await dispatch(deleteTodoList(id));
    }
  };

  return (
    <div className="container-fluid px-4">
      {/* En-tête */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
            <div className="card-body p-4" style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}>
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-white rounded-circle shadow-sm d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                    <Icon 
                      icon="fluent:checklist-24-filled" 
                      style={{ 
                        fontSize: '2rem', 
                        color: '#667eea'
                      }} 
                    />
                  </div>
                  <div>
                    <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>Listes de Tâches</h1>
                    <p className="mb-0 opacity-90">Gérez vos listes de tâches et catégories</p>
                  </div>
                </div>
                
                <button 
                  className="btn btn-light d-flex align-items-center gap-2 shadow-sm"
                  onClick={() => setShowAdd(s => !s)}
                >
                  <Icon icon={showAdd ? "fluent:dismiss-24-filled" : "fluent:add-circle-24-filled"} className="text-lg" />
                  {showAdd ? "Fermer" : "Nouvelle liste"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire d'ajout */}
      {showAdd && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <h5 className="card-title mb-3 text-primary fw-bold d-flex align-items-center gap-2">
                  <Icon icon="fluent:add-circle-24-filled" />
                  Créer une nouvelle liste
                </h5>
                <form onSubmit={submitCreate}>
                  <div className="row g-3 align-items-end">
                    <div className="col-md-5">
                      <label className="form-label small fw-medium text-secondary">Titre de la liste</label>
                      <input
                        className="form-control"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Ex: Tâches administratives"
                        autoFocus
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-medium text-secondary">Catégorie (Projet)</label>
                      <select className="form-select" value={newProjectId} onChange={(e) => {
                        if (e.target.value === 'NEW_CATEGORY') {
                          navigate('/projets/creer');
                        } else {
                          setNewProjectId(e.target.value);
                        }
                      }}>
                        <option value="">— Aucune —</option>
                        <option value="NEW_CATEGORY" style={{ fontWeight: 'bold', color: '#3b82f6' }}>+ Créer une catégorie</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.titre || p.nom || p.name || `Projet ${p.id}`}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3 d-flex gap-2">
                      <button className="btn btn-primary flex-grow-1 d-flex align-items-center justify-content-center gap-2" type="submit" disabled={loading}>
                        <Icon icon="fluent:checkmark-circle-24-filled" /> Créer
                      </button>
                      <button className="btn btn-light" type="button" onClick={() => setShowAdd(false)}>
                        Annuler
                      </button>
                    </div>
                  </div>
                  {creationError && <div className="alert alert-danger mt-3 mb-0 py-2 small d-flex align-items-center gap-2">
                    <Icon icon="fluent:error-circle-24-filled" />
                    {creationError}
                  </div>}
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtres et Recherche */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-3">
              <div className="row align-items-center">
                <div className="col-md-6">
                  <div className="position-relative">
                    <Icon icon="fluent:search-24-filled" className="position-absolute start-0 top-50 translate-middle-y ms-3 text-secondary" />
                    <input
                      type="text"
                      className="form-control ps-5 border-0 bg-light"
                      placeholder="Rechercher une liste..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6 text-end text-secondary small">
                  {filtered.length} liste(s) trouvée(s)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table des listes */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body p-0">
          <div className="table-responsive">
            <StyledTable>
              <thead className="bg-light">
                <tr>
                  <th className="py-3 ps-4" style={{width: '40%'}}>Titre</th>
                  <th className="py-3">Catégorie</th>
                  <th className="py-3 text-center">Tâches</th>
                  <th className="py-3 pe-4 text-end" style={{width: 160}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="align-middle">
                    <td className="ps-4">
                      {editingId === l.id ? (
                        <input className="form-control form-control-sm" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
                      ) : (
                        <div className="d-flex align-items-center gap-3">
                          <div className="rounded-circle bg-white shadow-sm p-2 d-flex align-items-center justify-content-center border border-light" style={{width: '40px', height: '40px'}}>
                            <Icon 
                              icon="fluent:task-list-square-24-filled" 
                              style={{ 
                                fontSize: '1.25rem', 
                                color: '#667eea'
                              }} 
                            />
                          </div>
                          <span className="fw-semibold text-dark">{l.title}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      {editingId === l.id ? (
                        <select className="form-select form-select-sm" value={editProjectId} onChange={(e) => {
                          if (e.target.value === 'NEW_CATEGORY') {
                            navigate('/projets/creer');
                          } else {
                            setEditProjectId(e.target.value);
                          }
                        }}>
                          <option value="">— Aucune —</option>
                          <option value="NEW_CATEGORY" style={{ fontWeight: 'bold', color: '#3b82f6' }}>+ Créer une catégorie</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.titre || p.nom || p.name || `Projet ${p.id}`}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`badge ${l.project_id ? 'bg-info-50 text-info-700' : 'bg-gray-50 text-gray-600'} border border-0 px-3 py-2 rounded-pill fw-medium`}>
                          {projects.find(p => p.id === l.project_id)?.titre || 'Non catégorisé'}
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className="badge bg-light text-dark border px-3 py-2 rounded-pill">
                        {Array.isArray(l.tasks) ? l.tasks.length : 0} tâches
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      {editingId === l.id ? (
                        <div className="d-inline-flex gap-2">
                          <button className="btn btn-success btn-sm d-flex align-items-center gap-1" onClick={() => submitUpdate(l.id)}>
                            <Icon icon="fluent:save-24-filled" /> Enregistrer
                          </button>
                          <button className="btn btn-light btn-sm d-flex align-items-center gap-1" onClick={cancelEdit}>
                            <Icon icon="fluent:dismiss-24-filled" />
                          </button>
                        </div>
                      ) : (
                        <div className="d-inline-flex gap-2">
                          <button className="btn btn-outline-primary btn-sm border-0 bg-primary-50 text-primary hover-bg-primary hover-text-white transition-all" onClick={() => startEdit(l)} title="Modifier">
                            <Icon icon="fluent:edit-24-filled" />
                          </button>
                          <button className="btn btn-outline-danger btn-sm border-0 bg-danger-50 text-danger hover-bg-danger hover-text-white transition-all" onClick={() => confirmDelete(l.id)} title="Supprimer">
                            <Icon icon="fluent:delete-24-filled" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-5">
                      <div className="d-flex flex-column align-items-center justify-content-center opacity-50">
                        <Icon icon="fluent:clipboard-error-24-regular" style={{ fontSize: '3rem' }} className="mb-3" />
                        <p className="mb-0 fw-medium">Aucune liste de tâches trouvée</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </StyledTable>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodoListsCrudPage;
