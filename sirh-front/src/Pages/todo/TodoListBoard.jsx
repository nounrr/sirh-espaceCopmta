

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTodoLists } from '../../Redux/Slices/todoListSlice';
import { updateTask } from '../../Redux/Slices/todoTaskSlice';
import { fetchUsers } from '../../Redux/Slices/userSlice';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toErrorMessage } from '../../utils/errorUtils';
import TaskComments from './TaskComments';


const TodoListBoard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, loading, error } = useSelector((state) => state.todoLists);
  const { user: currentUser } = useSelector((state) => state.auth);
  const { items: users } = useSelector((state) => state.users);
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);

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

  useEffect(() => {
    dispatch(fetchTodoLists());
    dispatch(fetchUsers());
  }, [dispatch]);

  // Debug: Afficher les données dans la console
  useEffect(() => {
    console.log('TodoListBoard Debug:');
    console.log('items:', items);
    console.log('currentUser:', currentUser);
    console.log('currentUser.id:', currentUser?.id);
    
    // Vérifier la structure des données
    if (items.length > 0) {
      console.log('Premier item:', items[0]);
      if (items[0].tasks && items[0].tasks.length > 0) {
        console.log('Première tâche:', items[0].tasks[0]);
        console.log('Champs de la tâche:', Object.keys(items[0].tasks[0]));
        
        // Vérifier toutes les tâches et leurs assignations
        items.forEach((list, listIndex) => {
          console.log(`Liste ${listIndex + 1}: ${list.title}`);
          if (list.tasks && list.tasks.length > 0) {
            list.tasks.forEach((task, taskIndex) => {
              console.log(`  Tâche ${taskIndex + 1}: "${task.title || task.description}"`, {
                id: task.id,
                assigned_to: task.assigned_to,
                assigned_to_type: typeof task.assigned_to,
                currentUserId: currentUser?.id,
                currentUserIdType: typeof currentUser?.id,
                isAssigned: task.assigned_to == currentUser?.id || task.assigned_to === currentUser?.id
              });
            });
          }
        });
      }
    }
  }, [items, currentUser]);

  // Récupérer TOUTES les tâches assignées à l'utilisateur connecté depuis toutes les listes
  const myTasks = items.reduce((allTasks, list) => {
    console.log(`Traitement de la liste: ${list.title}`);
    
    if (list.tasks && Array.isArray(list.tasks)) {
      console.log(`  ${list.tasks.length} tâches dans cette liste`);
      
      const userTasks = list.tasks.filter(task => {
        const isAssigned = task.assigned_to == currentUser?.id || task.assigned_to === currentUser?.id;
        console.log(`    Tâche "${task.title || task.description}": assigned_to=${task.assigned_to}, currentUser=${currentUser?.id}, isAssigned=${isAssigned}`);
        return isAssigned;
      }).map(task => ({
        ...task,
        listTitle: list.title,
        listId: list.id
      }));
      
      console.log(`  ${userTasks.length} tâches assignées trouvées`);
      return [...allTasks, ...userTasks];
    }
    return allTasks;
  }, []);

  console.log('Toutes mes tâches:', myTasks);
  console.log('Nombre total de tâches assignées:', myTasks.length);

  // Debug détaillé des statuts
  if (myTasks.length > 0) {
    console.log('Debug des statuts des tâches:');
    myTasks.forEach((task, index) => {
      console.log(`Tâche ${index + 1}:`, {
        title: task.title,
        description: task.description,
        status: task.status,
        statusType: typeof task.status,
        statusLength: task.status?.length
      });
    });
    
    // Voir tous les statuts uniques
    const allStatuses = [...new Set(myTasks.map(task => task.status))];
    console.log('Tous les statuts trouvés:', allStatuses);
  }

  // Afficher un message d'aide si aucune tâche n'est trouvée
  if (myTasks.length === 0 && items.length > 0 && currentUser?.id) {
    console.warn('Aucune tâche assignée trouvée. Vérifiez que:');
    console.warn('1. Les tâches ont bien un champ assigned_to');
    console.warn('2. La valeur de assigned_to correspond à currentUser.id');
    console.warn('3. Le type de données est cohérent (number vs string)');
    
    // Afficher toutes les valeurs d'assigned_to pour debug
    const allAssignedValues = items.flatMap(list => 
      list.tasks ? list.tasks.map(task => task.assigned_to) : []
    );
    console.warn('Toutes les valeurs assigned_to trouvées:', [...new Set(allAssignedValues)]);
    console.warn('currentUser.id:', currentUser.id, typeof currentUser.id);
  }

  // Filtrage par recherche sur les tâches
  const filteredTasks = myTasks.filter(task =>
    task.title?.toLowerCase().includes(search.toLowerCase()) ||
    task.description?.toLowerCase().includes(search.toLowerCase()) ||
    task.listTitle?.toLowerCase().includes(search.toLowerCase())
  );

  // Grouper les tâches par statut pour un affichage organisé
  const tasksByStatus = {
    'Non commencée': filteredTasks.filter(task => task.status === 'Non commencée' || task.status === 'En attente' || task.status === 'pending'),
    'En cours': filteredTasks.filter(task => task.status === 'En cours' || task.status === 'in_progress' || task.status === 'progress'),
    'Terminée': filteredTasks.filter(task => task.status === 'Terminée' || task.status === 'completed' || task.status === 'done')
  };

  console.log('Tâches groupées par statut:', tasksByStatus);
  console.log('Non commencée:', tasksByStatus['Non commencée'].length);
  console.log('En cours:', tasksByStatus['En cours'].length);
  console.log('Terminée:', tasksByStatus['Terminée'].length);

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      console.log('Changing task status:', { taskId, newStatus });
      
      // ✅ Mise à jour optimiste Redux sans rechargement de page
      const result = await dispatch(updateTask({ 
        id: taskId, 
        data: { status: newStatus }
      }));
      
      // Vérifier si la mise à jour a réussi
      if (updateTask.fulfilled.match(result)) {
        console.log('✅ Update successful:', result.payload);
        
        // ✅ Mise à jour silencieuse - pas de notification
        // Les données sont déjà mises à jour automatiquement dans le store Redux
        // L'interface se met à jour instantanément sans interruption
      } else {
        // ❌ En cas d'erreur, recharger les données pour synchroniser
        console.error('❌ Update failed, refreshing data:', result.error);
        await dispatch(fetchTodoLists());
        throw new Error(result.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('❌ Error updating task status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur lors de la mise à jour',
        text: error.message || 'Impossible de mettre à jour le statut',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Terminée': return { bg: '#28a745', text: 'white', icon: 'mdi:check-circle' };
      case 'En cours': return { bg: '#ffc107', text: 'black', icon: 'mdi:clock-outline' };
      case 'Non commencée': return { bg: '#6c757d', text: 'white', icon: 'mdi:pause-circle' };
      default: return { bg: '#dc3545', text: 'white', icon: 'mdi:alert-circle' };
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Haute': return '#dc3545';
      case 'Moyenne': return '#ffc107';
      case 'Faible': return '#28a745';
      default: return '#6c757d';
    }
  };

  return (
    <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <div className="container-fluid">
        {/* Bouton de retour simple */}
        <button 
          className="btn d-flex align-items-center gap-2 mb-3"
          onClick={() => navigate(-1)}
          style={{ 
            background: 'none',
            border: 'none',
            color: '#6c757d',
            padding: '0.5rem 0'
          }}
        >
          <Icon icon="mdi:arrow-left" />
          Retour
        </button>

        {/* En-tête moderne comme dans les projets */}
        <div className="card border-0 shadow-lg rounded-4 mb-4 overflow-hidden">
          <div className="card-body p-4" style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <div className="p-3 rounded-circle bg-white bg-opacity-20">
                  <Icon icon="mdi:clipboard-check-outline" style={{ fontSize: '2rem' }} />
                </div>
                <div>
                  <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>Mes Tâches</h1>
                  <p className="mb-0 opacity-90">Gérez et suivez l'avancement de vos tâches assignées</p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-3">
                <span className="badge d-flex align-items-center gap-1 px-3 py-2" style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '25px',
                  fontWeight: '600'
                }}>
                  <Icon icon="mdi:clipboard-list" />
                  {filteredTasks.length} tâche{filteredTasks.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
            
            {/* Barre de recherche intégrée */}
            <div className="mt-4">
              <div className="position-relative" style={{ maxWidth: '400px' }}>
                <Icon 
                  icon="mdi:magnify" 
                  className="position-absolute top-50 start-0 translate-middle-y ms-3 text-white opacity-75"
                  style={{ fontSize: '1.2rem' }}
                />
                <input
                  type="text"
                  className="form-control ps-5 rounded-pill border-0"
                  placeholder="Rechercher une tâche..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="mt-3 text-muted">Chargement de vos to-do lists...</p>
          </div>
    ) : error ? (
          <div className="alert alert-danger d-flex align-items-center gap-3" role="alert">
            <Icon icon="mdi:alert-circle" style={{ fontSize: '1.5rem' }} />
            <div>
              <h6 className="mb-1">Erreur de chargement</h6>
      <p className="mb-0">{toErrorMessage(error)}</p>
            </div>
          </div>
        ) : !currentUser?.id ? (
          <div className="card border-0 shadow-lg rounded-4">
            <div className="card-body text-center py-5">
              <div className="mb-4">
                <Icon icon="mdi:account-alert" style={{ fontSize: '4rem', color: '#e9ecef' }} />
              </div>
              <h5 className="text-muted mb-3">Utilisateur non connecté</h5>
              <p className="text-muted">Veuillez vous connecter pour voir vos tâches assignées.</p>
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="card border-0 shadow-lg rounded-4">
            <div className="card-body text-center py-5">
              <div className="mb-4">
                <Icon icon="mdi:clipboard-remove-outline" style={{ fontSize: '4rem', color: '#e9ecef' }} />
              </div>
              <h5 className="text-muted mb-3">Aucune tâche assignée</h5>
              <p className="text-muted mb-4">
                Vous n'avez actuellement aucune tâche assignée.
                {myTasks.length > 0 && filteredTasks.length === 0 && (
                  <><br />Essayez de modifier votre recherche.</>
                )}
              </p>
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-3 p-3 bg-light rounded">
                  <small className="text-muted">
                    <strong>Debug:</strong><br />
                    Total tâches: {myTasks.length}<br />
                    Tâches filtrées: {filteredTasks.length}<br />
                    User ID: {currentUser?.id}<br />
                    Total listes: {items.length}<br />
                    {myTasks.length > 0 && (
                      <>
                        <strong>Statuts des tâches:</strong><br />
                        {myTasks.map((task, i) => (
                          <span key={i}>
                            {i + 1}. "{task.title || task.description}" - Statut: "{task.status}"<br />
                          </span>
                        ))}
                      </>
                    )}
                  </small>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card border-0 shadow-lg rounded-4">
            <div className="card-header bg-white border-0 p-4">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-2 rounded-circle" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <Icon icon="mdi:clipboard-list" className="text-white" style={{ fontSize: '1.5rem' }} />
                  </div>
                  <div>
                    <h4 className="mb-1 fw-bold">Mes Tâches par Statut</h4>
                    <p className="text-muted small mb-0">Organisez et suivez l'avancement de vos tâches</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-body p-4">
              <div className="row g-4">
                {/* Colonnes par statut */}
                {Object.entries(tasksByStatus).map(([status, tasks]) => {
                  const statusConfig = {
                    'Non commencée': { 
                      color: '#6c757d', 
                      icon: 'mdi:pause-circle',
                      gradient: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)'
                    },
                    'En cours': { 
                      color: '#ffc107', 
                      icon: 'mdi:clock-outline',
                      gradient: 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)'
                    },
                    'Terminée': { 
                      color: '#28a745', 
                      icon: 'mdi:check-circle',
                      gradient: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                    }
                  };

                  return (
                    <div key={status} className="col-12 col-lg-4">
                      <div className="card h-100 border-0 shadow-sm position-relative overflow-hidden">
                        {/* En-tête de la colonne avec style projet */}
                        <div className="card-header border-0 p-3" style={{
                          background: statusConfig[status].gradient,
                          color: 'white'
                        }}>
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <Icon icon={statusConfig[status].icon} style={{ fontSize: '1.3rem' }} />
                              <h5 className="fw-bold mb-0">{status}</h5>
                            </div>
                            <span className="badge bg-white bg-opacity-20 px-2 py-1 fw-bold">
                              {tasks.length}
                            </span>
                          </div>
                        </div>

                        {/* Liste des tâches */}
                        <div className="card-body p-0" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                          {tasks.length === 0 ? (
                            <div className="p-4 text-center text-muted">
                              <Icon icon="mdi:clipboard-remove-outline" style={{ fontSize: '2.5rem', color: '#e9ecef' }} className="mb-3" />
                              <p className="mb-0 text-muted">
                                {status === 'Non commencée' ? 'Aucune tâche non commencée' : 
                                 status === 'En cours' ? 'Aucune tâche en cours' :
                                 'Aucune tâche terminée'}
                              </p>
                            </div>
                          ) : (
                            <div className="list-group list-group-flush">
                              {tasks.map((task, index) => {
                                const statusColor = getStatusColor(task.status);
                                
                                return (
                                  <div key={`${task.listId}-${task.id}`} className="list-group-item border-0 p-3">
                                    <div 
                                      className="card border-0 shadow-sm position-relative"
                                      style={{
                                        borderLeft: `4px solid ${statusColor.bg}`,
                                        background: task.status === 'Terminée' ? 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                        transition: 'all 0.3s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)';
                                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1), 0 3px 10px rgba(0,0,0,0.05)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                      }}
                                    >
                                      {/* Checkboxes de statut modernes en haut - disposition horizontale */}
                                      <div className="position-absolute" style={{ 
                                        top: '8px', 
                                        right: '8px', 
                                        zIndex: 1000 
                                      }}>
                                        <div className="d-flex flex-row gap-1">
                                          {/* Checkbox Non commencée */}
                                          <div className="custom-checkbox-container">
                                            <input 
                                              className="custom-checkbox" 
                                              type="checkbox" 
                                              id={`status-pending-${task.id}`}
                                              checked={task.status === 'Non commencée'}
                                              onChange={() => handleTaskStatusChange(task.id, 'Non commencée')}
                                            />
                                            <label 
                                              htmlFor={`status-pending-${task.id}`}
                                              className="custom-checkbox-label horizontal"
                                              style={{ '--color': '#6c757d' }}
                                              title="Non commencée"
                                            >
                                              <div className="checkbox-icon">
                                                <Icon icon="mdi:pause-circle" />
                                              </div>
                                            </label>
                                          </div>
                                          
                                          {/* Checkbox En cours */}
                                          <div className="custom-checkbox-container">
                                            <input 
                                              className="custom-checkbox" 
                                              type="checkbox" 
                                              id={`status-progress-${task.id}`}
                                              checked={task.status === 'En cours'}
                                              onChange={() => handleTaskStatusChange(task.id, 'En cours')}
                                            />
                                            <label 
                                              htmlFor={`status-progress-${task.id}`}
                                              className="custom-checkbox-label horizontal"
                                              style={{ '--color': '#ffc107' }}
                                              title="En cours"
                                            >
                                              <div className="checkbox-icon">
                                                <Icon icon="mdi:clock-outline" />
                                              </div>
                                            </label>
                                          </div>
                                          
                                          {/* Checkbox Terminée */}
                                          <div className="custom-checkbox-container">
                                            <input 
                                              className="custom-checkbox" 
                                              type="checkbox" 
                                              id={`status-done-${task.id}`}
                                              checked={task.status === 'Terminée'}
                                              onChange={() => handleTaskStatusChange(task.id, 'Terminée')}
                                            />
                                            <label 
                                              htmlFor={`status-done-${task.id}`}
                                              className="custom-checkbox-label horizontal"
                                              style={{ '--color': '#28a745' }}
                                              title="Terminée"
                                            >
                                              <div className="checkbox-icon">
                                                <Icon icon="mdi:check-circle" />
                                              </div>
                                            </label>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="card-body p-3">
                                        {/* Titre de la tâche avec largeur maximale */}
                                        <h6 className="" style={{ 
                                          fontSize: '0.5rem',
                                          lineHeight: '1.4',
                                          textDecoration: task.status === 'Terminée' ? 'line-through' : 'none',
                                          color: task.status === 'Terminée' ? '#6c757d' : '#212529',
                                          paddingTop: '20px', // Espace pour les checkboxes en haut
                                          width: '100%',
                                          maxWidth: '100%',
                                          wordWrap: 'break-word'
                                        }}>
                                          {task.title || task.description}
                                        </h6>
                                        
                                        {/* Nom du projet avec icône */}
                                        <div className="mb-3">
                                          <div className="d-flex align-items-center gap-2">
                                            <div className="p-2 rounded" style={{ backgroundColor: `${statusColor.bg}20` }}>
                                              <Icon icon="mdi:folder-outline" style={{ 
                                                fontSize: '1rem', 
                                                color: statusColor.bg 
                                              }} />
                                            </div>
                                            <span className="fw-semibold" style={{ 
                                              fontSize: '0.95rem',
                                              color: '#495057'
                                            }}>
                                              {task.listTitle}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        {/* Dates avec design moderne */}
                                        {(task.start_date || task.end_date) && (
                                          <div className="mb-2">
                                            <div className="row g-2">
                                              {task.start_date && (
                                                <div className="col-6">
                                                  <div className="d-flex align-items-center gap-2 p-2 rounded" style={{ backgroundColor: '#e3f2fd' }}>
                                                    <Icon icon="mdi:calendar-start" style={{ fontSize: '0.9rem', color: '#1976d2' }} />
                                                    <div>
                                                      <div className="fw-semibold text-muted" style={{ fontSize: '0.8rem' }}>Début</div>
                                                      <div className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>
                                                        {new Date(task.start_date).toLocaleDateString('fr-FR')}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                              
                                              {task.end_date && (
                                                <div className="col-6">
                                                  <div className="d-flex align-items-center gap-2 p-2 rounded" style={{ backgroundColor: '#ffebee' }}>
                                                    <Icon icon="mdi:calendar-end" style={{ fontSize: '0.9rem', color: '#d32f2f' }} />
                                                    <div>
                                                      <div className="fw-semibold text-muted" style={{ fontSize: '0.8rem' }}>Fin</div>
                                                      <div className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>
                                                        {new Date(task.end_date).toLocaleDateString('fr-FR')}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {/* Bouton commentaires */}
                                        <div className="d-flex justify-content-between align-items-center mt-3">
                                          <button
                                            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
                                            onClick={() => setSelectedTask(task)}
                                            style={{
                                              borderRadius: '20px',
                                              fontSize: '0.8rem',
                                              padding: '6px 12px'
                                            }}
                                          >
                                            <Icon icon="mdi:comment-outline" style={{ fontSize: '0.9rem' }} />
                                            <span>Commentaires</span>
                                            {task.comments && task.comments.length > 0 && (
                                              <span className="badge bg-primary rounded-pill">
                                                {task.comments.length}
                                              </span>
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
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal des commentaires */}
      {selectedTask && (
        <TaskComments
          taskId={selectedTask.id}
          taskTitle={selectedTask.title || selectedTask.description}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* CSS personnalisé moderne */}
      <style>
        {`
        .form-control::placeholder {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        .form-control:focus {
          background: rgba(255, 255, 255, 0.25) !important;
          border-color: rgba(255, 255, 255, 0.5) !important;
          box-shadow: 0 0 0 0.2rem rgba(255, 255, 255, 0.25) !important;
          color: white !important;
        }
        .form-select:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
        .card {
          transition: all 0.3s ease;
        }
        .card:hover {
          transform: translateY(-2px);
        }
        .list-group-item {
          transition: all 0.3s ease;
        }
        
        .badge {
          transition: all 0.3s ease;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        /* Styles modernes pour les checkboxes personnalisées */
        .custom-checkbox-container {
          position: relative;
          margin-bottom: 4px;
        }
        
        .custom-checkbox {
          display: none;
        }
        
        .custom-checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 15px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color);
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 2px solid transparent;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
          min-width: 130px;
          white-space: nowrap;
        }
        
        /* Style pour les checkboxes horizontales (seulement icônes) */
        .custom-checkbox-label.horizontal {
          min-width: auto;
          padding: 6px;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          justify-content: center;
        }
        
        .custom-checkbox-label.horizontal .checkbox-icon {
          width: 20px;
          height: 20px;
        }
        
        .custom-checkbox-label.horizontal .checkbox-icon svg {
          font-size: 14px;
        }
        
        .custom-checkbox-label:hover {
          background: rgba(255, 255, 255, 0.95);
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
        }
        
        .custom-checkbox:checked + .custom-checkbox-label {
          background: var(--color);
          color: white;
          border-color: var(--color);
          transform: scale(1.05);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        
        .custom-checkbox:checked + .custom-checkbox-label:hover {
          background: var(--color);
          filter: brightness(1.1);
        }
        
        .checkbox-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transition: all 0.3s ease;
        }
        
        .custom-checkbox:checked + .custom-checkbox-label .checkbox-icon {
          background: rgba(255, 255, 255, 0.4);
          transform: rotate(360deg);
        }
        
        .checkbox-icon svg {
          font-size: 12px;
          transition: all 0.3s ease;
        }
        
        .custom-checkbox:checked + .custom-checkbox-label .checkbox-icon svg {
          transform: scale(1.3);
        }
        
        /* Animation d'apparition */
        .custom-checkbox-container {
          animation: slideInRight 0.3s ease forwards;
          opacity: 0;
        }
        
        .custom-checkbox-container:nth-child(1) {
          animation-delay: 0.1s;
        }
        
        .custom-checkbox-container:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .custom-checkbox-container:nth-child(3) {
          animation-delay: 0.3s;
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        /* Améliorer l'apparence des cartes */
        .card {
          transition: all 0.3s ease;
        }
        
        .card:hover {
          transform: translateY(-2px);
        }
        
        .list-group-item {
          transition: all 0.3s ease;
        }
        
        /* Responsive pour les checkboxes */
        @media (max-width: 768px) {
          .custom-checkbox-label {
            font-size: 0.8rem;
            padding: 5px 10px;
            min-width: 110px;
          }
          
          .custom-checkbox-label.horizontal {
            width: 28px;
            height: 28px;
            padding: 4px;
          }
          
          .custom-checkbox-label.horizontal .checkbox-icon {
            width: 16px;
            height: 16px;
          }
          
          .custom-checkbox-label.horizontal .checkbox-icon svg {
            font-size: 12px;
          }
        }
        `}
      </style>
    </div>
  );
};

export default TodoListBoard;
