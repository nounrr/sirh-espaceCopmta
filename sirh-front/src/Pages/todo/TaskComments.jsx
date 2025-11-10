import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Icon } from '@iconify/react';
import { 
  fetchTaskComments, 
  addTaskComment, 
  updateTaskComment, 
  deleteTaskComment 
} from '../../Redux/Slices/taskCommentsSlice';
import Swal from 'sweetalert2';

const TaskComments = ({ taskId, taskTitle, onClose }) => {
  const dispatch = useDispatch();
  const { commentsByTask, isLoading, isError, message } = useSelector(state => state.taskComments);
  const { user: currentUser } = useSelector(state => state.auth);
  
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const textareaRef = useRef(null);

  const comments = commentsByTask[taskId] || [];

  useEffect(() => {
    if (taskId) {
      dispatch(fetchTaskComments(taskId));
    }
  }, [dispatch, taskId]);

  useEffect(() => {
    // Focus automatique sur le textarea après un court délai
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await dispatch(addTaskComment({ taskId, comment: newComment.trim() })).unwrap();
      setNewComment('');
      
      // Petit feedback visuel
      Swal.fire({
        icon: 'success',
        title: 'Commentaire ajouté',
        toast: true,
        position: 'top-end',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: message || 'Impossible d\'ajouter le commentaire',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false
      });
    }
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment.id);
    setEditText(comment.comment);
  };

  const handleUpdateComment = async (commentId) => {
    if (!editText.trim()) return;

    try {
      await dispatch(updateTaskComment({ 
        commentId, 
        comment: editText.trim(), 
        taskId 
      })).unwrap();
      setEditingComment(null);
      setEditText('');
      
      Swal.fire({
        icon: 'success',
        title: 'Commentaire modifié',
        toast: true,
        position: 'top-end',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: message || 'Impossible de modifier le commentaire',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false
      });
    }
  };

  const handleDeleteComment = async (commentId) => {
    const result = await Swal.fire({
      title: 'Supprimer le commentaire ?',
      text: 'Cette action est irréversible',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      try {
        await dispatch(deleteTaskComment({ commentId, taskId })).unwrap();
        
        Swal.fire({
          icon: 'success',
          title: 'Commentaire supprimé',
          toast: true,
          position: 'top-end',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: message || 'Impossible de supprimer le commentaire',
          toast: true,
          position: 'top-end',
          timer: 3000,
          showConfirmButton: false
        });
      }
    }
  };

  const canEditComment = (comment) => {
    return comment.user_id === currentUser?.id || currentUser?.role === 'RH';
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
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div 
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.5)', 
        zIndex: 1050,
        backdropFilter: 'blur(5px)'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="card border-0 shadow-lg"
        style={{ 
          width: '90%', 
          maxWidth: '600px', 
          maxHeight: '80vh',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="card-header border-0 p-4 text-white position-relative"
          style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        >
          <button 
            className="btn-close btn-close-white position-absolute top-0 end-0 m-3"
            onClick={onClose}
            style={{ fontSize: '1.2rem' }}
          ></button>
          
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 rounded-circle bg-white bg-opacity-20">
              <Icon icon="mdi:comment-multiple-outline" style={{ fontSize: '1.5rem' }} />
            </div>
            <div>
              <h5 className="mb-1 fw-bold">Commentaires</h5>
              <p className="mb-0 opacity-90 small">{taskTitle}</p>
            </div>
          </div>
          
          <div className="mt-3">
            <span className="badge px-3 py-2" style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '25px',
              fontWeight: '600'
            }}>
              {comments.length} commentaire{comments.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Body - Scrollable comments */}
        <div className="card-body p-0" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {isLoading && comments.length === 0 ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-5">
              <Icon icon="mdi:comment-remove-outline" style={{ fontSize: '3rem', color: '#e9ecef' }} />
              <p className="text-muted mt-3">Aucun commentaire pour cette tâche</p>
              <p className="text-muted small">Soyez le premier à commenter !</p>
            </div>
          ) : (
            <div className="p-3">
              {comments.map((comment, index) => (
                <div 
                  key={comment.id} 
                  className="mb-3"
                  style={{
                    animation: `fadeInUp 0.3s ease ${index * 0.1}s both`
                  }}
                >
                  <div 
                    className="card border-0 shadow-sm"
                    style={{ 
                      borderRadius: '12px',
                      background: comment.user_id === currentUser?.id 
                        ? 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)' 
                        : 'linear-gradient(135deg, #f8f9fa 0%, #fff 100%)'
                    }}
                  >
                    <div className="card-body p-3">
                      {/* User info and actions */}
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <div 
                            className="rounded-circle d-flex align-items-center justify-content-center"
                            style={{ 
                              width: '32px', 
                              height: '32px',
                              background: comment.user_id === currentUser?.id 
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                              color: 'white',
                              fontSize: '0.9rem',
                              fontWeight: 'bold'
                            }}
                          >
                            {(comment.user?.prenom?.[0] || comment.user?.name?.[0] || '?').toUpperCase()}
                          </div>
                          <div>
                            <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>
                              {comment.user?.prenom} {comment.user?.name || comment.user?.nom}
                              {comment.user_id === currentUser?.id && (
                                <span className="badge bg-primary ms-2" style={{ fontSize: '0.7rem' }}>Vous</span>
                              )}
                            </div>
                            <div className="text-muted small">{formatDate(comment.created_at)}</div>
                          </div>
                        </div>
                        
                        {canEditComment(comment) && (
                          <div className="dropdown">
                            <button 
                              className="btn btn-sm btn-light border-0" 
                              data-bs-toggle="dropdown"
                              style={{ borderRadius: '50%', width: '32px', height: '32px' }}
                            >
                              <Icon icon="mdi:dots-vertical" />
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end shadow border-0">
                              <li>
                                <button 
                                  className="dropdown-item d-flex align-items-center gap-2"
                                  onClick={() => handleEditComment(comment)}
                                >
                                  <Icon icon="mdi:pencil" />
                                  Modifier
                                </button>
                              </li>
                              <li>
                                <button 
                                  className="dropdown-item d-flex align-items-center gap-2 text-danger"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  <Icon icon="mdi:delete" />
                                  Supprimer
                                </button>
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Comment text */}
                      {editingComment === comment.id ? (
                        <div className="mt-2">
                          <textarea
                            className="form-control border-0"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows="3"
                            style={{ 
                              background: 'rgba(255, 255, 255, 0.8)',
                              borderRadius: '8px',
                              resize: 'none'
                            }}
                            autoFocus
                          />
                          <div className="d-flex gap-2 mt-2">
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleUpdateComment(comment.id)}
                              disabled={!editText.trim()}
                            >
                              <Icon icon="mdi:check" className="me-1" />
                              Sauvegarder
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setEditingComment(null);
                                setEditText('');
                              }}
                            >
                              <Icon icon="mdi:close" className="me-1" />
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mb-0" style={{ 
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {comment.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Add comment form */}
        <div className="card-footer border-0 bg-light p-4">
          <form onSubmit={handleAddComment}>
            <div className="d-flex gap-2 align-items-end">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ 
                  width: '36px', 
                  height: '36px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                {(currentUser?.prenom?.[0] || currentUser?.name?.[0] || '?').toUpperCase()}
              </div>
              <div className="flex-grow-1">
                <textarea
                  ref={textareaRef}
                  className="form-control shadow-sm"
                  placeholder="Écrivez votre commentaire..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows="2"
                  style={{ 
                    borderRadius: '12px',
                    resize: 'none',
                    background: '#ffffff',
                    border: '2px solid #e9ecef',
                    fontSize: '0.95rem',
                    lineHeight: '1.4',
                    color: '#212529'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleAddComment(e);
                    }
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 0.25rem rgba(102, 126, 234, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e9ecef';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <small className="text-muted">
                    <Icon icon="mdi:keyboard" className="me-1" />
                    Ctrl + Entrée pour envoyer
                  </small>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={!newComment.trim() || isLoading}
                    style={{ borderRadius: '20px' }}
                  >
                    {isLoading ? (
                      <div className="spinner-border spinner-border-sm me-2" role="status">
                        <span className="visually-hidden">Chargement...</span>
                      </div>
                    ) : (
                      <Icon icon="mdi:send" className="me-1" />
                    )}
                    Envoyer
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* CSS personnalisé */}
      <style>
        {`
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
          
          .dropdown-menu {
            border-radius: 12px !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
          }
          
          .dropdown-item:hover {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
          }
          
          .form-control::placeholder {
            color: #495057 !important;
            opacity: 1 !important;
            font-style: italic;
            font-weight: 400;
            visibility: visible !important;
            display: block !important;
          }
          
          .form-control:focus::placeholder {
            color: #6c757d !important;
            opacity: 0.8 !important;
            visibility: visible !important;
            display: block !important;
          }
          
          textarea.form-control {
            background-color: #ffffff !important;
            color: #212529 !important;
          }
          
          textarea.form-control:focus {
            background-color: #ffffff !important;
            color: #212529 !important;
            outline: none !important;
          }
        `}
      </style>
    </div>
  );
};

export default TaskComments;
