import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUsers } from '../../Redux/Slices/userSlice';
import { Icon } from '@iconify/react';
import TaskItem from './TaskItem';
import AddTaskForm from './AddTaskForm';
import { fetchTaskComments, addTaskComment, deleteTaskComment } from '../../Redux/Slices/taskCommentsSlice';

const TodoListPopup = ({ list, onClose, onTaskDelete, onTaskChange }) => {
  const dispatch = useDispatch();
  const [localList, setLocalList] = useState(list);
  const [expandedTask, setExpandedTask] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState({});
  // Pour mémoriser quelles tâches ont déjà été chargées (même si 0 commentaire)
  const [loadedCommentTasks, setLoadedCommentTasks] = useState({});
  
  const { items: todoLists } = useSelector(state => state.todoLists);
  const { items: users } = useSelector(state => state.users);
  const { commentsByTask } = useSelector(state => state.taskComments);
  const { user: currentUser } = useSelector(state => state.auth);
  
  // Charger les utilisateurs si nécessaire
  useEffect(() => {
    if (users.length === 0) {
      dispatch(fetchUsers());
    }
  }, [dispatch, users.length]);
  
  // Fonction pour obtenir le nom complet de l'utilisateur assigné à une tâche
  const getAssignedUserName = (assignedToId) => {
    if (!assignedToId) return 'Non assigné';
    const user = users.find(u => u.id === assignedToId);
    if (!user) return 'Utilisateur inconnu';
    
    const nom = user.nom || user.name || '';
    const prenom = user.prenom || user.first_name || '';
    
    if (nom && prenom) {
      return `${prenom} ${nom}`;
    } else if (nom) {
      return nom;
    } else if (prenom) {
      return prenom;
    } else {
      return `User ${user.id}`;
    }
  };
  
  // Synchroniser l'état local avec les données Redux
  useEffect(() => {
    if (list && todoLists.length > 0) {
      const updatedList = todoLists.find(l => l.id === list.id);
      if (updatedList) {
        setLocalList(updatedList);
      }
    }
  }, [todoLists, list]);
  
  // Suppression du préchargement global : on charge à la demande (lazy load)

  if (!localList) return null;

  const handleTaskAdded = (task) => {
    // Mettre à jour l'état local immédiatement pour un feedback visuel instantané
    setLocalList(prev => ({ ...prev, tasks: [...prev.tasks, task] }));
    // Notifier la page parent qu'il y a eu un changement
    if (onTaskChange) onTaskChange();
  };

  const handleTaskStatusChange = (taskId, newStatus) => {
    // Mettre à jour l'état local immédiatement
    setLocalList(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    }));
    // Notifier la page parent qu'il y a eu un changement
    if (onTaskChange) onTaskChange();
  };

  const handleTaskEditDescription = (taskId, newDescription) => {
    // Mettre à jour l'état local immédiatement
    setLocalList(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, description: newDescription } : t)
    }));
    // Notifier la page parent qu'il y a eu un changement
    if (onTaskChange) onTaskChange();
  };

  const handleTaskDelete = (taskId) => {
    // Mettre à jour l'état local immédiatement
    setLocalList(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== taskId)
    }));
    // Notifier la page parent qu'il y a eu un changement
    if (onTaskChange) onTaskChange();
    if (onTaskDelete) onTaskDelete();
  };

  // Fonctions pour gérer les commentaires
  const handleToggleComments = (taskId) => {
    if (expandedTask === taskId) {
      setExpandedTask(null);
      return;
    }
    setExpandedTask(taskId);
    // Charger seulement si jamais chargé auparavant
    if (!loadedCommentTasks[taskId]) {
      setLoadingComments(prev => ({ ...prev, [taskId]: true }));
      dispatch(fetchTaskComments(taskId))
        .unwrap()
        .catch(() => {})
        .finally(() => {
          setLoadingComments(prev => ({ ...prev, [taskId]: false }));
          setLoadedCommentTasks(prev => ({ ...prev, [taskId]: true }));
        });
    }
  };
  
  const handleAddComment = async (taskId) => {
    if (!newComment.trim()) return;
    
    setSubmittingComment(true);
    try {
      await dispatch(addTaskComment({ taskId, comment: newComment.trim() })).unwrap();
      setNewComment('');
    } catch (error) {
      console.error('Erreur lors de l\'ajout du commentaire:', error);
    } finally {
      setSubmittingComment(false);
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'À l\'instant';
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)}h`;
    
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return 'Utilisateur inconnu';
    return `${user.prenom || ''} ${user.nom || user.name || ''}`.trim() || `Utilisateur ${userId}`;
  };
  
  const handleDeleteComment = async (commentId, taskId) => {
    const confirmed = window.confirm('Voulez-vous vraiment supprimer ce commentaire ?');
    if (confirmed) {
      try {
        await dispatch(deleteTaskComment({ commentId, taskId })).unwrap();
      } catch (error) {
        console.error('Erreur lors de la suppression du commentaire:', error);
      }
    }
  };
  
  const canManageComment = (userId) => {
    return currentUser?.id === userId || ['RH', 'admin', 'Chef_Dep', 'Chef_Chant'].includes(currentUser?.role);
  };

  // Calculer les statistiques
  const totalTasks = localList.tasks.length;
  const completedTasks = localList.tasks.filter(t => t.status === 'Terminée').length;
  const inProgressTasks = localList.tasks.filter(t => t.status === 'En cours').length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ 
        background: 'rgba(0,0,0,0.4)', 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        zIndex: 1050, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backdropFilter: 'blur(2px)'
      }}
      onClick={onClose}
    >
      <div 
        className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable" 
        style={{ maxWidth: '95vw', width: '100%', margin: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content rounded-4 shadow-lg border-0" style={{ maxWidth: 800, width: '100%', margin: '0 auto' }}>
          {/* En-tête amélioré */}
          <div className="modal-header text-white rounded-top-4 position-relative" style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '1.5rem'
          }}>
            <div className="d-flex align-items-center gap-3 flex-grow-1">
              <div className="p-2 rounded-circle bg-white bg-opacity-20">
                <Icon icon="mdi:clipboard-list-outline" style={{ fontSize: '1.8rem' }} />
              </div>
              <div className="flex-grow-1">
                <h5 className="modal-title fw-bold mb-1" style={{ 
                  wordBreak: 'break-word', 
                  fontSize: '1.4rem',
                  lineHeight: '1.3'
                }}>
                  {localList.title}
                </h5>
                <div className="d-flex align-items-center gap-3 flex-wrap mt-2">
                  <span className="badge bg-info text-white d-flex align-items-center gap-1" style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                    <Icon icon="mdi:format-list-bulleted" style={{ fontSize: '0.9rem' }} />
                    {totalTasks} tâche{totalTasks > 1 ? 's' : ''}
                  </span>
                  <span className="badge bg-success text-white d-flex align-items-center gap-1" style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                    <Icon icon="mdi:check-circle" style={{ fontSize: '0.9rem' }} />
                    {completedTasks} terminée{completedTasks > 1 ? 's' : ''}
                  </span>
                  <span className="badge bg-warning text-white d-flex align-items-center gap-1" style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                    <Icon icon="mdi:clock" style={{ fontSize: '0.9rem' }} />
                    {inProgressTasks} en cours
                  </span>
                </div>
              </div>
            </div>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              aria-label="Close" 
              onClick={onClose}
              style={{ filter: 'brightness(0) invert(1)' }}
            ></button>
          </div>

          {/* Corps du modal */}
          <div className="modal-body p-0" style={{ background: '#f8f9fa' }}>
            {/* Barre de progression globale */}
            <div className="p-4 bg-white border-bottom">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-semibold text-muted">Progression globale</span>
                <span className="fw-bold text-primary">{progressPercent}%</span>
              </div>
              <div className="progress" style={{ height: '12px', borderRadius: '6px' }}>
                <div
                  className="progress-bar"
                  role="progressbar"
                  style={{ 
                    width: `${progressPercent}%`,
                    background: progressPercent === 100 
                      ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' 
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    transition: 'width 0.6s ease'
                  }}
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>

            {/* Section d'ajout de tâche */}
            <div className="p-4 bg-white border-bottom">
              <div className="d-flex align-items-center gap-2 mb-3">
                <Icon icon="mdi:plus-circle" className="text-primary" style={{ fontSize: '1.3rem' }} />
                <h6 className="fw-bold mb-0">Ajouter une nouvelle tâche</h6>
              </div>
              <AddTaskForm listId={localList.id} onTaskAdded={handleTaskAdded} />
            </div>

            {/* Liste des tâches */}
            <div className="p-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <Icon icon="mdi:format-list-checks" className="text-primary" style={{ fontSize: '1.3rem' }} />
                <h6 className="fw-bold mb-0">
                  Tâches ({totalTasks})
                  {totalTasks > 0 && (
                    <span className="ms-3 d-inline-flex align-items-center gap-3">
                      <span className="badge bg-success d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                        <Icon icon="mdi:check-circle" style={{ fontSize: '0.8rem' }} />
                        {completedTasks} terminée{completedTasks > 1 ? 's' : ''}
                      </span>
                      <span className="badge bg-warning d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                        <Icon icon="mdi:clock" style={{ fontSize: '0.8rem' }} />
                        {inProgressTasks} en cours
                      </span>
                    </span>
                  )}
                </h6>
              </div>
              
              {localList.tasks.length === 0 ? (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <Icon icon="mdi:format-list-bulleted-square" style={{ fontSize: '3rem', color: '#e9ecef' }} />
                  </div>
                  <h6 className="text-muted mb-2">Aucune tâche pour le moment</h6>
                  <p className="text-muted small mb-0">Ajoutez votre première tâche ci-dessus pour commencer !</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {localList.tasks.map((task, index) => {
                    const taskComments = commentsByTask[task.id] || [];
                    const commentCount = taskComments.length;
                    const isExpanded = expandedTask === task.id;
                    
                    return (
                      <div 
                        key={task.id} 
                        className="task-item"
                        style={{ 
                          opacity: 0,
                          animation: `fadeInUp 0.5s ease-out ${index * 0.1}s forwards`
                        }}
                      >
                        <div className="mb-2">
                          <TaskItem 
                            task={task} 
                            users={users}
                            assignedUserName={getAssignedUserName(task.assigned_to)}
                            onStatusChange={newStatus => handleTaskStatusChange(task.id, newStatus)} 
                            onEditDescription={desc => handleTaskEditDescription(task.id, desc)} 
                            onDelete={() => handleTaskDelete(task.id)} 
                          />
                        </div>
                        
                        {/* Section des commentaires et boutons d'action */}
                        <div className="d-flex justify-content-between align-items-center px-3 pb-1">
                          {/* Si des commentaires existent, afficher le bouton afficher/masquer */}
                          {commentCount > 0 ? (
                            <button 
                              className="btn btn-sm text-primary border-0 d-flex align-items-center gap-1"
                              onClick={() => handleToggleComments(task.id)}
                              style={{ fontSize: '0.85rem' }}
                            >
                              <Icon icon={isExpanded ? "mdi:comment-minus-outline" : "mdi:comment-plus-outline"} />
                              {isExpanded ? "Masquer" : "Voir"} {commentCount} commentaire{commentCount > 1 ? 's' : ''}
                            </button>
                          ) : (
                            /* Sinon, afficher un bouton pour ajouter un commentaire */
                            <button 
                              className="btn btn-sm text-secondary border-0 d-flex align-items-center gap-1"
                              onClick={() => handleToggleComments(task.id)}
                              style={{ fontSize: '0.85rem' }}
                            >
                              <Icon icon="mdi:comment-plus-outline" />
                              Ajouter un commentaire
                            </button>
                          )}
                          
                          {/* Badge indiquant le nombre de commentaires */}
                          {commentCount > 0 && (
                            <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill">
                              <Icon icon="mdi:comment-outline" className="me-1" style={{ fontSize: '0.7rem' }} />
                              {commentCount}
                            </span>
                          )}
                        </div>
                        
                        {/* Section commentaires avec animation */}
                        <div 
                          className={`comments-section border-top mt-2 pt-3 px-3 pb-2 ${isExpanded ? 'show' : 'hide'}`} 
                          style={{ 
                            backgroundColor: '#f8f9fa', 
                            borderRadius: '0 0 8px 8px',
                            maxHeight: isExpanded ? '500px' : '0',
                            opacity: isExpanded ? '1' : '0',
                            overflow: 'hidden',
                            transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out',
                            visibility: isExpanded ? 'visible' : 'hidden'
                          }}
                        >
                            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                              <Icon icon="mdi:comment-multiple-outline" style={{ color: '#6610f2' }} />
                              Commentaires
                            </h6>
                            
                            {/* Liste des commentaires */}
                            <div className="comments-list mb-3">
                              {loadingComments[task.id] ? (
                                <div className="text-center py-3">
                                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                                    <span className="visually-hidden">Chargement des commentaires...</span>
                                  </div>
                                  <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.9rem' }}>Chargement des commentaires...</p>
                                </div>
                              ) : taskComments.length === 0 ? (
                                <div className="text-center py-3">
                                  <Icon icon="mdi:comment-off-outline" style={{ fontSize: '1.5rem', color: '#dee2e6' }} />
                                  <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.9rem' }}>Aucun commentaire pour cette tâche</p>
                                </div>
                              ) : (
                                <div className="d-flex flex-column gap-3">
                                  {taskComments.map(comment => (
                                    <div key={comment.id} className="comment-item p-3 border rounded" style={{ backgroundColor: 'white' }}>
                                      <div className="d-flex justify-content-between align-items-start mb-2">
                                        <div className="d-flex align-items-center gap-2">
                                          <div className="bg-primary bg-opacity-10 rounded-circle p-2 d-flex align-items-center justify-content-center">
                                            <Icon icon="mdi:account-circle" style={{ fontSize: '1rem', color: '#0d6efd' }} />
                                          </div>
                                          <div>
                                            <div className="fw-bold" style={{ fontSize: '0.9rem' }}>{getUserName(comment.user_id)}</div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                              {formatDate(comment.created_at)}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Actions sur le commentaire */}
                                        {canManageComment(comment.user_id) && (
                                          <button 
                                            className="btn btn-sm btn-outline-danger border-0 p-1" 
                                            onClick={() => handleDeleteComment(comment.id, task.id)}
                                          >
                                            <Icon icon="mdi:delete-outline" style={{ fontSize: '0.9rem' }} />
                                          </button>
                                        )}
                                      </div>
                                      <p className="mb-0" style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                                        {comment.comment}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Formulaire d'ajout de commentaire */}
                            <div className="add-comment-form mt-3">
                              <div className="form-floating position-relative">
                                <textarea 
                                  id={`comment-input-${task.id}`}
                                  className="form-control" 
                                  placeholder="Ajouter un commentaire..." 
                                  value={newComment}
                                  onChange={(e) => setNewComment(e.target.value)}
                                  rows="2"
                                  style={{ 
                                    fontSize: '0.9rem', 
                                    height: '80px', 
                                    paddingRight: '50px' 
                                  }}
                                  disabled={submittingComment}
                                ></textarea>
                                <label htmlFor={`comment-input-${task.id}`} style={{ fontSize: '0.85rem' }}>
                                  Ajouter un commentaire...
                                </label>
                                <button 
                                  className="btn btn-sm btn-primary position-absolute d-flex align-items-center justify-content-center"
                                  style={{ 
                                    right: '10px', 
                                    bottom: '10px', 
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    padding: '0'
                                  }}
                                  onClick={() => handleAddComment(task.id)}
                                  disabled={!newComment.trim() || submittingComment}
                                >
                                  {submittingComment ? (
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                  ) : (
                                    <Icon icon="mdi:send" style={{ fontSize: '1rem' }} />
                                  )}
                                </button>
                              </div>
                            </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Pied de modal */}
          <div className="modal-footer bg-white border-top-0 rounded-bottom-4 p-3">
            <div className="d-flex justify-content-between align-items-center w-100">
              <small className="text-muted">
                <Icon icon="mdi:information-outline" className="me-1" />
                Double-cliquez sur une tâche pour la modifier
              </small>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-3"
                onClick={onClose}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CSS pour l'animation */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default TodoListPopup;
