import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Icon } from '@iconify/react';
import { fetchTodoLists, createTodoList, updateTodoList, deleteTodoList, resetCreationStatus } from '../../Redux/Slices/todoListSlice';

const TodoListsCrudPage = () => {
  const dispatch = useDispatch();
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
    <div className="container py-3">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0">Listes de tâches</h5>
        <div className="d-flex gap-2">
          <input
            className="form-control form-control-sm"
            placeholder="Rechercher une liste..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 240 }}
          />
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(s => !s)}>
            <Icon icon="mdi:plus" /> Nouvelle liste
          </button>
        </div>
      </div>

      {showAdd && (
        <form className="card mb-3 p-3" onSubmit={submitCreate}>
          <div className="row g-2 align-items-end">
            <div className="col-md-6">
              <label className="form-label small">Titre</label>
              <input
                className="form-control"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Nom de la liste"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label small">Catégorie (projet)</label>
              <select className="form-select" value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)}>
                <option value="">— Aucune —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.titre || p.nom || p.name || `Projet ${p.id}`}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2 d-flex gap-2">
              <button className="btn btn-success flex-grow-1" type="submit" disabled={loading}>
                <Icon icon="mdi:check" /> Créer
              </button>
              <button className="btn btn-light" type="button" onClick={() => setShowAdd(false)}>
                Annuler
              </button>
            </div>
          </div>
          {creationError && <div className="text-danger small mt-2">{creationError}</div>}
        </form>
      )}

      <div className="card">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th style={{width: '40%'}}>Titre</th>
                <th>Catégorie</th>
                <th>Tâches</th>
                <th style={{width: 160}}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td>
                    {editingId === l.id ? (
                      <input className="form-control form-control-sm" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    ) : (
                      <strong>{l.title}</strong>
                    )}
                  </td>
                  <td>
                    {editingId === l.id ? (
                      <select className="form-select form-select-sm" value={editProjectId} onChange={(e) => setEditProjectId(e.target.value)}>
                        <option value="">— Aucune —</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.titre || p.nom || p.name || `Projet ${p.id}`}</option>
                        ))}
                      </select>
                    ) : (
                      <span>{projects.find(p => p.id === l.project_id)?.titre || '—'}</span>
                    )}
                  </td>
                  <td>{Array.isArray(l.tasks) ? l.tasks.length : 0}</td>
                  <td className="text-end">
                    {editingId === l.id ? (
                      <div className="d-inline-flex gap-2">
                        <button className="btn btn-success btn-sm" onClick={() => submitUpdate(l.id)}>
                          <Icon icon="mdi:content-save" />
                        </button>
                        <button className="btn btn-light btn-sm" onClick={cancelEdit}>
                          <Icon icon="mdi:close" />
                        </button>
                      </div>
                    ) : (
                      <div className="d-inline-flex gap-2">
                        <button className="btn btn-outline-primary btn-sm" onClick={() => startEdit(l)}>
                          <Icon icon="mdi:pencil" />
                        </button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => confirmDelete(l.id)}>
                          <Icon icon="mdi:trash-can" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center text-muted py-4">Aucune liste</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TodoListsCrudPage;
