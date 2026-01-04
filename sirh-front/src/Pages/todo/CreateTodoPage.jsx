
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createTodoList } from '../../Redux/Slices/todoListSlice';
import { fetchProjects } from '../../Redux/Slices/projectSlice';
import { useNavigate } from 'react-router-dom';

const CreateTodoPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { items: projects } = useSelector((state) => state.projects);
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { title };
    if (projectId) payload.project_id = projectId;
    
    dispatch(createTodoList(payload))
      .unwrap()
      .then(() => navigate('/todo/phone'))
      .catch((err) => alert(err));
  };

  return (
    <div className="container py-4">
      <div className="card shadow-sm mx-auto" style={{ maxWidth: 500 }}>
        <div className="card-header text-white" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <h5 className="mb-0">Créer une nouvelle To-Do List</h5>
        </div>
        <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold">Titre de la liste</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="Titre de la liste"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-semibold">Catégorie (optionnel)</label>
                <select 
                  className="form-select" 
                  value={projectId} 
                  onChange={(e) => {
                    if (e.target.value === 'NEW_CATEGORY') {
                      navigate('/projets/creer');
                    } else {
                      setProjectId(e.target.value);
                    }
                  }}
                >
                  <option value="">— Aucune —</option>
                  <option value="NEW_CATEGORY" style={{ fontWeight: 'bold', color: '#3b82f6' }}>+ Créer une catégorie</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.titre || p.nom || p.name || `Projet ${p.id}`}</option>
                  ))}
                </select>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => navigate(-1)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4"
                >
                  Enregistrer
                </button>
              </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTodoPage;
