import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Row, Col, Form, Button, Badge, ProgressBar, Table, Modal } from 'react-bootstrap';
import { Icon } from '@iconify/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import ProjectDetailView from './ProjectDetailView';
import { fetchProjects, updateProject, deleteProject } from '../../Redux/Slices/projectSlice';
import { fetchTodoLists } from '../../Redux/Slices/todoListSlice';
import { fetchUsers } from '../../Redux/Slices/userSlice';
import Swal from 'sweetalert2';
import './ProjectReportPage.css';

// Couleurs pour les graphiques
const COLORS = {
  completed: '#28a745',    // Vert pour terminé
  inProgress: '#ffc107',   // Jaune pour en cours
  notStarted: '#6c757d',   // Gris pour non démarré
  primary: '#007bff',      // Bleu principal
  danger: '#dc3545'        // Rouge pour les alertes
};

const CHART_COLORS = [COLORS.completed, COLORS.inProgress, COLORS.notStarted];

const ProjectReportPage = () => {
  const dispatch = useDispatch();
  const { items: projects = [], status: projectsStatus } = useSelector(state => state.projects || {});
  const { items: todoLists = [], loading: todoListsLoading } = useSelector(state => state.todoLists || {});
  const { items: users = [] } = useSelector(state => state.users || {});
  
  const loading = projectsStatus === 'loading' || todoListsLoading;

  // États pour les filtres
  const [filters, setFilters] = useState({
    dateRange: 'all',
    searchTerm: '',
    statusFilter: 'all',
    selectedProject: 'all', // Nouveau filtre pour la sélection de projet
    selectedEmployee: 'all' // Nouveau filtre pour la sélection d'employé
  });

  // États pour l'affichage détaillé d'un projet
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState(null);

  // États pour l'édition des projets
  const [editingProject, setEditingProject] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    titre: '',
    description: '',
    date_debut: '',
    date_fin_prevu: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // États pour la recherche de projets avec select
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');

  // États pour la recherche d'employés avec select
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  // Visibilité des séries du graphique multi-barres (toutes cochées par défaut)
  const [visibleSeries, setVisibleSeries] = useState({
    completed: true,
    inProgress: true,
    notStarted: true,
    rate: true
  });

  const toggleSeries = (key) => {
    setVisibleSeries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Charger les données au montage du composant
  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchTodoLists());
    dispatch(fetchUsers());
  }, [dispatch]);

  // Gérer la fermeture du dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.position-relative')) {
        setShowProjectDropdown(false);
        setShowEmployeeDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Fonctions pour gérer l'édition des projets
  const handleEditProject = (project) => {
    setEditingProject(project);
    setEditForm({
      titre: project.titre || project.title || '',
      description: project.description || '',
      date_debut: project.date_debut || '',
      date_fin_prevu: project.date_fin_prevu || ''
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
    // Effacer l'erreur du champ modifié
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateEditForm = () => {
    const errors = {};
    if (!editForm.titre.trim()) {
      errors.titre = 'Le titre est requis';
    }
    if (!editForm.description.trim()) {
      errors.description = 'La description est requise';
    }
    if (editForm.date_debut && editForm.date_fin_prevu && 
        new Date(editForm.date_debut) > new Date(editForm.date_fin_prevu)) {
      errors.date_fin_prevu = 'La date de fin doit être après la date de début';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProject = async () => {
    if (!validateEditForm()) return;

    try {
      await dispatch(updateProject({ 
        id: editingProject.id, 
        ...editForm 
      })).unwrap();
      
      setShowEditModal(false);
      setEditingProject(null);
      
      Swal.fire({
        icon: 'success',
        title: 'Projet modifié avec succès !',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur lors de la modification',
        text: error.message || 'Une erreur est survenue',
        toast: true,
        position: 'top-end',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const handleDeleteProject = async (project) => {
    const result = await Swal.fire({
      title: 'Supprimer ce projet ?',
      text: `Êtes-vous sûr de vouloir supprimer le projet "${project.titre || project.title}" ? Cette action est irréversible.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d'
    });

    if (result.isConfirmed) {
      try {
        await dispatch(deleteProject(project.id)).unwrap();
        
        Swal.fire({
          icon: 'success',
          title: 'Projet supprimé',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Erreur lors de la suppression',
          text: error.message || 'Une erreur est survenue',
          toast: true,
          position: 'top-end',
          timer: 2000,
          showConfirmButton: false
        });
      }
    }
  };

  // Fonctions utilitaires pour les employés
  const getUserName = (userId) => {
    if (!userId) return 'Non assigné';
    const user = users.find(u => u.id.toString() === userId.toString());
    if (user) {
      return `${user.prenom || ''} ${user.nom || user.name || ''}`.trim();
    }
    return `Utilisateur ${userId}`;
  };

  const getUserDetails = (userId) => {
    if (!userId) return null;
    return users.find(u => u.id.toString() === userId.toString());
  };

  // Calculer des statistiques avec les vraies données ou des données par défaut
  const statistics = useMemo(() => {
    console.log('Projects data:', projects);
    console.log('TodoLists data:', todoLists);
    
    // Console.log seulement pour les projets qui ont un ID
    const projectsWithId = projects.filter(project => project.id);
    console.log('Projets avec ID:', projectsWithId);
    
    // Si nous avons des projets réels, les utiliser
  if (projects && projects.length > 0) {
      // Filtrer les projets selon la sélection
      let filteredProjects = projects;
      if (filters.selectedProject !== 'all') {
        filteredProjects = projects.filter(p => p.id === parseInt(filters.selectedProject));
      }
      
      const projectIds = filteredProjects.map(p => p.id);
      const relatedLists = todoLists.filter(list => 
        list.project_id && projectIds.includes(list.project_id)
      );
      
      // Filtrer les tâches selon l'employé sélectionné
  let allTasks = relatedLists.reduce((acc, list) => {
        if (list.tasks && Array.isArray(list.tasks)) {
          return [...acc, ...list.tasks];
        }
        return acc;
      }, []);

      // Appliquer le filtre employé sur les tâches
      if (filters.selectedEmployee !== 'all') {
        allTasks = allTasks.filter(task => 
          task.assigned_to && task.assigned_to.toString() === filters.selectedEmployee.toString()
        );
      }

      // Si un employé est sélectionné, recalculer les projets et listes impliqués
      let actualFilteredProjects = filteredProjects;
      let actualRelatedLists = relatedLists;

      if (filters.selectedEmployee !== 'all') {
        // Trouver les listes qui contiennent des tâches de cet employé
        const listsWithEmployeeTasks = relatedLists.filter(list => 
          list.tasks && list.tasks.some(task => 
            task.assigned_to && task.assigned_to.toString() === filters.selectedEmployee.toString()
          )
        );
        
        // Trouver les projets qui contiennent ces listes
        const projectIdsWithEmployeeTasks = [...new Set(listsWithEmployeeTasks.map(list => list.project_id))];
        const projectsWithEmployeeTasks = filteredProjects.filter(project => 
          projectIdsWithEmployeeTasks.includes(project.id)
        );

        actualFilteredProjects = projectsWithEmployeeTasks;
        actualRelatedLists = listsWithEmployeeTasks;
        
        console.log(`🔍 Employé sélectionné: ${getUserName(filters.selectedEmployee)}`);
        console.log(`📋 Listes avec tâches de l'employé: ${listsWithEmployeeTasks.length}`);
        console.log(`🗂️ Projets impliquant l'employé: ${projectsWithEmployeeTasks.length}`);
        console.log(`✅ Tâches de l'employé: ${allTasks.length}`);
      }

  // Helpers normalisation statut / pourcentage
  const normalizeStatus = (s) => (s || '').toString().trim().toLowerCase();
  const parsePourcentage = (v) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    const cleaned = v.toString().replace(/[^0-9.,]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };
  const isTaskCompleted = (task) => {
    const st = normalizeStatus(task.status);
    const pct = parsePourcentage(task.pourcentage);
    return st === 'terminée' || st === 'terminee' || (st === 'en cours' && pct >= 100);
  };
  const isTaskInProgress = (task) => {
    const st = normalizeStatus(task.status);
    if (st !== 'en cours') return false;
    const pct = parsePourcentage(task.pourcentage);
    return pct < 100; // 100 already counted as completed
  };
  const isTaskNotStarted = (task) => {
    const st = normalizeStatus(task.status);
    return st === '' || st === 'non commencée' || st === 'non commencee';
  };

  // Exclusion des tâches annulées des calculs (logique unifiée)
  const cancelledTasksGlobal = allTasks.filter(t => normalizeStatus(t.status) === 'annulé' || normalizeStatus(t.status) === 'annule').length;
  const activeTasks = allTasks.filter(t => {
    const st = normalizeStatus(t.status);
    return !(st === 'annulé' || st === 'annule');
  });

  // Calculer les tâches terminées/en cours/non commencées sur les tâches actives uniquement (via helpers)
  const completedTasks = activeTasks.filter(isTaskCompleted).length;
  const inProgressTasks = activeTasks.filter(isTaskInProgress).length;
  const notStartedTasks = activeTasks.filter(isTaskNotStarted).length;
  const pendingTasks = activeTasks.length - completedTasks;

  // Debug détaillé si incohérence potentielle (ex: utilisateur signale un écart)
  if (completedTasks + inProgressTasks + notStartedTasks !== activeTasks.length) {
    console.warn('[TASK CLASSIF MISMATCH] Somme catégories != total actifs', {
      active: activeTasks.length,
      completedTasks,
      inProgressTasks,
      notStartedTasks
    });
  }
  if (filters.selectedEmployee !== 'all') {
    const debugSample = activeTasks.slice(0, 25).map(t => ({
      id: t.id,
      titre: t.titre || t.title,
      rawStatus: t.status,
      normStatus: normalizeStatus(t.status),
      pourcentage: t.pourcentage,
      parsedPct: parsePourcentage(t.pourcentage),
      completed: isTaskCompleted(t),
      inProgress: isTaskInProgress(t),
      notStarted: isTaskNotStarted(t)
    }));
    // Identifier des tâches à 100% non comptées (anomalies)
    const anomalies = debugSample.filter(t => parsePourcentage(t.pourcentage) >= 100 && !t.completed);
    if (anomalies.length) {
      console.warn('[ANOMALIES POURCENTAGE >=100 NON COMPLETED]', anomalies);
    }
  }

      if (filters.selectedEmployee !== 'all') {
        console.log('[EMPLOYEE CLASSIF DEBUG]', {
          employee: getUserName(filters.selectedEmployee),
          activeTasks: activeTasks.length,
          completedTasks,
          inProgressTasks,
          notStartedTasks,
          rawCounts: activeTasks.reduce((acc,t)=>{acc[t.status||'']=(acc[t.status||'']||0)+1;return acc;}, {})
        });
      }

      // Calculer les projets par statut basé sur la progression des listes
  const projectStats = actualFilteredProjects.map(project => {
        const projectLists = actualRelatedLists.filter(list => list.project_id === project.id);
        let projectTasks = projectLists.reduce((acc, list) => {
          if (list.tasks) return [...acc, ...list.tasks];
          return acc;
        }, []);
        
        // Filtrer les tâches du projet selon l'employé sélectionné
        if (filters.selectedEmployee !== 'all') {
          projectTasks = projectTasks.filter(task => 
            task.assigned_to && task.assigned_to.toString() === filters.selectedEmployee.toString()
          );
        }
        
  const projectCancelledTasks = projectTasks.filter(t => normalizeStatus(t.status) === 'annulé' || normalizeStatus(t.status) === 'annule').length;
  const projectActiveTasks = projectTasks.filter(t => {
          const st = normalizeStatus(t.status);
          return !(st === 'annulé' || st === 'annule');
        });
        const completedProjectTasks = projectActiveTasks.filter(isTaskCompleted).length;
        
        console.log(`\n========== PROJET "${project.titre}" (ID: ${project.id}) ==========`);

        // Calculer le taux de completion basé sur la progression des listes
        let completionRate = 0;
        
        // Si le projet a des listes, calculer la progression de chaque liste puis faire la moyenne
        if (projectLists.length > 0) {
          let sumListPercents = 0;

            projectLists.forEach((list, index) => {
            // Exclure les tâches annulées
            const listTasks = (list.tasks || []).filter(t => t.status !== 'Annulé'); // Annulé exclu
            let listPercent = 0;

            console.log(`  📋 Liste ${index + 1}: "${list.titre || list.title}"`);
            console.log(`     - Nombre de tâches: ${listTasks.length}`);

            if (listTasks.length > 0) {
              let sumTaskProgress = 0;
              listTasks.forEach((task, taskIndex) => {
                let taskProgress = 0;
                if (task.status === 'Terminée') {
                  taskProgress = 100;
                } else if (task.status === 'En cours') {
                  taskProgress = Math.min(100, Math.max(0, Number(task.pourcentage) || 0));
                }
                sumTaskProgress += taskProgress;
                console.log(`       • Tâche ${taskIndex + 1}: "${task.title || task.titre}" - ${task.status} (${taskProgress}%)`);
              });
              const rawListAverage = sumTaskProgress / listTasks.length;
              listPercent = Math.round(rawListAverage); // Aligné avec ProjectTablePage.getListCompletionStats
              console.log(`     ✅ Progression de la liste (arrondie): ${listPercent}% (moyenne brute ${rawListAverage.toFixed(2)}%)`);
            } else {
              console.log('     ❌ Liste vide: 0%');
            }

            sumListPercents += listPercent;
          });

          // Moyenne simple non pondérée des listes, arrondie (même logique que ProjectTablePage.getProjectStats)
          const rawProjectAverage = sumListPercents / projectLists.length;
          completionRate = Math.round(rawProjectAverage);

          console.log(`  🎯 RÉSULTAT FINAL - Progression du projet: ${completionRate}% (moyenne simple des listes, brute ${rawProjectAverage.toFixed(2)}%)`);
          console.log('========================================\n');
        }
        // Si le projet n'a pas de listes ou de tâches = 0% de progression
        else {
          completionRate = 0;
          console.log(`  ❌ AUCUNE LISTE - Progression: 0%`);
          console.log(`========================================\n`);
        }

        // Déterminer la priorité basée sur les dates et l'urgence
        let priority = 'medium';
        if (project.date_fin_prevu) {
          const today = new Date();
          const endDate = new Date(project.date_fin_prevu);
          const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
          
          // Haute priorité si moins de 7 jours ou en retard
          if (daysLeft < 7 || (daysLeft < 0 && !project.date_fin_reel)) {
            priority = 'high';
          }
          // Faible priorité si plus de 30 jours
          else if (daysLeft > 30) {
            priority = 'low';
          }
        }

        return {
          ...project,
          title: project.titre, // Mapper titre vers title
          description: project.description,
          listsCount: projectLists.length,
          tasksCount: projectActiveTasks.length, // tâches actives uniquement
          completedTasksCount: completedProjectTasks,
          cancelledTasksCount: projectCancelledTasks,
          completionRate: completionRate,
          priority: priority,
          created_at: project.created_at || project.date_debut
        };
      });

      // Calculer les statistiques des projets par statut
      const completedProjects = projectStats.filter(p => p.completionRate >= 100).length;
      const inProgressProjects = projectStats.filter(p => p.completionRate > 0 && p.completionRate < 100).length;
      const notStartedProjects = projectStats.filter(p => p.completionRate === 0).length;

      // Calculer la moyenne de completion basée sur les projets (par défaut)
      let averageCompletion = projectStats.length > 0 ? 
        Math.round(projectStats.reduce((sum, p) => sum + p.completionRate, 0) / projectStats.length) : 0; // completionRate déjà entier

      // Nouveau calcul "Mon Taux de Réussite" pour un employé sélectionné
      // Règle initiale: done / (tâches dont end_date < aujourd'hui).
      // Ajustement demandé: si la tâche est terminée alors elle doit être comptée comme réalisée même si sa date de fin est future ou absente.
      // Donc:
      //   - Numerateur = toutes les tâches de l'employé (actives) considérées terminées (helper isTaskCompleted) quelle que soit end_date.
      //   - Dénominateur = union des tâches « dues » (end_date < today) + tâches terminées (pour inclure celles finies en avance ou sans date).
      //   - Exclusion des annulées déjà gérée par activeTasks.
      let employeeSuccessRate = null;
      let employeeDueTasksCount = null;
      let employeeCompletedDueTasksCount = null;
      if (filters.selectedEmployee !== 'all') {
        const startOfToday = new Date();
        startOfToday.setHours(0,0,0,0);
        // Tasks de l'employé (activeTasks déjà filtré Annulé + potentiellement par employé en amont)
        const employeeTasks = activeTasks.filter(t => 
          t.assigned_to && t.assigned_to.toString() === filters.selectedEmployee.toString()
        );

        // Due tasks (date passée stricte)
        const strictlyDue = employeeTasks.filter(t => {
          if (!t.end_date) return false;
          const taskEnd = new Date(t.end_date);
          taskEnd.setHours(0,0,0,0);
          return taskEnd < startOfToday;
        });

        const completedAll = employeeTasks.filter(isTaskCompleted);

        // Dénominateur = tâches dues + tâches terminées (inclut terminées sans date ou terminées avec date future)
        const denomSet = new Set();
        strictlyDue.forEach(t => denomSet.add(t.id));
        completedAll.forEach(t => denomSet.add(t.id));
        const denominatorTasks = employeeTasks.filter(t => denomSet.has(t.id));

        employeeDueTasksCount = denominatorTasks.length; // renommer pour cohérence UI (compte étendu)
        employeeCompletedDueTasksCount = completedAll.length;
        employeeSuccessRate = employeeDueTasksCount > 0 ? Math.round((employeeCompletedDueTasksCount / employeeDueTasksCount) * 100) : 0;
        // Remplacer l'indicateur principal par ce taux spécifique
        averageCompletion = employeeSuccessRate;
      }

      // Calcul efficacité par employé (indépendant de selectedEmployee, dépend de selectedProject)
  const employeeEfficiency = users.map(u => {
        const empTasks = activeTasks.filter(t => t.assigned_to && String(t.assigned_to) === String(u.id));
        if (filters.selectedProject !== 'all') {
          // Restreindre aux tâches du projet sélectionné
          const projectListsIds = actualRelatedLists.filter(l => l.project_id === Number(filters.selectedProject)).map(l => l.id);
          // on suppose t.todo_list_id existe
          const projectTasks = empTasks.filter(t => projectListsIds.includes(t.todo_list_id));
          return computeEmpEfficiency(u, projectTasks);
        }
        return computeEmpEfficiency(u, empTasks);
      }).filter(e => e.totalDenom > 0); // garder ceux ayant au moins une tâche considérée

      // Trier par efficacité desc
      employeeEfficiency.sort((a,b)=> b.rate - a.rate);

      return {
        totalProjects: actualFilteredProjects.length,
        totalLists: actualRelatedLists.length,
        totalTasks: activeTasks.length, // tâches actives uniquement
        completedProjects,
        inProgressProjects,
        notStartedProjects,
        completedTasks,
        inProgressTasks,
        notStartedTasks,
        pendingTasks,
        projectStats,
  averageCompletion,
  employeeSuccessRate, // peut être null si pas de filtre employé
  employeeDueTasksCount,
  employeeCompletedDueTasksCount,
        totalCancelledTasks: cancelledTasksGlobal,
        employeeEfficiency
      };
    }

    // Données vides si pas de projets réels
    return {
      totalProjects: 0,
      totalLists: 0,
      totalTasks: 0,
      completedProjects: 0,
      inProgressProjects: 0,
      notStartedProjects: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      notStartedTasks: 0,
      pendingTasks: 0,
  averageCompletion: 0,
  projectStats: [],
  totalCancelledTasks: 0,
  employeeEfficiency: []
    };
  }, [projects, todoLists, filters.selectedProject, filters.selectedEmployee, filters.statusFilter]);

  // Helper pour calcul efficacité employé
  function computeEmpEfficiency(user, tasks) {
    const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
    const strictlyDue = tasks.filter(t => t.end_date && new Date(t.end_date).setHours(0,0,0,0) < startOfToday.getTime());
    const completedAll = tasks.filter(t => {
      const st = (t.status || '').toLowerCase();
      const rawPct = t.pourcentage;
      let pct = 0;
      if (typeof rawPct === 'number') pct = rawPct; else if (rawPct) {
        const cleaned = rawPct.toString().replace(/[^0-9.,]/g,'').replace(',', '.');
        const parsed = parseFloat(cleaned); pct = isNaN(parsed)?0:parsed;
      }
      return st === 'terminée' || st === 'terminee' || (st === 'en cours' && pct >= 100);
    });
    const inProgress = tasks.filter(t => (t.status || '').toLowerCase() === 'en cours' && !(completedAll.includes(t))); // <100%
    const notStarted = tasks.filter(t => ['','non commencée','non commencee'].includes((t.status||'').toLowerCase()));
    const cancelled = tasks.filter(t => (t.status || '').toLowerCase().startsWith('annulé') || (t.status||'').toLowerCase()==='annule');
    const denomIds = new Set();
    strictlyDue.forEach(t=>denomIds.add(t.id));
    completedAll.forEach(t=>denomIds.add(t.id));
    const denominator = tasks.filter(t=>denomIds.has(t.id));
    const rate = denominator.length>0 ? Math.round((completedAll.length/denominator.length)*100) : 0;
    return {
      userId: user.id,
      name: `${user.prenom || ''} ${user.nom || user.name || ''}`.trim() || `User ${user.id}`,
      completed: completedAll.length,
      totalDenom: denominator.length,
      inProgress: inProgress.length,
      notStarted: notStarted.length,
      cancelled: cancelled.length,
      rate
    };
  }

  // Gestionnaires de filtres
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      dateRange: 'all',
      searchTerm: '',
      statusFilter: 'all',
      selectedProject: 'all',
      selectedEmployee: 'all'
    });
    setProjectSearchTerm('');
    setEmployeeSearchTerm('');
    setShowProjectDropdown(false);
    setShowEmployeeDropdown(false);
  };

  // Filtrer les projets pour la sélection
  const filteredProjectsForSelect = projects.filter(project => {
    if (!projectSearchTerm) return true;
    const title = project.titre || project.title || '';
    return title.toLowerCase().includes(projectSearchTerm.toLowerCase());
  });

  // Filtrer les employés pour la sélection
  const filteredEmployeesForSelect = users.filter(user => {
    if (!employeeSearchTerm) return true;
    const fullName = `${user.prenom || ''} ${user.nom || user.name || ''}`.trim();
    return fullName.toLowerCase().includes(employeeSearchTerm.toLowerCase());
  });

  // Fonction pour gérer la sélection d'un projet
  const handleProjectSelect = (projectId, projectTitle) => {
    handleFilterChange('selectedProject', projectId.toString());
    setProjectSearchTerm(projectTitle);
    setShowProjectDropdown(false);
  };

  // Fonction pour gérer la sélection d'un employé
  const handleEmployeeSelect = (employeeId, employeeName) => {
    handleFilterChange('selectedEmployee', employeeId.toString());
    setEmployeeSearchTerm(employeeName);
    setShowEmployeeDropdown(false);
  };

  // Fonction pour changer de projet dans la vue détaillée
  const handleProjectChangeInDetail = (newProject) => {
    setSelectedProjectForDetail(newProject);
  };

  // Fonction pour afficher les détails d'un projet
  const handleShowProjectDetail = (project) => {
    setSelectedProjectForDetail(project);
    setShowDetailView(true);
  };

  // Fonction pour revenir à la vue générale
  const handleBackToGeneral = () => {
    setShowDetailView(false);
    setSelectedProjectForDetail(null);
  };

  // Fonction pour gérer l'input de recherche
  const handleProjectSearchChange = (e) => {
    const value = e.target.value;
    setProjectSearchTerm(value);
    setShowProjectDropdown(true);
    
    // Si le champ est vide, remettre à "all"
    if (!value.trim()) {
      handleFilterChange('selectedProject', 'all');
    }
  };

  // Fonction pour effacer la sélection
  const clearProjectSelection = () => {
    setProjectSearchTerm('');
    handleFilterChange('selectedProject', 'all');
    setShowProjectDropdown(false);
  };

  // Fonction pour gérer l'input de recherche d'employés
  const handleEmployeeSearchChange = (e) => {
    const value = e.target.value;
    setEmployeeSearchTerm(value);
    setShowEmployeeDropdown(true);
    
    // Si le champ est vide, remettre à "all"
    if (!value.trim()) {
      handleFilterChange('selectedEmployee', 'all');
    }
  };

  // Fonction pour effacer la sélection d'employé
  const clearEmployeeSelection = () => {
    setEmployeeSearchTerm('');
    handleFilterChange('selectedEmployee', 'all');
    setShowEmployeeDropdown(false);
  };

  // Filtrer les statistiques des projets
  const filteredProjectStats = statistics.projectStats.filter(project => {
    // Recherche dans le titre et la description
    if (filters.searchTerm) {
      const title = project.title || project.titre || '';
      const description = project.description || '';
      if (!title.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
          !description.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }
    }
    
    // Filtre de statut (normalisation du taux)
    const rateRaw = project.completionRate;
    const rate = (typeof rateRaw === 'number' && !isNaN(rateRaw)) ? rateRaw : 0;
    switch (filters.statusFilter) {
      case 'completed':
        if (rate !== 100) return false;
        break;
      case 'in-progress':
        if (rate <= 0 || rate >= 100) return false; // strictement entre 0 et 100
        break;
      case 'not-started':
        if (rate > 0) return false;
        break;
      default:
        break;
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="text-muted">Chargement des données des projets...</p>
        </div>
      </div>
    );
  }

  // Si on affiche la vue détaillée d'un projet
  if (showDetailView && selectedProjectForDetail) {
    return (
      <ProjectDetailView 
        project={selectedProjectForDetail}
        todoLists={todoLists}
        onBack={handleBackToGeneral}
        allProjects={projects}
        onProjectChange={handleProjectChangeInDetail}
      />
    );
  }

  return (
    <div className="project-report-page">
      {/* En-tête */}
      <div className="page-header">
        <div className="d-flex justify-content-between align-items-center flex-wrap">
          <div>
            <h2 className="page-title mb-1">
              <Icon icon="fluent:chart-multiple-24-filled" className="me-2" />
              Rapport des Projets
            </h2>
            <p className="text-muted mb-0">Statistiques et analyse détaillée des projets et tâches</p>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-primary" size="sm">
              <Icon icon="fluent:arrow-export-24-filled" className="me-1" />
              Exporter
            </Button>
            <Button variant="primary" size="sm">
              <Icon icon="fluent:arrow-sync-24-filled" className="me-1" />
              Actualiser
            </Button>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Header className="bg-light border-0">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-semibold">
              <Icon icon="fluent:filter-24-filled" className="me-2" />
              Filtres et recherche
            </h6>
            <Button variant="outline-secondary" size="sm" onClick={resetFilters}>
              <Icon icon="fluent:arrow-reset-24-filled" className="me-1" />
              Réinitialiser
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Sélection de Projet</Form.Label>
                <div className="position-relative">
                  <div className="d-flex">
                    <Form.Control
                      type="text"
                      placeholder="Rechercher et sélectionner un projet..."
                      value={projectSearchTerm}
                      onChange={handleProjectSearchChange}
                      onFocus={() => setShowProjectDropdown(true)}
                      className="border-0 bg-light"
                    />
                    {projectSearchTerm && (
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="ms-2"
                        onClick={clearProjectSelection}
                        title="Effacer la sélection"
                      >
                        <Icon icon="fluent:dismiss-24-filled" />
                      </Button>
                    )}
                  </div>
                  
                  {showProjectDropdown && (filteredProjectsForSelect.length > 0 || projectSearchTerm) && (
                    <div className="position-absolute w-100 bg-white border rounded-3 shadow-sm mt-1" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                      {/* Option "Tous les projets" */}
                      <div
                        className="px-3 py-2 cursor-pointer border-bottom"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          handleFilterChange('selectedProject', 'all');
                          setProjectSearchTerm('');
                          setShowProjectDropdown(false);
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        <div className="d-flex align-items-center">
                          <Icon icon="fluent:folder-multiple-24-filled" className="text-primary me-2" />
                          <strong>Tous les projets</strong>
                        </div>
                      </div>
                      
                      {/* Liste des projets filtrés */}
                      {filteredProjectsForSelect.map(project => (
                        <div
                          key={project.id}
                          className="px-3 py-2 cursor-pointer"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleProjectSelect(project.id, project.titre || project.title)}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                          <div className="d-flex align-items-center">
                            <Icon icon="fluent:folder-24-filled" className="text-info me-2" />
                            <div>
                              <div className="fw-semibold">{project.titre || project.title}</div>
                              {project.description && (
                                <small className="text-muted">
                                  {project.description.length > 50 ? 
                                    `${project.description.substring(0, 50)}...` : 
                                    project.description}
                                </small>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Message si aucun projet trouvé */}
                      {filteredProjectsForSelect.length === 0 && projectSearchTerm && (
                        <div className="px-3 py-2 text-muted text-center">
                          <Icon icon="fluent:search-24-filled" className="me-2" />
                          Aucun projet trouvé pour "{projectSearchTerm}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Sélection d'Employé</Form.Label>
                <div className="position-relative">
                  <div className="d-flex">
                    <Form.Control
                      type="text"
                      placeholder="Rechercher et sélectionner un employé..."
                      value={employeeSearchTerm}
                      onChange={handleEmployeeSearchChange}
                      onFocus={() => setShowEmployeeDropdown(true)}
                      className="border-0 bg-light"
                    />
                    {employeeSearchTerm && (
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="ms-2"
                        onClick={clearEmployeeSelection}
                        title="Effacer la sélection"
                      >
                        <Icon icon="fluent:dismiss-24-filled" />
                      </Button>
                    )}
                  </div>
                  
                  {showEmployeeDropdown && (filteredEmployeesForSelect.length > 0 || employeeSearchTerm) && (
                    <div className="position-absolute w-100 bg-white border rounded-3 shadow-sm mt-1" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                      {/* Option "Tous les employés" */}
                      <div
                        className="px-3 py-2 cursor-pointer border-bottom"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          handleFilterChange('selectedEmployee', 'all');
                          setEmployeeSearchTerm('');
                          setShowEmployeeDropdown(false);
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        <div className="d-flex align-items-center">
                          <Icon icon="fluent:people-24-filled" className="text-primary me-2" />
                          <strong>Tous les employés</strong>
                        </div>
                      </div>
                      
                      {/* Liste des employés filtrés */}
                      {filteredEmployeesForSelect.map(employee => (
                        <div
                          key={employee.id}
                          className="px-3 py-2 cursor-pointer"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleEmployeeSelect(employee.id, getUserName(employee.id))}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                          <div className="d-flex align-items-center">
                            <Icon icon="fluent:person-24-filled" className="text-success me-2" />
                            <div>
                              <div className="fw-semibold">{getUserName(employee.id)}</div>
                              {employee.email && (
                                <small className="text-muted">{employee.email}</small>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Message si aucun employé trouvé */}
                      {filteredEmployeesForSelect.length === 0 && employeeSearchTerm && (
                        <div className="px-3 py-2 text-muted text-center">
                          <Icon icon="fluent:search-24-filled" className="me-2" />
                          Aucun employé trouvé pour "{employeeSearchTerm}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Form.Group>
            </Col>
          </Row>
          {/* Champs de recherche générale et statut supprimés selon demande */}
        </Card.Body>
      </Card>

      {/* Statistiques principales */}
      <Row className="mb-4">
        {/* Indicateur du projet sélectionné */}
        {filters.selectedProject !== 'all' && (
          <Col xs={12} className="mb-3">
            <div className="alert alert-info filter-alert d-flex align-items-center" role="alert">
              <Icon icon="fluent:info-24-filled" className="me-2" />
              <strong>Statistiques pour le projet : </strong>
              <span className="ms-2">
                {projects.find(p => p.id === parseInt(filters.selectedProject))?.titre || 'Projet inconnu'}
              </span>
              <Button 
                variant="outline-secondary" 
                size="sm" 
                className="ms-auto"
                onClick={() => handleFilterChange('selectedProject', 'all')}
              >
                <Icon icon="fluent:dismiss-24-filled" className="me-1" />
                Voir tous les projets
              </Button>
            </div>
          </Col>
        )}
        
        {/* Indicateur de l'employé sélectionné */}
        {filters.selectedEmployee !== 'all' && (
          <Col xs={12} className="mb-3">
            <div className="alert alert-success filter-alert d-flex align-items-center" role="alert">
              <Icon icon="fluent:person-24-filled" className="me-2" />
              <strong>Statistiques pour l'employé : </strong>
              <span className="ms-2">
                {getUserName(filters.selectedEmployee)}
              </span>
              <Button 
                variant="outline-secondary" 
                size="sm" 
                className="ms-auto"
                onClick={() => handleFilterChange('selectedEmployee', 'all')}
              >
                <Icon icon="fluent:dismiss-24-filled" className="me-1" />
                Voir tous les employés
              </Button>
            </div>
          </Col>
        )}
        
        <Col xl={3} lg={6} className="mb-3">
          <Card className={`border-0 shadow-sm h-100 stat-card-primary ${
            (filters.selectedProject !== 'all' || filters.selectedEmployee !== 'all') ? 'stat-card-filtered' : ''
          }`}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="d-flex align-items-center mb-2">
                    <div className="stat-icon-bg bg-primary bg-opacity-10 rounded-3 p-2 me-3">
                      <Icon icon={filters.selectedEmployee !== 'all' ? "fluent:person-star-24-filled" : "fluent:folder-multiple-24-filled"} className="text-primary" style={{fontSize: '24px'}} />
                    </div>
                    <div>
                      <h6 className="text-muted mb-0 fw-normal">
                        {filters.selectedProject !== 'all' ? 'Projet Sélectionné' : 
                         filters.selectedEmployee !== 'all' ? 'Projets de l\'Employé' : 'Projets Total'}
                        {(filters.selectedProject !== 'all' || filters.selectedEmployee !== 'all') && (
                          <Badge bg="primary" className="ms-2 fs-6 filter-badge">Filtré</Badge>
                        )}
                      </h6>
                      <h3 className="mb-0 fw-bold text-primary">{statistics.totalProjects}</h3>
                    </div>
                  </div>
                  <p className="text-muted small mb-0">
                    <span className="text-success">
                      <Icon icon="fluent:arrow-trending-up-24-filled" className="me-1" />
                      +12%
                    </span>
                    vs mois dernier
                    {filters.selectedEmployee !== 'all' && (
                      <span className="d-block mt-1 text-info">
                        Projets où {getUserName(filters.selectedEmployee)} a des tâches assignées
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={3} lg={6} className="mb-3">
          <Card className={`border-0 shadow-sm h-100 stat-card-info ${
            (filters.selectedProject !== 'all' || filters.selectedEmployee !== 'all') ? 'stat-card-filtered' : ''
          }`}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="d-flex align-items-center mb-2">
                    <div className="stat-icon-bg bg-info bg-opacity-10 rounded-3 p-2 me-3">
                      <Icon icon={filters.selectedEmployee !== 'all' ? "fluent:clipboard-task-list-24-filled" : "fluent:task-list-square-24-filled"} className="text-info" style={{fontSize: '24px'}} />
                    </div>
                    <div>
                      <h6 className="text-muted mb-0 fw-normal">
                        {filters.selectedProject !== 'all' ? 'Listes du Projet' : 
                         filters.selectedEmployee !== 'all' ? 'Listes Impliquées' : 'Listes de Tâches'}
                        {(filters.selectedProject !== 'all' || filters.selectedEmployee !== 'all') && (
                          <Badge bg="info" className="ms-2 fs-6 filter-badge">Filtré</Badge>
                        )}
                      </h6>
                      <h3 className="mb-0 fw-bold text-info">{statistics.totalLists}</h3>
                    </div>
                  </div>
                  <p className="text-muted small mb-0">
                    <span className="text-success">
                      <Icon icon="fluent:arrow-trending-up-24-filled" className="me-1" />
                      +8%
                    </span>
                    vs mois dernier
                    {filters.selectedEmployee !== 'all' && (
                      <span className="d-block mt-1 text-info">
                        Listes contenant des tâches de {getUserName(filters.selectedEmployee)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={3} lg={6} className="mb-3">
          <Card className={`border-0 shadow-sm h-100 stat-card-warning ${
            (filters.selectedProject !== 'all' || filters.selectedEmployee !== 'all') ? 'stat-card-filtered' : ''
          }`}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="d-flex align-items-center mb-2">
                    <div className="stat-icon-bg bg-warning bg-opacity-10 rounded-3 p-2 me-3">
                      <Icon icon={filters.selectedEmployee !== 'all' ? "fluent:person-task-24-filled" : "fluent:checkbox-checked-24-filled"} className="text-warning" style={{fontSize: '24px'}} />
                    </div>
                    <div>
                      <h6 className="text-muted mb-0 fw-normal">
                        {filters.selectedProject !== 'all' ? 'Tâches du Projet' : 
                         filters.selectedEmployee !== 'all' ? 'Mes Tâches' : 'Tâches Total'}
                        {(filters.selectedProject !== 'all' || filters.selectedEmployee !== 'all') && (
                          <Badge bg="warning" className="ms-2 fs-6 filter-badge">Filtré</Badge>
                        )}
                      </h6>
                      <h3 className="mb-0 fw-bold text-warning">{statistics.totalTasks}</h3>
                      {statistics.totalCancelledTasks > 0 && (
                        <div className="mt-1">
                          <Badge bg="danger" className="me-1">{statistics.totalCancelledTasks} annulée{statistics.totalCancelledTasks > 1 ? 's' : ''}</Badge>
                          <small className="text-muted">(exclues)</small>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-muted small mb-0">
                    <span className="text-success">
                      <Icon icon="fluent:arrow-trending-up-24-filled" className="me-1" />
                      +15%
                    </span>
                    vs mois dernier
                    {filters.selectedEmployee !== 'all' && (
                      <span className="d-block mt-1 text-info">
                        Tâches directement assignées à {getUserName(filters.selectedEmployee)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={3} lg={6} className="mb-3">
          <Card className={`border-0 shadow-sm h-100 stat-card-success ${
            (filters.selectedProject !== 'all' || filters.selectedEmployee !== 'all') ? 'stat-card-filtered' : ''
          }`}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="d-flex align-items-center mb-2">
                    <div className="stat-icon-bg bg-success bg-opacity-10 rounded-3 p-2 me-3">
                      <Icon icon={filters.selectedEmployee !== 'all' ? "fluent:person-badge-24-filled" : "fluent:target-24-filled"} className="text-success" style={{fontSize: '24px'}} />
                    </div>
                    <div>
                      <h6 className="text-muted mb-0 fw-normal">
                        {filters.selectedProject !== 'all' ? 'Taux du Projet' : 
                         filters.selectedEmployee !== 'all' ? 'Mon Taux de Réussite' : 'Taux Moyen'}
                        {(filters.selectedProject !== 'all' || filters.selectedEmployee !== 'all') && (
                          <Badge bg="success" className="ms-2 fs-6 filter-badge">Filtré</Badge>
                        )}
                      </h6>
                      <h3 className="mb-0 fw-bold text-success">{statistics.averageCompletion}%</h3>
                      {filters.selectedEmployee !== 'all' && (
                        <div className="mt-1 small text-muted" style={{maxWidth:'180px'}}>
                          <span title="Tâches réalisées / (tâches échues + tâches terminées même en avance ou sans date). Annulées exclues.">
                            {statistics.employeeCompletedDueTasksCount ?? 0}/{statistics.employeeDueTasksCount ?? 0} réalisées / dues+terminées
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-muted small mb-0">
                    <span className="text-success">
                      <Icon icon="fluent:arrow-trending-up-24-filled" className="me-1" />
                      +5%
                    </span>
                    vs mois dernier
                    {filters.selectedEmployee !== 'all' && (
                      <span className="d-block mt-1 text-info">
                        Performance personnelle de {getUserName(filters.selectedEmployee)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Graphiques et analyses */}
      <Row className="mb-4">
        {/* Graphique en secteurs - Répartition des projets - Masqué si filtre projet ou employé */}
        {filters.selectedProject === 'all' && filters.selectedEmployee === 'all' && (
          <Col lg={6} className="mb-4">
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white border-0 pb-0">
                <h6 className="fw-semibold mb-0">
                  <Icon icon="fluent:pie-chart-24-filled" className="me-2" />
                  Répartition des Projets par Statut
                </h6>
              </Card.Header>
              <Card.Body>
                {statistics.totalProjects > 0 ? (
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <defs>
                          <linearGradient id="completedGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="5%" stopColor="#28a745" />
                            <stop offset="90%" stopColor="#20c997" />
                          </linearGradient>
                          <linearGradient id="inProgressGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="5%" stopColor="#ffc107" />
                            <stop offset="90%" stopColor="#fd7e14" />
                          </linearGradient>
                          <linearGradient id="notStartedGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="5%" stopColor="#6c757d" />
                            <stop offset="90%" stopColor="#495057" />
                          </linearGradient>
                        </defs>
                        <Pie
                          data={[
                            { name: 'Terminés', value: statistics.completedProjects, color: 'url(#completedGradient)' },
                            { name: 'En cours', value: statistics.inProgressProjects, color: 'url(#inProgressGradient)' },
                            { name: 'Non démarrés', value: statistics.notStartedProjects, color: 'url(#notStartedGradient)' }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {[
                            { name: 'Terminés', value: statistics.completedProjects },
                            { name: 'En cours', value: statistics.inProgressProjects },
                            { name: 'Non démarrés', value: statistics.notStartedProjects }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name) => [
                            `${value} projet${value > 1 ? 's' : ''}`, 
                            name
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Légende personnalisée */}
                    <div className="d-flex justify-content-center gap-4 mt-3">
                      <div className="d-flex align-items-center gap-2">
                        <div style={{ width: 16, height: 16, backgroundColor: COLORS.completed, borderRadius: 4 }}></div>
                        <span className="fw-semibold">Terminés</span>
                        <span className="text-muted">({statistics.completedProjects})</span>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <div style={{ width: 16, height: 16, backgroundColor: COLORS.inProgress, borderRadius: 4 }}></div>
                        <span className="fw-semibold">En cours</span>
                        <span className="text-muted">({statistics.inProgressProjects})</span>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <div style={{ width: 16, height: 16, backgroundColor: COLORS.notStarted, borderRadius: 4 }}></div>
                        <span className="fw-semibold">Non démarrés</span>
                        <span className="text-muted">({statistics.notStartedProjects})</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <Icon icon="fluent:chart-pie-24-filled" className="text-muted mb-3" style={{fontSize: '48px'}} />
                    <h6 className="text-muted">Aucune donnée disponible</h6>
                    <p className="text-muted small mb-0">Créez des projets pour voir les statistiques</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        )}

  {/* Graphique en barres - Progression des tâches (affiché seulement si aucun employé spécifique n'est filtré) */}
  {filters.selectedEmployee === 'all' && (
  <Col lg={filters.selectedProject === 'all' ? 6 : 12} className="mb-4">
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 pb-0">
              <h6 className="fw-semibold mb-0">
                <Icon icon="fluent:chart-column-24-filled" className="me-2" />
                Progression des Tâches
                {filters.selectedProject !== 'all' && (
                  <Badge bg="primary" className="ms-2">
                    Projet: {projects.find(p => p.id === parseInt(filters.selectedProject))?.nom}
                  </Badge>
                )}
              </h6>
            </Card.Header>
            <Card.Body>
              {statistics.totalTasks > 0 ? (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={[
                        { 
                          name: 'Tâches', 
                          'Terminées': statistics.completedTasks, 
                          'En cours': statistics.inProgressTasks,
                          'Non commencées': statistics.notStartedTasks
                        }
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value} tâche${value > 1 ? 's' : ''}`, 
                          name
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="Terminées" fill={COLORS.completed} radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="Terminées" content={(props) => {
                          if(!props) return null;
                          const { value, x=0, y=0, width=0, payload } = props;
                          if(!payload) return null;
                          const total = (payload['Terminées']||0)+(payload['En cours']||0)+(payload['Non commencées']||0);
                          if(!total || !value) return null;
                          const pct = Math.round((value/total)*100);
                          if (y < 14) return null; // éviter chevauchement haut
                          return <text x={x + width / 2} y={y - 4} fill={COLORS.completed} fontSize={11} textAnchor="middle">{pct}%</text>;
                        }} />
                      </Bar>
                      <Bar dataKey="En cours" fill={COLORS.inProgress} radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="En cours" content={(props) => {
                          if(!props) return null;
                          const { value, x=0, y=0, width=0, payload } = props;
                          if(!payload) return null;
                          const total = (payload['Terminées']||0)+(payload['En cours']||0)+(payload['Non commencées']||0);
                          if(!total || !value) return null;
                          const pct = Math.round((value/total)*100);
                          if (y < 14) return null;
                          return <text x={x + width / 2} y={y - 4} fill={COLORS.inProgress} fontSize={11} textAnchor="middle">{pct}%</text>;
                        }} />
                      </Bar>
                      <Bar dataKey="Non commencées" fill={COLORS.notStarted} radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="Non commencées" content={(props) => {
                          if(!props) return null;
                          const { value, x=0, y=0, width=0, payload } = props;
                          if(!payload) return null;
                          const total = (payload['Terminées']||0)+(payload['En cours']||0)+(payload['Non commencées']||0);
                          if(!total || !value) return null;
                          const pct = Math.round((value/total)*100);
                          if (y < 14) return null;
                          return <text x={x + width / 2} y={y - 4} fill={COLORS.notStarted} fontSize={11} textAnchor="middle">{pct}%</text>;
                        }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Statistiques en bas avec 3 colonnes (affichées seulement si pas de projet filtré) */}
                  {filters.selectedProject === 'all' && (
                    <div className="row text-center mt-3">
                      <div className="col-4">
                        <div className="border-end">
                          <h4 className="text-success fw-bold mb-0">
                            {statistics.totalTasks > 0 ? Math.round((statistics.completedTasks / statistics.totalTasks) * 100) : 0}%
                          </h4>
                          <small className="text-muted">Terminées</small>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="border-end">
                          <h4 className="text-warning fw-bold mb-0">
                            {statistics.totalTasks > 0 ? Math.round((statistics.inProgressTasks / statistics.totalTasks) * 100) : 0}%
                          </h4>
                          <small className="text-muted">En cours</small>
                        </div>
                      </div>
                      <div className="col-4">
                        <h4 className="text-secondary fw-bold mb-0">
                          {statistics.totalTasks > 0 ? Math.round((statistics.notStartedTasks / statistics.totalTasks) * 100) : 0}%
                        </h4>
                        <small className="text-muted">Non commencées</small>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-5">
                  <Icon icon="fluent:chart-column-24-filled" className="text-muted mb-3" style={{fontSize: '48px'}} />
                  <h6 className="text-muted">Aucune tâche disponible</h6>
                  <p className="text-muted small mb-0">Créez des tâches pour voir la progression</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
  )}
      </Row>

      {/* Graphique des projets individuels affiché seulement si aucun projet spécifique n'est filtré */}
      {filters.selectedProject === 'all' && (
        <Row className="mb-4">
          <Col lg={12}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white border-0 pb-0">
                <h6 className="fw-semibold mb-0 d-flex align-items-center">
                  <Icon icon="fluent:chart-line-24-filled" className="me-2" />
                  Progression des Projets Individuels
                  {filters.selectedEmployee !== 'all' && (
                    <Badge bg="success" className="ms-2">
                      Employé: {getUserName(filters.selectedEmployee)}
                    </Badge>
                  )}
                </h6>
              </Card.Header>
              <Card.Body>
                {statistics.projectStats.length > 0 ? (
                  <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer>
                      <BarChart
                        data={statistics.projectStats.map(project => ({
                          name: project.titre && project.titre.length > 15 ? project.titre.substring(0, 15) + '...' : project.titre,
                          fullName: project.titre,
                          pourcentage: project.completionRate,
                          taches: project.tasksCount,
                          listes: project.listsCount
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          fontSize={12}
                        />
                        <YAxis 
                          domain={[0, 100]}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'pourcentage' ? `${value}%` : value,
                            name === 'pourcentage' ? 'Progression' : 
                            name === 'taches' ? 'Tâches' : 'Listes'
                          ]}
                          labelFormatter={(label, payload) => 
                            payload && payload[0] ? payload[0].payload.fullName : label
                          }
                        />
                        <Legend />
                        <Bar 
                          dataKey="pourcentage" 
                          name="Progression (%)"
                          fill={COLORS.primary} 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <Icon icon="fluent:chart-line-24-filled" className="text-muted mb-3" style={{fontSize: '48px'}} />
                    <h6 className="text-muted">Aucun projet disponible</h6>
                    <p className="text-muted small mb-0">Créez des projets pour voir leur progression</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Tableau efficacité employés */}
      <Row className="mb-4">
        <Col lg={12}>
          <div className="p-0">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="fw-semibold mb-0 d-flex align-items-center gap-2">
                <Icon icon="fluent:people-team-24-filled" /> Efficacité Employés
                {filters.selectedProject !== 'all' && (<Badge bg="primary" className="ms-1">Projet</Badge>)}
              </h6>
              <small className="text-muted">Taux = réalisées / (échues + terminées)</small>
            </div>
            {statistics.employeeEfficiency && statistics.employeeEfficiency.length > 0 ? (
              <div className="table-responsive rounded-3 border" style={{background:'#fff'}}>
                <Table hover className="mb-0 align-middle" style={{fontSize:'0.92rem'}}>
                  <thead style={{background:'#f8f9fa'}}>
                    <tr>
                      <th className="text-muted fw-semibold">Employé</th>
                      <th className="text-muted fw-semibold text-center">✔ Réalisées</th>
                      <th className="text-muted fw-semibold text-center">⏳ En cours</th>
                      <th className="text-muted fw-semibold text-center">📥 Non comm.</th>
                      <th className="text-muted fw-semibold text-center">✖ Annulées</th>
                      <th className="text-muted fw-semibold text-center">Total (Denom)</th>
                      <th className="text-muted fw-semibold" style={{minWidth:'140px'}}>Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statistics.employeeEfficiency.map(emp => (
                      <tr key={emp.userId}>
                        <td>
                          <div className="d-flex flex-column">
                            <span className="fw-semibold">{emp.name}</span>
                            <small className="text-muted">ID {emp.userId}</small>
                          </div>
                        </td>
                        <td className="text-center text-success fw-semibold">{emp.completed}</td>
                        <td className="text-center text-warning fw-semibold">{emp.inProgress}</td>
                        <td className="text-center text-secondary fw-semibold">{emp.notStarted}</td>
                        <td className="text-center text-danger fw-semibold">{emp.cancelled}</td>
                        <td className="text-center fw-semibold">{emp.totalDenom}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="progress flex-grow-1" style={{height:'10px', background:'#e9ecef'}}>
                              <div className="progress-bar bg-success" style={{width:`${emp.rate}%`}} />
                            </div>
                            <span className="badge bg-light text-success border border-success-subtle">{emp.rate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-4 text-muted small">Aucune donnée d'efficacité disponible</div>
            )}
          </div>
        </Col>
      </Row>
      {/* Style inline pour réduire l'espacement des cellules */}
      <style>{`
        .table-responsive table td, .table-responsive table th { padding: 0.6rem 0.75rem !important; }
      `}</style>

      {/* Graphe bar efficacité employés */}
      <Row className="mb-4">
        <Col lg={12}>
          <div className="p-0">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="fw-semibold mb-0 d-flex align-items-center gap-2">
                <Icon icon="fluent:data-bar-vertical-20-filled" /> Statuts & Taux (Multi Bar)
              </h6>
              <small className="text-muted">Taux (%) axe droit</small>
            </div>
            {statistics.employeeEfficiency && statistics.employeeEfficiency.length > 0 && (
              <div className="series-filter mb-2 d-flex flex-wrap align-items-center gap-3" style={{fontSize:'0.78rem'}}>
                <label className="form-check form-check-inline m-0 d-flex align-items-center gap-2">
                  <input type="checkbox" style={{'--series-color': COLORS.completed}} className="form-check-input shadow-none" checked={visibleSeries.completed} onChange={()=>toggleSeries('completed')} />
                  <span className="badge" style={{background:COLORS.completed}}>Réalisées</span>
                </label>
                <label className="form-check form-check-inline m-0 d-flex align-items-center gap-2">
                  <input type="checkbox" style={{'--series-color': COLORS.inProgress}} className="form-check-input shadow-none" checked={visibleSeries.inProgress} onChange={()=>toggleSeries('inProgress')} />
                  <span className="badge" style={{background:COLORS.inProgress}}>En cours</span>
                </label>
                <label className="form-check form-check-inline m-0 d-flex align-items-center gap-2">
                  <input type="checkbox" style={{'--series-color': COLORS.notStarted}} className="form-check-input shadow-none" checked={visibleSeries.notStarted} onChange={()=>toggleSeries('notStarted')} />
                  <span className="badge" style={{background:COLORS.notStarted}}>Non comm.</span>
                </label>
                <label className="form-check form-check-inline m-0 d-flex align-items-center gap-2">
                  <input type="checkbox" style={{'--series-color': COLORS.primary}} className="form-check-input shadow-none" checked={visibleSeries.rate} onChange={()=>toggleSeries('rate')} />
                  <span className="badge" style={{background:COLORS.primary}}>Taux (%)</span>
                </label>
                <button type="button" className="btn btn-light btn-sm border" onClick={()=> setVisibleSeries({completed:true,inProgress:true,notStarted:true,rate:true})}>Tout</button>
                <button type="button" className="btn btn-light btn-sm border" onClick={()=> setVisibleSeries({completed:false,inProgress:false,notStarted:false,rate:false})}>Aucun</button>
              </div>
            )}
            {statistics.employeeEfficiency && statistics.employeeEfficiency.length > 0 ? (
              <div style={{width:'100%', height: 360}} className="border rounded-3 p-2 bg-white">
                {Object.values(visibleSeries).some(v=>v) ? (
                  <ResponsiveContainer>
                    <BarChart data={statistics.employeeEfficiency.slice(0,30)} margin={{top:10,right:30,left:10,bottom:55}} barCategoryGap="18%">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" angle={-28} textAnchor="end" interval={0} height={70} fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" allowDecimals={false} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" domain={[0,100]} tickFormatter={v=>`${v}%`} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value, name) => name.includes('Taux') ? [`${value}%`, name] : [value, name]} labelFormatter={l=>l} />
                      <Legend />
                      {visibleSeries.completed && (
                        <Bar isAnimationActive animationDuration={700} yAxisId="left" dataKey="completed" name="Réalisées" fill={COLORS.completed} radius={[4,4,0,0]} />
                      )}
                      {visibleSeries.inProgress && (
                        <Bar isAnimationActive animationDuration={700} yAxisId="left" dataKey="inProgress" name="En cours" fill={COLORS.inProgress} radius={[4,4,0,0]} />
                      )}
                      {visibleSeries.notStarted && (
                        <Bar isAnimationActive animationDuration={700} yAxisId="left" dataKey="notStarted" name="Non comm." fill={COLORS.notStarted} radius={[4,4,0,0]} />
                      )}
                      {visibleSeries.rate && (
                        <Bar isAnimationActive animationDuration={700} yAxisId="right" dataKey="rate" name="Taux (%)" fill={COLORS.primary} radius={[4,4,0,0]} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="d-flex justify-content-center align-items-center h-100 text-muted small">Sélectionnez au moins une série</div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted small">Aucune donnée à afficher</div>
            )}
          </div>
        </Col>
      </Row>
      <style>{`
        .series-filter .form-check-input { width:18px; height:18px; cursor:pointer; border:2px solid #ced4da; margin:0; background:#fff; appearance:none; -webkit-appearance:none; display:inline-block; position:relative; }
        .series-filter .form-check-input:focus { box-shadow:0 0 0 0.15rem rgba(13,110,253,.15); }
        .series-filter .form-check-input:checked { background:var(--series-color); border-color:var(--series-color); }
        .series-filter .form-check-input:checked::after { content:'\\2713'; position:absolute; top:50%; left:50%; transform:translate(-50%,-55%); font-size:0.85rem; color:#fff; font-weight:600; }
        .series-filter .badge { font-weight:500; }
      `}</style>

      {/* Tableau des projets */}
      <Row>
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="fw-semibold mb-0">
                  <Icon icon="fluent:table-24-filled" className="me-2" />
                  Liste des Projets ({filteredProjectStats.length})
                </h6>
                <div className="d-flex gap-2">
                  <Badge bg="light" text="dark">
                    {filteredProjectStats.filter(p => p.completionRate === 100).length} terminés
                  </Badge>
                  <Badge bg="light" text="dark">
                    {filteredProjectStats.filter(p => p.completionRate > 0 && p.completionRate < 100).length} en cours
                  </Badge>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {filteredProjectStats.length > 0 ? (
                <div className="table-responsive">
                  <Table className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th className="border-0 fw-semibold text-muted py-3 px-4">Projet</th>
                        <th className="border-0 fw-semibold text-muted py-3">Listes</th>
                        <th className="border-0 fw-semibold text-muted py-3">Tâches</th>
                        <th className="border-0 fw-semibold text-muted py-3">Terminées</th>
                        <th className="border-0 fw-semibold text-muted py-3">Annulées</th>
                        <th className="border-0 fw-semibold text-muted py-3">Pourcentage</th>
                        <th className="border-0 fw-semibold text-muted py-3">Statut</th>
                        <th className="border-0 fw-semibold text-muted py-3">Date Début</th>
                        <th className="border-0 fw-semibold text-muted py-3">Date Fin</th>
                        <th className="border-0 fw-semibold text-muted py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjectStats.map((project, index) => {
                        // Corriger la logique de couleur de statut
                        const statusColor = project.completionRate >= 100 ? 'success' : 
                                          project.completionRate > 0 ? 'warning' : 'secondary';
                        const statusText = project.completionRate >= 100 ? 'Terminé' : 
                                         project.completionRate > 0 ? 'En cours' : 'Non démarré';

                        return (
                          <tr key={project.id} className="border-bottom">
                            <td className="py-3 px-4">
                              <div className="d-flex align-items-center">
                                <div className="bg-primary bg-opacity-10 rounded-3 p-2 me-3">
                                  <Icon icon="fluent:folder-24-filled" className="text-primary" />
                                </div>
                                <div>
                                  <h6 
                                    className="mb-1 fw-semibold text-primary" 
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleShowProjectDetail(project)}
                                    title="Cliquer pour voir les détails du projet"
                                  >
                                    {project.title || project.titre}
                                  </h6>
                                  {(project.description) && (
                                    <p className="text-muted small mb-0">
                                      {project.description.length > 60 ? 
                                        `${project.description.substring(0, 60)}...` : 
                                        project.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="d-flex align-items-center">
                                <Icon icon="fluent:task-list-square-24-filled" className="text-info me-2" />
                                <span className="fw-semibold">{project.listsCount}</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="d-flex align-items-center">
                                <Icon icon="fluent:checkbox-checked-24-filled" className="text-primary me-2" />
                                <span className="fw-semibold">{project.tasksCount}</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="d-flex align-items-center">
                                <Icon icon="fluent:checkmark-circle-24-filled" className="text-success me-2" />
                                <span className="fw-semibold text-success">{project.completedTasksCount}</span>
                              </div>
                            </td>
                            <td className="py-3">
                              {project.cancelledTasksCount > 0 ? (
                                <div className="d-flex align-items-center">
                                  <Icon icon="fluent:dismiss-circle-24-filled" className="text-danger me-2" />
                                  <span className="fw-semibold text-danger">{project.cancelledTasksCount}</span>
                                </div>
                              ) : (
                                <span className="text-muted small">0</span>
                              )}
                            </td>
                            <td className="py-3">
                              <div className="d-flex align-items-center" style={{width: '150px'}}>
                                <ProgressBar 
                                  now={project.completionRate} 
                                  variant={project.completionRate === 100 ? 'success' : 
                                          project.completionRate > 70 ? 'info' : 
                                          project.completionRate > 30 ? 'warning' : 'danger'}
                                  className="flex-grow-1 me-2"
                                  style={{ height: '6px' }}
                                />
                                <span className="small fw-semibold text-muted">{project.completionRate}%</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <Badge bg={statusColor} className="px-3 py-2">
                                {statusText}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="d-flex align-items-center">
                                <Icon icon="fluent:calendar-play-24-filled" className="text-success me-2" />
                                <span className="text-muted small">
                                  {project.date_debut ? 
                                    new Date(project.date_debut).toLocaleDateString('fr-FR') : 
                                    'Non définie'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="d-flex align-items-center">
                                <Icon icon="fluent:calendar-clock-24-filled" className="text-warning me-2" />
                                <span className="text-muted small">
                                  {project.date_fin_prevu ? 
                                    new Date(project.date_fin_prevu).toLocaleDateString('fr-FR') : 
                                    'Non définie'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 text-center">
                              <div className="d-flex gap-1 justify-content-center">
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  className="rounded-circle p-1 d-flex align-items-center justify-content-center"
                                  style={{ width: '32px', height: '32px' }}
                                  onClick={() => handleShowProjectDetail(project)}
                                  title="Voir les détails du projet"
                                >
                                  <Icon icon="fluent:eye-24-filled" style={{ fontSize: '14px' }} />
                                </Button>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  className="rounded-circle p-1 d-flex align-items-center justify-content-center"
                                  style={{ width: '32px', height: '32px' }}
                                  onClick={() => handleEditProject(project)}
                                  title="Modifier le projet"
                                >
                                  <Icon icon="fluent:edit-24-filled" style={{ fontSize: '14px' }} />
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  className="rounded-circle p-1 d-flex align-items-center justify-content-center"
                                  style={{ width: '32px', height: '32px' }}
                                  onClick={() => handleDeleteProject(project)}
                                  title="Supprimer le projet"
                                >
                                  <Icon icon="fluent:delete-24-filled" style={{ fontSize: '14px' }} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <Icon icon="fluent:folder-open-24-filled" className="text-muted mb-3" style={{fontSize: '48px'}} />
                  <h6 className="text-muted">Aucun projet trouvé</h6>
                  <p className="text-muted small mb-0">
                    {filters.searchTerm || filters.statusFilter !== 'all' ? 
                      'Aucun projet ne correspond aux critères de recherche' : 
                      'Aucun projet disponible pour le moment'}
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal d'édition de projet */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title className="d-flex align-items-center gap-2">
            <Icon icon="fluent:edit-24-filled" />
            Modifier le projet
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingProject && (
            <Form>
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label className="d-flex align-items-center gap-2">
                      <Icon icon="fluent:text-24-filled" className="text-primary" />
                      Titre du projet
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="titre"
                      value={editForm.titre}
                      onChange={handleEditFormChange}
                      isInvalid={!!formErrors.titre}
                      placeholder="Nom du projet"
                    />
                    <Form.Control.Feedback type="invalid">
                      {formErrors.titre}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>
              
              <Form.Group className="mb-3">
                <Form.Label className="d-flex align-items-center gap-2">
                  <Icon icon="fluent:text-description-24-filled" className="text-primary" />
                  Description
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  value={editForm.description}
                  onChange={handleEditFormChange}
                  isInvalid={!!formErrors.description}
                  placeholder="Description du projet"
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.description}
                </Form.Control.Feedback>
              </Form.Group>

              <div className="alert alert-info d-flex align-items-center mb-3">
                <Icon icon="fluent:info-24-filled" className="me-2" />
                <small>
                  <strong>Information :</strong> La progression du projet est calculée automatiquement à partir des tâches.
                  <br />
                  • Tâche terminée = 100% • Tâche en cours = progression de la tâche • Tâche non commencée = 0%
                </small>
              </div>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="d-flex align-items-center gap-2">
                      <Icon icon="fluent:calendar-play-24-filled" className="text-success" />
                      Date de début
                    </Form.Label>
                    <Form.Control
                      type="date"
                      name="date_debut"
                      value={editForm.date_debut}
                      onChange={handleEditFormChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="d-flex align-items-center gap-2">
                      <Icon icon="fluent:calendar-clock-24-filled" className="text-warning" />
                      Date de fin
                    </Form.Label>
                    <Form.Control
                      type="date"
                      name="date_fin_prevu"
                      value={editForm.date_fin_prevu}
                      onChange={handleEditFormChange}
                      isInvalid={!!formErrors.date_fin_prevu}
                    />
                    <Form.Control.Feedback type="invalid">
                      {formErrors.date_fin_prevu}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowEditModal(false)}>
            <Icon icon="fluent:dismiss-24-filled" className="me-1" />
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSaveProject}>
            <Icon icon="fluent:save-24-filled" className="me-1" />
            Enregistrer les modifications
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ProjectReportPage;
