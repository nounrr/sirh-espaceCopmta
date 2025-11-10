import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Icon } from '@iconify/react';
import { fetchAudits, fetchAuditStats, fetchAuditById } from '../Redux/Slices/auditSlice';
import { fetchProjects } from '../Redux/Slices/projectSlice';
import { fetchTodoLists } from '../Redux/Slices/todoListSlice';
import MobilePageHeader from '../Components/Common/MobilePageHeader';
import { ResponsiveButton } from '../Components/Common/ResponsiveButton';
import ResponsiveTable from '../Components/Common/ResponsiveTable';
import AuditDetailsModal from '../Components/AuditDetailsModal';
import AuditCard from '../Components/AuditCard';
import { useIsMobile } from '../utils/responsiveUtils';
import './AuditPage.css';
import './AuditPageExtras.css';

const AuditPage = () => {
  const dispatch = useDispatch();
  const isMobile = useIsMobile();
  
  const { items: audits, status, pagination, stats, currentAudit, entityHistory } = useSelector(state => state.audits);
  const { items: projects } = useSelector(state => state.projects);
  const { items: todoLists } = useSelector(state => state.todoLists);
  const { items: users } = useSelector(state => state.users || { items: [] });
  const { roles } = useSelector(state => state.auth);
  
  // Vérifier les permissions
  const hasAuditAccess = roles.includes('RH') || roles.includes('Gest_RH') || roles.includes('admin');
  
  // États pour les filtres
  const [filters, setFilters] = useState({
    entity_type: 'projects', // Par défaut sur projets
    entity_id: '',
    event: '',
    user_id: '',
    date_from: '',
    date_to: '',
    page: 1,
    per_page: 15
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  // Modes de vue pour l'onglet projets: table | timeline | groupe
  const [viewMode, setViewMode] = useState('table');
  
  // Filtres d'entités (checkboxes)
  const [entityFilters, setEntityFilters] = useState({
    projects: true,
    todoLists: true,
    todoTasks: true
  });

  // États pour les accordéons
  const [openAccordions, setOpenAccordions] = useState({
    stats: true,
    filters: true,
    entityTypes: true
  });

  useEffect(() => {
    if (!hasAuditAccess) return;
    
    dispatch(fetchProjects());
    dispatch(fetchTodoLists());
    dispatch(fetchAudits(filters));
    dispatch(fetchAuditStats());
  }, [dispatch, hasAuditAccess]);

  useEffect(() => {
    if (hasAuditAccess) {
      dispatch(fetchAudits(filters));
    }
  }, [dispatch, filters, hasAuditAccess]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset page when filters change
    }));
  };

  const handleProjectSelect = (projectId) => {
    const project = projects.find(p => p.id === parseInt(projectId));
    setSelectedProject(project);
    setFilters(prev => ({
      ...prev,
      entity_type: 'projects',
      entity_id: projectId || '',
      page: 1
    }));
  };



  // Fonction pour obtenir les audits filtrés avec les filtres d'entités
  const getFilteredAudits = () => {
    const allowedTypes = [];
    if (entityFilters.projects) allowedTypes.push('App\\Models\\Project');
    if (entityFilters.todoLists) allowedTypes.push('App\\Models\\TodoList');
    if (entityFilters.todoTasks) allowedTypes.push('App\\Models\\TodoTask');
    
    return audits.filter(audit => allowedTypes.includes(audit.auditable_type));
  };

  const resetFilters = () => {
    setFilters({
      entity_type: '',
      entity_id: '',
      event: '',
      user_id: '',
      date_from: '',
      date_to: '',
      page: 1,
      per_page: 15
    });
    setSelectedProject(null);
  };

  // Fonction pour gérer les changements des filtres d'entités
  const handleEntityFilterChange = (entityType, checked) => {
    setEntityFilters(prev => ({
      ...prev,
      [entityType]: checked
    }));
  };

  // Fonction pour calculer les statistiques filtrées
  const getFilteredStats = () => {
    const filtered = getFilteredAudits();
    
    const eventStats = [
      { event: 'created', count: filtered.filter(a => a.event === 'created').length },
      { event: 'updated', count: filtered.filter(a => a.event === 'updated').length },
      { event: 'deleted', count: filtered.filter(a => a.event === 'deleted').length }
    ];

    return {
      total_count: filtered.length,
      event_stats: eventStats,
      entity_stats: [
        { type: 'Project', count: filtered.filter(a => a.auditable_type === 'App\\Models\\Project').length },
        { type: 'TodoList', count: filtered.filter(a => a.auditable_type === 'App\\Models\\TodoList').length },
        { type: 'TodoTask', count: filtered.filter(a => a.auditable_type === 'App\\Models\\TodoTask').length }
      ]
    };
  };

  // Fonction helper pour récupérer les vraies données depuis Redux
  const getEntityDisplayData = (audit) => {
    const entityType = audit.auditable_type;
    const entityId = audit.auditable_id;

    if (entityType === 'App\\Models\\Project') {
      const project = projects.find(p => p.id === entityId);
      return {
        title: project?.titre || `Projet #${entityId}`,
        type: 'Projet',
        badge: 'Projet',
        path: project ? project.titre : `Projet #${entityId}`,
        project
      };
    }

    if (entityType === 'App\\Models\\TodoList') {
      const todoList = todoLists.find(list => list.id === entityId);
      const project = projects.find(p => p.id === (todoList?.project_id));
      return {
        title: todoList?.title || `Liste #${entityId}`,
        type: 'Liste',
        badge: 'Liste',
        path: project ? `${project.titre} › ${todoList?.title || `Liste #${entityId}`}` : (todoList?.title || `Liste #${entityId}`),
        project,
        todoList
      };
    }

    if (entityType === 'App\\Models\\TodoTask') {
      let foundList = null;
      let task = null;
      for (const list of todoLists) {
        if (list.tasks) {
          task = list.tasks.find(t => t.id === entityId);
          if (task) { foundList = list; break; }
        }
      }
      const project = foundList ? projects.find(p => p.id === foundList.project_id) : null;
      return {
        title: task?.description || `Tâche #${entityId}`,
        type: 'Tâche',
        badge: 'Tâche',
        path: project && foundList ? `${project.titre} › ${foundList.title} › ${task?.description || `Tâche #${entityId}`}` : (task?.description || `Tâche #${entityId}`),
        project,
        todoList: foundList,
        task
      };
    }

    return {
      title: `Entité #${entityId}`,
      type: entityType.split('\\').pop(),
      badge: entityType.split('\\').pop(),
      path: `Entité #${entityId}`
    };
  };

  const handleShowAuditDetails = async (auditId) => {
    await dispatch(fetchAuditById(auditId));
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
  };

  // Sélection de mode
  const setMode = (mode) => setViewMode(mode);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEntityTypeLabel = (type) => {
    switch (type) {
      case 'App\\Models\\Project': return 'Projet';
      case 'App\\Models\\TodoList': return 'Liste';
      case 'App\\Models\\TodoTask': return 'Tâche';
      default: return type;
    }
  };

  const getEventLabel = (event) => {
    switch (event) {
      case 'created': return 'Créé';
      case 'updated': return 'Modifié';
      case 'deleted': return 'Supprimé';
      default: return event;
    }
  };

  const getEventIcon = (event) => {
    switch (event) {
      case 'created': return 'mdi:plus-circle';
      case 'updated': return 'mdi:pencil-circle';
      case 'deleted': return 'mdi:delete-circle';
      default: return 'mdi:circle';
    }
  };

  const getEventColor = (event) => {
    switch (event) {
      case 'created': return '#28a745';
      case 'updated': return '#ffc107';
      case 'deleted': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // Fonction pour traduire les noms de champs
  const translateField = (field) => {
    const translations = {
      titre: 'Titre',
      description: 'Description',
      date_debut: 'Date de début',
      date_fin_prevu: 'Date de fin prévue',
      date_fin_reel: 'Date de fin réelle',
      status: 'Statut',
      assigned_to: 'Assigné à',
      priority: 'Priorité',
      due_date: 'Date d\'échéance',
      name: 'Nom',
      email: 'Email',
      role: 'Rôle',
      project_id: 'Projet',
      todo_list_id: 'Liste de tâches',
      user_id: 'Utilisateur',
      title: 'Titre'
    };
    return translations[field] || field;
  };

  // Fonction pour afficher les changements directement
  const renderChanges = (audit) => {
    if (!audit.old_values && !audit.new_values) return '-';
    
    const rawOld = typeof audit.old_values === 'string' ? JSON.parse(audit.old_values || '{}') : audit.old_values || {};
    const rawNew = typeof audit.new_values === 'string' ? JSON.parse(audit.new_values || '{}') : audit.new_values || {};
    const resolveUser = (id) => {
      if(!id) return id;
      const u = users?.find(us => us.id === id);
      return u ? `${u.prenom || ''} ${u.name || ''}`.trim() : id;
    };
    // Clone and resolve
    const oldValues = { ...rawOld };
    const newValues = { ...rawNew };
    ['assigned_to','user_id'].forEach(f=>{
      if(oldValues[f]) oldValues[f] = resolveUser(oldValues[f]);
      if(newValues[f]) newValues[f] = resolveUser(newValues[f]);
    });
    
    const changes = [];
    
    // Pour les créations
    if (audit.event === 'created') {
      Object.keys(newValues).forEach(key => {
        if (['created_at', 'updated_at', 'id'].includes(key)) return;
        changes.push(
          <div key={key} className="change-item">
            <div className="text-success small">
              <Icon icon="mdi:plus-circle" className="me-1" style={{ fontSize: '12px' }} />
              <strong>{key}:</strong> {String(newValues[key]).substring(0, 50)}
              {String(newValues[key]).length > 50 ? '...' : ''}
            </div>
          </div>
        );
      });
    }
    
    // Pour les modifications
    if (audit.event === 'updated') {
      Object.keys(newValues).forEach(key => {
        if (['created_at', 'updated_at'].includes(key)) return;
        if (oldValues[key] !== newValues[key]) {
          changes.push(
            <div key={key} className="change-item">
              <div className="small">
                <Icon icon="mdi:pencil-circle" className="me-1 text-warning" style={{ fontSize: '12px' }} />
                <strong>{key}:</strong>
              </div>
              <div className="ms-3">
                <div className="text-danger small">
                  <Icon icon="mdi:arrow-left" className="me-1" style={{ fontSize: '10px' }} />
                  {String(oldValues[key] || 'vide').substring(0, 40)}
                </div>
                <div className="text-success small">
                  <Icon icon="mdi:arrow-right" className="me-1" style={{ fontSize: '10px' }} />
                  {String(newValues[key] || 'vide').substring(0, 40)}
                </div>
              </div>
            </div>
          );
        }
      });
    }
    
    // Pour les suppressions
    if (audit.event === 'deleted') {
      Object.keys(oldValues).forEach(key => {
        if (['created_at', 'updated_at', 'id'].includes(key)) return;
        changes.push(
          <div key={key} className="change-item">
            <div className="text-danger small">
              <Icon icon="mdi:delete-circle" className="me-1" style={{ fontSize: '12px' }} />
              <strong>{key}:</strong> {String(oldValues[key]).substring(0, 50)}
              {String(oldValues[key]).length > 50 ? '...' : ''}
            </div>
          </div>
        );
      });
    }
    
    return changes.length > 0 ? (
      <div className="audit-changes">
        {changes}
      </div>
    ) : '-';
  };

  // Fonction pour afficher les changements détaillés (pour l'onglet projets)
  const renderDetailedChanges = (audit) => {
    if (!audit.old_values && !audit.new_values) {
      return (
        <div className="text-muted small">
          <Icon icon="mdi:information" className="me-1" />
          Aucun détail de modification disponible
        </div>
      );
    }
    
    const rawOld = typeof audit.old_values === 'string' ? JSON.parse(audit.old_values || '{}') : audit.old_values || {};
    const rawNew = typeof audit.new_values === 'string' ? JSON.parse(audit.new_values || '{}') : audit.new_values || {};
    const resolveUser = (id) => {
      if(!id) return id;
      const u = users?.find(us => us.id === id);
      return u ? `${u.prenom || ''} ${u.name || ''}`.trim() : id;
    };
    const oldValues = { ...rawOld };
    const newValues = { ...rawNew };
    ['assigned_to','user_id'].forEach(f=>{
      if(oldValues[f]) oldValues[f] = resolveUser(oldValues[f]);
      if(newValues[f]) newValues[f] = resolveUser(newValues[f]);
    });
    
    const changes = [];

    // Fonction pour obtenir les champs importants selon le type d'entité
    const getImportantFields = (entityType) => {
      switch (entityType) {
        case 'App\\Models\\Project':
          return ['titre', 'description', 'date_debut', 'date_fin_prevu'];
        case 'App\\Models\\TodoList':
          return ['name', 'description', 'project_id'];
        case 'App\\Models\\TodoTask':
          return ['description', 'assigned_to', 'status', 'due_date', 'priority'];
        default:
          return ['name', 'description', 'title'];
      }
    };
    
    // Pour les créations
    if (audit.event === 'created') {
      const importantFields = getImportantFields(audit.auditable_type);
      const fieldsToShow = Object.keys(newValues).filter(key => 
        !['created_at', 'updated_at', 'id'].includes(key)
      );
      
      // Afficher d'abord les champs importants
      importantFields.forEach(field => {
        if (newValues[field]) {
          changes.push(
            <div key={field} className="change-item border-start border-success border-3 ps-2 mb-2">
              <div className="d-flex align-items-center gap-2 mb-1">
                <Icon icon="mdi:plus-circle" className="text-success" style={{ fontSize: '14px' }} />
                <strong className="text-success small">{translateField(field)}</strong>
              </div>
              <div className="text-dark small ps-3">
                {(() => {
                  const value = String(newValues[field]);
                  // Formatage spécial pour certains champs
                  if (field.includes('date') && value.match(/^\d{4}-\d{2}-\d{2}/)) {
                    return new Date(value).toLocaleDateString('fr-FR');
                  }
                  if (field === 'assigned_to' || field === 'user_id') {
                    return `Utilisateur ID: ${value}`;
                  }
                  if (field === 'project_id') {
                    return `Projet ID: ${value}`;
                  }
                  if (field === 'todo_list_id') {
                    return `Liste ID: ${value}`;
                  }
                  return value.length > 100 ? value.substring(0, 100) + '...' : value;
                })()}
              </div>
            </div>
          );
        }
      });

      // Autres champs
      fieldsToShow.filter(field => !importantFields.includes(field)).forEach(field => {
        if (newValues[field] && !['project_id', 'todo_list_id', 'user_id'].includes(field)) {
          changes.push(
            <div key={field} className="change-item ps-2 mb-1">
              <div className="text-success small">
                <Icon icon="mdi:plus" className="me-1" style={{ fontSize: '12px' }} />
                <strong>{translateField(field)}:</strong> {String(newValues[field]).substring(0, 50)}
                {String(newValues[field]).length > 50 && '...'}
              </div>
            </div>
          );
        }
      });
    }
    
    // Pour les modifications
    if (audit.event === 'updated') {
      Object.keys(newValues).forEach(key => {
        if (['created_at', 'updated_at'].includes(key)) return;
        if (oldValues[key] !== newValues[key]) {
          changes.push(
            <div key={key} className="change-item border-start border-warning border-3 ps-2 mb-2">
              <div className="d-flex align-items-center gap-2 mb-1">
                <Icon icon="mdi:pencil-circle" className="text-warning" style={{ fontSize: '14px' }} />
                <strong className="text-warning small">{translateField(key)}</strong>
              </div>
              <div className="ps-3">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <Icon icon="mdi:chevron-right" className="text-danger" style={{ fontSize: '12px' }} />
                  <span className="text-danger small">Avant:</span>
                  <span className="text-muted small">
                    {(() => {
                      const value = String(oldValues[key] || 'vide');
                      // Formatage spécial pour certains champs
                      if (key.includes('date') && value.match(/^\d{4}-\d{2}-\d{2}/)) {
                        return new Date(value).toLocaleDateString('fr-FR');
                      }
                      if (key === 'assigned_to' || key === 'user_id') {
                        return value === 'vide' ? 'Non assigné' : `Utilisateur ID: ${value}`;
                      }
                      if (key === 'project_id') {
                        return `Projet ID: ${value}`;
                      }
                      if (key === 'todo_list_id') {
                        return `Liste ID: ${value}`;
                      }
                      return value.length > 60 ? value.substring(0, 60) + '...' : value;
                    })()}
                  </span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Icon icon="mdi:chevron-right" className="text-success" style={{ fontSize: '12px' }} />
                  <span className="text-success small">Après:</span>
                  <span className="text-dark small fw-semibold">
                    {(() => {
                      const value = String(newValues[key] || 'vide');
                      // Formatage spécial pour certains champs
                      if (key.includes('date') && value.match(/^\d{4}-\d{2}-\d{2}/)) {
                        return new Date(value).toLocaleDateString('fr-FR');
                      }
                      if (key === 'assigned_to' || key === 'user_id') {
                        return value === 'vide' ? 'Non assigné' : `Utilisateur ID: ${value}`;
                      }
                      if (key === 'project_id') {
                        return `Projet ID: ${value}`;
                      }
                      if (key === 'todo_list_id') {
                        return `Liste ID: ${value}`;
                      }
                      return value.length > 60 ? value.substring(0, 60) + '...' : value;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          );
        }
      });
    }
    
    // Pour les suppressions
    if (audit.event === 'deleted') {
      const importantFields = getImportantFields(audit.auditable_type);
      importantFields.forEach(field => {
        if (oldValues[field]) {
          changes.push(
            <div key={field} className="change-item border-start border-danger border-3 ps-2 mb-2">
              <div className="d-flex align-items-center gap-2 mb-1">
                <Icon icon="mdi:delete-circle" className="text-danger" style={{ fontSize: '14px' }} />
                <strong className="text-danger small">{translateField(field)} supprimé</strong>
              </div>
              <div className="text-muted small ps-3">
                {(() => {
                  const value = String(oldValues[field]);
                  // Formatage spécial pour certains champs
                  if (field.includes('date') && value.match(/^\d{4}-\d{2}-\d{2}/)) {
                    return `Date: ${new Date(value).toLocaleDateString('fr-FR')}`;
                  }
                  if (field === 'assigned_to' || field === 'user_id') {
                    return `Était assigné à l'utilisateur ID: ${value}`;
                  }
                  if (field === 'project_id') {
                    return `Appartenait au projet ID: ${value}`;
                  }
                  if (field === 'todo_list_id') {
                    return `Appartenait à la liste ID: ${value}`;
                  }
                  return value.length > 100 ? value.substring(0, 100) + '...' : value;
                })()}
              </div>
            </div>
          );
        }
      });
      
      // Afficher aussi les relations importantes qui ont été supprimées
      ['project_id', 'todo_list_id', 'assigned_to'].forEach(field => {
        if (oldValues[field] && !importantFields.includes(field)) {
          changes.push(
            <div key={field} className="change-item ps-2 mb-1">
              <div className="text-danger small">
                <Icon icon="mdi:link-off" className="me-1" style={{ fontSize: '12px' }} />
                <strong>{translateField(field)} supprimé:</strong> ID {oldValues[field]}
              </div>
            </div>
          );
        }
      });
    }
    
    return changes.length > 0 ? (
      <div className="audit-changes" style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {changes}
        {changes.length === 0 && (
          <div className="text-muted small">
            <Icon icon="mdi:information" className="me-1" />
            Modifications système uniquement
          </div>
        )}
      </div>
    ) : (
      <div className="text-muted small">
        <Icon icon="mdi:information" className="me-1" />
        Aucune modification visible
      </div>
    );
  };

  if (!hasAuditAccess) {
    return (
      <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <Icon icon="mdi:lock" style={{ fontSize: '4rem', color: '#dc3545' }} />
                <h4 className="mt-3 text-muted">Accès refusé</h4>
                <p className="text-muted">Vous n'avez pas les permissions nécessaires pour accéder aux audits.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div className={`container-fluid ${isMobile ? 'px-2' : 'px-4'}`}>

        {/* Header */}
        <MobilePageHeader
          title="Audit des Projets"
          subtitle="Historique des modifications et suivi des changements"
          breadcrumb={[
            { text: 'Dashboard', icon: 'fluent:home-24-regular' },
            { text: 'Administration', icon: 'fluent:settings-24-regular' },
            { text: 'Audit' }
          ]}
          actions={[
            <ResponsiveButton
              key="filters"
              variant={showFilters ? "primary" : "outline-primary"}
              size={isMobile ? "sm" : "md"}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Icon icon="fluent:filter-24-regular" width={16} className="me-2" />
              Filtres
            </ResponsiveButton>,
            <ResponsiveButton
              key="refresh"
              variant="outline-secondary"
              size={isMobile ? "sm" : "md"}
              onClick={() => dispatch(fetchAudits(filters))}
              disabled={status === 'loading'}
            >
              <Icon icon="fluent:arrow-clockwise-24-regular" width={16} className="me-2" />
              Actualiser
            </ResponsiveButton>
          ]}
        />

        {/* Header simplifié pour projets seulement */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-0 d-flex align-items-center flex-wrap">
            <div className="flex-grow-1 px-3 py-2">
              <h5 className="mb-0 text-primary d-flex align-items-center">
                <Icon icon="mdi:folder" className="me-2" />
                Audit des Projets
              </h5>
            </div>
            <div className="px-3 py-2">
              <div className="btn-group btn-group-sm" role="group">
                <button className={`btn btn-${viewMode==='table' ? 'primary':'outline-primary'}`} onClick={()=>setMode('table')}>Table</button>
                <button className={`btn btn-${viewMode==='timeline' ? 'primary':'outline-primary'}`} onClick={()=>setMode('timeline')}>
                  <Icon icon="mdi:timeline" className="me-1" />Timeline
                </button>
                <button className={`btn btn-${viewMode==='groupe' ? 'primary':'outline-primary'}`} onClick={()=>setMode('groupe')}>
                  <Icon icon="mdi:format-list-bulleted" className="me-1" />Groupe
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Accordéon Filtres d'entités */}
        <div className="audit-accordion">
          <div className="audit-accordion-item">
            <button
              className={`audit-accordion-header ${openAccordions.entityTypes ? 'active' : ''}`}
              onClick={() => setOpenAccordions(prev => ({ ...prev, entityTypes: !prev.entityTypes }))}
            >
              <div className="d-flex align-items-center">
                <Icon icon="mdi:filter" className="me-2" style={{ fontSize: '1.2rem' }} />
                <strong>Types d'entités à afficher</strong>
                <span className="badge bg-secondary bg-opacity-10 text-secondary ms-2">
                  {Object.values(entityFilters).filter(Boolean).length}/3 sélectionnés
                </span>
              </div>
              <Icon icon="mdi:chevron-down" className="audit-accordion-icon" />
            </button>
            <div className={`audit-accordion-content ${openAccordions.entityTypes ? 'show' : ''}`}>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="btn-group btn-group-sm">
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setEntityFilters({ projects: true, todoLists: true, todoTasks: true })}
                  >
                    Tout sélectionner
                  </button>
                  <button 
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setEntityFilters({ projects: false, todoLists: false, todoTasks: false })}
                  >
                    Tout désélectionner
                  </button>
                </div>
              </div>
              <div className="row g-3">
                <div className="col-md-4">
                  <div className={`audit-entity-option ${entityFilters.projects ? 'selected' : ''}`}>
                    <div className="d-flex align-items-center">
                      <div className="audit-custom-checkbox me-3">
                        <input
                          type="checkbox"
                          id="filter-projects"
                          checked={entityFilters.projects}
                          onChange={(e) => handleEntityFilterChange('projects', e.target.checked)}
                        />
                        <span className="checkmark"></span>
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center">
                            <Icon icon="mdi:folder" className="me-2 text-primary" style={{ fontSize: '1.2rem' }} />
                            <strong>Projets</strong>
                          </div>
                          <span className="badge bg-primary bg-opacity-10 text-primary">
                            {audits.filter(a => a.auditable_type === 'App\\Models\\Project').length}
                          </span>
                        </div>
                        <small className="text-muted">Suivi des projets et de leurs modifications</small>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className={`audit-entity-option ${entityFilters.todoLists ? 'selected' : ''}`}>
                    <div className="d-flex align-items-center">
                      <div className="audit-custom-checkbox me-3">
                        <input
                          type="checkbox"
                          id="filter-todoLists"
                          checked={entityFilters.todoLists}
                          onChange={(e) => handleEntityFilterChange('todoLists', e.target.checked)}
                        />
                        <span className="checkmark"></span>
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center">
                            <Icon icon="mdi:format-list-bulleted" className="me-2 text-info" style={{ fontSize: '1.2rem' }} />
                            <strong>Listes de tâches</strong>
                          </div>
                          <span className="badge bg-info bg-opacity-10 text-info">
                            {audits.filter(a => a.auditable_type === 'App\\Models\\TodoList').length}
                          </span>
                        </div>
                        <small className="text-muted">Gestion des listes de tâches</small>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className={`audit-entity-option ${entityFilters.todoTasks ? 'selected' : ''}`}>
                    <div className="d-flex align-items-center">
                      <div className="audit-custom-checkbox me-3">
                        <input
                          type="checkbox"
                          id="filter-todoTasks"
                          checked={entityFilters.todoTasks}
                          onChange={(e) => handleEntityFilterChange('todoTasks', e.target.checked)}
                        />
                        <span className="checkmark"></span>
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center">
                            <Icon icon="mdi:checkbox-marked" className="me-2 text-success" style={{ fontSize: '1.2rem' }} />
                            <strong>Tâches</strong>
                          </div>
                          <span className="badge bg-success bg-opacity-10 text-success">
                            {audits.filter(a => a.auditable_type === 'App\\Models\\TodoTask').length}
                          </span>
                        </div>
                        <small className="text-muted">Suivi individuel des tâches</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Accordéon Statistiques */}
        {stats && (
          <div className="audit-accordion">
            <div className="audit-accordion-item">
              <button
                className={`audit-accordion-header ${openAccordions.stats ? 'active' : ''}`}
                onClick={() => setOpenAccordions(prev => ({ ...prev, stats: !prev.stats }))}
              >
                <div className="d-flex align-items-center">
                  <Icon icon="mdi:chart-line" className="me-2" style={{ fontSize: '1.2rem' }} />
                  <strong>Statistiques des audits</strong>
                  <span className="badge bg-primary bg-opacity-10 text-primary ms-2">
                    {getFilteredStats().total_count} éléments
                  </span>
                </div>
                <Icon icon="mdi:chevron-down" className="audit-accordion-icon" />
              </button>
              <div className={`audit-accordion-content ${openAccordions.stats ? 'show' : ''}`}>
                <div className="row g-3 mb-4">
                  <div className="col-md-3">
                    <div className="card border-0 shadow-sm">
                      <div className="card-body">
                        <div className="d-flex align-items-center">
                          <div className="flex-shrink-0">
                            <div className="p-3 rounded-circle bg-primary bg-opacity-10">
                              <Icon icon="mdi:chart-line" style={{ fontSize: '1.5rem', color: '#0d6efd' }} />
                            </div>
                          </div>
                          <div className="ms-3">
                            <h6 className="text-muted mb-1">Total Actions</h6>
                            <h4 className="mb-0">{getFilteredStats().total_count}</h4>
                            <small className="text-muted">sur {stats.total_count} total</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0 shadow-sm">
                      <div className="card-body">
                        <div className="d-flex align-items-center">
                          <div className="flex-shrink-0">
                            <div className="p-3 rounded-circle bg-success bg-opacity-10">
                              <Icon icon="mdi:plus-circle" style={{ fontSize: '1.5rem', color: '#198754' }} />
                            </div>
                          </div>
                          <div className="ms-3">
                            <h6 className="text-muted mb-1">Créations</h6>
                            <h4 className="mb-0">
                              {getFilteredStats().event_stats?.find(e => e.event === 'created')?.count || 0}
                            </h4>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0 shadow-sm">
                      <div className="card-body">
                        <div className="d-flex align-items-center">
                          <div className="flex-shrink-0">
                            <div className="p-3 rounded-circle bg-warning bg-opacity-10">
                              <Icon icon="mdi:pencil-circle" style={{ fontSize: '1.5rem', color: '#fd7e14' }} />
                            </div>
                          </div>
                          <div className="ms-3">
                            <h6 className="text-muted mb-1">Modifications</h6>
                            <h4 className="mb-0">
                              {getFilteredStats().event_stats?.find(e => e.event === 'updated')?.count || 0}
                            </h4>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0 shadow-sm">
                      <div className="card-body">
                        <div className="d-flex align-items-center">
                          <div className="flex-shrink-0">
                            <div className="p-3 rounded-circle bg-danger bg-opacity-10">
                              <Icon icon="mdi:delete-circle" style={{ fontSize: '1.5rem', color: '#dc3545' }} />
                            </div>
                          </div>
                          <div className="ms-3">
                            <h6 className="text-muted mb-1">Suppressions</h6>
                            <h4 className="mb-0">
                              {getFilteredStats().event_stats?.find(e => e.event === 'deleted')?.count || 0}
                            </h4>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Statistiques détaillées par type d'entité */}
                  <div className="row g-3 mt-2">
                    <div className="col-md-4">
                      <div className="card border-0 bg-light">
                        <div className="card-body py-2">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <Icon icon="mdi:folder" className="text-primary me-2" />
                              <small className="text-muted">Projets</small>
                            </div>
                            <span className="fw-bold text-primary">
                              {getFilteredStats().entity_stats?.find(e => e.type === 'Project')?.count || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card border-0 bg-light">
                        <div className="card-body py-2">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <Icon icon="mdi:format-list-bulleted" className="text-info me-2" />
                              <small className="text-muted">Listes</small>
                            </div>
                            <span className="fw-bold text-info">
                              {getFilteredStats().entity_stats?.find(e => e.type === 'TodoList')?.count || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card border-0 bg-light">
                        <div className="card-body py-2">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <Icon icon="mdi:checkbox-marked" className="text-success me-2" />
                              <small className="text-muted">Tâches</small>
                            </div>
                            <span className="fw-bold text-success">
                              {getFilteredStats().entity_stats?.find(e => e.type === 'TodoTask')?.count || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Accordéon Filtres avancés */}
        {showFilters && (
          <div className="audit-accordion">
            <div className="audit-accordion-item">
              <button
                className={`audit-accordion-header ${openAccordions.filters ? 'active' : ''}`}
                onClick={() => setOpenAccordions(prev => ({ ...prev, filters: !prev.filters }))}
              >
                <div className="d-flex align-items-center">
                  <Icon icon="mdi:tune" className="me-2" style={{ fontSize: '1.2rem' }} />
                  <strong>Filtres avancés</strong>
                  {selectedProject && (
                    <span className="badge bg-info bg-opacity-10 text-info ms-2">
                      Projet: {selectedProject.titre}
                    </span>
                  )}
                </div>
                <Icon icon="mdi:chevron-down" className="audit-accordion-icon" />
              </button>
              <div className={`audit-accordion-content ${openAccordions.filters ? 'show' : ''}`}>
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold text-muted">Projet spécifique</label>
                    <select
                      className="form-select"
                      value={selectedProject?.id || ''}
                      onChange={(e) => handleProjectSelect(e.target.value)}
                    >
                      <option value="">Tous les projets</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.titre}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-md-2">
                    <label className="form-label small fw-semibold text-muted">Type d'entité</label>
                    <select
                      className="form-select"
                      value={filters.entity_type}
                      onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                    >
                      <option value="projects">Tout (Projets)</option>
                      <option value="App\\Models\\Project">Projets seulement</option>
                      <option value="App\\Models\\TodoList">Listes seulement</option>
                      <option value="App\\Models\\TodoTask">Tâches seulement</option>
                    </select>
                  </div>
                  
                  <div className="col-md-2">
                    <label className="form-label small fw-semibold text-muted">Action</label>
                    <select
                      className="form-select"
                      value={filters.event}
                      onChange={(e) => handleFilterChange('event', e.target.value)}
                    >
                      <option value="">Toutes les actions</option>
                      <option value="created">Créé</option>
                      <option value="updated">Modifié</option>
                      <option value="deleted">Supprimé</option>
                    </select>
                  </div>
                  
                  <div className="col-md-2">
                    <label className="form-label small fw-semibold text-muted">Date début</label>
                    <input
                      type="date"
                      className="form-control"
                      value={filters.date_from}
                      onChange={(e) => handleFilterChange('date_from', e.target.value)}
                    />
                  </div>
                  
                  <div className="col-md-2">
                    <label className="form-label small fw-semibold text-muted">Date fin</label>
                    <input
                      type="date"
                      className="form-control"
                      value={filters.date_to}
                      onChange={(e) => handleFilterChange('date_to', e.target.value)}
                    />
                  </div>
                  
                  <div className="col-md-1">
                    <label className="form-label small fw-semibold text-muted">&nbsp;</label>
                    <button
                      className="btn btn-outline-secondary w-100"
                      onClick={resetFilters}
                      title="Réinitialiser les filtres"
                    >
                      <Icon icon="mdi:refresh" />
                    </button>
                  </div>
                </div>
                
                {selectedProject && (
                  <div className="mt-3 p-3 bg-light rounded">
                    <div className="d-flex align-items-center gap-3">
                      <Icon icon="mdi:folder" style={{ color: '#0d6efd', fontSize: '1.5rem' }} />
                      <div>
                        <h6 className="mb-1">Projet sélectionné: {selectedProject.titre}</h6>
                        <small className="text-muted">{selectedProject.description}</small>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tableau des audits */}
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {status === 'loading' ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary mb-3">
                  <span className="visually-hidden">Chargement...</span>
                </div>
                <p className="text-muted">Chargement des audits...</p>
              </div>
            ) : audits.length === 0 ? (
              <div className="text-center py-5">
                <Icon icon="mdi:database-search" style={{ fontSize: '4rem', color: '#6c757d' }} />
                <h5 className="text-muted mt-3">Aucun audit trouvé</h5>
                <p className="text-muted">Aucun historique ne correspond à vos critères de recherche</p>
              </div>
            ) : (
              <>
                {viewMode === 'timeline' ? (
                  <div className="p-3">
                    {(() => {
                      const list = getFilteredAudits();
                      // Group by entity
                      const groups = list.reduce((acc, audit) => {
                        const key = audit.auditable_type + ':' + audit.auditable_id;
                        if (!acc[key]) acc[key] = { audits: [], sample: audit };
                        acc[key].audits.push(audit);
                        return acc;
                      }, {});
                      const entries = Object.entries(groups);
                      if (!entries.length) return <div className="text-muted small">Aucun audit</div>;
                      
                      return entries.map(([key, group]) => {
                        const entityData = getEntityDisplayData(group.sample);
                        // sort audits chronologically
                        group.audits.sort((a,b)=> new Date(a.created_at) - new Date(b.created_at));
                        
                        return (
                          <AuditCard
                            key={key}
                            entityData={{
                              ...entityData,
                              id: group.sample.auditable_id
                            }}
                            audits={group.audits}
                            users={users}
                            getEventIcon={getEventIcon}
                            getEventColor={getEventColor}
                            getEventLabel={getEventLabel}
                            formatDate={formatDate}
                            translateField={translateField}
                            viewMode="timeline"
                          />
                        );
                      });
                    })()}
                  </div>
                ) : viewMode === 'groupe' ? (
                  <div className="p-3">
                    {(() => {
                      const list = getFilteredAudits();
                      const groups = list.reduce((acc, audit) => {
                        const key = audit.auditable_type + ':' + audit.auditable_id;
                        if (!acc[key]) acc[key] = { audits: [], sample: audit };
                        acc[key].audits.push(audit);
                        return acc;
                      }, {});
                      const entries = Object.entries(groups);
                      if (!entries.length) return <div className="text-muted small">Aucun audit</div>;
                      
                      return entries.map(([key, group]) => {
                        const entityData = getEntityDisplayData(group.sample);
                        // tri audits par date croissante
                        group.audits.sort((a,b)=> new Date(a.created_at) - new Date(b.created_at));
                        
                        return (
                          <AuditCard
                            key={key}
                            entityData={{
                              ...entityData,
                              id: group.sample.auditable_id
                            }}
                            audits={group.audits}
                            users={users}
                            getEventIcon={getEventIcon}
                            getEventColor={getEventColor}
                            getEventLabel={getEventLabel}
                            formatDate={formatDate}
                            translateField={translateField}
                            viewMode="groupe"
                          />
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <ResponsiveTable
                    headers={[
                      'Entité modifiée',
                      'Date/Heure',
                      'Utilisateur',
                      'Type de changement'
                    ]}
                    data={getFilteredAudits().map(audit => {
                      return {
                          entity: {
                            type: 'component',
                            render: () => {
                              const entityData = getEntityDisplayData(audit);
                              return (
                                <div className="d-flex flex-column">
                                  <div className="fw-bold text-primary mb-2" style={{fontSize:'0.95rem', lineHeight:'1.3'}}>{entityData.title}</div>
                                  <div className="text-muted d-flex align-items-center gap-2 flex-wrap">
                                    <span className={`audit-entity-badge audit-entity-badge--${entityData.type === 'Projet' ? 'project' : entityData.type === 'Liste de tâches' ? 'list' : 'task'}`}>{entityData.badge} #{audit.auditable_id}</span>
                                    {entityData.project && entityData.type !== 'Projet' && (
                                      <span className="audit-entity-badge audit-entity-badge--project">Projet: {entityData.project.titre}</span>
                                    )}
                                    {entityData.todoList && entityData.type === 'Tâche' && (
                                      <span className="audit-entity-badge audit-entity-badge--list">Liste: {entityData.todoList.title}</span>
                                    )}
                                  </div>
                                  {entityData.path && entityData.path !== entityData.title && (
                                    <div className="text-muted mt-1" style={{fontSize:'0.8rem', fontWeight:'500'}}>{entityData.path}</div>
                                  )}
                                </div>
                              );
                            }
                          },
                          datetime: formatDate(audit.created_at),
                          user: {
                            type: 'component',
                            render: () => (
                              <div className="d-flex align-items-center gap-2">
                                <div className="bg-primary bg-opacity-10 rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                                  <Icon icon="mdi:account" style={{ fontSize: '16px', color: '#0d6efd' }} />
                                </div>
                                <div>
                                  <span className={`audit-user-badge ${!audit.user ? 'audit-user-badge--system' : ''}`}>
                                    {audit.user ? `${audit.user.prenom || ''} ${audit.user.name || ''}`.trim() : 'Système'}
                                  </span>
                                  <div className="text-muted" style={{ fontSize: '11px' }}>
                                    {audit.ip_address || 'IP inconnue'}
                                  </div>
                                </div>
                              </div>
                            )
                          },
                          changeType: {
                            type: 'component',
                            render: () => (
                              <div className="d-flex flex-column align-items-start gap-1">
                                <div className="d-flex align-items-center gap-2">
                                  <Icon
                                    icon={getEventIcon(audit.event)}
                                    style={{ color: getEventColor(audit.event), fontSize: '18px' }}
                                  />
                                  <span className="fw-semibold" style={{ color: getEventColor(audit.event) }}>
                                    {getEventLabel(audit.event)}
                                  </span>
                                </div>
                                <small className="text-muted">{getEntityTypeLabel(audit.auditable_type)}</small>
                              </div>
                            )
                          },
                          _subRow: {
                            type: 'component',
                            render: () => (
                              <div className="audit-subrow-card">
                                <div className="d-flex flex-wrap gap-3">
                                  {(() => {
                                    const rawOld = typeof audit.old_values === 'string' ? JSON.parse(audit.old_values || '{}') : audit.old_values || {};
                                    const rawNew = typeof audit.new_values === 'string' ? JSON.parse(audit.new_values || '{}') : audit.new_values || {};
                                    const resolveUser = (id) => {
                                      if(!id) return id;
                                      const u = users?.find(us => us.id === id);
                                      return u ? `${u.prenom || ''} ${u.name || ''}`.trim() : id;
                                    };
                                    const oldValues = { ...rawOld };
                                    const newValues = { ...rawNew };
                                    ['assigned_to','user_id'].forEach(f=>{
                                      if(oldValues[f]) oldValues[f] = resolveUser(oldValues[f]);
                                      if(newValues[f]) newValues[f] = resolveUser(newValues[f]);
                                    });
                                    const elements = [];
                                    if (audit.event === 'created') {
                                      Object.keys(newValues).forEach(key => {
                                        if (['created_at','updated_at','id'].includes(key)) return;
                                        elements.push(
                                          <div key={key} className="audit-inline-change created">
                                            <div className="field">{key}</div>
                                            <div className="new">{String(newValues[key]).substring(0,60)}</div>
                                          </div>
                                        );
                                      });
                                    } else if (audit.event === 'updated') {
                                      Object.keys(newValues).forEach(key => {
                                        if (['created_at','updated_at'].includes(key)) return;
                                        if (oldValues[key] !== newValues[key]) {
                                          elements.push(
                                            <div key={key} className="audit-inline-change updated">
                                              <div className="field">{key}</div>
                                              <div className="old" title={String(oldValues[key]||'')}>
                                                {String(oldValues[key]||'vide').substring(0,45)}
                                              </div>
                                              <div className="new" title={String(newValues[key]||'')}>
                                                {String(newValues[key]||'vide').substring(0,45)}
                                              </div>
                                            </div>
                                          );
                                        }
                                      });
                                    } else if (audit.event === 'deleted') {
                                      Object.keys(oldValues).forEach(key => {
                                        if (['created_at','updated_at','id'].includes(key)) return;
                                        elements.push(
                                          <div key={key} className="audit-inline-change deleted">
                                            <div className="field">{key}</div>
                                            <div className="old">{String(oldValues[key]).substring(0,60)}</div>
                                          </div>
                                        );
                                      });
                                    }
                                    return elements.length ? elements : <span className="text-muted">Aucune modification</span>;
                                  })()}
                                </div>
                              </div>
                            )
                          }
                        };
                    })}
                  />
                )}
                
                {/* Pagination */}
                {pagination.last_page > 1 && (
                  <div className="d-flex justify-content-between align-items-center p-3 border-top">
                    <div className="text-muted small">
                      Affichage de {((pagination.current_page - 1) * pagination.per_page) + 1} à{' '}
                      {Math.min(pagination.current_page * pagination.per_page, pagination.total)} sur{' '}
                      {pagination.total} résultats
                    </div>
                    <nav>
                      <ul className="pagination pagination-sm mb-0">
                        <li className={`page-item ${pagination.current_page === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => handleFilterChange('page', pagination.current_page - 1)}
                            disabled={pagination.current_page === 1}
                          >
                            Précédent
                          </button>
                        </li>
                        {[...Array(pagination.last_page)].map((_, i) => (
                          <li key={i + 1} className={`page-item ${pagination.current_page === i + 1 ? 'active' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handleFilterChange('page', i + 1)}
                            >
                              {i + 1}
                            </button>
                          </li>
                        ))}
                        <li className={`page-item ${pagination.current_page === pagination.last_page ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => handleFilterChange('page', pagination.current_page + 1)}
                            disabled={pagination.current_page === pagination.last_page}
                          >
                            Suivant
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modal des détails */}
        <AuditDetailsModal
          audit={currentAudit}
          isOpen={showDetailsModal}
          onClose={handleCloseDetailsModal}
        />
      </div>
    </div>
  );
};

export default AuditPage;
