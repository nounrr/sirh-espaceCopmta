import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { createTask } from '../../Redux/Slices/todoTaskSlice';
import { fetchTodoLists } from '../../Redux/Slices/todoListSlice';
import { fetchUsers } from '../../Redux/Slices/userSlice';
import { Icon } from '@iconify/react';



// Composant Select avec recherche pour l'assignation
const AssigneeSelector = ({ id, users, value, onChange, disabled, placeholder = 'Rechercher un utilisateur...' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = React.useRef(null);

  const selectedUser = users?.find(u => String(u.id) === String(value));
  const displayValue = selectedUser ? `${selectedUser.prenom || ''} ${selectedUser.nom || selectedUser.name || ''}`.trim() : '';
  const effectiveQuery = open ? query : displayValue;

  const filtered = (users || []).filter(u => {
    if (!query) return true;
    const label = `${u.prenom || ''} ${u.nom || u.name || ''}`.toLowerCase();
    return label.includes(query.toLowerCase());
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectUser = (u) => {
    onChange(String(u.id));
    setOpen(false);
    setQuery('');
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setOpen(true);
  };

  return (
    <div className="position-relative" ref={containerRef} id={id}>
      <div className="input-group input-group-sm">
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder={placeholder}
          value={effectiveQuery}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-list`}
        />
        {value && !disabled && (
          <button type="button" className="btn btn-outline-secondary" onClick={clearSelection} title="Effacer" tabIndex={-1}>
            <Icon icon="mdi:close" />
          </button>
        )}
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={() => { if (disabled) return; setOpen(o => !o); if (open) setQuery(''); }}
          aria-label={open ? 'Fermer la liste des utilisateurs' : 'Ouvrir la liste des utilisateurs'}
          disabled={disabled}
          tabIndex={-1}
        >
          <Icon icon={open ? 'mdi:chevron-up' : 'mdi:chevron-down'} />
        </button>
      </div>
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="list-group shadow-sm position-absolute w-100 mt-1 searchable-select-dropdown"
          style={{ maxHeight: 240, overflowY: 'auto', zIndex: 20 }}
        >
          {filtered.length === 0 && (
            <li className="list-group-item small text-muted">Aucun résultat</li>
          )}
          {filtered.map(u => {
            const label = `${u.prenom || ''} ${u.nom || u.name || ''}`.trim() || `User ${u.id}`;
            const selected = String(u.id) === String(value);
            return (
              <li key={u.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center py-1 ${selected ? 'active' : ''}`}
                  onClick={() => selectUser(u)}
                  style={{ fontSize: '0.8rem' }}
                >
                  <span className="text-truncate">{label}</span>
                  {selected && <Icon icon="mdi:check" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

AssigneeSelector.propTypes = {
  id: PropTypes.string.isRequired,
  users: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) })).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string
};

const AddTaskForm = ({ listId, onTaskAdded }) => {
  const dispatch = useDispatch();
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Non commencée');
  const [pourcentage, setPourcentage] = useState(0);
  // Nouveaux champs
  const [type, setType] = useState('AC');
  const [origine, setOrigine] = useState('');
  const [errors, setErrors] = useState({});
  const [expanded, setExpanded] = useState(false);

  const users = useSelector(state => state.users.items);
  const usersStatus = useSelector(state => state.users.status);

  useEffect(() => {
    if (usersStatus === 'idle') {
      dispatch(fetchUsers());
    }
  }, [dispatch, usersStatus]);

  const validateForm = () => {
    const newErrors = {};
    if (!description.trim()) {
      newErrors.description = 'La description est requise';
    } else if (description.trim().length < 3) {
      newErrors.description = 'La description doit contenir au moins 3 caractères';
    }
    
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = 'La date de fin doit être postérieure à la date de début';
    }
    if (status === 'En cours') {
      if (pourcentage < 0 || pourcentage > 100 || isNaN(pourcentage)) {
        newErrors.pourcentage = 'Le pourcentage doit être entre 0 et 100';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
    // Auto bascule statut si En cours + 100% -> Terminée
    const effectiveStatus = (status === 'En cours' && Number(pourcentage) >= 100) ? 'Terminée' : status;
    const effectivePourcentage = effectiveStatus === 'Terminée' ? 100 : (effectiveStatus === 'En cours' ? pourcentage : 0);

    const result = await dispatch(createTask({
        listId,
        data: {
          description: description.trim(),
          start_date: startDate || null,
          end_date: endDate || null,
          assigned_to: assignedTo || null,
      status: effectiveStatus,
      pourcentage: effectivePourcentage,
          type: type || null,
          origine: origine?.trim() || null
        }
      })).unwrap();
      
      // Reset form
  setDescription('');
  setStartDate('');
  setEndDate('');
  setAssignedTo('');
  setErrors({});
  setExpanded(false);
  setStatus('Non commencée');
  setPourcentage(0);
  setType('AC');
  setOrigine('');
      
      if (result?.task) {
        onTaskAdded?.(result.task);
      } else {
        dispatch(fetchTodoLists());
      }
  // Succès silencieux (pas de popup) conformément à la demande
    } catch (error) {
      setErrors({ submit: 'Erreur lors de l\'ajout de la tâche' });
  // Erreur silencieuse (option: laisser le message d'erreur dans l'UI)
    } finally {
      setLoading(false);
    }
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
    if (errors.description) {
      setErrors(prev => ({ ...prev, description: null }));
    }
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    if (errors.endDate) {
      setErrors(prev => ({ ...prev, endDate: null }));
    }
  };

  const resetForm = () => {
  setDescription('');
  setStartDate('');
  setEndDate('');
  setAssignedTo('');
  setErrors({});
  setStatus('Non commencée');
  setPourcentage(0);
  setType('AC');
  setOrigine('');
    setExpanded(false);
  };

  return (
    <div className="card border-0 shadow-sm rounded-3" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
      <div className="card-body p-3">
        <form onSubmit={handleSubmit}>
          {/* Champ principal de description */}
          <div className="mb-3">
            <div className="d-flex align-items-center gap-2 mb-2">
              <Icon icon="mdi:text" className="text-primary" />
              <label htmlFor="task-description" className="form-label fw-semibold mb-0">Description de la tâche</label>
            </div>
            <div className="input-group">
              {(() => { /* compute class once for lint clarity */ })()}
              { /* Precompute className to avoid nested ternary */ }
              { /* eslint-disable-next-line */ }
              <input
                id="task-description"
                className={`form-control ${errors.description ? 'is-invalid' : (description.trim() ? 'is-valid' : '')}`}
                placeholder="Que faut-il faire ?"
                value={description}
                onChange={handleDescriptionChange}
                disabled={loading}
                style={{ borderRadius: '8px 0 0 8px', fontSize: '0.95rem' }}
              />
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => setExpanded(!expanded)}
                style={{ borderRadius: '0 8px 8px 0' }}
                title={expanded ? "Masquer les options" : "Afficher les options"}
              >
                <Icon icon={expanded ? "mdi:chevron-up" : "mdi:chevron-down"} />
              </button>
            </div>
            {errors.description && (
              <div className="text-danger small mt-1 d-flex align-items-center gap-1">
                <Icon icon="mdi:alert-circle" />
                {errors.description}
              </div>
            )}
          </div>
          {/* Ligne nouveaux champs type / origine */}
          <div className="row g-3 mb-3">
            <div className="col-md-3 col-6">
              <label htmlFor="task-type" className="form-label small text-muted d-flex align-items-center gap-1 mb-1">
                <Icon icon="mdi:shape" /> Type
              </label>
              <select
                id="task-type"
                className="form-select form-select-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={loading}
              >
                <option value="AC">AC</option>
                <option value="AP">AP</option>
              </select>
            </div>
            <div className="col-md-5 col-6">
              <label htmlFor="task-origine" className="form-label small text-muted d-flex align-items-center gap-1 mb-1">
                <Icon icon="mdi:source-branch" /> Origine
              </label>
              <input
                type="text"
                id="task-origine"
                className="form-control form-control-sm"
                placeholder="Origine (facultatif)"
                value={origine}
                onChange={(e) => setOrigine(e.target.value)}
                disabled={loading}
                maxLength={80}
              />
            </div>
            <div className="col-md-4 col-12">
              <label htmlFor="task-assignee-inline" className="form-label small text-muted d-flex align-items-center gap-1 mb-1">
                <Icon icon="mdi:account" /> Assignée à
              </label>
              <AssigneeSelector
                id="task-assignee-inline"
                users={users || []}
                value={assignedTo}
                onChange={setAssignedTo}
                disabled={loading}
                placeholder="Chercher ou choisir"
              />
            </div>
          </div>

          {/* Options étendues */}
          <div className={`options-container ${expanded ? 'show' : ''}`} style={{
            maxHeight: expanded ? '300px' : '0',
            overflow: 'hidden',
            transition: 'max-height 0.3s ease-in-out'
          }}>
            <div className="row g-3 mb-3">
              {/* Dates */}
              <div className="col-md-6">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <Icon icon="mdi:calendar-start" className="text-success" />
                  <label htmlFor="task-start-date" className="form-label fw-semibold mb-0 small">Date de début</label>
                </div>
                <input
                  type="date"
                  id="task-start-date"
                  className="form-control form-control-sm"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  disabled={loading}
                  style={{ borderRadius: '8px' }}
                />
              </div>
              
              <div className="col-md-6">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <Icon icon="mdi:calendar-end" className="text-warning" />
                  <label htmlFor="task-end-date" className="form-label fw-semibold mb-0 small">Date de fin</label>
                </div>
                <input
                  type="date"
                  id="task-end-date"
                  className={`form-control form-control-sm ${errors.endDate ? 'is-invalid' : ''}`}
                  value={endDate}
                  onChange={handleEndDateChange}
                  disabled={loading}
                  style={{ borderRadius: '8px' }}
                />
                {errors.endDate && (
                  <div className="text-danger small mt-1">
                    {errors.endDate}
                  </div>
                )}
              </div>
            </div>

            {/* Assignation */}
            <div className="mb-3">
              <div className="d-flex align-items-center gap-2 mb-2">
                <Icon icon="mdi:account" className="text-info" />
                <label htmlFor="task-assignee-extended" className="form-label fw-semibold mb-0 small">Assigner à</label>
              </div>
              <AssigneeSelector
                id="task-assignee-extended"
                users={users || []}
                value={assignedTo}
                onChange={setAssignedTo}
                disabled={loading || usersStatus === 'loading'}
                placeholder="Rechercher un utilisateur"
              />
            </div>

            {/* Statut & Pourcentage */}
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <Icon icon="mdi:flag" className="text-secondary" />
                  <label htmlFor="task-status" className="form-label fw-semibold mb-0 small">Statut</label>
                </div>
                <select
                  id="task-status"
                  className="form-select form-select-sm"
                  value={status}
                  onChange={e => {
                    const val = e.target.value;
                    setStatus(val);
                    if (val !== 'En cours') setPourcentage(0);
                  }}
                  disabled={loading}
                  style={{ borderRadius: '8px' }}
                >
                  <option value="Non commencée">Non commencée</option>
                  <option value="En cours">En cours</option>
                  <option value="Terminée">Terminée</option>
                  <option value="Annulé">Annulé</option>
                </select>
              </div>
              {status === 'En cours' && (
                <div className="col-md-6">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <Icon icon="mdi:percent" className="text-primary" />
                    <label htmlFor="task-progress" className="form-label fw-semibold mb-0 small">Progression (%)</label>
                  </div>
                  <input
                    type="number"
                    id="task-progress"
                    className={`form-control form-control-sm ${errors.pourcentage ? 'is-invalid' : ''}`}
                    value={pourcentage}
                    min={0}
                    max={100}
                    onChange={e => setPourcentage(Math.min(100, Math.max(0, Number(e.target.value))))}
                    disabled={loading}
                    style={{ borderRadius: '8px' }}
                  />
                  {errors.pourcentage && (
                    <div className="text-danger small mt-1">{errors.pourcentage}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Erreur de soumission */}
          {errors.submit && (
            <div className="alert alert-danger alert-sm d-flex align-items-center gap-2 mb-3" role="alert">
              <Icon icon="mdi:alert-circle" />
              {errors.submit}
            </div>
          )}

          {/* Boutons d'action */}
          <div className="d-flex justify-content-between align-items-center">
            {expanded && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                onClick={resetForm}
                disabled={loading}
                style={{ borderRadius: '8px' }}
              >
                <Icon icon="mdi:refresh" />
                Réinitialiser
              </button>
            )}
            
            <div className="ms-auto d-flex gap-2">
              {expanded && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setExpanded(false)}
                  disabled={loading}
                  style={{ borderRadius: '8px' }}
                >
                  Réduire
                </button>
              )}
              
              <button
                type="submit"
                className="btn btn-primary btn-sm d-flex align-items-center gap-1 px-3"
                disabled={loading || !description.trim()}
                style={{ 
                  borderRadius: '8px',
                  background: loading ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none'
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" aria-live="polite" aria-label="Ajout en cours" />
                    Ajout...
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:plus" />
                    Ajouter
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {/* CSS pour les animations */}
      <style>{`
        .options-container {
          transition: max-height 0.3s ease-in-out;
        }
        .btn:hover {
          transform: translateY(-1px);
          transition: transform 0.2s ease;
        }
        .form-control:focus, .form-select:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
      `}</style>
    </div>
  );
};

AddTaskForm.propTypes = {
  listId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onTaskAdded: PropTypes.func
};

export default AddTaskForm;
export { AssigneeSelector };
