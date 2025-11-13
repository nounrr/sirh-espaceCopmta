import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@iconify/react';
import { useDispatch } from 'react-redux';
import { updateTask, deleteTask } from '../../Redux/Slices/todoTaskSlice';
import { fetchTodoLists } from '../../Redux/Slices/todoListSlice';
import TaskItemActions from './TaskItemActions';
// (Suppression import doublon IconifyIcon)
import Swal from '../../utils/swal';

const TaskItem = ({ task, users = [], assignedUserName, onStatusChange, onEditDescription, onDelete }) => {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.description);
  const [editStartDate, setEditStartDate] = useState(task.start_date || '');
  const [editEndDate, setEditEndDate] = useState(task.end_date || '');
  const [editAssigned, setEditAssigned] = useState(task.assigned_to || '');
  const [editType, setEditType] = useState(task.type || 'AC');
  const [editOrigine, setEditOrigine] = useState(task.origine || '');
  const [status, setStatus] = useState(task.status);
  const [isHovered, setIsHovered] = useState(false);
  const [editPourcentage, setEditPourcentage] = useState(task.pourcentage || 0);
  const [inlinePourcentage, setInlinePourcentage] = useState(task.pourcentage || 0);
  
  // Sync local status if the task prop changes externally (ex: updated elsewhere then store refresh)
  useEffect(() => {
    if (task.status !== status) {
      setStatus(task.status);
    }
  }, [task.status]);

  let badgeClass = 'bg-secondary-subtle text-secondary';
  let icon = 'mdi:progress-clock';
  let cardStyle = { borderLeft: '4px solid #6c757d' };
  
  if (status === 'Terminée') {
    badgeClass = 'bg-success-subtle text-success';
    icon = 'mdi:check-circle-outline';
    cardStyle = { borderLeft: '4px solid #28a745' };
  } else if (status === 'En cours') {
    badgeClass = 'bg-warning-subtle text-warning';
    icon = 'mdi:clock-outline';
    cardStyle = { borderLeft: '4px solid #ffc107' };
  } else if (status === 'Annulé') {
    badgeClass = 'bg-danger-subtle text-danger';
    icon = 'mdi:close-circle-outline';
    cardStyle = { borderLeft: '4px solid #dc3545' };
  }

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    const oldStatus = status;
    setStatus(newStatus);
    
    try {
      await dispatch(updateTask({ id: task.id, data: { status: newStatus } })).unwrap();
      
      Swal.fire({ 
        icon: 'success', 
        title: 'Statut mis à jour', 
        timer: 1200, 
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
      
      if (onStatusChange) {
        onStatusChange(newStatus);
      } else {
        await dispatch(fetchTodoLists());
      }
    } catch (error) {
      setStatus(oldStatus); // Revert on error
      Swal.fire({ 
        icon: 'error', 
        title: 'Erreur lors de la mise à jour',
        toast: true,
        position: 'top-end',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Supprimer la tâche ?',
      text: 'Cette action est irréversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      customClass: {
        confirmButton: 'btn btn-danger',
        cancelButton: 'btn btn-secondary'
      }
    });
    
    if (result.isConfirmed) {
      try {
        await dispatch(deleteTask({ id: task.id }));
        
        Swal.fire({ 
          icon: 'success', 
          title: 'Tâche supprimée', 
          timer: 1500, 
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
        
        if (onDelete) {
          onDelete();
        } else {
          dispatch(fetchTodoLists());
        }
      } catch (error) {
        Swal.fire({ 
          icon: 'error', 
          title: 'Erreur lors de la suppression',
          toast: true,
          position: 'top-end',
          timer: 2000,
          showConfirmButton: false
        });
      }
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(task.description);
  };

  const handleEditChange = (e) => setEditValue(e.target.value);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    // Auto bascule: si statut En cours et progression 100 => Terminée
    let finalStatus = status;
    let finalPourcentage = editPourcentage;
    if (status === 'En cours' && Number(editPourcentage) >= 100) {
      finalStatus = 'Terminée';
      finalPourcentage = 100;
      setStatus('Terminée');
    }
    const payload = {
      description: editValue.trim(),
      start_date: editStartDate || null,
      end_date: editEndDate || null,
      assigned_to: editAssigned || null,
      status: finalStatus,
      pourcentage: finalStatus === 'En cours' ? finalPourcentage : finalStatus === 'Terminée' ? 100 : 0,
      type: editType || null,
      origine: editOrigine?.trim() || null
    };
    if (!payload.description) return;
    try {
      await dispatch(updateTask({ id: task.id, data: payload })).unwrap();
  // Succès silencieux (pas de popup)
      if (onEditDescription) onEditDescription(payload.description);
      if (onStatusChange) onStatusChange(finalStatus);
      else dispatch(fetchTodoLists());
    } catch (error) {
  // Option: gérer une bannière d'erreur plus tard
    } finally {
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue(task.description);
    setEditStartDate(task.start_date || '');
    setEditEndDate(task.end_date || '');
  setEditAssigned(task.assigned_to || '');
  setEditPourcentage(task.pourcentage || 0);
  setEditType(task.type || 'AC');
  setEditOrigine(task.origine || '');
  };

  const handleInlinePourcentageUpdate = async (value) => {
    const safeVal = Math.min(100, Math.max(0, Number(value)));
    setInlinePourcentage(safeVal);
    const newStatus = (safeVal === 100 && status === 'En cours') ? 'Terminée' : status;
    try {
      await dispatch(updateTask({ id: task.id, data: { pourcentage: safeVal, status: newStatus } })).unwrap();
      if (onStatusChange) onStatusChange(newStatus);
    } catch (e) {
      setInlinePourcentage(task.pourcentage || 0);
    }
  };

  // Nom complet (prénom + nom) prioritaire; fallback sur prop assignéeUserName puis 'Non assigné'
  const fullAssignedName = React.useMemo(() => {
    if (task.assigned_to) {
      const u = users.find(u => String(u.id) === String(task.assigned_to));
      if (u) {
        const full = `${u.prenom || ''} ${u.nom || u.name || ''}`.trim();
        if (full) return full;
      }
    }
    if (assignedUserName) return assignedUserName;
    return 'Non assigné';
  }, [task.assigned_to, users, assignedUserName]);

  return (
    <div
      className="card border-0 shadow-sm rounded-3 position-relative"
      style={{ 
        ...cardStyle,
        wordBreak: 'break-word',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        background: status === 'Terminée' ? '#f8f9fa' : '#ffffff'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="card-body p-3">
        {/* En-tête avec statut et actions */}
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex align-items-center gap-2 flex-grow-1">
            <Icon 
              icon={icon} 
              style={{ 
                fontSize: '1.2rem',
                transition: 'all 0.3s ease',
                color: status === 'Terminée' ? '#28a745' : status === 'En cours' ? '#ffc107' : '#6c757d'
              }} 
            />
          </div>

          {/* Actions */}
          <div className="d-flex align-items-center gap-1 ms-2">
            {isEditing ? (
              <div className="d-flex gap-1">
                <button
                  className="btn btn-sm btn-success rounded-circle p-1 d-flex align-items-center justify-content-center"
                  style={{ width: '28px', height: '28px' }}
                  onClick={handleEditSubmit}
                  title="Enregistrer"
                  type="button"
                >
                  <Icon icon="mdi:check" style={{ fontSize: '0.9rem' }} />
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary rounded-circle p-1 d-flex align-items-center justify-content-center"
                  style={{ width: '28px', height: '28px' }}
                  onClick={handleCancelEdit}
                  title="Annuler"
                  type="button"
                >
                  <Icon icon="mdi:close" style={{ fontSize: '0.9rem' }} />
                </button>
              </div>
            ) : (
              <div className={`task-actions ${isHovered ? 'show' : ''}`} style={{
                opacity: isHovered ? 1 : 0.6,
                transition: 'opacity 0.3s ease'
              }}>
                <TaskItemActions onEdit={handleEdit} onDelete={handleDelete} />
              </div>
            )}
          </div>
        </div>

        {/* Description & champs d'édition étendus */}
        <div className="task-description">
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="mb-0">
              <div className="mb-2">
                <input
                  className="form-control form-control-sm mb-2"
                  value={editValue}
                  onChange={handleEditChange}
                  autoFocus
                  placeholder="Description de la tâche..."
                />
                <div className="row g-2">
                  <div className="col-6">
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      placeholder="Date début"
                    />
                  </div>
                  <div className="col-6">
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      placeholder="Date fin"
                    />
                  </div>
                  <div className="col-6">
                    <select
                      className="form-select form-select-sm"
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                    >
                      <option value="AC">AC</option>
                      <option value="AP">AP</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editOrigine}
                      placeholder="Origine"
                      maxLength={80}
                      onChange={(e) => setEditOrigine(e.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <select
                      className="form-select form-select-sm"
                      value={editAssigned}
                      onChange={(e) => setEditAssigned(e.target.value)}
                    >
                      <option value="">-- Assignée à (optionnel) --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{`${u.prenom || ''} ${u.nom || u.name || ''}`.trim() || `User ${u.id}`}</option>
                      ))}
                    </select>
                  </div>
                  {status === 'En cours' && (
                    <div className="col-12">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="form-control form-control-sm"
                        value={editPourcentage}
                        onChange={(e) => setEditPourcentage(Math.min(100, Math.max(0, Number(e.target.value))))}
                        placeholder="Progression %"
                      />
                    </div>
                  )}
                </div>
              </div>
            </form>
          ) : (
            <div
              className="task-text"
              onDoubleClick={handleEdit}
              style={{ 
                cursor: 'pointer', 
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: isHovered ? '#f8f9fa' : 'transparent',
                transition: 'background-color 0.3s ease',
                fontSize: '0.9rem',
                lineHeight: '1.4',
                textDecoration: status === 'Terminée' ? 'line-through' : 'none',
                color: status === 'Terminée' ? '#6c757d' : '#333'
              }}
            >
              {task.description}
            </div>
          )}
        </div>

        {/* Informations supplémentaires */}
        <div className="mt-2 pt-2 border-top">
          <div className="d-flex align-items-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {/* Type */}
              <span className={`badge ${task.type === 'AC' ? 'bg-primary' : task.type === 'AP' ? 'bg-success' : 'bg-secondary'} rounded-pill px-2 py-1 d-flex align-items-center gap-1`} style={{ fontSize: '0.6rem' }}>
                <Icon icon="mdi:ticket" style={{ fontSize: '0.7rem' }} /> {task.type || 'N/A'}
              </span>
              {/* Origine */}
              {task.origine && (
                <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-2 py-1 d-flex align-items-center gap-1" style={{ fontSize: '0.6rem' }}>
                  <Icon icon="mdi:source-branch" style={{ fontSize: '0.7rem' }} /> {task.origine}
                </span>
              )}
              {/* Assignation avec nom complet */}
              <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-2 py-1 d-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                <Icon icon="mdi:account" style={{ fontSize: '0.8rem' }} />
                {fullAssignedName}
              </span>
              
              {/* Date de création */}
              {task.created_at && (
                <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill px-2 py-1 d-flex align-items-center gap-1" style={{
                  fontSize: '0.7rem'
                }}>
                  <Icon icon="mdi:clock-plus" style={{ fontSize: '0.8rem' }} />
                  Créé le {new Date(task.created_at).toLocaleDateString('fr-FR')}
                </span>
              )}
              
              {/* Date de début */}
              {task.start_date && (
                <span className="badge bg-info bg-opacity-10 text-info rounded-pill px-2 py-1 d-flex align-items-center gap-1" style={{
                  fontSize: '0.7rem'
                }}>
                  <Icon icon="mdi:calendar-start" style={{ fontSize: '0.8rem' }} />
                  {new Date(task.start_date).toLocaleDateString('fr-FR')}
                </span>
              )}
              
              {/* Date de fin */}
              {task.end_date && (
                <span className="badge bg-warning bg-opacity-10 text-warning rounded-pill px-2 py-1 d-flex align-items-center gap-1" style={{
                  fontSize: '0.7rem'
                }}>
                  <Icon icon="mdi:calendar-end" style={{ fontSize: '0.8rem' }} />
                  {new Date(task.end_date).toLocaleDateString('fr-FR')}
                </span>
              )}
              
              {/* Date d'échéance */}
              {task.due_date && (
                <span className="badge bg-danger bg-opacity-10 text-danger rounded-pill px-2 py-1 d-flex align-items-center gap-1" style={{
                  fontSize: '0.7rem'
                }}>
                  <Icon icon="mdi:calendar-alert" style={{ fontSize: '0.8rem' }} />
                  Échéance {new Date(task.due_date).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
            
            {/* Sélecteur de statut compact */}
            {!isEditing && (
              <select
                className={`form-select form-select-sm ${badgeClass}`}
                style={{ 
                  width: 'fit-content',
                  minWidth: 'auto',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.7rem', 
                  borderRadius: '20px',
                  border: 'none',
                  fontWeight: '500'
                }}
                value={status}
                onChange={handleStatusChange}
              >
                <option value="Non commencée">📋 Non commencée</option>
                <option value="En cours">⏳ En cours</option>
                <option value="Terminée">✅ Terminée</option>
                <option value="Annulé">❌ Annulé</option>
              </select>
            )}
          </div>
          {/* Inline progression editor when status En cours and not editing description */}
          {!isEditing && status === 'En cours' && (
            <div className="mt-2 w-100">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <small className="text-muted fw-semibold" style={{ fontSize: '0.75rem', letterSpacing: '.5px' }}>Progression</small>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={inlinePourcentage}
                  onChange={(e) => setInlinePourcentage(Math.min(100, Math.max(0, Number(e.target.value))))}
                  onBlur={(e) => handleInlinePourcentageUpdate(e.target.value)}
                  className="form-control form-control-sm"
                  style={{ width: '95px', fontSize: '0.75rem', padding: '0.25rem 0.45rem', fontWeight: 500 }}
                />
                <div className="flex-grow-1" style={{ minWidth: '120px' }}>
                  <div className="progress" style={{ height: '6px', borderRadius: '4px' }}>
                    <div className="progress-bar" role="progressbar" style={{ width: `${inlinePourcentage}%`, transition: 'width .25s ease' }} aria-valuenow={inlinePourcentage} aria-valuemin={0} aria-valuemax={100}></div>
                  </div>
                </div>
                <span className="badge bg-primary bg-opacity-10 text-primary" style={{ fontSize: '0.65rem', padding: '0.35rem 0.5rem' }}>{inlinePourcentage}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Aide pour l'édition */}
        {!isEditing && isHovered && (
          <div className="text-center mt-2">
            <small className="text-muted">
              <Icon icon="mdi:gesture-double-tap" className="me-1" />
              Double-cliquez pour modifier (description, dates, assignation)
            </small>
          </div>
        )}
      </div>

      {/* CSS pour les animations */}
      <style jsx>{`
        .task-actions {
          transition: opacity 0.3s ease;
        }
        .task-text:hover {
          background-color: #f8f9fa !important;
        }
        .card:hover {
          box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important;
        }
      `}</style>
    </div>
  );
};

export default TaskItem;

TaskItem.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    description: PropTypes.string,
    start_date: PropTypes.string,
    end_date: PropTypes.string,
    assigned_to: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    type: PropTypes.string,
    origine: PropTypes.string,
    status: PropTypes.string,
    pourcentage: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    created_at: PropTypes.string,
    due_date: PropTypes.string
  }).isRequired,
  users: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    prenom: PropTypes.string,
    nom: PropTypes.string,
    name: PropTypes.string
  })),
  assignedUserName: PropTypes.string,
  onStatusChange: PropTypes.func,
  onEditDescription: PropTypes.func,
  onDelete: PropTypes.func
};
