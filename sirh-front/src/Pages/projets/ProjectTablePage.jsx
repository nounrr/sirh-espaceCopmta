import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Icon } from '@iconify/react';
import Swal from 'sweetalert2';
import './ProjectTablePage.css';
import '../../styles/OverdueBadge.css';
import { 
  fetchProjects,
  createProject, 
  deleteProject 
} from '../../Redux/Slices/projectSlice';
import { 
  fetchTodoLists, 
  createTodoList, 
  deleteTodoList 
} from '../../Redux/Slices/todoListSlice';
import { 
  createTask, 
  deleteTask,
  updateTask
} from '../../Redux/Slices/todoTaskSlice';
import {
  fetchUsers
} from '../../Redux/Slices/userSlice';
import { 
  updateTodoList 
} from '../../Redux/Slices/todoListSlice';
import { 
  updateProject 
} from '../../Redux/Slices/projectSlice';
import { 
  fetchCommentsByTask,
  addTaskComment
} from '../../Redux/Slices/taskCommentsSlice';
import ProjectAuditHistory from '../../Components/ProjectAuditHistory';

const ProjectTablePage = () => {
  const dispatch = useDispatch();
  
  // États pour les données
  const { items: projects, status: projectsStatus } = useSelector(state => state.projects);
  const { items: todoLists, loading: todoListsLoading } = useSelector(state => state.todoLists);
  const { items: allTasks } = useSelector(state => state.todoTasks);
  const { user: currentUser } = useSelector(state => state.auth);
  const { items: users } = useSelector(state => state.users);
  const { commentsByTask } = useSelector(state => state.taskComments);
  
  // Obtenir toutes les tâches depuis les listes ET depuis le store des tâches
  const tasks = [
    // Tâches depuis les listes
    ...todoLists.reduce((allTasks, list) => {
      if (list.tasks && Array.isArray(list.tasks)) {
        return [...allTasks, ...list.tasks];
      }
      return allTasks;
    }, []),
    // Tâches depuis le store global des tâches (pour éviter les doublons, on filtre)
    ...allTasks.filter(task => 
      !todoLists.some(list => 
        list.tasks && list.tasks.some(listTask => listTask.id === task.id)
      )
    )
  ];
  
  // États pour les formulaires en ligne
  const [showAddProjectForm, setShowAddProjectForm] = useState(false);
  const [showAddListForm, setShowAddListForm] = useState({});
  const [showAddTaskForm, setShowAddTaskForm] = useState({});
  const [newProjectData, setNewProjectData] = useState({
    titre: '',
    description: '',
    date_debut: '',
    date_fin_prevu: ''
  });
  const [newListData, setNewListData] = useState({});
  const [newTaskData, setNewTaskData] = useState({});
  const [submittingProject, setSubmittingProject] = useState(false);
  const [submittingList, setSubmittingList] = useState({});
  const [submittingTask, setSubmittingTask] = useState({});
  
  // États pour la recherche et le filtrage
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date_created');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // État pour afficher les détails
  const [expandedRows, setExpandedRows] = useState({});
  
  // États pour la gestion des employés de la société (utilisés depuis Redux)
  const [employeeSearchQueries, setEmployeeSearchQueries] = useState({});
  const [showEmployeeDropdowns, setShowEmployeeDropdowns] = useState({});
  
  // États pour l'édition
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingListId, setEditingListId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editProjectData, setEditProjectData] = useState({});
  const [editListData, setEditListData] = useState({});
  const [editTaskData, setEditTaskData] = useState({});
  
  // État pour afficher les commentaires d'une tâche
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // État pour l'historique d'audit
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedProjectForAudit, setSelectedProjectForAudit] = useState(null);
  
  // Chargement initial des données
  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchTodoLists());
    dispatch(fetchUsers()); // Ajouter le chargement des utilisateurs
  }, [dispatch]);
  
  // Charger les commentaires d'une tâche lorsqu'elle est sélectionnée
  useEffect(() => {
    if (selectedTask) {
      dispatch(fetchCommentsByTask(selectedTask.id));
    }
  }, [dispatch, selectedTask]);

  // Debug: Observer les changements des listes
  useEffect(() => {
    console.log('TodoLists mis à jour:', todoLists.length, todoLists);
  }, [todoLists]);

  // Fermer les dropdowns d'employés quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Fermer tous les dropdowns d'employés si on clique en dehors
      if (!event.target.closest('.position-relative')) {
        setShowEmployeeDropdowns({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Fonction pour obtenir le nom d'un employé de la société
  const getUserName = (userId) => {
    if (!userId) return 'Non assigné';
    const user = users.find(u => u.id.toString() === userId.toString());
    if (user) {
      return `${user.prenom || ''} ${user.nom || user.name || ''}`.trim();
    }
    return `Utilisateur ${userId}`;
  };

  // Fonction pour obtenir les détails complets d'un employé
  const getEmployeeDetails = (userId) => {
    if (!userId) return null;
    return users.find(u => u.id.toString() === userId.toString());
  };

  // Fonctions pour la gestion des employés de la société
  const getFilteredEmployees = (listId) => {
    const query = employeeSearchQueries[listId] || '';
    if (!query.trim()) return users;
    
    return users.filter(user => 
      `${user.prenom || ''} ${user.nom || user.name || ''}`.trim().toLowerCase().includes(query.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(query.toLowerCase())) ||
      (user.departement && user.departement.toLowerCase().includes(query.toLowerCase())) ||
      (user.poste && user.poste.toLowerCase().includes(query.toLowerCase()))
    );
  };

  const handleEmployeeSelect = (listId, employee) => {
    // Gérer l'assignation pour les nouvelles tâches
    if (!listId.toString().startsWith('edit_')) {
      setNewTaskData(prev => ({
        ...prev,
        [listId]: {
          ...prev[listId],
          assigned_to: employee.id
        }
      }));
    } else {
      // Gérer l'assignation pour les tâches en cours d'édition
      setEditTaskData(prev => ({
        ...prev,
        assigned_to: employee.id
      }));
    }
    
    setEmployeeSearchQueries(prev => ({
      ...prev,
      [listId]: `${employee.prenom || ''} ${employee.name || employee.name || ''}`.trim()
    }));
    setShowEmployeeDropdowns(prev => ({
      ...prev,
      [listId]: false
    }));
  };

  const handleEmployeeSearchChange = (listId, value) => {
    setEmployeeSearchQueries(prev => ({
      ...prev,
      [listId]: value
    }));
    setShowEmployeeDropdowns(prev => ({
      ...prev,
      [listId]: true
    }));
    
    // Si la valeur est vide, reset l'assignation
    if (!value.trim()) {
      if (listId.toString().startsWith('edit_')) {
        // Pour l'édition
        setEditTaskData(prev => ({
          ...prev,
          assigned_to: ''
        }));
      } else {
        // Pour les nouvelles tâches
        setNewTaskData(prev => ({
          ...prev,
          [listId]: {
            ...prev[listId],
            assigned_to: ''
          }
        }));
      }
    }
  };
  
  // Fonction pour obtenir la progression (moyenne des pourcentages) d'une liste
  const getListCompletionStats = (listId) => {
    const listTasks = tasks.filter(task => task.todo_list_id === listId);
    // Exclure les tâches annulées du calcul
    const activeTasks = listTasks.filter(t => t.status !== 'Annulé');
    if (activeTasks.length === 0) {
      return { total: 0, completed: 0, percent: 0 };
    }
    const completedTasks = activeTasks.filter(task => task.status === 'Terminée');
    const sumProgress = activeTasks.reduce((acc, t) => {
      if (t.status === 'Terminée') return acc + 100;
      if (t.status === 'En cours') return acc + (Number(t.pourcentage) || 0);
      return acc; // Non commencée (ou autres) = 0
    }, 0);
    const percent = Math.round(sumProgress / activeTasks.length);
    const list = todoLists.find(list => list.id === listId);
    console.log(`Liste "${list?.titre || list?.title || listId}": progression ${percent}% (terminées: ${completedTasks.length}/${activeTasks.length}, annulées exclues: ${listTasks.length - activeTasks.length})`);
    return {
      total: activeTasks.length,
      completed: completedTasks.length,
      percent
    };
  };
  
  // Fonction pour obtenir stats projet à partir des progressions de listes (moyenne simple non pondérée)
  // Chaque liste a le même poids, comme demandé.
  const getProjectStats = (projectId) => {
    const projectLists = todoLists.filter(list => list.project_id === projectId);
    if (projectLists.length === 0) {
      return { lists: 0, tasks: 0, completedTasks: 0, cancelledTasks: 0, percent: 0 };
    }
    let totalTasks = 0;
    let totalCompletedTasks = 0;
    let totalCancelledTasks = 0;
    let sumPercents = 0;
    projectLists.forEach(l => {
      // All tasks of the list for cancellation count
      const listAllTasks = tasks.filter(t => t.todo_list_id === l.id);
      const listCancelled = listAllTasks.filter(t => t.status === 'Annulé').length;
      totalCancelledTasks += listCancelled;
      const stats = getListCompletionStats(l.id); // uses active (non annulé) tasks
      totalTasks += stats.total; // active tasks only
      totalCompletedTasks += stats.completed;
      // Ajoute le pourcentage tel quel (moyenne simple)
      sumPercents += stats.percent;
    });
    const percent = Math.round(sumPercents / projectLists.length);
    const project = projects.find(p => p.id === projectId);
    console.log(`Projet "${project?.titre || project?.title || projectId}" progression (moyenne simple) = ${percent}% (tâches complétées ${totalCompletedTasks}/${totalTasks})`);
    return {
      lists: projectLists.length,
      tasks: totalTasks,
      completedTasks: totalCompletedTasks,
      cancelledTasks: totalCancelledTasks,
      percent
    };
  };
  
  // Fonction pour basculer l'affichage d'une ligne détail
  const toggleRowExpanded = (rowId, type) => {
    setExpandedRows(prev => ({
      ...prev,
      [`${type}_${rowId}`]: !prev[`${type}_${rowId}`]
    }));
  };
  
  // Fonction pour filtrer les projets selon la recherche et les filtres
  const getFilteredProjects = () => {
    return projects
      .filter(project => {
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          return (
            project.titre?.toLowerCase().includes(searchLower) ||
            project.description?.toLowerCase().includes(searchLower)
          );
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'titre':
            return sortOrder === 'asc' 
              ? a.titre.localeCompare(b.titre) 
              : b.titre.localeCompare(a.titre);
          case 'date_created':
            return sortOrder === 'asc' 
              ? new Date(a.created_at) - new Date(b.created_at) 
              : new Date(b.created_at) - new Date(a.created_at);
          case 'date_debut':
            return sortOrder === 'asc' 
              ? new Date(a.date_debut || 0) - new Date(b.date_debut || 0) 
              : new Date(b.date_debut || 0) - new Date(a.date_debut || 0);
          default:
            return 0;
        }
      });
  };
  
  // Fonction pour filtrer les listes selon la recherche et les filtres
  const getFilteredLists = (projectId) => {
    return todoLists
      .filter(list => list.project_id === projectId)
      .filter(list => {
        if (searchQuery) {
          return list.title?.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
      })
      .sort((a, b) => {
        return sortOrder === 'asc' 
          ? new Date(a.created_at) - new Date(b.created_at) 
          : new Date(b.created_at) - new Date(a.created_at);
      });
  };
  
  // Fonction pour filtrer les tâches selon la recherche et les filtres
  const getFilteredTasks = (listId) => {
    const lidNum = Number(listId);
    return tasks
      .filter(task => Number(task.todo_list_id) === lidNum)
      .filter(task => {
        // Filtre par statut
        if (filterStatus !== 'all' && task.status !== filterStatus) {
          return false;
        }
        
        // Filtre par recherche
        if (searchQuery) {
          return task.description?.toLowerCase().includes(searchQuery.toLowerCase());
        }
        
        return true;
      })
      .sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at) : new Date();
        const bDate = b.created_at ? new Date(b.created_at) : new Date();
        return sortOrder === 'asc' 
          ? aDate - bDate
          : bDate - aDate;
      });
  };

  // Fonctions pour les formulaires en ligne
  const handleAddProjectInline = () => {
    setShowAddProjectForm(true);
    setNewProjectData({
      titre: '',
      description: '',
      date_debut: '',
      date_fin_prevu: ''
    });
  };

  const handleSubmitProjectInline = async () => {
    if (!newProjectData.titre.trim()) return;
    
    setSubmittingProject(true);
    try {
      await dispatch(createProject(newProjectData)).unwrap();
      setShowAddProjectForm(false);
      setNewProjectData({
        titre: '',
        description: '',
        date_debut: '',
        date_fin_prevu: ''
      });
    } catch (error) {
      console.error('Erreur lors de la création du projet:', error);
      alert('Erreur lors de la création du projet: ' + error);
    } finally {
      setSubmittingProject(false);
    }
  };

  const handleCancelProjectInline = () => {
    setShowAddProjectForm(false);
    setNewProjectData({
      titre: '',
      description: '',
      date_debut: '',
      date_fin_prevu: ''
    });
  };

  const handleAddListInline = (projectId) => {
    console.log('Ajouter liste pour projet:', projectId); // Debug
    setShowAddListForm(prev => ({ ...prev, [projectId]: true }));
    setNewListData(prev => ({ 
      ...prev, 
      [projectId]: { 
        title: '', 
        project_id: projectId 
      } 
    }));
  };

const handleSubmitListInline = async (projectId) => {
  const listData = newListData[projectId];
  if (!listData?.title.trim()) return;

  setSubmittingList(prev => ({ ...prev, [projectId]: true }));

  try {
    const result = await dispatch(createTodoList(listData)).unwrap();

    // ⬇️ Refetch des listes à jour
    await dispatch(fetchTodoLists());

    setShowAddListForm(prev => ({ ...prev, [projectId]: false }));
    setNewListData(prev => {
      const updated = { ...prev };
      delete updated[projectId];
      return updated;
    });
  } catch (error) {
    console.error('Erreur lors de la création de la liste:', error);
    alert('Erreur lors de la création de la liste: ' + error);
  } finally {
    setSubmittingList(prev => ({ ...prev, [projectId]: false }));
  }
};


  const handleCancelListInline = (projectId) => {
    setShowAddListForm(prev => ({ ...prev, [projectId]: false }));
    setNewListData(prev => {
      const updated = { ...prev };
      delete updated[projectId];
      return updated;
    });
  };

  const handleAddTaskInline = (listId) => {
    setShowAddTaskForm(prev => ({ ...prev, [listId]: true }));
    setNewTaskData(prev => ({ 
      ...prev, 
      [listId]: { 
        description: '', 
        status: 'Non commencée',
        assigned_to: '',
        start_date: '',
        end_date: '',
        type: 'AC',
        origine: '',
        todo_list_id: listId 
      } 
    }));
  };

  const handleSubmitTaskInline = async (listId) => {
    const taskData = newTaskData[listId];
    if (!taskData?.description.trim()) return;
    
    setSubmittingTask(prev => ({ ...prev, [listId]: true }));
    try {
      const payload = {
        description: taskData.description,
        status: taskData.status,
        assigned_to: taskData.assigned_to || null,
        start_date: taskData.start_date || null,
        end_date: taskData.end_date || null,
  // Ajout des nouveaux champs
  type: taskData.type || null,
  origine: taskData.origine || null,
      };
      await dispatch(createTask({ listId, data: payload })).unwrap();
      setShowAddTaskForm(prev => ({ ...prev, [listId]: false }));
      setNewTaskData(prev => {
        const updated = { ...prev };
        delete updated[listId];
        return updated;
      });
    } catch (error) {
      console.error('Erreur lors de la création de la tâche:', error);
      alert('Erreur lors de la création de la tâche: ' + error);
    } finally {
      setSubmittingTask(prev => ({ ...prev, [listId]: false }));
    }
  };

  const handleCancelTaskInline = (listId) => {
    setShowAddTaskForm(prev => ({ ...prev, [listId]: false }));
    setNewTaskData(prev => {
      const updated = { ...prev };
      delete updated[listId];
      return updated;
    });
    // Réinitialiser les états des employés
    setEmployeeSearchQueries(prev => {
      const updated = { ...prev };
      delete updated[listId];
      return updated;
    });
    setShowEmployeeDropdowns(prev => {
      const updated = { ...prev };
      delete updated[listId];
      return updated;
    });
  };
  
  // Formatage de date
  const formatDate = (dateString) => {
    if (!dateString) return 'Non défini';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  // Gestion de la suppression
  const handleDeleteProject = async (projectId) => {
    const result = await Swal.fire({
      title: 'Supprimer le projet ?',
      text: 'Cette action supprimera définitivement le projet et toutes ses listes/tâches associées. Cette action est irréversible !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      reverseButtons: true
    });
    
    if (result.isConfirmed) {
      try {
        await dispatch(deleteProject(projectId)).unwrap();
        Swal.fire({
          title: 'Supprimé !',
          text: 'Le projet a été supprimé avec succès.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire({
          title: 'Erreur !',
          text: 'Une erreur est survenue lors de la suppression du projet.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    }
  };
  
  const handleDeleteList = async (listId) => {
    const result = await Swal.fire({
      title: 'Supprimer la liste ?',
      text: 'Cette action supprimera définitivement la liste et toutes ses tâches associées. Cette action est irréversible !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      reverseButtons: true
    });
    
    if (result.isConfirmed) {
      try {
        await dispatch(deleteTodoList(listId)).unwrap();
        Swal.fire({
          title: 'Supprimée !',
          text: 'La liste a été supprimée avec succès.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire({
          title: 'Erreur !',
          text: 'Une erreur est survenue lors de la suppression de la liste.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    }
  };
  
  // Fonction pour ouvrir l'historique d'audit d'un projet
  const handleShowAuditHistory = (project) => {
    setSelectedProjectForAudit(project);
    setShowAuditModal(true);
  };
  
  // Fonction pour fermer l'historique d'audit
  const handleCloseAuditHistory = () => {
    setShowAuditModal(false);
    setSelectedProjectForAudit(null);
  };
  
  const handleDeleteTask = async (taskId) => {
    const result = await Swal.fire({
      title: 'Supprimer la tâche ?',
      text: 'Cette action supprimera définitivement la tâche. Cette action est irréversible !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      reverseButtons: true
    });
    
    if (result.isConfirmed) {
      try {
        await dispatch(deleteTask({ id: taskId })).unwrap();
        // Popup de succès supprimée comme demandé
      } catch (error) {
        Swal.fire({
          title: 'Erreur !',
          text: 'Une erreur est survenue lors de la suppression de la tâche.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    }
  };
  
  // Fonctions pour éditer un projet
  const handleEditProject = (project) => {
    setEditingProjectId(project.id);
    setEditProjectData({
      id: project.id,
      titre: project.titre,
      description: project.description || '',
      date_debut: project.date_debut || '',
      date_fin_prevu: project.date_fin_prevu || ''
    });
  };

  const handleSaveProjectEdit = async () => {
    try {
      await dispatch(updateProject(editProjectData)).unwrap();
      setEditingProjectId(null);
      setEditProjectData({});
    } catch (error) {
      console.error('Erreur lors de la mise à jour du projet:', error);
      alert('Erreur lors de la mise à jour du projet: ' + error);
    }
  };

  const handleCancelProjectEdit = () => {
    setEditingProjectId(null);
    setEditProjectData({});
  };

  // Fonctions pour éditer une liste
  const handleEditList = (list) => {
    setEditingListId(list.id);
    setEditListData({
      id: list.id,
      title: list.title,
  project_id: list.project_id
    });
  };

  const handleSaveListEdit = async () => {
    try {
      await dispatch(updateTodoList(editListData)).unwrap();
      setEditingListId(null);
      setEditListData({});
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la liste:', error);
      alert('Erreur lors de la mise à jour de la liste: ' + error);
    }
  };

  const handleCancelListEdit = () => {
    setEditingListId(null);
    setEditListData({});
  };

  // Fonctions pour éditer une tâche
  const handleEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditTaskData({
      id: task.id,
      description: task.description,
      status: task.status,
      assigned_to: task.assigned_to || '',
  start_date: task.start_date || '',
  end_date: task.end_date || '',
      type: task.type || 'AC',
      origine: task.origine || '',
      pourcentage: task.pourcentage || 0,
      todo_list_id: task.todo_list_id
    });
    
    if (task.assigned_to) {
      const user = users.find(u => u.id.toString() === task.assigned_to.toString());
      if (user) {
        setEmployeeSearchQueries(prev => ({
          ...prev,
          [`edit_${task.id}`]: `${user.prenom || ''} ${user.nom || user.name || ''}`.trim()
        }));
      }
    }
  };

  const handleSaveTaskEdit = async () => {
    try {
      console.log('Sauvegarde de la tâche:', editTaskData); // Debug
      console.log('Assigned_to avant envoi:', editTaskData.assigned_to); // Debug spécifique
      const { id, ...taskData } = editTaskData; // Extraire l'id et le reste des données
      console.log('TaskData à envoyer:', taskData); // Debug du payload
      await dispatch(updateTask({ id, data: taskData })).unwrap();
      
      // Recharger les listes pour avoir les données à jour
      await dispatch(fetchTodoLists());
      
      setEditingTaskId(null);
      setEditTaskData({});
      
      // Nettoyer les états relatifs à l'employé
      setEmployeeSearchQueries(prev => {
        const updated = { ...prev };
        delete updated[`edit_${id}`];
        return updated;
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la tâche:', error);
      alert('Erreur lors de la mise à jour de la tâche: ' + (error.message || error));
    }
  };

  const handleCancelTaskEdit = () => {
    setEditingTaskId(null);
    setEditTaskData({});
    // Nettoyer les états relatifs à l'employé
    setEmployeeSearchQueries(prev => {
      const updated = { ...prev };
      delete updated[`edit_${editingTaskId}`];
      return updated;
    });
  };

  // Fonction pour gérer les commentaires
  const handleShowComments = (task) => {
    setSelectedTask(task);
    setShowCommentsModal(true);
  };

  const handleCloseComments = () => {
    setSelectedTask(null);
    setShowCommentsModal(false);
    setNewComment('');
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !selectedTask) return;
    
    setSubmittingComment(true);
    try {
      // Adapter cette partie à votre API
      await dispatch(addTaskComment({ 
        taskId: selectedTask.id, 
        comment: newComment 
      })).unwrap();
      
      setNewComment('');
      // Recharger les commentaires
      dispatch(fetchCommentsByTask(selectedTask.id));
    } catch (error) {
      console.error('Erreur lors de l\'ajout du commentaire:', error);
      alert('Erreur lors de l\'ajout du commentaire: ' + error);
    } finally {
      setSubmittingComment(false);
    }
  };
  
  // Déterminer si l'utilisateur peut modifier/supprimer
  const canManageProject = () => {
    return ['RH', 'Gest_RH', 'admin', 'Chef_Dep', 'Chef_Chant'].includes(currentUser?.role);
  };

  // Calcul du statut global du projet (règles utilisateur)
  // Règles:
  // - Aucun (ou zéro tâche active) => Non commencé
  // - Toutes les tâches actives terminées => Terminé
  // - Sinon (au moins une en cours OU mélange terminé/non commencé) => En cours
  // Les tâches "Annulé" sont ignorées. Une tâche "En cours" à 100% est considérée comme terminée (cohérence règle globale).
  const getProjectStatus = (projectId) => {
    const projectLists = todoLists.filter(l => l.project_id === projectId);
    const projectTasks = projectLists.flatMap(l => tasks.filter(t => t.todo_list_id === l.id));
    const activeTasks = projectTasks.filter(t => t.status !== 'Annulé');
    if (activeTasks.length === 0) {
      return { label: 'Non commencé', color: '#6c757d', icon: 'mdi:progress-clock' };
    }
    const completedCount = activeTasks.filter(t => t.status === 'Terminée' || (t.status === 'En cours' && Number(t.pourcentage) >= 100)).length;
    const inProgressCount = activeTasks.filter(t => t.status === 'En cours' && Number(t.pourcentage) < 100).length;
    const notStartedCount = activeTasks.filter(t => !t.status || t.status === 'Non commencée').length;
    // Toutes terminées
    if (completedCount === activeTasks.length) {
      return { label: 'Terminé', color: '#28a745', icon: 'mdi:check-circle' };
    }
    // Si au moins une en cours OU mélange de terminées / non commencées => En cours
    if (inProgressCount > 0 || (completedCount > 0 && notStartedCount > 0)) {
      return { label: 'En cours', color: '#ffc107', icon: 'mdi:clock-outline' };
    }
    // Si aucune terminée ni en cours => toutes non commencées
    if (completedCount === 0 && inProgressCount === 0 && notStartedCount === activeTasks.length) {
      return { label: 'Non commencé', color: '#6c757d', icon: 'mdi:progress-clock' };
    }
    // Par défaut (autres combinaisons) => En cours
    return { label: 'En cours', color: '#ffc107', icon: 'mdi:clock-outline' };
  };

  // Fonction pour vérifier si un projet est en retard
  const isProjectOverdue = (project) => {
    if (!project.date_fin_prevu) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(project.date_fin_prevu);
    dueDate.setHours(0, 0, 0, 0);
    
    const status = getProjectStatus(project.id);
    
    // Un projet est en retard si la date d'échéance est dépassée et qu'il n'est pas terminé
    return dueDate < today && status.label !== 'Terminé';
  };

  // Fonction pour vérifier si une liste est en retard
  const isListOverdue = (list) => {
    if (!list.due_date && !list.end_date) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(list.due_date || list.end_date);
    dueDate.setHours(0, 0, 0, 0);
    
    const listTasks = tasks.filter(task => task.todo_list_id === list.id);
    const activeTasks = listTasks.filter(t => t.status !== 'Annulé');
    const completedTasks = activeTasks.filter(t => t.status === 'Terminée');
    
    // Une liste est en retard si la date d'échéance est dépassée et qu'elle n'est pas complète
    return dueDate < today && completedTasks.length < activeTasks.length;
  };

  // Fonction pour vérifier si une tâche est en retard
  const isTaskOverdue = (task) => {
    if (!task.end_date && !task.due_date) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(task.end_date || task.due_date);
    dueDate.setHours(0, 0, 0, 0);
    
    // Une tâche est en retard si la date d'échéance est dépassée et qu'elle n'est pas terminée
    return dueDate < today && task.status !== 'Terminée' && task.status !== 'Annulé';
  };

  // Fonction pour obtenir le badge de retard
  const getOverdueBadge = () => {
    return (
      <span className="overdue-badge">
        <Icon icon="mdi:clock-alert-outline" style={{ fontSize: '0.9rem' }} />
        <span className="badge-text">En retard</span>
      </span>
    );
  };

  const isLoading = projectsStatus === 'loading' || todoListsLoading;

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div className="container-fluid px-3">
        {/* En-tête de la page */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4" style={{ backgroundColor: '#ffffff' }}>
                <div className="row align-items-center">
                  <div className="col-lg-8 col-md-7">
                    <div className="d-flex align-items-center gap-4">
                      <div className="p-4 rounded-4 bg-gradient position-relative overflow-hidden" style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
                      }}>
                        <Icon icon="solar:folder-with-files-bold-duotone" style={{ fontSize: '2.5rem', color: 'white' }} />
                        <div className="position-absolute top-0 start-0 w-100 h-100 bg-white" style={{ opacity: '0.1' }}></div>
                      </div>
                      <div>
                        <h1 className="fw-bold mb-2 text-dark" style={{ 
                          fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text'
                        }}>Tableau des Projets</h1>
                        <p className="text-muted mb-0 d-none d-md-block fs-6">Gérez tous vos projets, listes et tâches en un seul endroit avec une interface moderne</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-4 col-md-5 text-md-end">
                    <button 
                      className="btn btn-primary d-flex align-items-center gap-2 px-4 py-3 shadow-lg mx-auto mx-md-0 rounded-pill"
                      onClick={() => handleAddProjectInline()}
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        transition: 'all 0.3s ease',
                        fontSize: '0.95rem',
                        fontWeight: '600'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(102, 126, 234, 0.3)';
                      }}
                    >
                      <Icon icon="solar:add-circle-bold-duotone" style={{ fontSize: '1.3rem' }} />
                      <span className="d-none d-sm-inline">Nouveau Projet</span>
                      <span className="d-sm-none">Nouveau</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Barre de recherche et filtres */}
        <div className="card border-0 shadow-sm mb-4 rounded-4">
          <div className="card-body p-4">
            <div className="row g-4">
              <div className="col-lg-5 col-md-6">
                <div className="input-group input-group-lg rounded-pill shadow-sm">
                  <span className="input-group-text bg-white border-0 rounded-start-pill px-4" style={{
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important'
                  }}>
                    <Icon icon="solar:magnifer-bold-duotone" style={{ fontSize: '1.3rem', color: '#667eea' }} />
                  </span>
                  <input
                    type="text"
                    className="form-control border-0 rounded-end-pill px-4"
                    placeholder="Rechercher projets, listes ou tâches..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ fontSize: '1rem', fontWeight: '500' }}
                  />
                </div>
              </div>
              <div className="col-lg-2 col-md-3 col-6">
                <select
                  className="form-select form-select-lg rounded-pill shadow-sm border-0"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  style={{ 
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                    fontSize: '0.95rem',
                    fontWeight: '500'
                  }}
                >
                  <option value="all">Tous statuts</option>
                  <option value="Non commencée">Non commencée</option>
                  <option value="En cours">En cours</option>
                  <option value="Terminée">Terminée</option>
                </select>
              </div>
              <div className="col-lg-2 col-md-3 col-6">
                <select
                  className="form-select form-select-lg rounded-pill shadow-sm border-0"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  style={{ 
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                    fontSize: '0.95rem',
                    fontWeight: '500'
                  }}
                >
                  <option value="date_created">Date création</option>
                  <option value="titre">Titre</option>
                  <option value="date_debut">Date début</option>
                </select>
              </div>
              <div className="col-lg-3 col-md-12">
                <button
                  className="btn btn-outline-primary d-flex align-items-center gap-2 w-100 justify-content-center rounded-pill px-4 py-3 shadow-sm"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  style={{
                    borderColor: '#667eea',
                    color: '#667eea',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#667eea';
                    e.currentTarget.style.borderColor = '#667eea';
                  }}
                >
                  <Icon icon={sortOrder === 'asc' ? 'solar:sort-vertical-bold-duotone' : 'solar:sort-vertical-bold-duotone'} 
                    style={{ transform: sortOrder === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }} />
                  <span className="d-none d-sm-inline">{sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}</span>
                  <span className="d-sm-none">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tableau principal */}
        <div className="card border-0 shadow-lg rounded-5" style={{
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
          backdropFilter: 'blur(10px)'
        }}>
          <div className="card-body p-0">
            {isLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
                  <span className="visually-hidden">Chargement...</span>
                </div>
                <h5 className="text-muted">Chargement des données...</h5>
                <p className="text-muted small">Veuillez patienter quelques instants</p>
              </div>
            ) : getFilteredProjects().length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-4">
                  <Icon icon="solar:folder-cross-bold-duotone" style={{ fontSize: '5rem', color: '#e9ecef' }} />
                </div>
                <h4 className="text-muted mb-3">Aucun projet trouvé</h4>
                <p className="text-muted mb-4">Commencez par créer votre premier projet pour organiser vos tâches</p>
                <button
                  className="btn btn-primary d-flex align-items-center gap-2 mx-auto rounded-pill px-4 py-3 shadow-lg"
                  onClick={() => handleAddProjectInline()}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none'
                  }}
                >
                  <Icon icon="solar:add-circle-bold-duotone" style={{ fontSize: '1.2rem' }} />
                  Créer un projet
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                {/* Formulaire en ligne pour ajouter un projet */}
                {showAddProjectForm && (
                  <div className="m-3 p-4 bg-light border rounded">
                    <div className="row g-3">
                      <div className="col-lg-4 col-md-6">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Titre du projet *"
                          value={newProjectData.titre}
                          onChange={(e) => setNewProjectData(prev => ({ ...prev, titre: e.target.value }))}
                          autoFocus
                        />
                      </div>
                      <div className="col-lg-4 col-md-6">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Description"
                          value={newProjectData.description}
                          onChange={(e) => setNewProjectData(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      <div className="col-lg-2 col-md-6">
                        <input
                          type="date"
                          className="form-control"
                          placeholder="Date début"
                          value={newProjectData.date_debut}
                          onChange={(e) => setNewProjectData(prev => ({ ...prev, date_debut: e.target.value }))}
                        />
                      </div>
                      <div className="col-lg-2 col-md-6">
                        <input
                          type="date"
                          className="form-control"
                          placeholder="Date fin prévue"
                          value={newProjectData.date_fin_prevu}
                          onChange={(e) => setNewProjectData(prev => ({ ...prev, date_fin_prevu: e.target.value }))}
                        />
                      </div>
                      <div className="col-12">
                        <div className="d-flex gap-2 justify-content-end">
                          <button
                            type="button"
                            className="btn btn-success"
                            onClick={handleSubmitProjectInline}
                            disabled={!newProjectData.titre.trim() || submittingProject}
                          >
                            {submittingProject ? (
                              <div className="spinner-border spinner-border-sm">
                                <span className="visually-hidden">Loading...</span>
                              </div>
                            ) : (
                              <>
                                <Icon icon="material-symbols:check" />
                                <span className="d-none d-sm-inline ms-1">Enregistrer</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleCancelProjectInline}
                          >
                            <Icon icon="material-symbols:close" />
                            <span className="d-none d-sm-inline ms-1">Annuler</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <table className="table table-hover align-middle mb-0" style={{ boxShadow: 'none' }}>
                  <thead style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '20px 20px 0 0'
                  }}>
                    <tr style={{ borderRadius: '20px 20px 0 0' }}>
                      <th style={{ 
                        width: '50px', 
                        color: 'white', 
                        fontWeight: '700',
                        border: 'none',
                        fontSize: '1rem',
                        paddingTop: '1.5rem',
                        paddingBottom: '1.5rem',
                        paddingLeft: '2rem'
                      }}></th>
                      <th style={{ 
                        minWidth: '250px', 
                        color: 'white', 
                        fontWeight: '700',
                        border: 'none',
                        fontSize: '1rem',
                        paddingTop: '1.5rem',
                        paddingBottom: '1.5rem'
                      }}>
                        <div className="d-flex align-items-center gap-3">
                          <Icon icon="solar:folder-favourite-bookmark-bold-duotone" style={{ fontSize: '1.3rem' }} />
                          <span>Projet</span>
                        </div>
                      </th>
                      <th style={{ 
                        minWidth: '180px', 
                        color: 'white', 
                        fontWeight: '700',
                        border: 'none',
                        fontSize: '1rem',
                        paddingTop: '1.5rem',
                        paddingBottom: '1.5rem'
                      }} className="d-none d-md-table-cell">
                        <div className="d-flex align-items-center gap-3">
                          <Icon icon="solar:calendar-date-bold-duotone" style={{ fontSize: '1.3rem' }} />
                          <span>Période</span>
                        </div>
                      </th>
                      <th style={{ 
                        minWidth: '150px', 
                        color: 'white', 
                        fontWeight: '700',
                        border: 'none',
                        fontSize: '1rem',
                        paddingTop: '1.5rem',
                        paddingBottom: '1.5rem'
                      }}>
                        <div className="d-flex align-items-center gap-3">
                          <Icon icon="solar:chart-2-bold-duotone" style={{ fontSize: '1.3rem' }} />
                          <span>Progression</span>
                        </div>
                      </th>
                      <th style={{ 
                        minWidth: '120px', 
                        color: 'white', 
                        fontWeight: '700',
                        border: 'none',
                        fontSize: '1rem',
                        paddingTop: '1.5rem',
                        paddingBottom: '1.5rem'
                      }} className="d-none d-lg-table-cell">
                        <div className="d-flex align-items-center gap-3">
                          <Icon icon="solar:flag-bold-duotone" style={{ fontSize: '1.3rem' }} />
                          <span>Statut</span>
                        </div>
                      </th>
                      <th style={{ 
                        width: '160px', 
                        color: 'white', 
                        fontWeight: '700',
                        border: 'none',
                        fontSize: '1rem',
                        paddingTop: '1.5rem',
                        paddingBottom: '1.5rem',
                        textAlign: 'center',
                        paddingRight: '2rem'
                      }}>
                        <div className="d-flex align-items-center justify-content-center gap-3">
                          <Icon icon="solar:settings-bold-duotone" style={{ fontSize: '1.3rem' }} />
                          <span>Actions</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: '#ffffff' }}>
                    {/* Ligne pour ajouter un nouveau projet */}
                    {!showAddProjectForm && (
                      <tr style={{ 
                        backgroundColor: '#f8f9fc',
                        borderLeft: '6px solid transparent',
                        borderImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%) 1',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative'
                      }} 
                      className="table-light"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f2ff';
                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.005)';
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.2)';
                        e.currentTarget.style.zIndex = '10';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fc';
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.zIndex = 'auto';
                      }}>
                        <td style={{ border: 'none', paddingTop: '2rem', paddingBottom: '2rem', paddingLeft: '2rem' }}></td>
                        <td colSpan="5" style={{ border: 'none', paddingTop: '2rem', paddingBottom: '2rem', paddingRight: '2rem' }}>
                          <button
                            className="btn btn-outline-primary d-flex align-items-center gap-3 px-6 py-3"
                            onClick={() => handleAddProjectInline()}
                            style={{
                              borderRadius: '50px',
                              fontWeight: '600',
                              fontSize: '1rem',
                              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                              border: '2px dashed #667eea',
                              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                              backdropFilter: 'blur(10px)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                              e.currentTarget.style.color = 'white';
                              e.currentTarget.style.border = '2px solid transparent';
                              e.currentTarget.style.transform = 'scale(1.05)';
                              e.currentTarget.style.boxShadow = '0 8px 32px rgba(102, 126, 234, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)';
                              e.currentTarget.style.color = '#667eea';
                              e.currentTarget.style.border = '2px dashed #667eea';
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <Icon icon="solar:add-circle-bold-duotone" style={{ fontSize: '1.5rem' }} />
                            <span style={{ fontSize: '1rem', letterSpacing: '0.5px' }}>Ajouter un nouveau projet</span>
                          </button>
                        </td>
                      </tr>
                    )}
                    
                    {/* Projets existants */}
                    {getFilteredProjects().map(project => {
                      const stats = getProjectStats(project.id);
                      const status = getProjectStatus(project.id);
                      const isExpanded = expandedRows[`project_${project.id}`] || false;
                      
                      return (
                        <React.Fragment key={`project-${project.id}`}>
                          {editingProjectId === project.id ? (
                            // Mode édition du projet
                            <tr>
                              <td>
                                <button 
                                  className="btn btn-sm btn-link text-primary border-0 p-0"
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: '#f8f9fa'
                                  }}
                                  disabled
                                >
                                  <Icon icon="mdi:pencil" style={{ fontSize: '1.2rem' }} />
                                </button>
                              </td>
                              <td>
                                <div className="d-flex flex-column gap-2">
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Titre du projet *"
                                    value={editProjectData.titre || ''}
                                    onChange={(e) => setEditProjectData(prev => ({ ...prev, titre: e.target.value }))}
                                    autoFocus
                                  />
                                  <textarea
                                    className="form-control"
                                    placeholder="Description"
                                    value={editProjectData.description || ''}
                                    onChange={(e) => setEditProjectData(prev => ({ ...prev, description: e.target.value }))}
                                    rows="2"
                                  ></textarea>
                                </div>
                              </td>
                              <td>
                                <div className="d-flex flex-column gap-2">
                                  <div>
                                    <label className="form-label small text-muted mb-1">Date de début</label>
                                    <input
                                      type="date"
                                      className="form-control"
                                      value={editProjectData.date_debut || ''}
                                      onChange={(e) => setEditProjectData(prev => ({ ...prev, date_debut: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="form-label small text-muted mb-1">Date de fin prévue</label>
                                    <input
                                      type="date"
                                      className="form-control"
                                      value={editProjectData.date_fin_prevu || ''}
                                      onChange={(e) => setEditProjectData(prev => ({ ...prev, date_fin_prevu: e.target.value }))}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td colSpan="2">
                                <div className="alert alert-warning mb-0" role="alert">
                                  <div className="d-flex align-items-center gap-2 mb-2">
                                    <Icon icon="mdi:information" style={{ fontSize: '1.2rem' }} />
                                    <span className="fw-semibold">Édition en cours</span>
                                  </div>
                                  <p className="mb-0 small">Veuillez compléter et enregistrer vos modifications.</p>
                                </div>
                              </td>
                              <td>
                                <div className="d-flex flex-column gap-2">
                                  <button
                                    type="button"
                                    className="btn btn-success btn-sm"
                                    onClick={handleSaveProjectEdit}
                                    disabled={!editProjectData.titre?.trim()}
                                  >
                                    <Icon icon="mdi:content-save" /> Enregistrer
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={handleCancelProjectEdit}
                                  >
                                    <Icon icon="mdi:close" /> Annuler
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            // Mode affichage du projet
                            <tr 
                              className={isExpanded ? 'table-active' : ''}
                              style={{
                                backgroundColor: isExpanded ? '#f0f4ff' : '#ffffff',
                                borderLeft: isExpanded ? '4px solid #667eea' : '4px solid transparent',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => {
                                if (!isExpanded) {
                                  e.currentTarget.style.backgroundColor = '#f8f9fc';
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isExpanded) {
                                  e.currentTarget.style.backgroundColor = '#ffffff';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }
                              }}
                            >
                              <td style={{ 
                                border: 'none', 
                                paddingTop: '1.2rem', 
                                paddingBottom: '1.2rem',
                                paddingLeft: '1.5rem'
                              }}>
                                <button 
                                  className="btn btn-sm btn-link text-primary border-0 p-0"
                                  onClick={() => toggleRowExpanded(project.id, 'project')}
                                  style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '50%',
                                    backgroundColor: isExpanded ? '#667eea' : '#e8f0fe',
                                    color: isExpanded ? 'white' : '#667eea',
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.2)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#667eea';
                                    e.currentTarget.style.color = 'white';
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isExpanded) {
                                      e.currentTarget.style.backgroundColor = '#e8f0fe';
                                      e.currentTarget.style.color = '#667eea';
                                    }
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }}
                                >
                                  <Icon 
                                    icon={isExpanded ? "mdi:chevron-down" : "mdi:chevron-right"} 
                                    style={{ fontSize: '1.3rem' }} 
                                  />
                                </button>
                              </td>
                              <td style={{ 
                                border: 'none', 
                                paddingTop: '1.2rem', 
                                paddingBottom: '1.2rem'
                              }}>
                                <div className="d-flex flex-column">
                                  <div className="d-flex align-items-center gap-3 mb-2">
                                    <Icon icon="mdi:folder" style={{ 
                                      color: status.color, 
                                      fontSize: '1.2rem' 
                                    }} />
                                    <div className="d-flex align-items-center flex-wrap gap-2">
                                      <span className="fw-bold text-dark" style={{ 
                                        fontSize: '1.1rem',
                                        letterSpacing: '0.01em'
                                      }}>
                                        {project.titre}
                                      </span>
                                      {isProjectOverdue(project) && getOverdueBadge()}
                                    </div>
                                  </div>
                                  <div className="ps-4">
                                    <small className="text-muted d-none d-sm-block" style={{ 
                                      lineHeight: '1.4',
                                      fontSize: '0.85rem'
                                    }}>
                                      {project.description?.substring(0, 60)}{project.description?.length > 60 ? '...' : ''}
                                    </small>
                                    {/* Show dates on mobile */}
                                    <div className="d-md-none mt-2">
                                      <div className="d-flex flex-wrap gap-3 text-muted" style={{ fontSize: '0.8rem' }}>
                                        <div className="d-flex align-items-center gap-1">
                                          <Icon icon="mdi:calendar-start" />
                                          {formatDate(project.date_debut)}
                                        </div>
                                        <div className="d-flex align-items-center gap-1">
                                          <Icon icon="mdi:calendar-end" />
                                          {formatDate(project.date_fin_prevu)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="d-none d-md-table-cell" style={{ 
                                border: 'none', 
                                paddingTop: '1.2rem', 
                                paddingBottom: '1.2rem'
                              }}>
                                <div className="d-flex align-items-center gap-3">
                                  <div className="d-flex align-items-center gap-2">
                                    <Icon icon="mdi:calendar-start" style={{ color: '#059669', fontSize: '1rem' }} />
                                    <div>
                                      <small className="text-muted" style={{ fontSize: '0.75rem' }}>Début</small>
                                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#059669' }}>
                                        {formatDate(project.date_debut)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="d-flex align-items-center gap-2">
                                    <Icon icon="mdi:calendar-end" style={{ color: '#dc2626', fontSize: '1rem' }} />
                                    <div>
                                      <small className="text-muted" style={{ fontSize: '0.75rem' }}>Fin prévue</small>
                                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#dc2626' }}>
                                        {formatDate(project.date_fin_prevu)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ 
                                border: 'none', 
                                paddingTop: '1.2rem', 
                                paddingBottom: '1.2rem'
                              }}>
                                <div className="d-flex flex-column gap-2">
                                  <div className="d-flex justify-content-between align-items-center">
                                    <div className="d-flex align-items-center gap-2">
                                      <Icon 
                                        icon={stats.percent === 100 ? "mdi:check-circle" : 
                                             stats.percent >= 50 ? "mdi:clock-outline" : "mdi:progress-clock"} 
                                        style={{ 
                                          color: stats.percent === 100 ? '#10b981' : 
                                                stats.percent >= 50 ? '#f59e0b' : '#ef4444',
                                          fontSize: '1.2rem' 
                                        }} 
                                      />
                                      <div className="fw-bold" style={{ 
                                        fontSize: '1.1rem',
                                        color: stats.percent === 100 ? '#10b981' : 
                                              stats.percent >= 50 ? '#f59e0b' : '#667eea'
                                      }}>
                                        {stats.percent}%
                                      </div>
                                    </div>
                                    <div className="text-end d-flex flex-column align-items-end gap-1">
                                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                                        {stats.completedTasks}/{stats.tasks} tâches actives
                                      </span>
                                      {stats.cancelledTasks > 0 && (
                                        <span className="badge bg-danger-subtle text-danger" style={{ fontSize: '0.6rem' }}>
                                          <Icon icon="mdi:cancel" className="me-1" style={{ fontSize: '0.65rem' }} />
                                          {stats.cancelledTasks} annulée{stats.cancelledTasks > 1 ? 's' : ''}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="progress" style={{ 
                                    height: '8px', 
                                    backgroundColor: '#f1f5f9',
                                    borderRadius: '10px',
                                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                                  }}>
                                    <div 
                                      className="progress-bar" 
                                      style={{ 
                                        width: `${stats.percent}%`,
                                        background: stats.percent === 100 ? 
                                          'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                                          stats.percent >= 50 ? 
                                          'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                                          'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        borderRadius: '10px',
                                        transition: 'width 0.6s ease'
                                      }} 
                                      aria-valuenow={stats.percent} 
                                      aria-valuemin="0" 
                                      aria-valuemax="100"
                                    ></div>
                                  </div>
                                  {/* Show status on mobile */}
                                  <div className="d-lg-none mt-2">
                                    <div className="d-flex align-items-center gap-2">
                                      <Icon icon={status.icon} style={{ color: status.color, fontSize: '1rem' }} />
                                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                                        {status.label}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="d-none d-lg-table-cell" style={{ 
                                border: 'none', 
                                paddingTop: '1.2rem', 
                                paddingBottom: '1.2rem'
                              }}>
                                <div className="d-flex align-items-center justify-content-center gap-2">
                                  <Icon icon={status.icon} style={{ 
                                    color: status.color, 
                                    fontSize: '1.1rem' 
                                  }} />
                                  <span className="fw-medium" style={{ 
                                    color: status.color,
                                    fontSize: '0.9rem'
                                  }}>
                                    {status.label}
                                  </span>
                                </div>
                              </td>
                              <td style={{ 
                                border: 'none', 
                                paddingTop: '1.2rem', 
                                paddingBottom: '1.2rem',
                                textAlign: 'center'
                              }}>
                                <div className="d-flex gap-1 flex-wrap justify-content-center">
                                  <button
                                    className="btn btn-sm"
                                    onClick={() => handleAddListInline(project.id)}
                                    title="Ajouter une liste"
                                    style={{
                                      backgroundColor: 'white',
                                      color: '#1976d2',
                                      border: '1px solid #1976d2',
                                      borderRadius: '6px',
                                      padding: '6px 10px',
                                      fontSize: '0.8rem'
                                    }}
                                  >
                                    <Icon icon="mdi:playlist-plus" style={{ fontSize: '1rem' }} />
                                    <span className="d-none d-xl-inline ms-1">Liste</span>
                                  </button>
                                  {canManageProject() && (
                                    <>
                                      <button
                                        className="btn btn-sm"
                                        onClick={() => handleEditProject(project)}
                                        title="Éditer le projet"
                                        style={{
                                          backgroundColor: 'white',
                                          color: '#f57c00',
                                          border: '1px solid #f57c00',
                                          borderRadius: '6px',
                                          padding: '6px 10px',
                                          fontSize: '0.8rem'
                                        }}
                                      >
                                        <Icon icon="mdi:pencil" style={{ fontSize: '1rem' }} />
                                        <span className="d-none d-xl-inline ms-1">Éditer</span>
                                      </button>
                                      <button
                                        className="btn btn-sm"
                                        onClick={() => handleDeleteProject(project.id)}
                                        title="Supprimer le projet"
                                        style={{
                                          backgroundColor: 'white',
                                          color: '#d32f2f',
                                          border: '1px solid #d32f2f',
                                          borderRadius: '6px',
                                          padding: '6px 10px',
                                          fontSize: '0.8rem'
                                        }}
                                      >
                                        <Icon icon="mdi:delete" style={{ fontSize: '1rem' }} />
                                        <span className="d-none d-xl-inline ms-1">Suppr.</span>
                                      </button>
                                      <button
                                        className="btn btn-sm"
                                        onClick={() => handleShowAuditHistory(project)}
                                        title="Historique d'audit"
                                        style={{
                                          backgroundColor: 'white',
                                          color: '#6c757d',
                                          border: '1px solid #6c757d',
                                          borderRadius: '6px',
                                          padding: '6px 10px',
                                          fontSize: '0.8rem'
                                        }}
                                      >
                                        <Icon icon="mdi:history" style={{ fontSize: '1rem' }} />
                                        <span className="d-none d-xl-inline ms-1">Audit</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                          
                          {/* Section détaillée du projet (listes) */}
                          {isExpanded && (
                            <tr>
                              <td colSpan="6" className="p-0 border-0">
                                <div className="px-4 py-3 bg-light">
                                  <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                                      <Icon icon="mdi:format-list-bulleted" style={{ color: '#0d6efd' }} />
                                      Listes de tâches ({stats.lists})
                                    </h6>
                                    <button
                                      className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                                      onClick={() => handleAddListInline(project.id)}
                                    >
                                      <Icon icon="mdi:plus" />
                                      Ajouter une liste
                                    </button>
                                  </div>
                                  
                                  {/* Formulaire en ligne pour ajouter une liste */}
                                  {showAddListForm[project.id] && (
                                    <div className="mb-3 p-3 bg-white border rounded">
                                      <div className="row g-3">
                                        <div className="col-md-10">
                                          <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Titre de la liste *"
                                            value={newListData[project.id]?.title || ''}
                                            onChange={(e) => setNewListData(prev => ({
                                              ...prev,
                                              [project.id]: {
                                                ...prev[project.id],
                                                title: e.target.value
                                              }
                                            }))}
                                            autoFocus
                                          />
                                        </div>
                                        <div className="col-md-2">
                                          <div className="d-flex gap-2">
                                            <button
                                              type="button"
                                              className="btn btn-success"
                                              onClick={() => handleSubmitListInline(project.id)}
                                              disabled={!newListData[project.id]?.title?.trim() || submittingList[project.id]}
                                            >
                                              {submittingList[project.id] ? (
                                                <div className="spinner-border spinner-border-sm">
                                                  <span className="visually-hidden">Loading...</span>
                                                </div>
                                              ) : (
                                                <Icon icon="material-symbols:check" />
                                              )}
                                            </button>
                                            <button
                                              type="button"
                                              className="btn btn-secondary"
                                              onClick={() => handleCancelListInline(project.id)}
                                            >
                                              <Icon icon="material-symbols:close" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Listes existantes */}
                                  {getFilteredLists(project.id).length === 0 && !showAddListForm[project.id] ? (
                                    <div className="text-center py-3">
                                      <p className="text-muted mb-0">Aucune liste de tâches pour ce projet</p>
                                    </div>
                                  ) : (
                                    <div className="row g-3">
                                      {getFilteredLists(project.id).map(list => {
                                        const listStats = getListCompletionStats(list.id);
                                        const isListExpanded = expandedRows[`list_${list.id}`] || false;
                                        
                                        return (
                                          <div key={`list-${list.id}`} className="col-12">
                                            <div className="card border">
                                              <div className={`card-header ${editingListId === list.id ? 'bg-warning-subtle' : 'bg-white'}`}>
                                                {editingListId === list.id ? (
                                                  // Mode édition de la liste
                                                  <div className="p-2">
                                                    <div className="mb-3">
                                                      <label className="form-label small text-muted">Titre de la liste *</label>
                                                      <input
                                                        type="text"
                                                        className="form-control"
                                                        value={editListData.title || ''}
                                                        onChange={(e) => setEditListData(prev => ({ ...prev, title: e.target.value }))}
                                                        autoFocus
                                                      />
                                                    </div>
                                                    {/* Description supprimée pour les listes */}
                                                    <div className="d-flex justify-content-end gap-2">
                                                      <button
                                                        type="button"
                                                        className="btn btn-sm btn-success"
                                                        onClick={handleSaveListEdit}
                                                        disabled={!editListData.title?.trim()}
                                                      >
                                                        <Icon icon="mdi:content-save" /> Enregistrer
                                                      </button>
                                                      <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-secondary"
                                                        onClick={handleCancelListEdit}
                                                      >
                                                        <Icon icon="mdi:close" /> Annuler
                                                      </button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  // Mode affichage normal de la liste
                                                  <div className="d-flex justify-content-between align-items-center">
                                                    <div className="d-flex align-items-center gap-3">
                                                      <button 
                                                        className="btn btn-sm btn-link text-success border-0 p-0"
                                                        onClick={() => toggleRowExpanded(list.id, 'list')}
                                                        style={{
                                                          width: '28px',
                                                          height: '28px',
                                                          borderRadius: '50%',
                                                          backgroundColor: 'white',
                                                          border: '1px solid #e9ecef'
                                                        }}
                                                      >
                                                        <Icon 
                                                          icon={isListExpanded ? "mdi:chevron-down" : "mdi:chevron-right"} 
                                                          style={{ fontSize: '1rem' }} 
                                                        />
                                                      </button>
                                                      <div className="d-flex align-items-center gap-3">
                                                        <div className="d-flex align-items-center flex-wrap gap-2">
                                                          <span className="fw-medium text-dark">{list.title}</span>
                                                          {isListOverdue(list) && getOverdueBadge()}
                                                        </div>
                                                        <div className="d-flex align-items-center gap-2">
                                                          <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                                                            {listStats.completed}/{listStats.total} tâches
                                                          </span>
                                                          <div className="progress" style={{ height: '4px', width: '80px' }}>
                                                            <div 
                                                              className="progress-bar" 
                                                              style={{ 
                                                                width: `${listStats.percent}%`,
                                                                backgroundColor: '#28a745'
                                                              }}
                                                            ></div>
                                                          </div>
                                                          <small className="text-muted">{listStats.percent}%</small>
                                                        </div>
                                                      </div>
                                                    </div>
                                                    <div className="d-flex gap-1">
                                                      <button
                                                        className="btn btn-sm border-0"
                                                        onClick={() => handleAddTaskInline(list.id)}
                                                        title="Ajouter une tâche"
                                                        style={{
                                                          backgroundColor: 'white',
                                                          color: '#28a745',
                                                          border: '1px solid #28a745 !important'
                                                        }}
                                                      >
                                                        <Icon icon="mdi:plus" />
                                                      </button>
                                                      {canManageProject() && (
                                                        <>
                                                          <button
                                                            className="btn btn-sm border-0"
                                                            onClick={() => handleEditList(list)}
                                                            title="Éditer la liste"
                                                            style={{
                                                              backgroundColor: 'white',
                                                              color: '#6c757d',
                                                              border: '1px solid #6c757d !important'
                                                            }}
                                                          >
                                                            <Icon icon="mdi:pencil" />
                                                          </button>
                                                          <button
                                                            className="btn btn-sm border-0"
                                                            onClick={() => handleDeleteList(list.id)}
                                                            title="Supprimer la liste"
                                                            style={{
                                                              backgroundColor: 'white',
                                                              color: '#dc3545',
                                                              border: '1px solid #dc3545 !important'
                                                            }}
                                                          >
                                                            <Icon icon="mdi:delete" />
                                                          </button>
                                                        </>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>

                                              {/* Section des tâches */}
                                              {isListExpanded && (
                                                <div className="card-body">
                                                  {/* Formulaire en ligne pour ajouter une tâche */}
                                                  {showAddTaskForm[list.id] && (
                                                    <div className="mb-3 p-3 bg-light border rounded">
                                                      <div className="row g-3 mb-3">
                                                        <div className="col-md-4">
                                                          <label className="form-label small text-muted">Description *</label>
                                                          <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="Description de la tâche *"
                                                            value={newTaskData[list.id]?.description || ''}
                                                            onChange={(e) => setNewTaskData(prev => ({
                                                              ...prev,
                                                              [list.id]: {
                                                                ...prev[list.id],
                                                                description: e.target.value
                                                              }
                                                            }))}
                                                            autoFocus
                                                          />
                                                        </div>
                                                        <div className="col-md-2">
                                                          <label className="form-label small text-muted">Type *</label>
                                                          <select
                                                            className="form-select form-select-sm"
                                                            value={newTaskData[list.id]?.type || 'AC'}
                                                            onChange={(e) => setNewTaskData(prev => ({
                                                              ...prev,
                                                              [list.id]: {
                                                                ...prev[list.id],
                                                                type: e.target.value
                                                              }
                                                            }))}
                                                          >
                                                            <option value="AC">AC</option>
                                                            <option value="AP">AP</option>
                                                          </select>
                                                        </div>
                                                        <div className="col-md-3">
                                                          <label className="form-label small text-muted">Origine</label>
                                                          <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="Origine de la tâche"
                                                            value={newTaskData[list.id]?.origine || ''}
                                                            onChange={(e) => setNewTaskData(prev => ({
                                                              ...prev,
                                                              [list.id]: {
                                                                ...prev[list.id],
                                                                origine: e.target.value
                                                              }
                                                            }))}
                                                          />
                                                        </div>
                                                        <div className="col-md-3">
                                                          <label className="form-label small text-muted">Statut</label>
                                                          <select
                                                            className="form-select form-select-sm"
                                                            value={newTaskData[list.id]?.status || 'Non commencée'}
                                                            onChange={(e) => setNewTaskData(prev => ({
                                                              ...prev,
                                                              [list.id]: {
                                                                ...prev[list.id],
                                                                status: e.target.value
                                                              }
                                                            }))}
                                                          >
                                                            <option value="Non commencée">Non commencée</option>
                                                            <option value="En cours">En cours</option>
                                                            <option value="Terminée">Terminée</option>
                                                            <option value="Annulé">Annulé</option>
                                                          </select>
                                                        </div>
                                                      </div>
                                                      <div className="row g-3 mb-3">
                                                        <div className="col-md-12">
                                                          <label className="form-label small text-muted">Assignée à (Employé de la société)</label>
                                                          <div className="position-relative">
                                                            <input
                                                              type="text"
                                                              className="form-control form-control-sm"
                                                              placeholder="Rechercher un employé de la société..."
                                                              value={employeeSearchQueries[list.id] || ''}
                                                              onChange={(e) => handleEmployeeSearchChange(list.id, e.target.value)}
                                                              onFocus={() => setShowEmployeeDropdowns(prev => ({ ...prev, [list.id]: true }))}
                                                              autoComplete="off"
                                                            />
                                                            {showEmployeeDropdowns[list.id] && getFilteredEmployees(list.id).length > 0 && (
                                                              <div className="position-absolute w-100 bg-white border rounded shadow-sm mt-1" style={{ zIndex: 1050, maxHeight: '250px', overflowY: 'auto' }}>
                                                                <div className="px-3 py-2 bg-light border-bottom">
                                                                  <small className="text-muted fw-medium">
                                                                    <Icon icon="mdi:office-building" className="me-1" />
                                                                    Employés de la société ({getFilteredEmployees(list.id).length})
                                                                  </small>
                                                                </div>
                                                                {getFilteredEmployees(list.id).map(employee => (
                                                                  <div
                                                                    key={employee.id}
                                                                    className="px-3 py-2 cursor-pointer border-bottom"
                                                                    onClick={() => handleEmployeeSelect(list.id, employee)}
                                                                    style={{ cursor: 'pointer' }}
                                                                    onMouseEnter={(e) => e.target.closest('div').classList.add('bg-light')}
                                                                    onMouseLeave={(e) => e.target.closest('div').classList.remove('bg-light')}
                                                                  >
                                                                    <div className="d-flex align-items-center gap-3">
                                                                      <div className="flex-shrink-0">
                                                                        <Icon icon="mdi:account-circle" style={{ color: '#0d6efd', fontSize: '1.5rem' }} />
                                                                      </div>
                                                                      <div className="flex-grow-1">
                                                                        <div className="fw-medium text-dark">{employee.prenom} {employee.name}</div>
                                                                        <div className="d-flex align-items-center gap-2 mt-1">
                                                                          <span className="badge bg-primary bg-opacity-10 text-primary px-2 py-1">
                                                                            {employee.departement}
                                                                          </span>
                                                                          <small className="text-muted">{employee.poste}</small>
                                                                        </div>
                                                                        <small className="text-muted d-block mt-1">
                                                                          <Icon icon="mdi:email-outline" className="me-1" style={{ fontSize: '0.8rem' }} />
                                                                          {employee.email}
                                                                        </small>
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                ))}
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </div>
                                                      <div className="row g-3">
                                                        <div className="col-lg-3 col-md-6">
                                                          <label className="form-label small text-muted">Date début réelle</label>
                                                          <input
                                                            type="date"
                                                            className="form-control form-control-sm"
                                                            value={newTaskData[list.id]?.start_date || ''}
                                                            onChange={(e) => setNewTaskData(prev => ({
                                                              ...prev,
                                                              [list.id]: {
                                                                ...prev[list.id],
                                                                start_date: e.target.value
                                                              }
                                                            }))}
                                                          />
                                                        </div>
                                                        <div className="col-lg-3 col-md-6">
                                                          <label className="form-label small text-muted">Date fin réelle</label>
                                                          <input
                                                            type="date"
                                                            className="form-control form-control-sm"
                                                            value={newTaskData[list.id]?.end_date || ''}
                                                            onChange={(e) => setNewTaskData(prev => ({
                                                              ...prev,
                                                              [list.id]: {
                                                                ...prev[list.id],
                                                                end_date: e.target.value
                                                              }
                                                            }))}
                                                          />
                                                        </div>
                                                        {/* Afficher le champ progression seulement si le statut est "En cours" */}
                                                        {newTaskData[list.id]?.status === 'En cours' && (
                                                          <div className="col-lg-3 col-md-6">
                                                            <label className="form-label small text-muted d-flex align-items-center gap-1">
                                                              <Icon icon="mdi:percent" className="text-primary" />
                                                              Progression (%)
                                                            </label>
                                                            <input
                                                              type="number"
                                                              className="form-control form-control-sm"
                                                              min="0"
                                                              max="100"
                                                              value={newTaskData[list.id]?.pourcentage || 0}
                                                              onChange={(e) => setNewTaskData(prev => ({
                                                                ...prev,
                                                                [list.id]: {
                                                                  ...prev[list.id],
                                                                  pourcentage: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                                                                }
                                                              }))}
                                                              placeholder="0-100"
                                                            />
                                                            <small className="text-muted">Avancement initial de la tâche</small>
                                                          </div>
                                                        )}
                                                      </div>
                                                      <div className="row g-3 mt-2">
                                                        <div className="col-12 d-flex justify-content-end">
                                                          <div className="d-flex gap-2">
                                                            <button
                                                              type="button"
                                                              className="btn btn-success btn-sm d-flex align-items-center gap-2"
                                                              onClick={() => handleSubmitTaskInline(list.id)}
                                                              disabled={!newTaskData[list.id]?.description?.trim() || submittingTask[list.id]}
                                                            >
                                                              {submittingTask[list.id] ? (
                                                                <div className="spinner-border spinner-border-sm">
                                                                  <span className="visually-hidden">Loading...</span>
                                                                </div>
                                                              ) : (
                                                                <>
                                                                  <Icon icon="material-symbols:check" />
                                                                  <span>Ajouter</span>
                                                                </>
                                                              )}
                                                            </button>
                                                            <button
                                                              type="button"
                                                              className="btn btn-secondary btn-sm d-flex align-items-center gap-2"
                                                              onClick={() => handleCancelTaskInline(list.id)}
                                                            >
                                                              <Icon icon="material-symbols:close" />
                                                              <span>Annuler</span>
                                                            </button>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )}
                                                  
                                                  {/* Tâches existantes */}
                                                  {getFilteredTasks(list.id).length === 0 && !showAddTaskForm[list.id] ? (
                                                    <div className="text-center py-3">
                                                      <Icon icon="mdi:checkbox-blank-outline" style={{ fontSize: '2rem', color: '#6c757d' }} />
                                                      <p className="text-muted mb-0 mt-2">Aucune tâche dans cette liste</p>
                                                    </div>
                                                  ) : (
                                                    <div className="row g-2">
                                                      {getFilteredTasks(list.id).map(task => {
                                                        const getStatusClass = (status) => {
                                                          switch(status) {
                                                            case 'Terminée': return 'bg-success';
                                                            case 'En cours': return 'bg-warning text-dark';
                                                            case 'Annulé': return 'bg-danger';
                                                            default: return 'bg-secondary';
                                                          }
                                                        };

                                                        if (editingTaskId === task.id) {
                                                          // Mode édition de la tâche
                                                          return (
                                                            <div key={`task-${task.id}`} className="col-12">
                                                              <div className="card border-0 bg-warning-subtle shadow-sm">
                                                                <div className="card-body p-3">
                                                                  <h6 className="card-title d-flex align-items-center gap-2 mb-3">
                                                                    <Icon icon="mdi:pencil" style={{ color: '#6c757d' }} />
                                                                    Modifier la tâche
                                                                  </h6>
                                                                  <div className="row g-3">
                                                                    <div className="col-md-6">
                                                                      <label className="form-label small text-muted mb-1">Description *</label>
                                                                      <input
                                                                        type="text"
                                                                        className="form-control"
                                                                        value={editTaskData.description || ''}
                                                                        onChange={(e) => setEditTaskData(prev => ({ ...prev, description: e.target.value }))}
                                                                        autoFocus
                                                                      />
                                                                    </div>
                                                                    
                                                                    <div className="col-md-3">
                                                                      <label className="form-label small text-muted mb-1">Type *</label>
                                                                      <select
                                                                        className="form-select"
                                                                        value={editTaskData.type || 'AC'}
                                                                        onChange={(e) => setEditTaskData(prev => ({ ...prev, type: e.target.value }))}
                                                                      >
                                                                        <option value="AC">AC</option>
                                                                        <option value="AP">AP</option>
                                                                      </select>
                                                                    </div>
                                                                    
                                                                    <div className="col-md-3">
                                                                      <label className="form-label small text-muted mb-1">Origine</label>
                                                                      <input
                                                                        type="text"
                                                                        className="form-control"
                                                                        placeholder="Origine de la tâche"
                                                                        value={editTaskData.origine || ''}
                                                                        onChange={(e) => setEditTaskData(prev => ({ ...prev, origine: e.target.value }))}
                                                                      />
                                                                    </div>
                                                                    
                                                                    <div className="col-md-6">
                                                                      <label className="form-label small text-muted mb-1">Statut</label>
                                                                      <select
                                                                        className="form-select"
                                                                        value={editTaskData.status || 'Non commencée'}
                                                                        onChange={(e) => setEditTaskData(prev => ({ ...prev, status: e.target.value }))}
                                                                      >
                                                                        <option value="Non commencée">Non commencée</option>
                                                                        <option value="En cours">En cours</option>
                                                                        <option value="Terminée">Terminée</option>
                                                                        <option value="Annulé">Annulé</option>
                                                                      </select>
                                                                    </div>
                                                                    
                                                                    <div className="col-md-6">
                                                                      <label className="form-label small text-muted mb-1">Assignée à</label>
                                                                      <div className="position-relative">
                                                                        <input
                                                                          type="text"
                                                                          className="form-control"
                                                                          placeholder="Rechercher un employé..."
                                                                          value={employeeSearchQueries[`edit_${task.id}`] || ''}
                                                                          onChange={(e) => handleEmployeeSearchChange(`edit_${task.id}`, e.target.value)}
                                                                          onFocus={() => setShowEmployeeDropdowns(prev => ({ ...prev, [`edit_${task.id}`]: true }))}
                                                                        />
                                                                        
                                                                        {showEmployeeDropdowns[`edit_${task.id}`] && getFilteredEmployees(`edit_${task.id}`).length > 0 && (
                                                                          <div className="position-absolute top-100 start-0 w-100 mt-1 bg-white border shadow-sm rounded p-2 z-3">
                                                                            <div className="p-2 bg-light rounded mb-2">
                                                                              <small className="fw-semibold">
                                                                                Employés de la société ({getFilteredEmployees(`edit_${task.id}`).length})
                                                                              </small>
                                                                            </div>
                                                                            {getFilteredEmployees(`edit_${task.id}`).map(employee => (
                                                                              <div
                                                                                key={employee.id}
                                                                                className="p-2 rounded d-flex align-items-center gap-2 cursor-pointer"
                                                                                onClick={() => handleEmployeeSelect(`edit_${task.id}`, employee)}
                                                                                onMouseEnter={(e) => e.target.closest('div').classList.add('bg-light')}
                                                                                onMouseLeave={(e) => e.target.closest('div').classList.remove('bg-light')}
                                                                                style={{ cursor: 'pointer' }}
                                                                              >
                                                                                <Icon icon="mdi:account" style={{ fontSize: '1rem', color: '#0d6efd' }} />
                                                                                <div className="d-flex flex-column">
                                                                                  <span className="fw-medium">{employee.prenom} {employee.name}</span>
                                                                                  <small className="text-muted">{employee.email}</small>
                                                                                  <div className="d-flex align-items-center gap-1 mt-1">
                                                                                    <span className="badge bg-info bg-opacity-10 text-info px-2 py-1" style={{ fontSize: '0.65rem' }}>
                                                                                      {employee.departement}
                                                                                    </span>
                                                                                    <span className="badge bg-secondary bg-opacity-10 text-secondary px-2 py-1" style={{ fontSize: '0.65rem' }}>
                                                                                      {employee.poste}
                                                                                    </span>
                                                                                  </div>
                                                                                </div>
                                                                              </div>
                                                                            ))}
                                                                          </div>
                                                                        )}
                                                                      </div>
                                                                    </div>
                                                                    
                                                                    <div className="col-lg-3 col-md-6">
                                                                      <label className="form-label small text-muted mb-1">Date début</label>
                                                                      <input
                                                                        type="date"
                                                                        className="form-control"
                                                                        value={editTaskData.start_date || ''}
                                                                        onChange={(e) => setEditTaskData(prev => ({ ...prev, start_date: e.target.value }))}
                                                                      />
                                                                    </div>
                                                                    
                                                                    <div className="col-lg-3 col-md-6">
                                                                      <label className="form-label small text-muted mb-1">Date fin</label>
                                                                      <input
                                                                        type="date"
                                                                        className="form-control"
                                                                        value={editTaskData.end_date || ''}
                                                                        onChange={(e) => setEditTaskData(prev => ({ ...prev, end_date: e.target.value }))}
                                                                      />
                                                                    </div>
                                                                    
                                                                    {/* Afficher le champ progression seulement si la tâche est "En cours" */}
                                                                    {editTaskData.status === 'En cours' && (
                                                                      <div className="col-lg-3 col-md-6">
                                                                        <label className="form-label small text-muted mb-1 d-flex align-items-center gap-1">
                                                                          <Icon icon="mdi:percent" className="text-primary" />
                                                                          Progression (%)
                                                                        </label>
                                                                        <input
                                                                          type="number"
                                                                          className="form-control"
                                                                          min="0"
                                                                          max="100"
                                                                          value={editTaskData.pourcentage || 0}
                                                                          onChange={(e) => setEditTaskData(prev => ({ ...prev, pourcentage: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                                                                          placeholder="0-100"
                                                                        />
                                                                        <small className="text-muted">Pourcentage d'avancement de la tâche</small>
                                                                      </div>
                                                                    )}
                                                                    
                                                                    <div className="col-12 d-flex justify-content-end gap-2">
                                                                      <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-success"
                                                                        onClick={handleSaveTaskEdit}
                                                                        disabled={!editTaskData.description?.trim()}
                                                                      >
                                                                        <Icon icon="mdi:content-save" /> Enregistrer
                                                                      </button>
                                                                      <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-secondary"
                                                                        onClick={handleCancelTaskEdit}
                                                                      >
                                                                        <Icon icon="mdi:close" /> Annuler
                                                                      </button>
                                                                    </div>
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            </div>
                                                          );
                                                        } else {
                                                          // Mode affichage normal de la tâche
                                                          return (
                                                            <div key={`task-${task.id}`} className="col-12">
                                                              <div className="card border-0 bg-white shadow-sm">
                                                                <div className="card-body p-3">
                                                                  <div className="row align-items-center g-2">
                                                                    <div className="col-md-5">
                                                                      <div className="d-flex align-items-center justify-content-between">
                                                                        <div className="d-flex flex-column gap-1">
                                                                          <div className="d-flex align-items-center flex-wrap gap-2">
                                                                            <Icon icon="mdi:checkbox-marked-circle-outline" style={{ color: task.status === 'Terminée' ? '#28a745' : '#6c757d', fontSize: '1.2rem' }} />
                                                                            <span className="text-dark fw-medium">{task.description}</span>
                                                                            {isTaskOverdue(task) && getOverdueBadge()}
                                                                          </div>
                                                                          <div className="d-flex align-items-center gap-2 ms-4">
                                                                            <span className={`badge px-2 py-1 ${
                                                                              task.type === 'AC' ? 'bg-primary' : 
                                                                              task.type === 'AP' ? 'bg-success' : 
                                                                              'bg-secondary'
                                                                            }`} style={{ fontSize: '0.7rem' }}>
                                                                              {task.type || 'N/A'}
                                                                            </span>
                                                                            {task.origine && (
                                                                              <span className="badge bg-secondary px-2 py-1" style={{ fontSize: '0.7rem' }}>
                                                                                <Icon icon="mdi:source-branch" style={{ fontSize: '0.8rem' }} className="me-1" />
                                                                                {task.origine}
                                                                              </span>
                                                                            )}
                                                                          </div>
                                                                        </div>
                                                                        
                                                                        {/* Actions intégrées dans la ligne */}
                                                                        <div className="d-flex gap-1">
                                                                          <button
                                                                            className="btn btn-sm rounded-pill shadow-sm border-0 d-flex align-items-center justify-content-center"
                                                                            onClick={() => handleShowComments(task)}
                                                                            title="Commentaires"
                                                                            style={{
                                                                            
                                                                              background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                                                                              color: 'white',
                                                                              transition: 'all 0.3s ease'
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                              e.currentTarget.style.transform = 'translateY(-2px) scale(1.1)';
                                                                              e.currentTarget.style.boxShadow = '0 8px 25px rgba(23, 162, 184, 0.4)';
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                              e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                                                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                                                            }}
                                                                          >
                                                                            <Icon icon="mdi:comment-multiple-outline" style={{ fontSize: '0.9rem' }} />
                                                                          </button>
                                                                          
                                                                          {canManageProject() && (
                                                                            <>
                                                                              <button
                                                                                className="btn btn-sm rounded-pill shadow-sm border-0 d-flex align-items-center justify-content-center"
                                                                                onClick={() => handleEditTask(task)}
                                                                                title="Éditer la tâche"
                                                                                style={{
                                                                                  
                                                                                  background: 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)',
                                                                                  color: 'white',
                                                                                  transition: 'all 0.3s ease'
                                                                                }}
                                                                                onMouseEnter={(e) => {
                                                                                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.1)';
                                                                                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 193, 7, 0.4)';
                                                                                }}
                                                                                onMouseLeave={(e) => {
                                                                                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                                                                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                                                                }}
                                                                              >
                                                                                <Icon icon="mdi:pencil" style={{ fontSize: '0.9rem' }} />
                                                                              </button>
                                                                              <button
                                                                                className="btn btn-sm rounded-pill shadow-sm border-0 d-flex align-items-center justify-content-center"
                                                                                onClick={() => handleDeleteTask(task.id)}
                                                                                title="Supprimer la tâche"
                                                                                style={{
                                                                                  background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                                                                                  color: 'white',
                                                                                  transition: 'all 0.3s ease'
                                                                                }}
                                                                                onMouseEnter={(e) => {
                                                                                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.1)';
                                                                                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 53, 69, 0.4)';
                                                                                }}
                                                                                onMouseLeave={(e) => {
                                                                                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                                                                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                                                                }}
                                                                              >
                                                                                <Icon icon="solar:trash-bin-trash-bold-duotone" style={{ fontSize: '0.8rem' }} />
                                                                              </button>
                                                                            </>
                                                                          )}
                                                                        </div>
                                                                      </div>
                                                                    </div>
                                                                    <div className="col-md-2">
                                                                      <span className={`badge rounded-pill ${getStatusClass(task.status)}`}>
                                                                        {task.status}
                                                                      </span>
                                                                    </div>
                                                                    <div className="col-md-2">
                                                                      {task.assigned_to ? (
                                                                        (() => {
                                                                          const employee = getEmployeeDetails(task.assigned_to);
                                                                          return employee ? (
                                                                            <div className="d-flex flex-column">
                                                                              <div className="d-flex align-items-center gap-2">
                                                                                <Icon icon="mdi:account-circle" style={{ color: '#0d6efd', fontSize: '1.1rem' }} />
                                                                                <span className="text-dark fw-medium small">{`${employee.prenom || ''} ${employee.name || ''}`}</span>
                                                                              </div>
                                                                              {employee.departement && (
                                                                                <div className="d-flex align-items-center gap-1 mt-1">
                                                                                  <span className="badge bg-info bg-opacity-10 text-info px-2 py-1" style={{ fontSize: '0.65rem' }}>
                                                                                    {employee.departement}
                                                                                  </span>
                                                                                </div>
                                                                              )}
                                                                            </div>
                                                                          ) : (
                                                                            <span className="text-muted small">Employé introuvable</span>
                                                                          );
                                                                        })()
                                                                      ) : (
                                                                        <div className="d-flex align-items-center gap-2">
                                                                          <Icon icon="mdi:account-off" style={{ color: '#6c757d', fontSize: '1.1rem' }} />
                                                                          <span className="text-muted small">Non assigné</span>
                                                                        </div>
                                                                      )}
                                                                    </div>
                                                                    <div className="col-md-3">
                                                                      <div className="d-flex flex-column gap-1">
                                                                        <div className="d-flex align-items-center gap-1">
                                                                          <Icon icon="mdi:calendar-start" style={{ color: '#28a745', fontSize: '0.9rem' }} />
                                                                          <small className="text-muted">Début: {formatDate(task.start_date)}</small>
                                                                        </div>
                                                                        <div className="d-flex align-items-center gap-1">
                                                                          <Icon icon="mdi:calendar-end" style={{ color: '#dc3545', fontSize: '0.9rem' }} />
                                                                          <small className="text-muted">Fin: {formatDate(task.end_date)}</small>
                                                                        </div>
                                                                        {/* Afficher la progression seulement si la tâche est "En cours" */}
                                                                        {task.status === 'En cours' && (
                                                                          <>
                                                                            <div className="d-flex align-items-center gap-1 mt-1">
                                                                              <Icon icon="mdi:percent" style={{ color: '#0d6efd', fontSize: '0.9rem' }} />
                                                                              <small className="text-primary fw-medium">Progression: {task.pourcentage || 0}%</small>
                                                                            </div>
                                                                            {/* Barre de progression */}
                                                                            <div className="mt-1">
                                                                              <div className="progress" style={{ height: '4px', borderRadius: '2px' }}>
                                                                                <div
                                                                                  className="progress-bar"
                                                                                  role="progressbar"
                                                                                  style={{ 
                                                                                    width: `${task.pourcentage || 0}%`,
                                                                                    background: (task.pourcentage || 0) === 100 
                                                                                      ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' 
                                                                                      : (task.pourcentage || 0) > 75 
                                                                                      ? 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)'
                                                                                      : 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                                                                                    transition: 'width 0.3s ease'
                                                                                  }}
                                                                                  aria-valuenow={task.pourcentage || 0}
                                                                                  aria-valuemin={0}
                                                                                  aria-valuemax={100}
                                                                                />
                                                                              </div>
                                                                            </div>
                                                                          </>
                                                                        )}
                                                                      </div>
                                                                    </div>
                                                                    <div className="col-md-1">
                                                                      <small className="text-muted">Créée: {formatDate(task.created_at)}</small>
                                                                    </div>
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            </div>
                                                          );
                                                        }
                                                      })}
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal des commentaires de tâche */}
      <TaskCommentsModal
        show={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        task={selectedTask}
        users={users}
      />
      
      {/* Modal d'historique d'audit */}
      {showAuditModal && selectedProjectForAudit && (
        <ProjectAuditHistory 
          project={selectedProjectForAudit}
          show={showAuditModal}
          onHide={handleCloseAuditHistory}
        />
      )}
    </div>
  );
};

// Composant pour afficher les commentaires d'une tâche
const TaskCommentsModal = ({ show, onClose, task, users }) => {
  const dispatch = useDispatch();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { commentsByTask } = useSelector(state => state.taskComments);
  const comments = commentsByTask[task?.id] || [];
  
  useEffect(() => {
    if (task?.id) {
      dispatch(fetchCommentsByTask(task.id));
    }
  }, [dispatch, task?.id]);
  
  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return 'Utilisateur inconnu';
    return `${user.prenom || ''} ${user.nom || user.name || ''}`.trim();
  };
  
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !task) return;
    
    setSubmitting(true);
    try {
      await dispatch(addTaskComment({ 
        taskId: task.id, 
        comment: newComment 
      })).unwrap();
      
      setNewComment('');
    } catch (error) {
      console.error('Erreur lors de l\'ajout du commentaire:', error);
      alert('Erreur lors de l\'ajout du commentaire: ' + error);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (!show || !task) return null;
  
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
        zIndex: 1060, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backdropFilter: 'blur(2px)'
      }}
      onClick={onClose}
    >
      <div 
        className="modal-dialog modal-dialog-centered modal-dialog-scrollable" 
        style={{ maxWidth: 500, width: '95%' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-content rounded-4 shadow-lg border-0">
          <div className="modal-header bg-gradient text-white rounded-top-4" style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '1rem 1.5rem'
          }}>
            <div className="d-flex align-items-center gap-2">
              <div className="p-2 rounded-circle bg-white bg-opacity-20">
                <Icon icon="mdi:comment-multiple-outline" style={{ fontSize: '1.3rem' }} />
              </div>
              <h5 className="modal-title fw-bold mb-0">Commentaires de la tâche</h5>
            </div>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              aria-label="Close" 
              onClick={onClose}
              style={{ filter: 'brightness(0) invert(1)' }}
            ></button>
          </div>
          
          <div className="modal-body p-0">
            <div className="p-3 bg-light border-bottom">
              <div className="d-flex align-items-start gap-2">
                <Icon 
                  icon={
                    task.status === 'Terminée' ? 'mdi:check-circle' : 
                    task.status === 'En cours' ? 'mdi:clock-outline' : 'mdi:progress-clock'
                  } 
                  style={{ 
                    fontSize: '1.4rem',
                    color: task.status === 'Terminée' ? '#28a745' : 
                           task.status === 'En cours' ? '#ffc107' : '#6c757d'
                  }} 
                />
                <div className="flex-grow-1">
                  <h6 className="fw-bold mb-1">{task.description}</h6>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <span className="badge bg-secondary-subtle text-secondary py-1 px-2 d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                      <Icon icon="mdi:tag" style={{ fontSize: '0.8rem' }} />
                      {task.status}
                    </span>
                    {task.assigned_to && (
                      <span className="badge bg-primary-subtle text-primary py-1 px-2 d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                        <Icon icon="mdi:account" style={{ fontSize: '0.8rem' }} />
                        {getUserName(task.assigned_to)}
                      </span>
                    )}
                    {task.due_date && (
                      <span className="badge bg-danger-subtle text-danger py-1 px-2 d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                        <Icon icon="mdi:calendar-alert" style={{ fontSize: '0.8rem' }} />
                        Échéance: {new Date(task.due_date).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {comments.length === 0 ? (
                <div className="text-center py-4">
                  <Icon icon="mdi:comment-off-outline" style={{ fontSize: '2.5rem', color: '#e9ecef' }} />
                  <p className="text-muted mt-2 mb-0">Aucun commentaire pour cette tâche</p>
                  <small className="text-muted">Soyez le premier à commenter!</small>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {comments.map(comment => (
                    <div key={comment.id} className="card shadow-sm border-0">
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <div className="bg-primary bg-opacity-10 rounded-circle p-2 d-flex align-items-center justify-content-center">
                              <Icon icon="mdi:account-circle" style={{ fontSize: '1.2rem', color: '#0d6efd' }} />
                            </div>
                            <div>
                              <h6 className="fw-bold mb-0">{getUserName(comment.user_id)}</h6>
                              <small className="text-muted">
                                {new Date(comment.created_at).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </small>
                            </div>
                          </div>
                        </div>
                        <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{comment.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-3 border-top bg-light">
              <form onSubmit={handleSubmitComment}>
                <div className="d-flex flex-column gap-2">
                  <textarea
                    className="form-control"
                    placeholder="Écrivez votre commentaire ici..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    rows="3"
                    disabled={submitting}
                    style={{ 
                      borderRadius: '12px',
                      resize: 'none',
                      fontSize: '0.95rem'
                    }}
                  ></textarea>
                  <div className="d-flex justify-content-end">
                    <button
                      type="submit"
                      className="btn btn-primary d-flex align-items-center gap-2"
                      disabled={!newComment.trim() || submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Icon icon="mdi:send" />
                          Envoyer
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTablePage;
