    // Helpers pour visualiser les pièces jointes et preuves (même logique qu'AbsenceRequestsListPage)
    const getFileUrl = (file) => {
      if (!file) return null;
      const directUrl = file.url || file.download_url || file.link || null;
      const storedPath = file.file_path || file.stored_path || file.storedPath || null;
      const pathfileFinal = `${import.meta.env.VITE_API_URL}storage/${storedPath}`;
      return (storedPath ? pathfileFinal : null);
    };

    const getFileIcon = (name = '') => {
      const lower = String(name).toLowerCase();
      if (/(\.pdf)(\?|#|$)/.test(lower)) return 'fluent:document-pdf-24-filled';
      if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp)(\?|#|$)/.test(lower)) return 'fluent:image-24-filled';
      if (/(\.doc|\.docx)(\?|#|$)/.test(lower)) return 'fluent:document-24-filled';
      if (/(\.xls|\.xlsx|\.csv)(\?|#|$)/.test(lower)) return 'fluent:table-24-filled';
      if (/(\.zip|\.rar|\.7z)(\?|#|$)/.test(lower)) return 'fluent:folder-24-filled';
      return 'fluent:attach-24-filled';
    };

    const openFile = (file) => {
      const url = getFileUrl(file);
      if (!url) {
        showSwal({
          icon: 'info',
          title: 'Information',
          text: 'Aucun lien de téléchargement disponible.',
          confirmButtonText: 'OK'
        });
        return;
      }
      window.open(url, '_blank');
    };

    // alias rétro-compatible
    const handleDownloadAttachment = openFile;
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Icon } from '@iconify/react';
import { fetchTodoLists } from '../../Redux/Slices/todoListSlice';
import { createTask, updateTask, deleteTask, requestTaskCancellation, cancelTaskCancellationRequest, uploadTaskProofs, approveCancellationRequest, rejectCancellationRequest, sendBulkReminders } from '../../Redux/Slices/todoTaskSlice';
import { fetchProjects } from '../../Redux/Slices/projectSlice';
import { fetchUsers } from '../../Redux/Slices/userSlice';
import { fetchClients } from '../../Redux/Slices/clientsSlice';
import Swal from '../../utils/swal';
import { fetchTaskComments, addTaskComment, updateTaskComment, deleteTaskComment } from '../../Redux/Slices/taskCommentsSlice';
import { fetchActiveEntry, startTaskTimer, pauseTaskTimer, finishTask, fetchDailySummary } from '../../Redux/Slices/timeTrackingSlice';

const formatMinutesLabel = (value) => {
  const total = Math.max(0, Number(value) || 0);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) {
    return `${minutes} min`;
  }
  const minutePart = minutes.toString().padStart(2, '0');
  return `${hours}h ${minutePart}`;
};

const PRIVILEGED_ROLES = [
  'rh',
  'gest_rh',
  'gest_projet',
  'gest-projet',
  'gestionnaire_projet',
  'chef_dep',
  'chef-dep',
  'chef_dept',
  'chef_departement',
  'chef_department',
  'admin',
];
const MINIMAL_ACCESS_ROLES = [
  'employe',
  'employé',
  'employee',
  'gest_rh',
  'chef_dep',
  'chef_dept',
  'chef-dep',
  'chef_departement',
  'chef_department',
  'chef_projet',
  'ched_dep',
];

const MAX_REPEAT_COUNT = 10;
const REPEAT_FREQUENCY_OPTIONS = [
  { value: 'manual', label: 'Personnalisé' },
  { value: 'week', label: 'Chaque semaine' },
  { value: 'month', label: 'Chaque mois' },
  { value: '3_months', label: 'Tous les 3 mois' },
  { value: '6_months', label: 'Tous les 6 mois' },
  { value: 'year', label: 'Chaque année' },
];

const formatDateForInput = (value) => {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addIntervalToDate = (dateString, frequency, multiplier) => {
  if (!dateString) return '';
  const baseDate = new Date(dateString);
  if (Number.isNaN(baseDate.getTime())) return '';
  const steps = Number(multiplier) || 0;
  switch (frequency) {
    case 'week':
      baseDate.setDate(baseDate.getDate() + steps * 7);
      break;
    case 'month':
      baseDate.setMonth(baseDate.getMonth() + steps);
      break;
    case '3_months':
      baseDate.setMonth(baseDate.getMonth() + steps * 3);
      break;
    case '6_months':
      baseDate.setMonth(baseDate.getMonth() + steps * 6);
      break;
    case 'year':
      baseDate.setFullYear(baseDate.getFullYear() + steps);
      break;
    default:
      baseDate.setDate(baseDate.getDate());
      break;
  }
  return formatDateForInput(baseDate);
};
const REPEAT_COUNT_OPTIONS = Array.from({ length: MAX_REPEAT_COUNT }, (_, index) => index + 1);

const TasksPhoneView = () => {
  // Configuration globale et moderne pour tous les popups SweetAlert2
  const showSwal = (config) => {
    const defaultConfig = {
      position: 'center',
      backdrop: true,
      background: '#ffffff',
      customClass: {
        popup: 'rounded-4 shadow-lg',
        title: 'fw-bold',
        htmlContainer: 'text-muted',
        confirmButton: 'btn btn-primary rounded-pill px-4 py-2 fw-semibold shadow-sm',
        cancelButton: 'btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold',
        denyButton: 'btn btn-danger rounded-pill px-4 py-2 fw-semibold shadow-sm'
      },
      buttonsStyling: false,
      showClass: {
        popup: 'animate__animated animate__fadeInDown animate__faster'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp animate__faster'
      }
    };

    // Merge avec config personnalisée
    return Swal.fire({ ...defaultConfig, ...config });
  };

  const dispatch = useDispatch();
  const { items: lists = [] } = useSelector((state) => state.todoLists);
  const { items: projects = [] } = useSelector((state) => state.projects);
  // Employés (users) + Clients will be merged for assignment / filtering
  const { items: users = [] } = useSelector((state) => state.users);
  const { items: clients = [] } = useSelector((state) => state.clients || {});
  const { user: authUser, roles: authRoles = [] } = useSelector((state) => state.auth || {});
  const taskCommentsState = useSelector((state) => state.taskComments || {});
  const commentsByTask = taskCommentsState.commentsByTask || {};
  const { activeByTask = {}, dailyByTask = {} } = useSelector((state) => state.timeTracking || {});

  // Ticker global pour l'affichage HH:MM:SS des entrées actives
  // plus de compteur live

  // Parse robuste des timestamps renvoyés par l'API
  const parseApiDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
    const norm = String(value).replace(' ', 'T');
    const d2 = new Date(norm);
    if (!Number.isNaN(d2.getTime())) return d2;
    const d3 = new Date(norm + 'Z');
    return Number.isNaN(d3.getTime()) ? null : d3;
  };

  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [repeatCount, setRepeatCount] = useState(1);
  const [repeatRanges, setRepeatRanges] = useState([{ start: '', end: '' }]);
  const [repeatFrequency, setRepeatFrequency] = useState('manual');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedList, setSelectedList] = useState('');
  const [assigneeInput, setAssigneeInput] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  // New separated inputs for Employees & Clients assignment (create form)
  const [employeeAssigneeInput, setEmployeeAssigneeInput] = useState('');
  const [clientAssigneeInput, setClientAssigneeInput] = useState('');
  const [selectedEmployeeAssignees, setSelectedEmployeeAssignees] = useState([]); // array of user IDs (employees)
  const [selectedClientAssignees, setSelectedClientAssignees] = useState([]); // array of user IDs (clients)
  const [status, setStatus] = useState('Non commencée');
  const [priority, setPriority] = useState('normale');
  const [pourcentage, setPourcentage] = useState(0);
  const [source, setSource] = useState('');
  const [taskType, setTaskType] = useState('AC');
  const [attachments, setAttachments] = useState([]);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editAssigneeInput, setEditAssigneeInput] = useState('');
  const [editSelectedAssignees, setEditSelectedAssignees] = useState([]);
  // New separated inputs for Employees & Clients assignment (edit form)
  const [editEmployeeAssigneeInput, setEditEmployeeAssigneeInput] = useState('');
  const [editClientAssigneeInput, setEditClientAssigneeInput] = useState('');
  const [editSelectedEmployeeAssignees, setEditSelectedEmployeeAssignees] = useState([]);
  const [editSelectedClientAssignees, setEditSelectedClientAssignees] = useState([]);
  const [editStatus, setEditStatus] = useState('Non commencée');
  const [editPriority, setEditPriority] = useState('normale');
  const [editPourcentage, setEditPourcentage] = useState(0);
  const [editType, setEditType] = useState('AC');
  const [editLoading, setEditLoading] = useState(false);
  const [editSelectedProject, setEditSelectedProject] = useState('');
  const [editSelectedList, setEditSelectedList] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editExistingAttachments, setEditExistingAttachments] = useState([]);
  const [editNewAttachments, setEditNewAttachments] = useState([]);
  const [attachmentsToRemove, setAttachmentsToRemove] = useState([]);
  const [editCompletionProofs, setEditCompletionProofs] = useState([]);
  const [cancelLoadingTaskId, setCancelLoadingTaskId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [filterProject, setFilterProject] = useState('');
  const [filterList, setFilterList] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignees, setFilterAssignees] = useState([]);
  const [filterAssigneeQuery, setFilterAssigneeQuery] = useState('');
  const [filterAssigneeMenuOpen, setFilterAssigneeMenuOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showHundredIncompleteOnly, setShowHundredIncompleteOnly] = useState(false);
  const [sortMode, setSortMode] = useState('recent');
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [editingCommentIds, setEditingCommentIds] = useState({});
  const [editCommentInputs, setEditCommentInputs] = useState({});
  const [selectedTasksForReminder, setSelectedTasksForReminder] = useState([]);
  const [sendingBulkReminders, setSendingBulkReminders] = useState(false);
  const [todayDate, setTodayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const filterAssigneeCloseTimeout = useRef(null);
  const commentInputRefs = useRef({});
  const dailySummaryRequestsRef = useRef({});
  const manualTimerControlRef = useRef(new Set());
  const autoPausedTasksRef = useRef(new Set());

  const handleRepeatCountChange = useCallback((rawValue) => {
    const numericValue = Number(rawValue);
    const parsed = Number.isNaN(numericValue) ? 1 : Math.floor(numericValue);
    const clamped = Math.min(MAX_REPEAT_COUNT, Math.max(1, parsed));
    setRepeatCount(clamped);
    setRepeatRanges((prev) => {
      const base = Array.isArray(prev) && prev.length > 0
        ? prev
        : [{ start: startDate || '', end: endDate || '' }];
      const next = base.slice(0, clamped).map((range) => ({
        start: range.start || '',
        end: range.end || '',
      }));
      while (next.length < clamped) {
        next.push({ start: '', end: '' });
      }
      if (next[0]) {
        next[0] = {
          start: next[0].start || startDate || '',
          end: next[0].end || endDate || '',
        };
      }
      if (repeatFrequency !== 'manual' && clamped > 1) {
        const baseStart = next[0]?.start || startDate || '';
        const baseEnd = next[0]?.end || endDate || '';
        if (baseStart && baseEnd) {
          for (let idx = 1; idx < clamped; idx += 1) {
            next[idx] = {
              start: addIntervalToDate(baseStart, repeatFrequency, idx),
              end: addIntervalToDate(baseEnd, repeatFrequency, idx),
            };
          }
        }
      }
      return next;
    });
  }, [startDate, endDate, repeatFrequency]);

  const handleRepeatRangeChange = useCallback((index, field, value) => {
    setRepeatRanges((prev) => {
      const base = Array.isArray(prev) && prev.length > 0 ? prev : [{ start: '', end: '' }];
      const next = base.map((range) => ({ ...range }));
      if (!next[index]) {
        next[index] = { start: '', end: '' };
      }
      next[index] = { ...next[index], [field]: value };
      if (repeatFrequency !== 'manual' && repeatCount > 1 && index === 0) {
        const baseStart = next[0]?.start || startDate || '';
        const baseEnd = next[0]?.end || endDate || '';
        if (baseStart && baseEnd) {
          for (let idx = 1; idx < repeatCount; idx += 1) {
            next[idx] = {
              start: addIntervalToDate(baseStart, repeatFrequency, idx),
              end: addIntervalToDate(baseEnd, repeatFrequency, idx),
            };
          }
        }
      }
      return next;
    });
  }, [repeatFrequency, repeatCount, startDate, endDate]);

  const handleRepeatFrequencyChange = useCallback((value) => {
    setRepeatFrequency(value);
    if (value === 'manual' || repeatCount <= 1) {
      return;
    }
    setRepeatRanges((prev) => {
      const baseStart = prev[0]?.start || startDate || '';
      const baseEnd = prev[0]?.end || endDate || '';
      if (!baseStart || !baseEnd) {
        return prev;
      }
      const next = Array.from({ length: repeatCount }, (_, idx) => (
        idx === 0
          ? { start: baseStart, end: baseEnd }
          : {
              start: addIntervalToDate(baseStart, value, idx),
              end: addIntervalToDate(baseEnd, value, idx),
            }
      ));
      const hasChanged = next.length !== prev.length
        || next.some((range, idx) => (
          range.start !== (prev[idx]?.start || '')
          || range.end !== (prev[idx]?.end || '')
        ));
      return hasChanged ? next : prev;
    });
  }, [repeatCount, startDate, endDate]);

  useEffect(() => {
    if (repeatCount !== 1) return;
    const firstRange = repeatRanges[0];
    if (!firstRange) return;
    if (!startDate && firstRange.start) {
      setStartDate(firstRange.start);
    }
    if (!endDate && firstRange.end) {
      setEndDate(firstRange.end);
    }
  }, [repeatCount, repeatRanges, startDate, endDate]);

  const cancelFilterAssigneeClose = () => {
    if (filterAssigneeCloseTimeout.current) {
      clearTimeout(filterAssigneeCloseTimeout.current);
      filterAssigneeCloseTimeout.current = null;
    }
  };

  const openFilterAssigneeMenu = () => {
    cancelFilterAssigneeClose();
    setFilterAssigneeMenuOpen(true);
  };

  const scheduleCloseFilterAssigneeMenu = () => {
    cancelFilterAssigneeClose();
    filterAssigneeCloseTimeout.current = setTimeout(() => {
      setFilterAssigneeMenuOpen(false);
      filterAssigneeCloseTimeout.current = null;
    }, 120);
  };

  const closeFilterAssigneeMenuNow = () => {
    cancelFilterAssigneeClose();
    setFilterAssigneeMenuOpen(false);
  };

  const toggleCommentsSection = (taskId) => {
    const wasOpen = !!expandedComments[taskId];
    const willOpen = !wasOpen;

    setExpandedComments((prev) => ({ ...prev, [taskId]: willOpen }));

    if (willOpen && !commentsByTask[String(taskId)]) {
      dispatch(fetchTaskComments(taskId));
    }

    if (!willOpen) {
      setEditingCommentIds((prev) => ({ ...prev, [taskId]: null }));
      setEditCommentInputs((prev) => ({ ...prev, [taskId]: '' }));
    }
  };

  const handleCommentInputChange = (taskId, value) => {
    setCommentInputs((prev) => ({ ...prev, [taskId]: value }));
  };

  const handleEditCommentInputChange = (taskId, value) => {
    setEditCommentInputs((prev) => ({ ...prev, [taskId]: value }));
  };

  const getCommentBody = (comment) => {
    if (!comment) {
      return '';
    }
    return comment.comment ?? comment.content ?? comment.body ?? '';
  };

  const formatCommentDate = (dateString) => {
    if (!dateString) {
      return '';
    }
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "À l'instant";
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)}h`;

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canEditComment = (comment) => {
    if (!comment) {
      return false;
    }
    const currentUserId = authUser?.id;
  return String(comment.user_id) === String(currentUserId) || userHasAdvancedAccess;
  };

  const handleAddComment = async (taskId) => {
    const raw = (commentInputs[taskId] || '').trim();
    if (!raw) {
      return;
    }
    try {
      await dispatch(addTaskComment({ taskId, comment: raw })).unwrap();
      setCommentInputs((prev) => ({ ...prev, [taskId]: '' }));
      showSwal({
        icon: 'success',
        title: 'Commentaire ajouté',
        text: 'Votre commentaire a été ajouté avec succès',
        toast: true,
        position: 'top-end',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      showSwal({
        icon: 'error',
        title: 'Erreur',
        text: taskCommentsState.message || "Commentaire non enregistré",
        toast: true,
        position: 'top-end',
        timer: 2500,
        showConfirmButton: false,
      });
    }
  };

  const startEditingComment = (taskId, comment) => {
    setEditingCommentIds((prev) => ({ ...prev, [taskId]: comment.id }));
    setEditCommentInputs((prev) => ({ ...prev, [taskId]: getCommentBody(comment) }));
  };

  const cancelEditingComment = (taskId) => {
    setEditingCommentIds((prev) => ({ ...prev, [taskId]: null }));
    setEditCommentInputs((prev) => ({ ...prev, [taskId]: '' }));
  };

  const handleUpdateComment = async (taskId) => {
    const commentId = editingCommentIds[taskId];
    const updated = (editCommentInputs[taskId] || '').trim();
    if (!commentId || !updated) {
      return;
    }
    try {
      await dispatch(updateTaskComment({ commentId, comment: updated, taskId })).unwrap();
      cancelEditingComment(taskId);
      showSwal({
        icon: 'success',
        title: 'Commentaire modifié',
        text: 'Vos modifications ont été enregistrées',
        toast: true,
        position: 'top-end',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      showSwal({
        icon: 'error',
        title: 'Erreur',
        text: taskCommentsState.message || "Modification impossible",
        toast: true,
        position: 'top-end',
        timer: 2500,
        showConfirmButton: false,
      });
    }
  };

  const handleDeleteComment = async (taskId, commentId) => {
    const result = await showSwal({
      title: 'Supprimer le commentaire ?',
      html: '<p class="text-muted mb-0">Cette action est <strong>irréversible</strong></p>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '<i class="mdi mdi-delete me-1"></i> Supprimer',
      cancelButtonText: '<i class="mdi mdi-close me-1"></i> Annuler',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await dispatch(deleteTaskComment({ commentId, taskId })).unwrap();
      showSwal({
        icon: 'success',
        title: 'Commentaire supprimé',
        text: 'Le commentaire a été supprimé avec succès',
        toast: true,
        position: 'top-end',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      showSwal({
        icon: 'error',
        title: 'Erreur',
        text: taskCommentsState.message || "Suppression impossible",
        toast: true,
        position: 'top-end',
        timer: 2500,
        showConfirmButton: false,
      });
    }
  };

  const buildUserLabel = (user) => {
    if (!user) {
      return '';
    }
    const base = `${user.prenom || ''} ${user.nom || user.name || ''}`.replace(/\s+/g, ' ').trim();
    // Ne pas ajouter (Client) dans le label de comparaison pour ne pas casser la saisie
    const label = base || user.email || `Utilisateur ${user.id}`;
    return label;
  };

  const buildDisplayLabel = (user) => {
    if (!user) return '';
    const core = buildUserLabel(user);
    if (user.typeContrat === 'Client') return `${core} (Client)`;
    return core;
  };

  const findUserByLabel = (label) => {
    const normalized = (label || '').trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    return allSelectableUsers.find((u) => buildDisplayLabel(u).toLowerCase() === normalized || buildUserLabel(u).toLowerCase() === normalized) || null;
  };

  const addAssignee = (userId) => {
    const id = String(userId);
    setSelectedAssignees((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };
  // Helpers to add/remove employees & clients separately while keeping combined list in sync
  const addEmployeeAssignee = (userId) => {
    const id = String(userId);
    setSelectedEmployeeAssignees(prev => prev.includes(id) ? prev : [...prev, id]);
    addAssignee(id);
  };
  const removeEmployeeAssignee = (userId) => {
    const id = String(userId);
    setSelectedEmployeeAssignees(prev => prev.filter(x => x !== id));
    removeAssignee(id);
  };
  const addClientAssignee = (userId) => {
    const id = String(userId);
    setSelectedClientAssignees(prev => prev.includes(id) ? prev : [...prev, id]);
    addAssignee(id);
  };
  const removeClientAssignee = (userId) => {
    const id = String(userId);
    setSelectedClientAssignees(prev => prev.filter(x => x !== id));
    removeAssignee(id);
  };

  const addEditEmployeeAssignee = (userId) => {
    const id = String(userId);
    setEditSelectedEmployeeAssignees(prev => prev.includes(id) ? prev : [...prev, id]);
    addEditAssignee(id);
  };
  const removeEditEmployeeAssignee = (userId) => {
    const id = String(userId);
    setEditSelectedEmployeeAssignees(prev => prev.filter(x => x !== id));
    removeEditAssignee(id);
  };
  const addEditClientAssignee = (userId) => {
    const id = String(userId);
    setEditSelectedClientAssignees(prev => prev.includes(id) ? prev : [...prev, id]);
    addEditAssignee(id);
  };
  const removeEditClientAssignee = (userId) => {
    const id = String(userId);
    setEditSelectedClientAssignees(prev => prev.filter(x => x !== id));
    removeEditAssignee(id);
  };

  const removeAssignee = (userId) => {
    const id = String(userId);
    setSelectedAssignees((prev) => prev.filter((existingId) => existingId !== id));
  };

  const addEditAssignee = (userId) => {
    const id = String(userId);
    setEditSelectedAssignees((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const removeEditAssignee = (userId) => {
    const id = String(userId);
    setEditSelectedAssignees((prev) => prev.filter((existingId) => existingId !== id));
  };

  // Fusion employés + clients (évite doublons si un client apparaît aussi dans users par erreur)
  const allSelectableUsers = useMemo(() => {
    const map = new Map();
    users.forEach(u => { if (u && u.id != null) map.set(String(u.id), u); });
    clients.forEach(c => { if (c && c.id != null) { if (!map.has(String(c.id))) map.set(String(c.id), c); else {
      // merge minimal fields that might exist only on client record
      map.set(String(c.id), { ...map.get(String(c.id)), ...c });
    } } });
    return Array.from(map.values());
  }, [users, clients]);

  const projectsById = useMemo(() => {
    return projects.reduce((acc, project) => {
      if (project && project.id !== undefined && project.id !== null) {
        acc[String(project.id)] = project;
      }
      return acc;
    }, {});
  }, [projects]);

  const usersById = useMemo(() => {
    return allSelectableUsers.reduce((acc, user) => {
      if (user && user.id !== undefined && user.id !== null) {
        acc[String(user.id)] = user;
      }
      return acc;
    }, {});
  }, [allSelectableUsers]);

  const getUserById = (userId) => usersById[String(userId)] || null;

  const filterAssigneeOptions = useMemo(() => {
    const search = filterAssigneeQuery.trim().toLowerCase();
    return allSelectableUsers
      .map((user) => ({ id: String(user.id), label: buildDisplayLabel(user) }))
      .filter((option) => option.label && option.id && option.id !== 'undefined')
      .filter((option) => (!search ? true : option.label.toLowerCase().includes(search)))
      .slice(0, 8);
  }, [allSelectableUsers, filterAssigneeQuery]);

  const selectedFilterAssigneeEntries = useMemo(() => {
    return filterAssignees
      .map((assigneeId) => {
        const user = getUserById(assigneeId);
        const label = buildUserLabel(user);
        return label ? { id: assigneeId, label } : null;
      })
      .filter(Boolean);
  }, [filterAssignees, usersById]);

  const shouldShowAssigneeDropdown = useMemo(() => {
    if (!filterAssigneeMenuOpen) {
      return false;
    }
    return filterAssigneeOptions.length > 0;
  }, [filterAssigneeMenuOpen, filterAssigneeOptions]);

  const handleSelectFilterAssignee = (userId) => {
    const id = String(userId);
    setFilterAssignees((prev) => {
      if (prev.includes(id)) {
        return prev.filter((existingId) => existingId !== id);
      }
      return [...prev, id];
    });
    setFilterAssigneeQuery('');
    openFilterAssigneeMenu();
  };

  const clearFilterAssignee = () => {
    setFilterAssignees([]);
    setFilterAssigneeQuery('');
    closeFilterAssigneeMenuNow();
  };

  const handleFilterAssigneeKeyDown = (event) => {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    const match = findUserByLabel(filterAssigneeQuery);
    if (match) {
      setFilterAssignees((prev) => (prev.includes(String(match.id)) ? prev : [...prev, String(match.id)]));
      setFilterAssigneeQuery('');
      openFilterAssigneeMenu();
    }
  };

  useEffect(() => () => {
    cancelFilterAssigneeClose();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = new Date().toISOString().slice(0, 10);
      setTodayDate((prev) => (prev === next ? prev : next));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const normalizedAuthRoles = useMemo(() => {
    const collected = [
      ...(Array.isArray(authRoles) ? authRoles : []),
      ...(authUser?.role ? [authUser.role] : []),
    ];

    return collected
      .filter((role) => role !== undefined && role !== null)
      .map((role) => String(role).toLowerCase());
  }, [authRoles, authUser]);

  const userHasAdvancedAccess = useMemo(() => {
    return normalizedAuthRoles.some((role) => PRIVILEGED_ROLES.includes(role));
  }, [normalizedAuthRoles]);

  const hasMinimalAccessRole = useMemo(() => {
    return normalizedAuthRoles.some((role) => MINIMAL_ACCESS_ROLES.includes(role));
  }, [normalizedAuthRoles]);

  useEffect(() => {
    if (!userHasAdvancedAccess && showHundredIncompleteOnly) {
      setShowHundredIncompleteOnly(false);
    }
  }, [userHasAdvancedAccess, showHundredIncompleteOnly]);

  useEffect(() => {
    dailySummaryRequestsRef.current = {};
  }, [todayDate]);

  const hasLimitedEmployeePermissions = useMemo(() => {
    return hasMinimalAccessRole && !userHasAdvancedAccess;
  }, [hasMinimalAccessRole, userHasAdvancedAccess]);

  const editStatusOptions = useMemo(() => {
    if (hasLimitedEmployeePermissions) {
      const options = [{ value: 'En cours', label: '⏳ En cours' }];

      if (String(editStatus || '').toLowerCase().includes('termin')) {
        options.push({ value: 'Terminée', label: '✅ Terminée', disabled: true });
      }

      return options;
    }
    return [
      { value: 'Non commencée', label: '🔄 Non commencée' },
      { value: 'En cours', label: '⏳ En cours' },
      { value: 'Terminée', label: '✅ Terminée' },
      { value: 'Annulé', label: '❌ Annulé' },
    ];
  }, [hasLimitedEmployeePermissions, editStatus]);

  const createStatusOptions = useMemo(() => {
    if (hasLimitedEmployeePermissions) {
      return [
        { value: 'En attente', label: '⏳ En attente' },
        { value: 'En cours', label: '🚧 En cours' },
      ];
    }
    return [
      { value: 'En attente', label: '⏳ En attente' },
      { value: 'En cours', label: '🚧 En cours' },
      { value: 'En validation', label: '🧐 En validation' },
      { value: 'Terminée', label: '✅ Terminée' },
      { value: 'Annulé', label: '❌ Annulé' },
    ];
  }, [hasLimitedEmployeePermissions]);

  useEffect(() => {
    if (hasLimitedEmployeePermissions) {
  const allowedValues = ['En cours', 'Terminée', 'En validation'];
      if (!allowedValues.includes(editStatus)) {
        setEditStatus('En cours');
      }
    }
  }, [hasLimitedEmployeePermissions, editStatus]);

  const isTaskAssignedToCurrentUser = useCallback((task) => {
    if (!authUser?.id) {
      return false;
    }

    const currentId = String(authUser.id);
    const primaryAssignee = task?.assigned_to ? String(task.assigned_to) : null;

    if (primaryAssignee && primaryAssignee === currentId) {
      return true;
    }

    if (Array.isArray(task?.assignees)) {
      if (task.assignees.some((assignee) => String(assignee.id) === currentId)) {
        return true;
      }
    }

    if (Array.isArray(task?.collaborators)) {
      if (task.collaborators.some((user) => String(user.id) === currentId)) {
        return true;
      }
    }

    if (Array.isArray(task?.participants)) {
      if (task.participants.some((user) => String(user.id) === currentId)) {
        return true;
      }
    }

    return false;
  }, [authUser]);

  // Autorisation d'afficher les boutons Début/Pause/Finish
  const canWorkOnTask = useCallback((task) => {
    if (!task) return false;
    if (userHasAdvancedAccess) return true;
    return isTaskAssignedToCurrentUser(task);
  }, [userHasAdvancedAccess, isTaskAssignedToCurrentUser]);

  const getCancellationRequests = (task) => task?.cancellation_requests || task?.cancellationRequests || [];

  useEffect(() => {
    dispatch(fetchTodoLists());
    dispatch(fetchProjects());
    // Charger beaucoup d'utilisateurs et clients pour la sélection (perPage élevé)
    dispatch(fetchUsers({ perPage: 500 }));
    dispatch(fetchClients({ perPage: 500 }));
  }, [dispatch]);

  useEffect(() => {
    setFilterList('');
    setFilterAssignees([]);
    setFilterAssigneeQuery('');
    closeFilterAssigneeMenuNow();
  }, [filterProject]);

  const listsForSelectedProject = useMemo(() => {
    if (!selectedProject) return lists;
    return lists.filter((l) => {
      const pid = l.project_id ?? l.projectId ?? (l.project && l.project.id) ?? l.project;
      return String(pid) === String(selectedProject);
    });
  }, [lists, selectedProject]);

  const listsForFilters = useMemo(() => {
    if (!filterProject) return lists;
    return lists.filter((l) => {
      const pid = l.project_id ?? l.projectId ?? (l.project && l.project.id) ?? l.project;
      return String(pid) === String(filterProject);
    });
  }, [lists, filterProject]);

  const allTasks = useMemo(() => {
    return lists.flatMap((l) => {
  const rawProjectId = l.project_id ?? l.projectId ?? (l.project && l.project.id) ?? l.project;
  const projectId = rawProjectId !== undefined && rawProjectId !== null ? String(rawProjectId) : '';
  const project = projectsById[projectId] || l.project || {};
      const projectTitle = project?.nom || project?.titre || project?.name || project?.title || '';

      return (l.tasks || []).map((t) => ({
        ...t,
        listTitle: l.title || l.name || '',
        listId: l.id !== undefined && l.id !== null ? String(l.id) : '',
        projectId,
        projectTitle,
      }));
    });
  }, [lists, projectsById]);

  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase();

    const filteredTasks = allTasks.filter((t) => {
      // Si l'utilisateur est un employé avec des permissions limitées, 
      // ne montrer que les tâches qui lui sont assignées
      if (hasLimitedEmployeePermissions) {
        const isAssigned = isTaskAssignedToCurrentUser(t);
        if (!isAssigned) {
          return false;
        }
      }

      const matchesProject = !filterProject || String(t.projectId) === String(filterProject);
      const matchesList = !filterList || String(t.listId) === String(filterList);
      const matchesStatus = !filterStatus || String(t.status || '').toLowerCase() === String(filterStatus).toLowerCase();

      if (!matchesProject || !matchesList || !matchesStatus) {
        return false;
      }

      const rawAssignees = Array.isArray(t.assignees) && t.assignees.length > 0
        ? t.assignees
        : (t.assigned_to ? [{ id: t.assigned_to }] : []);

      const assigneeIds = rawAssignees
        .map((assignee) => {
          if (assignee === null || assignee === undefined) return null;
          if (typeof assignee === 'object') {
            return assignee.id !== undefined && assignee.id !== null ? String(assignee.id) : null;
          }
          return String(assignee);
        })
        .filter(Boolean);

      const matchesAssignee = filterAssignees.length === 0
        || filterAssignees.some((selectedId) => assigneeIds.includes(String(selectedId)));

      if (!matchesAssignee) {
        return false;
      }

      if (userHasAdvancedAccess && showHundredIncompleteOnly) {
        const percentValue = Number(t.pourcentage ?? t.progression ?? 0);
        const statusLabel = String(t.status || '').toLowerCase();
        if (!(percentValue >= 100 && !statusLabel.includes('termin'))) {
          return false;
        }
      }

      if (!q) {
        return true;
      }

      const assigneeLabels = rawAssignees
        .map((assignee) => {
          const normalized = typeof assignee === 'object' && assignee !== null ? assignee : { id: assignee };
          const user = (normalized && normalized.prenom !== undefined) ? normalized : getUserById(normalized.id);
          return buildUserLabel(user || normalized);
        })
        .filter(Boolean)
        .map((label) => label.toLowerCase());

      const searchableFields = [
        t.description,
        t.title,
        t.nom,
        t.titre,
        t.listTitle,
  t.projectId,
        t.projectTitle,
        t.source,
        t.status,
        t.listId,
    t.type,
        t.id,
      ]
        .filter((value) => value !== undefined && value !== null)
        .map((value) => String(value).toLowerCase());

      return [...searchableFields, ...assigneeLabels].some((value) => value.includes(q));
    });

    // Sorting helpers and comparator based on sortMode
    const getTaskTimestamp = (t) => {
      const raw = t.created_at || t.createdAt || t.start_date || t.startDate || t.updated_at || t.updatedAt || null;
      const ts = raw ? Date.parse(raw) : NaN;
      if (!Number.isNaN(ts)) return ts;
      const idNum = Number(t.id);
      return Number.isNaN(idNum) ? 0 : idNum;
    };
    const getName = (t) => String(t.description || t.title || t.nom || t.name || '').toLowerCase();
    const getStatusNorm = (t) => String(t.status || '').toLowerCase();
    const getPourcentage = (t) => {
      const val = t.pourcentage ?? t.progression ?? 0;
      const num = Number(val);
      return Number.isNaN(num) ? 0 : num;
    };

    const byRecent = (a, b) => getTaskTimestamp(b) - getTaskTimestamp(a);
    const byAlpha = (a, b) => getName(a).localeCompare(getName(b), 'fr', { sensitivity: 'base' });
    const byPourcentageDesc = (a, b) => {
      const diff = getPourcentage(b) - getPourcentage(a);
      return diff !== 0 ? diff : byRecent(a, b);
    };
    const statusFirst = (wanted) => (a, b) => {
      const an = getStatusNorm(a);
      const bn = getStatusNorm(b);
      const aw = an.includes(wanted) ? 0 : 1;
      const bw = bn.includes(wanted) ? 0 : 1;
      if (aw !== bw) return aw - bw;
      return byRecent(a, b);
    };

    const comparator = (() => {
      switch (sortMode) {
        case 'alpha':
          return byAlpha;
        case 'pourcentage_desc':
          return byPourcentageDesc;
        case 'status_terminee':
          return statusFirst('termin');
        case 'status_encours':
          return statusFirst('cours');
        case 'status_noncommencee':
          return statusFirst('non');
        case 'recent':
        default:
          return byRecent;
      }
    })();

    return [...filteredTasks].sort(comparator);
  }, [allTasks, filterProject, filterList, filterStatus, filterAssignees, query, usersById, hasLimitedEmployeePermissions, authUser, userHasAdvancedAccess, showHundredIncompleteOnly, sortMode]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filtered.length / perPage || 1));
  }, [filtered.length, perPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [perPage, query, filterProject, filterList, filterStatus, filterAssignees, showHundredIncompleteOnly]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedTasks = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIdx = (safePage - 1) * perPage;
    return filtered.slice(startIdx, startIdx + perPage);
  }, [filtered, currentPage, perPage, totalPages]);

  // Précharger l'état active-entry pour les tâches visibles (une seule fois par tâche)
  const preloadedActiveRef = useRef(new Set());
  useEffect(() => {
    if (!Array.isArray(paginatedTasks)) return;
    paginatedTasks.forEach((t) => {
      const id = t?.id;
      if (!id) return;
      if (!preloadedActiveRef.current.has(id)) {
        preloadedActiveRef.current.add(id);
        dispatch(fetchActiveEntry(id));
      }
    });
  }, [dispatch, paginatedTasks]);

  useEffect(() => {
    if (!Array.isArray(paginatedTasks)) return;
    paginatedTasks.forEach((t) => {
      const id = t?.id;
      if (!id) return;
      const key = `${id}-${todayDate}`;
      if (dailySummaryRequestsRef.current[key]) {
        return;
      }
      dailySummaryRequestsRef.current[key] = true;
      dispatch(fetchDailySummary({ taskId: id, date: todayDate }));
    });
  }, [dispatch, paginatedTasks, todayDate]);

  useEffect(() => {
    if (!Array.isArray(paginatedTasks)) return;
    paginatedTasks.forEach((task) => {
      const id = task?.id;
      if (!id) return;
      const entry = activeByTask?.[id];
      if (!entry) {
        return;
      }
      if (manualTimerControlRef.current.has(id)) return;
      if (autoPausedTasksRef.current.has(id)) return;
      autoPausedTasksRef.current.add(id);
      dispatch(pauseTaskTimer(id))
        .then(() => dispatch(fetchActiveEntry(id)))
        .catch(() => {});
    });
  }, [activeByTask, paginatedTasks, dispatch]);

  const resetForm = () => {
    setDescription('');
    setStartDate('');
    setEndDate('');
    setRepeatCount(1);
    setRepeatRanges([{ start: '', end: '' }]);
    setRepeatFrequency('manual');
    setSelectedProject('');
    setSelectedList('');
    setAssigneeInput('');
    setSelectedAssignees([]);
    setEmployeeAssigneeInput('');
    setClientAssigneeInput('');
    setSelectedEmployeeAssignees([]);
    setSelectedClientAssignees([]);
    setStatus('Non commencée');
    setPourcentage(0);
    setSource('');
    setTaskType('AC');
    setAttachments([]);
  };

  const handleAddToggle = () => {
    setShowAdd((s) => {
      const next = !s;
      if (!next) {
        resetForm();
      }
      return next;
    });
  };

  const handleAttachmentChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setAttachments((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const removeAttachmentAt = (indexToRemove) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleEditAttachmentChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setEditNewAttachments((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const removeEditNewAttachmentAt = (indexToRemove) => {
    setEditNewAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const markAttachmentForRemoval = (attachmentId) => {
    setAttachmentsToRemove((prev) => (prev.includes(attachmentId) ? prev : [...prev, attachmentId]));
    setEditExistingAttachments((prev) => prev.filter((att) => att.id !== attachmentId));
  };

  const handleCompletionProofsChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }
    setEditCompletionProofs((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const removeCompletionProofAt = (indexToRemove) => {
    setEditCompletionProofs((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Liste optionnelle: choisir une liste par défaut si aucune sélection
    let effectiveListId = selectedList;
    if (!effectiveListId) {
      const candidates = (selectedProject && Array.isArray(listsForSelectedProject) && listsForSelectedProject.length > 0)
        ? listsForSelectedProject
        : (Array.isArray(lists) ? lists : []);
      if (candidates.length > 0) {
        effectiveListId = String(candidates[0].id);
      }
    }
    if (!effectiveListId) {
      showSwal({ 
        icon: 'warning', 
        title: 'Aucune liste disponible', 
        text: 'Veuillez créer une liste avant d\'ajouter une tâche.', 
        confirmButtonText: 'OK',
        toast: true, 
        position: 'top-end', 
        timer: 2500, 
        showConfirmButton: false 
      });
      return;
    }
    const isRepeatingTask = repeatCount > 1;
    const normalizedRepeatRanges = isRepeatingTask
      ? repeatRanges.slice(0, repeatCount).map((range) => ({
          start: range?.start || '',
          end: range?.end || '',
        }))
      : [];

    if (isRepeatingTask) {
      const hasMissingDates = normalizedRepeatRanges.some((range) => !range.start || !range.end);
      if (hasMissingDates) {
        showSwal({
          icon: 'warning',
          title: 'Dates manquantes',
          text: 'Chaque répétition doit avoir une date de début et une date de fin.',
          confirmButtonText: 'OK',
          toast: true,
          position: 'top-end',
          timer: 2400,
          showConfirmButton: false,
        });
        return;
      }

      const hasInvalidRange = normalizedRepeatRanges.some((range) => new Date(range.start) > new Date(range.end));
      if (hasInvalidRange) {
        showSwal({
          icon: 'warning',
          title: 'Répétition invalide',
          text: 'Pour chaque répétition, la date de fin doit être après la date de début.',
          confirmButtonText: 'OK',
          toast: true,
          position: 'top-end',
          timer: 2400,
          showConfirmButton: false,
        });
        return;
      }
    } else if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      showSwal({ 
        icon: 'warning', 
        title: 'Dates invalides', 
        text: 'La date de fin doit être après la date de début', 
        confirmButtonText: 'OK',
        toast: true, 
        position: 'top-end', 
        timer: 2200, 
        showConfirmButton: false 
      });
      return;
    }

    setLoadingAdd(true);
    try {
      // compute effective status / pourcentage similar to AddTaskForm
  const effectiveStatus = (status === 'En cours' && Number(pourcentage) >= 100) ? 'Terminée' : status;
  const effectivePourcentage = effectiveStatus === 'Terminée' ? 100 : (effectiveStatus === 'En cours' ? pourcentage : 0);

      const formData = new FormData();
      formData.append('description', (description || '').trim() || 'Nouvelle tâche');
      formData.append('status', effectiveStatus === 'Non commencée' ? 'En attente' : effectiveStatus);
      formData.append('priority', priority);
      if (selectedClientAssignees[0]) {
        formData.append('client_id', selectedClientAssignees[0]);
      }
      formData.append('pourcentage', String(effectivePourcentage));


      const baseStartDate = isRepeatingTask ? normalizedRepeatRanges[0]?.start : startDate;
      const baseEndDate = isRepeatingTask ? normalizedRepeatRanges[0]?.end : endDate;
      if (baseStartDate) formData.append('start_date', baseStartDate);
      if (baseEndDate) formData.append('end_date', baseEndDate);
      if (isRepeatingTask) {
        formData.append('repeat_count', String(repeatCount));
        normalizedRepeatRanges.forEach((range, index) => {
          formData.append(`repeat_ranges[${index}][start_date]`, range.start);
          formData.append(`repeat_ranges[${index}][end_date]`, range.end);
        });
        formData.append('repeat_ranges_json', JSON.stringify(normalizedRepeatRanges));
        formData.append('repeat_frequency', repeatFrequency);
      }
      formData.append('assignees_present', '1');
      if (selectedAssignees.length > 0) {
        selectedAssignees.forEach((id) => {
          formData.append('assignees[]', id);
        });
        formData.append('assigned_to', selectedAssignees[0]);
      } else {
        formData.append('assigned_to', '');
      }
      if (source.trim()) formData.append('source', source.trim());
      formData.append('type', taskType || 'AC');

      attachments.forEach((file) => {
        formData.append('attachments[]', file);
      });

  const result = await dispatch(createTask({ listId: effectiveListId, data: formData })).unwrap();
    const scheduledOccurrences = result?.scheduledDuplicates || [];
      // refresh lists to show the new task
      dispatch(fetchTodoLists());

      // Always open the comments section for the newly created task
      // (same effect as clicking the comment icon), fetch its comments,
      // then focus the comment input for quick typing.
      {
        const created = result && result.task ? result.task : result;
        const taskId = created?.id || null;
        if (taskId) {
          setExpandedComments((prev) => ({ ...prev, [taskId]: true }));
          dispatch(fetchTaskComments(taskId));

          // Focus the comment input shortly after render
          const tryFocus = (attempt = 0) => {
            const el = commentInputRefs.current?.[taskId];
            if (el && typeof el.focus === 'function') {
              el.focus();
              el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
              return;
            }
            if (attempt < 8) {
              setTimeout(() => tryFocus(attempt + 1), 80);
            }
          };
          setTimeout(() => tryFocus(0), 120);
        }
      }

      resetForm();
      setShowAdd(false);
      const successCopy = scheduledOccurrences.length > 0
        ? `${scheduledOccurrences.length} occurrence${scheduledOccurrences.length > 1 ? 's' : ''} supplémentaires seront créées automatiquement selon la fréquence choisie.`
        : 'Votre tâche a été créée avec succès';

      showSwal({ 
        icon: 'success', 
        title: 'Tâche ajoutée', 
        text: successCopy,
        toast: true, 
        position: 'top-end', 
        timer: 1400, 
        showConfirmButton: false 
      });
    } catch (err) {
      showSwal({ 
        icon: 'error', 
        title: 'Erreur', 
        text: err?.toString() || 'Impossible de créer la tâche',
        toast: true, 
        position: 'top-end', 
        timer: 2200, 
        showConfirmButton: false 
      });
    } finally {
      setLoadingAdd(false);
    }
  };

  // When user selects an assignee from the datalist in the create form, attach it to the new task
  // Legacy single input support (kept if some code still sets assigneeInput)
  useEffect(() => {
    if (!assigneeInput.trim()) return;
    const match = findUserByLabel(assigneeInput);
    if (match) {
      if (match.typeContrat === 'Client') {
        addClientAssignee(match.id);
      } else {
        addEmployeeAssignee(match.id);
      }
      setAssigneeInput('');
    }
  }, [assigneeInput, allSelectableUsers]);

  // New employee input handler
  useEffect(() => {
    if (!employeeAssigneeInput.trim()) return;
    const normalized = employeeAssigneeInput.trim().toLowerCase();
    const match = users.find(u => buildDisplayLabel(u).toLowerCase() === normalized || buildUserLabel(u).toLowerCase() === normalized);
    if (match) {
      addEmployeeAssignee(match.id);
      setEmployeeAssigneeInput('');
    }
  }, [employeeAssigneeInput, users]);

  // New client input handler
  useEffect(() => {
    if (!clientAssigneeInput.trim()) return;
    const normalized = clientAssigneeInput.trim().toLowerCase();
    const match = clients.find(c => buildDisplayLabel(c).toLowerCase() === normalized || buildUserLabel(c).toLowerCase() === normalized);
    if (match) {
      addClientAssignee(match.id);
      setClientAssigneeInput('');
    }
  }, [clientAssigneeInput, clients]);

  // same for edit inputs
  // Legacy edit single input
  useEffect(() => {
    if (!editAssigneeInput.trim()) return;
    const match = findUserByLabel(editAssigneeInput);
    if (match) {
      if (match.typeContrat === 'Client') {
        addEditClientAssignee(match.id);
      } else {
        addEditEmployeeAssignee(match.id);
      }
      setEditAssigneeInput('');
    }
  }, [editAssigneeInput, allSelectableUsers]);

  // Edit form employee input
  useEffect(() => {
    if (!editEmployeeAssigneeInput.trim()) return;
    const normalized = editEmployeeAssigneeInput.trim().toLowerCase();
    const match = users.find(u => buildDisplayLabel(u).toLowerCase() === normalized || buildUserLabel(u).toLowerCase() === normalized);
    if (match) {
      addEditEmployeeAssignee(match.id);
      setEditEmployeeAssigneeInput('');
    }
  }, [editEmployeeAssigneeInput, users]);

  // Edit form client input
  useEffect(() => {
    if (!editClientAssigneeInput.trim()) return;
    const normalized = editClientAssigneeInput.trim().toLowerCase();
    const match = clients.find(c => buildDisplayLabel(c).toLowerCase() === normalized || buildUserLabel(c).toLowerCase() === normalized);
    if (match) {
      addEditClientAssignee(match.id);
      setEditClientAssigneeInput('');
    }
  }, [editClientAssigneeInput, clients]);

  const startEdit = (task) => {
    // Prevent editing if task is annulée
    const status = String(task.status || '').toLowerCase();
    if (status.includes('annul')) {
      showSwal({ 
        icon: 'warning', 
        title: 'Modification impossible', 
        text: 'Cette tâche est annulée et ne peut pas être modifiée.',
        confirmButtonText: 'OK'
      });
      return;
    }
    setEditingTaskId(task.id);
    setEditDescription(task.description || '');
    setEditStartDate(task.start_date || '');
    setEditEndDate(task.end_date || '');
    setEditAssigneeInput('');
    setEditStatus(task.status || 'Non commencée');
    setEditPourcentage(task.pourcentage ?? 0);
    setEditSource(task.source || '');
  setEditType(task.type || 'AC');
    setEditCompletionProofs([]);
    const normalizedAssignees = Array.isArray(task.assignees) && task.assignees.length > 0
      ? task.assignees.map((assignee) => String(assignee.id))
      : (task.assigned_to ? [String(task.assigned_to)] : []);
    setEditSelectedAssignees(normalizedAssignees);
    // Split into employees vs clients
    const employeeIds = [];
    const clientIds = [];
    normalizedAssignees.forEach(id => {
      const u = usersById[id];
      if (u && u.typeContrat === 'Client') clientIds.push(id); else employeeIds.push(id);
    });
    setEditSelectedEmployeeAssignees(employeeIds);
    setEditSelectedClientAssignees(clientIds);
    setEditExistingAttachments((task.attachments || []).map((att) => ({
      id: att.id,
      original_name: att.original_name,
  url: att.file_path ? `${import.meta.env.VITE_API_URL}storage/${att.file_path}` : (att.url || att.download_url || att.stored_path),
    })));
    setEditNewAttachments([]);
    setAttachmentsToRemove([]);

    // find the list containing this task to prefill project/list
    const parentList = lists.find(l => (l.tasks || []).some(t => String(t.id) === String(task.id)));
    if (parentList) {
      const pid = parentList.project_id ?? parentList.projectId ?? (parentList.project && parentList.project.id) ?? parentList.project;
      setEditSelectedProject(pid ? String(pid) : '');
      setEditSelectedList(parentList.id ? String(parentList.id) : '');
    } else {
      setEditSelectedProject('');
      setEditSelectedList('');
    }
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditDescription('');
    setEditStartDate('');
    setEditEndDate('');
    setEditAssigneeInput('');
  setEditSelectedAssignees([]);
  setEditSelectedEmployeeAssignees([]);
  setEditSelectedClientAssignees([]);
    setEditStatus('Non commencée');
    setEditPourcentage(0);
    setEditSource('');
    setEditType('AC');
    setEditExistingAttachments([]); // Reset existing attachments
    setEditNewAttachments([]); // Reset new attachments
    setAttachmentsToRemove([]); // Reset attachments to remove
    setEditCompletionProofs([]);
  };


  const submitEdit = async (e, taskId) => {
    e.preventDefault();
    if (!taskId) return;
    if (editStartDate && editEndDate && new Date(editStartDate) > new Date(editEndDate)) {
      showSwal({ 
        icon: 'warning', 
        title: 'Dates invalides', 
        text: 'La date de fin doit être après la date de début',
        confirmButtonText: 'OK',
        toast: true, 
        position: 'top-end', 
        timer: 2000, 
        showConfirmButton: false 
      });
      return;
    }
    setEditLoading(true);
    try {
      const formData = new FormData();
        formData.append('status', editStatus || 'En cours');
        formData.append('priority', editPriority);
        if (!hasLimitedEmployeePermissions && editSelectedClientAssignees[0]) {
          formData.append('client_id', editSelectedClientAssignees[0]);
        }
      formData.append('pourcentage', String(editPourcentage || 0));

      if (!hasLimitedEmployeePermissions) {
        formData.append('description', (editDescription || '').trim());
        formData.append('start_date', editStartDate || '');
        formData.append('end_date', editEndDate || '');
        formData.append('source', editSource.trim());
        formData.append('type', editType || 'AC');
        if (editSelectedList) {
          formData.append('todo_list_id', editSelectedList);
        }

        formData.append('assignees_present', '1');
        const combinedEditAssignees = Array.from(new Set([...editSelectedEmployeeAssignees, ...editSelectedClientAssignees]));
        if (combinedEditAssignees.length > 0) {
          combinedEditAssignees.forEach((id) => {
            formData.append('assignees[]', id);
          });
          formData.append('assigned_to', combinedEditAssignees[0]);
        } else {
          formData.append('assigned_to', '');
        }

        attachmentsToRemove.forEach((attachmentId) => {
          formData.append('remove_attachments[]', attachmentId);
        });

        editNewAttachments.forEach((file) => {
          formData.append('attachments[]', file);
        });
      }

        await dispatch(updateTask({ id: taskId, data: formData })).unwrap();

    const shouldUploadProofs = hasLimitedEmployeePermissions && editCompletionProofs.length > 0;

        if (shouldUploadProofs) {
          const proofFormData = new FormData();
          editCompletionProofs.forEach((file) => {
            proofFormData.append('proofs[]', file);
          });

          await dispatch(uploadTaskProofs({ id: taskId, data: proofFormData })).unwrap();
        } else {
          dispatch(fetchTodoLists());
        }

      showSwal({ 
        icon: 'success', 
        title: 'Tâche modifiée', 
        text: 'Vos modifications ont été enregistrées',
        toast: true, 
        position: 'top-end', 
        timer: 1400, 
        showConfirmButton: false 
      });
      cancelEdit();
    } catch (err) {
      showSwal({ 
        icon: 'error', 
        title: 'Erreur', 
        text: err?.toString() || 'Impossible de modifier la tâche',
        toast: true, 
        position: 'top-end', 
        timer: 2200, 
        showConfirmButton: false 
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (taskId) => {
    const res = await showSwal({
      icon: 'warning',
      title: 'Supprimer la tâche ?',
      html: '<p class="text-muted mb-0">Cette action est <strong>irréversible</strong></p>',
      showCancelButton: true,
      confirmButtonText: '<i class="mdi mdi-delete me-1"></i> Supprimer',
      cancelButtonText: '<i class="mdi mdi-close me-1"></i> Annuler',
      reverseButtons: true
    });
    if (res.isConfirmed) {
      try {
        await dispatch(deleteTask({ id: taskId })).unwrap();
        dispatch(fetchTodoLists());
        showSwal({ 
          icon: 'success', 
          title: 'Tâche supprimée', 
          text: 'La tâche a été supprimée avec succès',
          toast: true, 
          position: 'top-end', 
          timer: 1400, 
          showConfirmButton: false 
        });
      } catch (err) {
        showSwal({ 
          icon: 'error', 
          title: 'Erreur', 
          text: err?.toString() || 'Impossible de supprimer la tâche',
          toast: true, 
          position: 'top-end', 
          timer: 2200, 
          showConfirmButton: false 
        });
      }
    }
  };

  const handleCloseTask = async (taskId) => {
    const res = await showSwal({
      icon: 'question',
      title: 'Clôturer la tâche ?',
      text: 'Cela marquera la tâche comme terminée.',
      showCancelButton: true,
      confirmButtonText: '<i class="mdi mdi-check-circle me-1"></i> Clôturer',
      cancelButtonText: '<i class="mdi mdi-close me-1"></i> Annuler',
      reverseButtons: true
    });
    if (res.isConfirmed) {
      try {
        const formData = new FormData();
        formData.append('status', 'Terminée');

        await dispatch(updateTask({ id: taskId, data: formData })).unwrap();
        dispatch(fetchTodoLists());
        showSwal({ 
          icon: 'success', 
          title: 'Tâche clôturée', 
          text: 'La tâche a été marquée comme terminée',
          toast: true, 
          position: 'top-end', 
          timer: 1400, 
          showConfirmButton: false 
        });
      } catch (err) {
        showSwal({ 
          icon: 'error', 
          title: 'Erreur', 
          text: err?.toString() || 'Impossible de clôturer la tâche',
          toast: true, 
          position: 'top-end', 
          timer: 2200, 
          showConfirmButton: false 
        });
      }
    }
  };

  const handleCancellationRequest = async (task) => {
    if (!task) {
      return;
    }

    const pending = getCancellationRequests(task).some((request) => request.status === 'pending');
    if (pending) {
      showSwal({
        icon: 'info',
        title: 'Demande déjà en attente',
        text: 'Une demande d\'annulation existe déjà pour cette tâche.',
        confirmButtonText: 'OK',
        toast: true,
        position: 'top-end',
        timer: 2500,
        showConfirmButton: false,
      });
      return;
    }

    const { value: reason, isConfirmed } = await showSwal({
      title: 'Demande d\'annulation',
      html: '<p class="text-muted small mb-3">Expliquez la raison de cette demande d\'annulation</p>',
      input: 'textarea',
      inputLabel: 'Motif (optionnel)',
      inputPlaceholder: 'Votre motif ici...',
      inputAttributes: {
        'aria-label': 'Motif de la demande',
        'style': 'border-radius: 8px; border: 1px solid rgba(102,126,234,0.2);'
      },
      showCancelButton: true,
      confirmButtonText: '<i class="mdi mdi-send me-1"></i> Envoyer',
      cancelButtonText: '<i class="mdi mdi-close me-1"></i> Annuler',
      reverseButtons: true
    });

    if (!isConfirmed) {
      return;
    }

    try {
      setCancelLoadingTaskId(task.id);
      await dispatch(requestTaskCancellation({ taskId: task.id, reason: reason || null })).unwrap();
      showSwal({
        icon: 'success',
        title: 'Demande envoyée',
        text: 'Votre demande d\'annulation a été transmise',
        toast: true,
        position: 'top-end',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err) {
      showSwal({
        icon: 'error',
        title: 'Erreur',
        text: typeof err === 'string' ? err : 'Impossible d\'envoyer la demande',
        toast: true,
        position: 'top-end',
        timer: 2500,
        showConfirmButton: false,
      });
    } finally {
      setCancelLoadingTaskId(null);
    }
  };

  const handleDuplicateTask = (task) => {
    if (!task) return;

    // Prefill create form from task (do not copy attachments)
    setDescription(task.description || '');
    setStartDate(task.start_date || '');
    setEndDate(task.end_date || '');
    setSelectedProject(task.projectId || task.project_id || task.project || '');
    // find list id as string
    const parentListId = task.listId || (task.list_id ? String(task.list_id) : task.listId) || task.listId || '';
    setSelectedList(parentListId || (task.listId ? String(task.listId) : ''));
    setSelectedAssignees((Array.isArray(task.assignees) && task.assignees.length > 0)
      ? task.assignees.map((a) => (typeof a === 'object' ? String(a.id) : String(a)))
      : (task.assigned_to ? [String(task.assigned_to)] : []));
    setTaskType(task.type || 'AC');
    setPourcentage(task.pourcentage ?? task.progression ?? 0);
    setStatus('Non commencée'); // reset status to default for new task
    setAttachments([]);
    setShowAdd(true);
    // scroll to top where the form appears
    setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 50);
  };

  const handleCancelCancellationRequest = async (task) => {
    if (!task) {
      return;
    }

    const pendingRequest = getCancellationRequests(task).find((request) => request.status === 'pending');
    if (!pendingRequest) {
      showSwal({
        icon: 'info',
        title: 'Aucune demande en cours',
        text: 'Aucune demande d\'annulation à retirer.',
        confirmButtonText: 'OK',
        toast: true,
        position: 'top-end',
        timer: 2500,
        showConfirmButton: false,
      });
      return;
    }

    const result = await showSwal({
      icon: 'question',
      title: 'Retirer la demande ?',
      text: 'Voulez-vous retirer votre demande d\'annulation ?',
      showCancelButton: true,
      confirmButtonText: '<i class="mdi mdi-cancel me-1"></i> Oui, retirer',
      cancelButtonText: '<i class="mdi mdi-close me-1"></i> Non',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setCancelLoadingTaskId(task.id);
      await dispatch(cancelTaskCancellationRequest({ 
        requestId: pendingRequest.id 
      })).unwrap();
      showSwal({
        icon: 'success',
        title: 'Demande retirée',
        text: 'Votre demande d\'annulation a été retirée',
        toast: true,
        position: 'top-end',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err) {
      showSwal({
        icon: 'error',
        title: 'Erreur',
        text: typeof err === 'string' ? err : 'Impossible de retirer la demande',
        toast: true,
        position: 'top-end',
        timer: 2500,
        showConfirmButton: false,
      });
    } finally {
      setCancelLoadingTaskId(null);
    }
  };

  const handleApproveCancellationRequest = async (task) => {
    if (!task) {
      return;
    }

    const pendingRequest = getCancellationRequests(task).find((request) => request.status === 'pending');
    if (!pendingRequest) {
      showSwal({
        icon: 'info',
        title: 'Aucune demande en attente',
        text: 'Aucune demande d\'annulation à traiter.',
        confirmButtonText: 'OK',
        toast: true,
        position: 'top-end',
        timer: 2500,
        showConfirmButton: false,
      });
      return;
    }

    const { value: resolutionNote, isConfirmed } = await showSwal({
      title: 'Accepter la demande ?',
      html: '<p class="text-muted small mb-3">Cette action annulera définitivement la tâche</p>',
      input: 'textarea',
      inputLabel: 'Note de résolution (optionnel)',
      inputPlaceholder: 'Commentaire sur l\'acceptation...',
      inputAttributes: {
        'aria-label': 'Note de résolution',
        'style': 'border-radius: 8px; border: 1px solid rgba(102,126,234,0.2);'
      },
      showCancelButton: true,
      confirmButtonText: '<i class="mdi mdi-check-circle me-1"></i> Accepter',
      cancelButtonText: '<i class="mdi mdi-close me-1"></i> Annuler',
      reverseButtons: true
    });

    if (!isConfirmed) {
      return;
    }

    try {
      setCancelLoadingTaskId(task.id);
      await dispatch(approveCancellationRequest({ 
        taskId: task.id, 
        requestId: pendingRequest.id,
        resolutionNote: resolutionNote || ''
      })).unwrap();
      showSwal({
        icon: 'success',
        title: 'Demande acceptée',
        text: 'La tâche a été annulée avec succès',
        toast: true,
        position: 'top-end',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      showSwal({
        icon: 'error',
        title: 'Erreur',
        text: typeof err === 'string' ? err : 'Impossible d\'accepter la demande',
        toast: true,
        position: 'top-end',
        timer: 2500,
        showConfirmButton: false,
      });
    } finally {
      setCancelLoadingTaskId(null);
    }
  };

  const handleRejectCancellationRequest = async (task) => {
    if (!task) {
      return;
    }

    const pendingRequest = getCancellationRequests(task).find((request) => request.status === 'pending');
    if (!pendingRequest) {
      showSwal({
        icon: 'info',
        title: 'Aucune demande en attente',
        text: 'Aucune demande d\'annulation à traiter.',
        confirmButtonText: 'OK',
        toast: true,
        position: 'top-end',
        timer: 2500,
        showConfirmButton: false,
      });
      return;
    }

    const { value: resolutionNote, isConfirmed } = await showSwal({
      title: 'Refuser la demande ?',
      html: '<p class="text-muted small mb-3">Veuillez expliquer les raisons du refus</p>',
      input: 'textarea',
      inputLabel: 'Motif du refus (requis)',
      inputPlaceholder: 'Expliquez pourquoi vous refusez cette demande...',
      inputAttributes: {
        'aria-label': 'Motif du refus',
        required: true,
        'style': 'border-radius: 8px; border: 1px solid rgba(239,68,68,0.2);'
      },
      inputValidator: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Le motif du refus est obligatoire';
        }
      },
      showCancelButton: true,
      confirmButtonText: '<i class="mdi mdi-close-circle me-1"></i> Refuser',
      cancelButtonText: '<i class="mdi mdi-arrow-left me-1"></i> Annuler',
      reverseButtons: true
    });

    if (!isConfirmed) {
      return;
    }

    try {
      setCancelLoadingTaskId(task.id);
      await dispatch(rejectCancellationRequest({ 
        taskId: task.id, 
        requestId: pendingRequest.id,
        resolutionNote: resolutionNote || ''
      })).unwrap();
      showSwal({
        icon: 'success',
        title: 'Demande refusée',
        text: 'La demande d\'annulation a été refusée',
        toast: true,
        position: 'top-end',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      showSwal({
        icon: 'error',
        title: 'Erreur',
        text: typeof err === 'string' ? err : 'Impossible de refuser la demande',
        toast: true,
        position: 'top-end',
        timer: 2500,
        showConfirmButton: false,
      });
    } finally {
      setCancelLoadingTaskId(null);
    }
  };

  // Selection functions for bulk reminders
  const toggleTaskSelection = (taskId) => {
    setSelectedTasksForReminder(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId);
      } else {
        return [...prev, taskId];
      }
    });
  };

  const selectAllTasks = () => {
    setSelectedTasksForReminder(paginatedTasks.map(t => t.id));
  };

  const clearSelection = () => {
    setSelectedTasksForReminder([]);
  };

  const handleSendBulkReminders = async () => {
    if (selectedTasksForReminder.length === 0) {
      showSwal({
        icon: 'info',
        title: 'Aucune tâche sélectionnée',
        text: 'Veuillez sélectionner au moins une tâche pour envoyer des rappels.',
        confirmButtonText: 'OK'
      });
      return;
    }

    const result = await showSwal({
      title: 'Envoyer des rappels WhatsApp ?',
      html: `<p class="text-muted mb-0">Envoyer des rappels pour <strong>${selectedTasksForReminder.length}</strong> tâche(s) sélectionnée(s) ?</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '<i class="mdi mdi-whatsapp me-1"></i> Envoyer',
      cancelButtonText: '<i class="mdi mdi-close me-1"></i> Annuler',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    setSendingBulkReminders(true);
    try {
      const result = await dispatch(sendBulkReminders({ taskIds: selectedTasksForReminder })).unwrap();
      
      showSwal({
        icon: 'success',
        title: 'Rappels envoyés !',
        html: `<p class="mb-0">${result.message}</p>`,
        timer: 3000,
        showConfirmButton: false
      });
      clearSelection();
    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      showSwal({
        icon: 'error',
        title: 'Erreur',
        text: error || 'Impossible d\'envoyer les rappels',
        confirmButtonText: 'OK'
      });
    } finally {
      setSendingBulkReminders(false);
    }
  };

  return (
    <div className="container-fluid px-3 py-2" style={{ minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden mb-3">
        <div className="card-body gradient-hero-banner p-3">
          <div className="gradient-hero-content d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <button 
                className="gradient-hero-back-btn btn_filters" 
                onClick={() => window.history.back()} 
                aria-label="Retour"
              >
                <Icon icon="material-symbols:arrow-back" style={{ fontSize: '1.1rem' }} />
              </button>
              <div>
                <h4 className="mb-1 fw-bold text-white">Mes Tâches</h4>
                <p className="mb-0 text-white-50">Gestion mobile de vos tâches quotidiennes</p>
              </div>
            </div>
            <button 
              className="btn btn-outline-light d-md-none d-flex align-items-center gap-1 btn_filters no-column" 
              onClick={() => setShowFilters(!showFilters)}
              style={{ borderRadius: '999px', padding: '6px 14px' }}
            >
              <Icon icon="material-symbols:filter-list" style={{ fontSize: '1rem' }} />
              Filtres
            </button>
          </div>
        </div>
      </div>

      {/* Combined section: Per-page control + 100% incomplete tasks checkbox */}
      <div className="mb-3">
        <div className="row g-2">
          {/* Per-page control - responsive for mobile (50%) and desktop (auto-width) */}
          <div className="col-6 col-md-auto">
            <div 
              className="p-2 h-100 d-flex align-items-center gap-2 no-column"
              style={{
                borderRadius: '12px',
                background: 'linear-gradient(145deg, rgba(102, 126, 234, 0.04) 0%, rgba(118, 75, 162, 0.04) 100%)',
                border: '1px solid rgba(102, 126, 234, 0.1)',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.08)'
              }}
            >
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{
                  width: 24,
                  height: 24,
                  minWidth: 24,
                  background: 'rgba(102, 126, 234, 0.1)'
                }}
              >
                <Icon icon="mdi:view-list" style={{ fontSize: '0.8rem', color: '#667eea' }} />
              </div>
              <select
                className="form-select form-select-sm border-0"
                value={perPage}
                onChange={(e) => setPerPage(Math.min(100, Math.max(20, Number(e.target.value))))}
                style={{ 
                  borderRadius: '10px', 
                  background: 'transparent',
                  fontSize: '0.8rem',
                  padding: '6px 10px',
                  color: '#667eea',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: 'fit-content',
                  minWidth: 'auto',
                  border: 'none'
                }}
              >
                {[20, 40, 60, 80, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Checkbox for 100% incomplete tasks - takes half width on mobile, auto on desktop */}
          {userHasAdvancedAccess && (
            <div className="col-6 col-md-auto ms-md-auto d-flex align-items-center">
              <label 
                htmlFor="filter-hundred-incomplete"
                className="d-flex align-items-center gap-2 px-2 px-md-3 py-2 no-column w-100"
                style={{
                  cursor: 'pointer',
                  borderRadius: '12px',
                  background: showHundredIncompleteOnly 
                    ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)'
                    : 'rgba(102, 126, 234, 0.04)',
                  border: `1px solid ${showHundredIncompleteOnly ? 'rgba(102, 126, 234, 0.3)' : 'rgba(102, 126, 234, 0.1)'}`,
                  transition: 'all 0.2s ease',
                  userSelect: 'none',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.08)'
                }}
                onMouseEnter={(e) => {
                  if (!showHundredIncompleteOnly) {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showHundredIncompleteOnly) {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.04)';
                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.1)';
                  }
                }}
              >
                <div 
                  className="d-flex align-items-center justify-content-center"
                  style={{
                    width: 20,
                    height: 20,
                    minWidth: 20,
                    borderRadius: '6px',
                    background: showHundredIncompleteOnly 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : '#ffffff',
                    border: `2px solid ${showHundredIncompleteOnly ? '#667eea' : '#d1d5db'}`,
                    transition: 'all 0.2s ease',
                    boxShadow: showHundredIncompleteOnly ? '0 2px 8px rgba(102, 126, 234, 0.3)' : 'none'
                  }}
                >
                  {showHundredIncompleteOnly && (
                    <Icon icon="mdi:check" style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }} />
                  )}
                </div>
                <input
                  className="form-check-input d-none"
                  type="checkbox"
                  id="filter-hundred-incomplete"
                  checked={showHundredIncompleteOnly}
                  onChange={(event) => setShowHundredIncompleteOnly(event.target.checked)}
                />
                <span 
                  className="fw-semibold d-none d-md-inline"
                  style={{ 
                    fontSize: '0.85rem',
                    color: showHundredIncompleteOnly ? '#667eea' : '#6b7280',
                    transition: 'color 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Icon icon="mdi:file-document-check" className="me-1" style={{ fontSize: '1rem' }} />
                  Tâches 100% non clôturées
                </span>
                <span 
                  className="fw-semibold d-md-none"
                  style={{ 
                    fontSize: '0.75rem',
                    color: showHundredIncompleteOnly ? '#667eea' : '#6b7280',
                    transition: 'color 0.2s ease',
                    lineHeight: '1.2'
                  }}
                >
                  <Icon icon="mdi:file-document-check" className="me-1" style={{ fontSize: '0.9rem' }} />
                  100% non clôturées
                </span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Section des filtres - responsive */}
      <div className={`mb-3 ${showFilters ? 'd-block' : 'd-none d-md-block'}`}>
        <div 
          className="p-3" 
          style={{ 
            borderRadius: '16px',
            background: 'linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)',
            border: '1px solid rgba(102, 126, 234, 0.1)',
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.08)'
          }}
        >
          <div className="d-flex align-items-center mb-3">
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center me-2"
              style={{
                width: 32,
                height: 32,
                background: 'rgba(102, 126, 234, 0.1)'
              }}
            >
              <Icon icon="mdi:filter-variant" style={{ fontSize: '1rem', color: '#667eea' }} />
            </div>
            <h6 className="mb-0 fw-semibold" style={{ color: '#1f2937', fontSize: '0.95rem' }}>Filtres</h6>
          </div>
          
          <div className="row g-2">
            {/* Recherche */}
            <div className="col-6 col-md-2">
              <label className="form-label small fw-semibold mb-1" style={{ color: '#6b7280', fontSize: '0.7rem' }}>
                <Icon icon="mdi:magnify" className="me-1" style={{ fontSize: '0.85rem' }} />
                Recherche
              </label>
              <div className="position-relative">
                <input 
                  className="form-control form-control-sm shadow-sm border-0" 
                  placeholder="Rechercher..." 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                  style={{ 
                    borderRadius: '10px', 
                    background: 'rgba(102, 126, 234, 0.04)',
                    fontSize: '0.8rem',
                    padding: '8px 12px',
                    border: '1px solid rgba(102, 126, 234, 0.1)'
                  }} 
                />
              </div>
            </div>
            {/* Catégorie (ex-Projet) */}
            <div className="col-6 col-md-2">
              <label className="form-label small fw-semibold mb-1" style={{ color: '#6b7280', fontSize: '0.7rem' }}>
                <Icon icon="mdi:folder-outline" className="me-1" style={{ fontSize: '0.85rem', color: '#3b82f6' }} />
                Catégorie
              </label>
              <select
                className="form-select form-select-sm shadow-sm border-0"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                style={{ 
                  borderRadius: '10px', 
                  background: 'rgba(59, 130, 246, 0.04)',
                  fontSize: '0.8rem',
                  padding: '8px 12px',
                  border: '1px solid rgba(59, 130, 246, 0.1)'
                }}
              >
                <option value="">Toutes les catégories</option>
                {projects.map((project) => (
                  <option key={project.id} value={String(project.id)}>
                    {project.nom || project.titre || project.name || project.title || `Catégorie ${project.id}`}
                  </option>
                ))}
              </select>
            </div>
            {/* Liste */}
            <div className="col-6 col-md-3">
              <label className="form-label small fw-semibold mb-1" style={{ color: '#6b7280', fontSize: '0.7rem' }}>
                <Icon icon="mdi:format-list-bulleted" className="me-1" style={{ fontSize: '0.85rem', color: '#667eea' }} />
                Liste
              </label>
              <select
                className="form-select form-select-sm shadow-sm border-0"
                value={filterList}
                onChange={(e) => setFilterList(e.target.value)}
                style={{ 
                  borderRadius: '10px', 
                  background: 'rgba(102, 126, 234, 0.04)',
                  fontSize: '0.8rem',
                  padding: '8px 12px',
                  border: '1px solid rgba(102, 126, 234, 0.1)'
                }}
                disabled={filterProject && listsForFilters.length === 0}
              >
                <option value="">Toutes les listes</option>
                {listsForFilters.map((listOption) => (
                  <option key={listOption.id} value={String(listOption.id)}>
                    {listOption.title || listOption.name || `Liste ${listOption.id}`}
                  </option>
                ))}
              </select>
            </div>
            {/* Statut */}
            <div className="col-6 col-md-2">
              <label className="form-label small fw-semibold mb-1" style={{ color: '#6b7280', fontSize: '0.7rem' }}>
                <Icon icon="mdi:flag-variant" className="me-1" style={{ fontSize: '0.85rem', color: '#10b981' }} />
                Statut
              </label>
              <select
                className="form-select form-select-sm shadow-sm border-0"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ 
                  borderRadius: '10px', 
                  background: 'rgba(16, 185, 129, 0.04)',
                  fontSize: '0.8rem',
                  padding: '8px 12px',
                  border: '1px solid rgba(16, 185, 129, 0.1)'
                }}
              >
                <option value="">Tous les statuts</option>
                <option value="Non commencée">Non commencée</option>
                <option value="En cours">En cours</option>
                <option value="Terminée">Terminée</option>
                <option value="Annulé">Annulé</option>
              </select>
            </div>
            {/* Tri */}
            <div className="col-6 col-md-3">
              <label className="form-label small fw-semibold mb-1" style={{ color: '#6b7280', fontSize: '0.7rem' }}>
                <Icon icon="mdi:sort" className="me-1" style={{ fontSize: '0.85rem', color: '#f59e0b' }} />
                Tri
              </label>
              <select
                className="form-select form-select-sm shadow-sm border-0"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
                style={{ 
                  borderRadius: '10px', 
                  background: 'rgba(245, 158, 11, 0.04)',
                  fontSize: '0.8rem',
                  padding: '8px 12px',
                  border: '1px solid rgba(245, 158, 11, 0.1)'
                }}
              >
                <option value="recent">Plus récent</option>
                <option value="alpha">Alphabétique (A → Z)</option>
                <option value="pourcentage_desc">Progression décroissante</option>
                <option value="status_terminee">Statut: Terminée en premier</option>
                <option value="status_encours">Statut: En cours en premier</option>
                <option value="status_noncommencee">Statut: Non commencée en premier</option>
              </select>
            </div>
          
            {/* Collaborateur */}
            <div className="col-6 col-md-3">
              <label className="form-label small fw-semibold mb-1" style={{ color: '#6b7280', fontSize: '0.7rem' }}>
                <Icon icon="mdi:account" className="me-1" style={{ fontSize: '0.85rem', color: '#8b5cf6' }} />
                Collaborateur
              </label>
              <div className="position-relative">
                <input
                  className="form-control form-control-sm shadow-sm border-0 pe-5"
                  placeholder="Rechercher un membre..."
                  value={filterAssigneeQuery}
                  onChange={(e) => {
                    setFilterAssigneeQuery(e.target.value);
                    openFilterAssigneeMenu();
                  }}
                  onKeyDown={handleFilterAssigneeKeyDown}
                  onFocus={openFilterAssigneeMenu}
                  onBlur={scheduleCloseFilterAssigneeMenu}
                  style={{ 
                    borderRadius: '10px', 
                    background: 'rgba(139, 92, 246, 0.04)',
                    fontSize: '0.8rem',
                    padding: '8px 12px',
                    border: '1px solid rgba(139, 92, 246, 0.1)'
                  }}
                />
              {(filterAssignees.length > 0 || filterAssigneeQuery) && (
                <button
                  type="button"
                  className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-muted"
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onTouchStart={(event) => {
                    event.preventDefault();
                  }}
                  onClick={clearFilterAssignee}
                  style={{ textDecoration: 'none', fontSize: '0.8rem' }}
                  aria-label="Réinitialiser le filtre collaborateur"
                >
                  <Icon icon="mdi:close" />
                </button>
              )}
              {shouldShowAssigneeDropdown && (
                <div
                  className="list-group position-absolute start-0 mt-1 w-100 shadow-sm"
                  style={{ zIndex: 1300, maxHeight: 200, overflowY: 'auto', borderRadius: '12px' }}
                >
                  {filterAssigneeOptions.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={`list-group-item list-group-item-action small ${filterAssignees.includes(option.id) ? 'active' : ''}`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                      }}
                      onTouchStart={(event) => {
                        event.preventDefault();
                      }}
                      onClick={() => handleSelectFilterAssignee(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedFilterAssigneeEntries.length > 0 && (
              <div className="mt-2 d-flex flex-wrap gap-2">
                {selectedFilterAssigneeEntries.map((entry) => (
                  <span key={entry.id} className="badge rounded-pill d-inline-flex align-items-center gap-1" style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                    boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)',
                    fontSize: '0.75rem',
                    padding: '4px 10px'
                  }}>
                    <Icon icon="mdi:account" />
                    {entry.label}
                    <button
                      type="button"
                      className="btn btn-link p-0 text-white"
                      onMouseDown={(event) => {
                        event.preventDefault();
                      }}
                      onTouchStart={(event) => {
                        event.preventDefault();
                      }}
                      onClick={() => handleSelectFilterAssignee(entry.id)}
                      style={{ textDecoration: 'none', lineHeight: 1 }}
                      aria-label={`Retirer ${entry.label}`}
                    >
                      <Icon icon="mdi:close" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          </div> {/* Fermeture row g-2 */}
        </div> {/* Fermeture container de filtre */}
      </div> {/* Fermeture showFilters div */}

      {/* Add form appears at top when toggled */}
      {showAdd && (
        <div 
          className="card mb-3 border-0 shadow-lg animate__animated animate__fadeInDown" 
          style={{ 
            zIndex: 1250, 
            borderRadius: '20px', 
            background: 'linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(102, 126, 234, 0.15)',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* Accent bar at top */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #667eea, #764ba2)'
          }} />
          
          <div className="card-body p-3 pt-4">
            <div className="d-flex align-items-center mb-3">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center me-2"
                style={{
                  width: 40,
                  height: 40,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
              >
                <Icon icon="mdi:plus" style={{ fontSize: '1.5rem', color: '#fff' }} />
              </div>
              <h6 className="mb-0 fw-bold" style={{ color: '#1f2937', fontSize: '1.1rem' }}>Nouvelle Tâche</h6>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small mb-2 fw-semibold" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  <Icon icon="mdi:text" className="me-1" style={{ fontSize: '0.9rem' }} />
                  Titre de la tâche
                </label>
                <input 
                  className="form-control border-0 shadow-sm" 
                  placeholder="Que faut-il faire ?" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  aria-label="Titre"
                  style={{ 
                    borderRadius: '12px', 
                    background: 'rgba(102, 126, 234, 0.04)',
                    fontSize: '0.9rem',
                    padding: '12px 16px',
                    border: '1px solid rgba(102, 126, 234, 0.1)',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.background = 'rgba(102, 126, 234, 0.08)';
                    e.target.style.borderColor = 'rgba(102, 126, 234, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.target.style.background = 'rgba(102, 126, 234, 0.04)';
                    e.target.style.borderColor = 'rgba(102, 126, 234, 0.1)';
                  }}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small mb-2 fw-semibold" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  <Icon icon="mdi:repeat" className="me-1" style={{ color: '#8b5cf6', fontSize: '0.95rem' }} />
                  Répétitions
                </label>
                <div className="d-flex flex-column flex-md-row align-items-start gap-3">
                  <div className="d-flex flex-column" style={{ minWidth: '120px' }}>
                    <span className="text-muted small mb-1">Nombre</span>
                    <select
                      className="form-select border-0 shadow-sm"
                      value={repeatCount}
                      onChange={(e) => handleRepeatCountChange(e.target.value)}
                      aria-label="Nombre de répétitions"
                      style={{
                        borderRadius: '12px',
                        background: 'rgba(139, 92, 246, 0.04)',
                        padding: '10px 12px',
                        border: '1px solid rgba(139, 92, 246, 0.15)',
                        minWidth: '120px',
                      }}
                    >
                      {REPEAT_COUNT_OPTIONS.map((option) => (
                        <option key={`repeat-count-${option}`} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="d-flex flex-column" style={{ minWidth: '160px' }}>
                    <span className="text-muted small mb-1">Fréquence</span>
                    <select
                      className="form-select border-0 shadow-sm"
                      value={repeatFrequency}
                      onChange={(e) => handleRepeatFrequencyChange(e.target.value)}
                      aria-label="Fréquence de répétition"
                      disabled={repeatCount <= 1}
                      style={{
                        borderRadius: '12px',
                        background: 'rgba(14, 165, 233, 0.04)',
                        padding: '10px 12px',
                        border: '1px solid rgba(14, 165, 233, 0.15)',
                        minWidth: '160px',
                        opacity: repeatCount <= 1 ? 0.6 : 1,
                      }}
                    >
                      {REPEAT_FREQUENCY_OPTIONS.map((option) => (
                        <option key={`repeat-frequency-${option.value}`} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-grow-1">
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Jusqu'à {MAX_REPEAT_COUNT} dates. Choisissez une fréquence pour remplir automatiquement les autres périodes.
                    </small>
                    {repeatCount > 1 && (
                      <small className="text-muted d-block mt-1" style={{ fontSize: '0.75rem' }}>
                        Les occurrences supplémentaires seront planifiées automatiquement et créées selon la fréquence sélectionnée.
                      </small>
                    )}
                  </div>
                </div>
              </div>

              {repeatCount === 1 ? (
                <div className="mb-3 row g-3">
                  <div className="col-6">
                    <label className="form-label small mb-2 fw-semibold" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      <Icon icon="mdi:calendar-start" className="me-1" style={{ color: '#10b981', fontSize: '0.9rem' }} />
                      Début
                    </label>
                    <input 
                      type="date" 
                      className="form-control border-0 shadow-sm" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      aria-label="Date de début"
                      style={{ 
                        borderRadius: '12px', 
                        background: 'rgba(16, 185, 129, 0.04)',
                        padding: '10px 12px',
                        border: '1px solid rgba(16, 185, 129, 0.1)',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small mb-2 fw-semibold" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      <Icon icon="mdi:calendar-end" className="me-1" style={{ color: '#f59e0b', fontSize: '0.9rem' }} />
                      Fin
                    </label>
                    <input 
                      type="date" 
                      className="form-control border-0 shadow-sm" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      aria-label="Date de fin"
                      style={{ 
                        borderRadius: '12px', 
                        background: 'rgba(245, 158, 11, 0.04)',
                        padding: '10px 12px',
                        border: '1px solid rgba(245, 158, 11, 0.1)',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mb-3">
                  <label className="form-label small mb-2 fw-semibold" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                    <Icon icon="mdi:calendar-range" className="me-1" style={{ color: '#f97316', fontSize: '0.95rem' }} />
                    Dates des répétitions
                  </label>
                  <div className="d-flex flex-column gap-3">
                    {repeatRanges.slice(0, repeatCount).map((range, index) => (
                      <div key={`repeat-range-${index}`} className="row g-2 align-items-end">
                        <div className="col-6">
                          <label className="form-label small mb-1 fw-semibold text-muted">
                            Début #{index + 1}
                          </label>
                          <input
                            type="date"
                            className="form-control border-0 shadow-sm"
                            value={range.start}
                            onChange={(e) => handleRepeatRangeChange(index, 'start', e.target.value)}
                            aria-label={`Date de début répétition ${index + 1}`}
                            disabled={repeatFrequency !== 'manual' && index > 0}
                            style={{
                              borderRadius: '12px',
                              background: 'rgba(16, 185, 129, 0.04)',
                              padding: '10px 12px',
                              border: '1px solid rgba(16, 185, 129, 0.1)',
                              fontSize: '0.85rem',
                              opacity: repeatFrequency !== 'manual' && index > 0 ? 0.8 : 1,
                            }}
                          />
                        </div>
                        <div className="col-6">
                          <label className="form-label small mb-1 fw-semibold text-muted">
                            Fin #{index + 1}
                          </label>
                          <input
                            type="date"
                            className="form-control border-0 shadow-sm"
                            value={range.end}
                            onChange={(e) => handleRepeatRangeChange(index, 'end', e.target.value)}
                            aria-label={`Date de fin répétition ${index + 1}`}
                            disabled={repeatFrequency !== 'manual' && index > 0}
                            style={{
                              borderRadius: '12px',
                              background: 'rgba(245, 158, 11, 0.04)',
                              padding: '10px 12px',
                              border: '1px solid rgba(245, 158, 11, 0.1)',
                              fontSize: '0.85rem',
                              opacity: repeatFrequency !== 'manual' && index > 0 ? 0.8 : 1,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {repeatFrequency !== 'manual' && repeatCount > 1 && (
                    <small className="text-muted fst-italic d-block mt-2">
                      Les répétitions #2 et suivantes sont calculées automatiquement à partir de la première période et seront ajoutées dans le temps, pas instantanément.
                    </small>
                  )}
                </div>
              )}

              <div className="mb-3">
                <label className="form-label small mb-2 fw-semibold" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  <Icon icon="mdi:folder-outline" className="me-1" style={{ color: '#3b82f6', fontSize: '0.9rem' }} />
                  Catégorie (optionnel)
                </label>
                <select 
                  className="form-select border-0 shadow-sm" 
                  value={selectedProject} 
                  onChange={(e) => { setSelectedProject(e.target.value); setSelectedList(''); /* keep assignees */ }} 
                  aria-label="Projet (optionnel)"
                  style={{ 
                    borderRadius: '12px', 
                    background: 'rgba(59, 130, 246, 0.04)',
                    padding: '12px 16px',
                    border: '1px solid rgba(59, 130, 246, 0.1)',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="">Sélectionner une catégorie...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.nom || p.titre || p.name || p.title || `Catégorie ${p.id}`}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small mb-2 fw-semibold" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  <Icon icon="mdi:format-list-bulleted" className="me-1" style={{ color: '#667eea', fontSize: '0.9rem' }} />
                  Liste (optionnel)
                </label>
                <select 
                  className="form-select border-0 shadow-sm" 
                  value={selectedList} 
                  onChange={(e) => { setSelectedList(e.target.value); /* keep assignees */ }} 
                  aria-label="Liste"
                  style={{ 
                    borderRadius: '12px', 
                    background: 'rgba(102, 126, 234, 0.04)',
                    padding: '12px 16px',
                    border: '1px solid rgba(102, 126, 234, 0.1)',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="">Choisir une liste...</option>
                  {listsForSelectedProject.map((l) => (<option key={l.id} value={l.id}>{l.title || l.name || `Liste ${l.id}`}</option>))}
                </select>
              </div>

              <div className="mb-3 row g-2">
                {!hasLimitedEmployeePermissions && (
                  <div className="col-6">
                    <label className="form-label small mb-2 fw-semibold text-secondary d-flex align-items-center gap-1">
                      <Icon icon="mdi:tag" className="text-primary" />
                      Nature
                    </label>
                    <select
                      className="form-select border-0 shadow-sm"
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value)}
                      style={{
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.85)',
                        padding: '10px 12px'
                      }}
                    >
                      <option value="AC">AC</option>
                      <option value="AP">AP</option>
                    </select>
                  </div>
                )}
                {!hasLimitedEmployeePermissions && (
                  <div className="col-6">
                    <label className="form-label small mb-2 fw-semibold text-secondary d-flex align-items-center gap-1">
                      <Icon icon="mdi:alarm" className="text-danger" />
                      Priorité
                    </label>
                    <select
                      className="form-select border-0 shadow-sm"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      style={{
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.85)',
                        padding: '10px 12px'
                      }}
                    >
                      <option value="basse">Basse</option>
                      <option value="normale">Normale</option>
                      <option value="haute">Haute</option>
                      <option value="critique">Critique</option>
                    </select>
                  </div>
                )}
                <div className={hasLimitedEmployeePermissions ? 'col-12 col-md-6' : 'col-6'}>
                  <label className="form-label small mb-2 fw-semibold text-secondary d-flex align-items-center gap-1">
                    <Icon icon="mdi:flag" className="text-secondary" />
                    Statut
                  </label>
                  <select
                    className="form-select border-0 shadow-sm"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.85)',
                      padding: '10px 12px'
                    }}
                  >
                    {createStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className={hasLimitedEmployeePermissions ? 'col-12 col-md-6' : 'col-6'}>
                  <label className="form-label small mb-2 fw-semibold text-secondary d-flex align-items-center gap-1">
                    <Icon icon="mdi:percent" className="text-primary" />
                    Progression
                  </label>
                  <input
                    type="number"
                    className="form-control border-0 shadow-sm"
                    min={0}
                    max={100}
                    value={pourcentage}
                    onChange={(e) => setPourcentage(Math.min(100, Math.max(0, Number(e.target.value))))}
                    style={{
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.85)',
                      padding: '10px 12px'
                    }}
                  />
                </div>
                {!hasLimitedEmployeePermissions && (
                  <div className="col-6">
                    <label className="form-label small mb-2 fw-semibold text-secondary">
                      <Icon icon="mdi:link-variant" className="me-1 text-secondary" />
                      Source (optionnel)
                    </label>
                    <input
                      className="form-control border-0 shadow-sm"
                      placeholder="Lien ou référence..."
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      aria-label="Source (optionnel)"
                      style={{
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.8)',
                        padding: '12px 16px'
                      }}
                    />
                  </div>
                )}
              </div>

              


              <div className="mb-3">
                <label className="form-label small mb-2 fw-semibold text-secondary d-flex align-items-center gap-1">
                  <Icon icon="mdi:paperclip" className="text-primary" />
                  Documents (optionnel)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.xlsm,.txt"
                  className="form-control border-0 shadow-sm"
                  onChange={handleAttachmentChange}
                  style={{
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.8)',
                    padding: '10px 12px'
                  }}
                />
                {attachments.length > 0 && (
                  <div className="mt-3" >
                    <div className="d-flex flex-wrap gap-2 no-column" style={{ maxHeight: 120, overflowY: 'auto' }}>
                      {attachments.map((file, idx) => {
                        const getFileIcon = (fileName) => {
                          const ext = fileName.split('.').pop()?.toLowerCase();
                          switch (ext) {
                            case 'pdf': return 'mdi:file-pdf';
                            case 'doc':
                            case 'docx': return 'mdi:file-word';
                            case 'xls':
                            case 'xlsx':
                            case 'xlsm': return 'mdi:file-excel';
                            case 'jpg':
                            case 'jpeg':
                            case 'png':
                            case 'gif': return 'mdi:file-image';
                            case 'txt': return 'mdi:file-document';
                            default: return 'mdi:file';
                          }
                        };

                        return (
                          <div
                            key={`${file.name}-${idx}`}
                            className="d-flex align-items-center gap-1 bg-light rounded-full "
                            style={{
                              minWidth: 0,
                              maxWidth: "fit-content"
                            }}
                          >
                            <Icon 
                              icon={getFileIcon(file.name)} 
                              className="text-primary flex-shrink-0" 
                              style={{ fontSize: '1.2rem' }} 
                            />
                            <span 
                              className="text-truncate small fw-medium text-dark" 
                              style={{ maxWidth: 160 }}
                              title={file.name}
                            >
                              {file.name}
                            </span>
                            <button
                              type="button"
                              className="btn btn-link p-0 text-danger flex-shrink-0 btn_docs_trash"
                              onClick={() => removeAttachmentAt(idx)}
                              style={{ 
                                fontSize: '1.1rem',
                                lineHeight: 1,
                                textDecoration: 'none'
                              }}
                              title="Supprimer ce fichier"
                            >
                              <Icon icon="mdi:trash-can" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <>
                <div className="mb-3">
                  <label className="form-label small mb-2 fw-semibold" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                    <Icon icon="mdi:account-multiple" className="me-1" style={{ color: '#667eea', fontSize: '0.9rem' }} />
                    Assigner Employés
                  </label>
                  <div className="position-relative mb-2">
                    <Icon icon="mdi:account-search" className="position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: '#9ca3af', fontSize: '1rem' }} />
                    <input
                      list="tasks-phone-employee-assignee-list"
                      className="form-control border-0 shadow-sm ps-5"
                      placeholder="Rechercher un employé..."
                      value={employeeAssigneeInput}
                      onChange={(e) => setEmployeeAssigneeInput(e.target.value)}
                      aria-label="Assigner employés"
                      style={{ 
                        borderRadius: '12px', 
                        background: 'rgba(102, 126, 234, 0.04)',
                        padding: '12px 16px 12px 45px',
                        border: '1px solid rgba(102, 126, 234, 0.1)',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                  <datalist id="tasks-phone-employee-assignee-list">
                    {users.map(u => {
                      const label = buildDisplayLabel(u) || `Utilisateur ${u.id}`;
                      return <option key={`emp-${u.id}`} value={label} />;
                    })}
                  </datalist>
                  {selectedEmployeeAssignees.length > 0 && (
                    <div className="mt-2 d-flex flex-wrap gap-2 no-column">
                      {selectedEmployeeAssignees.map(empId => {
                        const user = getUserById(empId);
                        const label = buildUserLabel(user) || `Employé ${empId}`;
                        const initials = label.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
                        return (
                          <div key={`emp-chip-${empId}`} className="d-inline-flex align-items-center gap-1 px-2 py-1" style={{ borderRadius:'10px', background:'rgba(102,126,234,0.1)', fontSize:'0.75rem', maxWidth:'fit-content' }}>
                            <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width:22,height:22, background:'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', color:'#fff', fontSize:'0.6rem', fontWeight:'600' }}>{initials}</div>
                            <span className="text-truncate fw-medium" style={{ maxWidth:'140px', color:'#667eea' }}>{label}</span>
                            <button type="button" className="btn btn-link p-0" onClick={() => removeEmployeeAssignee(empId)} aria-label={`Retirer ${label}`} style={{ fontSize:'0.9rem', lineHeight:1, textDecoration:'none', color:'#667eea', opacity:0.7, transition:'opacity 0.2s' }} onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0.7'}>
                              <Icon icon="mdi:close-circle" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label small mb-2 fw-semibold" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                    <Icon icon="mdi:account-box-multiple" className="me-1" style={{ color: '#10b981', fontSize: '0.9rem' }} />
                    Client associé
                  </label>
                  <div className="position-relative mb-2">
                    <Icon icon="mdi:account-search" className="position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: '#9ca3af', fontSize: '1rem' }} />
                    <input
                      list="tasks-phone-client-assignee-list"
                      className="form-control border-0 shadow-sm ps-5"
                      placeholder="Rechercher un client... (1 maximum)"
                      value={clientAssigneeInput}
                      onChange={(e) => setClientAssigneeInput(e.target.value)}
                      aria-label="Assigner clients"
                      style={{ 
                        borderRadius: '12px', 
                        background: 'rgba(16, 185, 129, 0.04)',
                        padding: '12px 16px 12px 45px',
                        border: '1px solid rgba(16, 185, 129, 0.1)',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                  <datalist id="tasks-phone-client-assignee-list">
                    {clients.map(c => {
                      const label = buildDisplayLabel(c) || `Client ${c.id}`;
                      return <option key={`cli-${c.id}`} value={label} />;
                    })}
                  </datalist>
                  {selectedClientAssignees.length > 0 && (
                    <div className="mt-2 d-flex flex-wrap gap-2 no-column">
                      {selectedClientAssignees.slice(0,1).map(cliId => {
                        const user = getUserById(cliId);
                        const label = buildUserLabel(user) || `Client ${cliId}`;
                        const initials = label.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
                        return (
                          <div key={`cli-chip-${cliId}`} className="d-inline-flex align-items-center gap-1 px-2 py-1" style={{ borderRadius:'10px', background:'rgba(16,185,129,0.12)', fontSize:'0.75rem', maxWidth:'fit-content' }}>
                            <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width:22,height:22, background:'linear-gradient(135deg,#10b981 0%,#059669 100%)', color:'#fff', fontSize:'0.6rem', fontWeight:'600' }}>{initials}</div>
                            <span className="text-truncate fw-medium" style={{ maxWidth:'140px', color:'#059669' }}>{label}</span>
                            <button type="button" className="btn btn-link p-0" onClick={() => removeClientAssignee(cliId)} aria-label={`Retirer ${label}`} style={{ fontSize:'0.9rem', lineHeight:1, textDecoration:'none', color:'#059669', opacity:0.7, transition:'opacity 0.2s' }} onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0.7'}>
                              <Icon icon="mdi:close-circle" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>

              <div className="d-flex gap-2 mt-4 no-column">
                <button 
                  type="submit" 
                  className="btn btn-primary flex-grow-1 d-flex no-column align-items-center justify-content-center gap-2 fw-semibold" 
                  disabled={loadingAdd}
                  style={{ 
                    borderRadius: '12px', 
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                  }}
                >
                  {loadingAdd ? (
                    <>
                      <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div>
                      Création...
                    </>
                  ) : (
                    <>
                      <Icon icon="mdi:check" style={{ fontSize: '1.1rem' }} />
                      Créer la tâche
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn no-column d-flex align-items-center justify-content-center gap-1" 
                  onClick={() => { resetForm(); setShowAdd(false); }}
                  style={{ 
                    borderRadius: '12px', 
                    padding: '12px 20px',
                    border: 'none',
                    background: 'rgba(107, 114, 128, 0.1)',
                    color: '#6b7280',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(107, 114, 128, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(107, 114, 128, 0.1)';
                  }}
                >
                  <Icon icon="mdi:close" />
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Reminder Actions Bar */}
      {selectedTasksForReminder.length > 0 && (
        <div 
          className="mb-3 p-3 animate__animated animate__fadeInDown" 
          style={{ 
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)'
          }}
        >
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{
                  width: 36,
                  height: 36,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                }}
              >
                <Icon icon="mdi:checkbox-marked" style={{ fontSize: '1.2rem', color: '#fff' }} />
              </div>
              <div>
                <div className="fw-bold" style={{ color: '#667eea', fontSize: '0.95rem' }}>
                  {selectedTasksForReminder.length} tâche(s) sélectionnée(s)
                </div>
                <div className="small text-muted" style={{ fontSize: '0.75rem' }}>
                  Prêt à envoyer des rappels WhatsApp
                </div>
              </div>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm d-flex align-items-center gap-1"
                onClick={handleSendBulkReminders}
                disabled={sendingBulkReminders}
                style={{
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  padding: '8px 16px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                }}
              >
                {sendingBulkReminders ? (
                  <>
                    <div className="spinner-border spinner-border-sm" role="status"></div>
                    Envoi...
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:whatsapp" style={{ fontSize: '1.1rem' }} />
                    Envoyer rappels
                  </>
                )}
              </button>
              <button
                className="btn btn-sm d-flex align-items-center gap-1"
                onClick={selectAllTasks}
                style={{
                  borderRadius: '10px',
                  background: 'rgba(102, 126, 234, 0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                  color: '#667eea',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  padding: '8px 16px'
                }}
              >
                <Icon icon="mdi:select-all" />
                Tout
              </button>
              <button
                className="btn btn-sm d-flex align-items-center gap-1"
                onClick={clearSelection}
                style={{
                  borderRadius: '10px',
                  background: 'rgba(107, 114, 128, 0.1)',
                  border: '1px solid rgba(107, 114, 128, 0.2)',
                  color: '#6b7280',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  padding: '8px 16px'
                }}
              >
                <Icon icon="mdi:close" />
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

  <div className="d-flex justify-content-between align-items-center text-muted mb-2" style={{ fontSize: '0.8rem' }}>
        <span>{filtered.length} tâche(s) trouvée(s)</span>
        <span>Page {Math.min(currentPage, totalPages)} / {totalPages}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-5">
          <Icon icon="mdi:clipboard-text-outline" style={{ fontSize: '4rem', color: 'rgba(102,126,234,0.4)' }} />
          <p className="text-dark mt-3 mb-0" style={{ fontSize: '1.1rem' }}>Aucune tâche pour le moment</p>
          <small className="text-muted" style={{ opacity: 0.7 }}>Utilisez le bouton + pour créer votre première tâche</small>
        </div>
      ) : (
        <div className="row g-3">
          {paginatedTasks.map((task) => {
            const cancellationRequests = getCancellationRequests(task) || [];
            const pendingCancellations = cancellationRequests.filter((request) => String(request.status || '').toLowerCase() === 'pending');
            const pendingCancellation = pendingCancellations[0] || null; // keep single reference for existing checks
            const processedCancellations = cancellationRequests.filter((request) => String(request.status || '').toLowerCase() !== 'pending');
            const latestProcessedCancellation = processedCancellations[0] || null; // backward-compatible
            const normalizedStatus = String(task.status || '').toLowerCase();
            const isFinalisedStatus = normalizedStatus.includes('annul') || normalizedStatus.includes('termin');
            const canRequestCancellation = isTaskAssignedToCurrentUser(task) && !pendingCancellation && !isFinalisedStatus;
            const cancellationButtonTitle = pendingCancellation
              ? 'Demande déjà envoyée'
              : isFinalisedStatus
                ? 'Tâche déjà finalisée'
                : 'Demander l\'annulation';
            const canSeeCancellationDetails = userHasAdvancedAccess || isTaskAssignedToCurrentUser(task);
            const typeBadgeClass = task.type === 'AC' ? 'bg-primary' : task.type === 'AP' ? 'bg-success' : 'bg-secondary';
            const typeLabel = task.type || 'N/A';
            const dynamicComments = commentsByTask[String(task.id)] || [];
            const fallbackCommentsCount = Array.isArray(task.comments) ? task.comments.length : 0;
            const commentCount = dynamicComments.length || fallbackCommentsCount;
            const commentsOpen = !!expandedComments[task.id];
            const taskComments = dynamicComments.length > 0
              ? dynamicComments
              : (Array.isArray(task.comments) ? task.comments : []);

            const isSelected = selectedTasksForReminder.includes(task.id);

            return (
            <div key={task.id} className="col-12">
              <div 
                className="card border-0 h-100" 
                style={{ 
                  borderRadius: '20px', 
                  background: isSelected 
                    ? 'linear-gradient(145deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)'
                    : 'linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)',
                  border: isSelected 
                    ? '2px solid rgba(102, 126, 234, 0.3)'
                    : '1px solid rgba(102, 126, 234, 0.08)',
                  boxShadow: isSelected
                    ? '0 4px 16px rgba(102, 126, 234, 0.2)'
                    : '0 2px 8px rgba(102, 126, 234, 0.08)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = isSelected
                    ? '0 8px 28px rgba(102, 126, 234, 0.25)'
                    : '0 8px 24px rgba(102, 126, 234, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isSelected
                    ? '0 4px 16px rgba(102, 126, 234, 0.2)'
                    : '0 2px 8px rgba(102, 126, 234, 0.08)';
                }}
              >
                {/* Subtle gradient accent bar */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: task.status === 'Terminée' 
                    ? 'linear-gradient(90deg, #10b981, #059669)' 
                    : task.status === 'En cours'
                    ? 'linear-gradient(90deg, #3b82f6, #2563eb)'
                    : task.status === 'Annulé'
                    ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                    : 'linear-gradient(90deg, #f59e0b, #d97706)'
                }} />
                
                <div className="card-body p-3 d-flex flex-column gap-2">
                  {editingTaskId === task.id ? (
                    <form onSubmit={(e) => submitEdit(e, task.id)}>
                      {!hasLimitedEmployeePermissions && (
                        <div className="mb-3">
                          <label className="form-label small mb-2 fw-semibold" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                            <Icon icon="mdi:text" className="me-1" style={{ fontSize: '0.9rem' }} />
                            Titre de la tâche
                          </label>
                          <input 
                            className="form-control border-0 shadow-sm" 
                            value={editDescription} 
                            onChange={(e) => setEditDescription(e.target.value)}
                            disabled={hasLimitedEmployeePermissions}
                            style={{ 
                              borderRadius: '12px', 
                              background: 'rgba(102, 126, 234, 0.04)', 
                              padding: '12px 16px',
                              border: '1px solid rgba(102, 126, 234, 0.1)',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>
                      )}
                      {!hasLimitedEmployeePermissions && (
                        <div className="row g-3 mb-3">
                          <div className="col-6">
                            <label className="form-label small mb-2 fw-semibold" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                              <Icon icon="mdi:tag" className="text-primary" />
                              Nature
                            </label>
                            <input 
                              type="date" 
                              className="form-control border-0 shadow-sm" 
                              value={editStartDate} 
                              onChange={(e) => setEditStartDate(e.target.value)}
                              disabled={hasLimitedEmployeePermissions}
                              style={{ 
                                borderRadius: '10px', 
                                background: 'rgba(16, 185, 129, 0.04)',
                                border: '1px solid rgba(16, 185, 129, 0.1)',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label small mb-1 fw-semibold" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                              <Icon icon="mdi:calendar-end" className="me-1" style={{ color: '#f59e0b', fontSize: '0.9rem' }} />
                              Fin
                            </label>
                            <input 
                              type="date" 
                              className="form-control border-0 shadow-sm" 
                              value={editEndDate} 
                              onChange={(e) => setEditEndDate(e.target.value)}
                              disabled={hasLimitedEmployeePermissions}
                              style={{ 
                                borderRadius: '10px', 
                                background: 'rgba(245, 158, 11, 0.04)',
                                border: '1px solid rgba(245, 158, 11, 0.1)',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {!hasLimitedEmployeePermissions && (
                        <div className="mb-3">
                          <label className="form-label small mb-1 fw-semibold text-secondary">Catégorie</label>
                          <select 
                            className="form-select border-0 shadow-sm mb-2" 
                            value={editSelectedProject} 
                            onChange={(e) => { setEditSelectedProject(e.target.value); setEditSelectedList(''); }}
                            disabled={hasLimitedEmployeePermissions}
                            style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.8)' }}
                          >
                            <option value="">Aucune catégorie</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.nom || p.titre || p.name || p.title || `Projet ${p.id}`}</option>)}
                          </select>
                          <label className="form-label small mb-1 fw-semibold text-secondary">Liste</label>
                          <select 
                            className="form-select border-0 shadow-sm" 
                            value={editSelectedList} 
                            onChange={(e) => setEditSelectedList(e.target.value)}
                            disabled={hasLimitedEmployeePermissions}
                            style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.8)' }}
                          >
                            <option value="">Choisir une liste</option>
                            {(editSelectedProject ? lists.filter(l => {
                              const pid = l.project_id ?? l.projectId ?? (l.project && l.project.id) ?? l.project;
                              return String(pid) === String(editSelectedProject);
                            }) : lists).map(l => <option key={l.id} value={l.id}>{l.title || l.name || `Liste ${l.id}`}</option>)}
                          </select>
                        </div>
                      )}

                      {!hasLimitedEmployeePermissions && (
                        <div className="mb-3">
                          <label className="form-label small mb-1 fw-semibold text-secondary">Assigner Employés</label>
                          <input 
                            list="tasks-phone-employee-assignee-list-edit" 
                            className="form-control border-0 shadow-sm" 
                            placeholder="Nom de l'employé..." 
                            value={editEmployeeAssigneeInput} 
                            onChange={(e) => setEditEmployeeAssigneeInput(e.target.value)}
                            disabled={hasLimitedEmployeePermissions}
                            style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.8)', padding: '10px 12px' }}
                          />
                          <datalist id="tasks-phone-employee-assignee-list-edit">
                            {users.map(u => {
                              const label = buildDisplayLabel(u) || `Employé ${u.id}`;
                              return <option key={`edit-emp-${u.id}`} value={label} />;
                            })}
                          </datalist>
                          {editSelectedEmployeeAssignees.length > 0 && (
                            <div className="mt-2 d-flex flex-wrap gap-2 no-column">
                              {editSelectedEmployeeAssignees.map(assigneeId => {
                                const user = getUserById(assigneeId);
                                const label = buildUserLabel(user) || `Employé ${assigneeId}`;
                                return (
                                  <span key={`edit-emp-chip-${assigneeId}`} className="badge rounded-pill text-bg-primary d-inline-flex align-items-center gap-1" style={{ fontSize:'0.75rem', padding:'6px 8px', maxWidth:'150px' }}>
                                    <Icon icon="mdi:account" style={{ fontSize:'0.8rem' }} />
                                    <span className="text-truncate" style={{ maxWidth:'80px' }}>{label}</span>
                                    <button type="button" className="btn_remove_assignee" onClick={() => removeEditEmployeeAssignee(assigneeId)} disabled={hasLimitedEmployeePermissions} aria-label={`Retirer ${label}`}><Icon icon="mdi:close" /></button>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      {!hasLimitedEmployeePermissions && (
                        <div className="mb-3">
                          <label className="form-label small mb-1 fw-semibold text-secondary">Assigner Clients</label>
                      {!hasLimitedEmployeePermissions && (
                        <div className="mb-3">
                          <label className="form-label small mb-1 fw-semibold text-secondary">Priorité</label>
                          <select
                            className="form-select border-0 shadow-sm"
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value)}
                            style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.85)' }}
                          >
                            <option value="basse">Basse</option>
                            <option value="normale">Normale</option>
                            <option value="haute">Haute</option>
                            <option value="critique">Critique</option>
                          </select>
                        </div>
                      )}
                          <input 
                            list="tasks-phone-client-assignee-list-edit" 
                            className="form-control border-0 shadow-sm" 
                            placeholder="Nom du client..." 
                            value={editClientAssigneeInput} 
                            onChange={(e) => setEditClientAssigneeInput(e.target.value)}
                            disabled={hasLimitedEmployeePermissions}
                            style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.8)', padding: '10px 12px' }}
                          />
                          <datalist id="tasks-phone-client-assignee-list-edit">
                            {clients.map(c => {
                              const label = buildDisplayLabel(c) || `Client ${c.id}`;
                              return <option key={`edit-cli-${c.id}`} value={label} />;
                            })}
                          </datalist>
                          {editSelectedClientAssignees.length > 0 && (
                            <div className="mt-2 d-flex flex-wrap gap-2 no-column">
                              {editSelectedClientAssignees.slice(0,1).map(assigneeId => {
                                const user = getUserById(assigneeId);
                                const label = buildUserLabel(user) || `Client ${assigneeId}`;
                                return (
                                  <span key={`edit-cli-chip-${assigneeId}`} className="badge rounded-pill bg-success d-inline-flex align-items-center gap-1" style={{ fontSize:'0.75rem', padding:'6px 8px', maxWidth:'150px' }}>
                                    <Icon icon="mdi:account" style={{ fontSize:'0.8rem' }} />
                                    <span className="text-truncate" style={{ maxWidth:'80px' }}>{label}</span>
                                    <button type="button" className="btn_remove_assignee" onClick={() => removeEditClientAssignee(assigneeId)} disabled={hasLimitedEmployeePermissions} aria-label={`Retirer ${label}`}><Icon icon="mdi:close" /></button>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="row g-2 mb-3">
                        {!hasLimitedEmployeePermissions && (
                          <div className="col-6">
                            <label className="form-label small mb-1 fw-semibold text-secondary">Nature</label>
                            <select
                              className="form-select border-0 shadow-sm"
                              value={editType}
                              onChange={(e) => setEditType(e.target.value)}
                              style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.85)' }}
                            >
                              <option value="AC">AC</option>
                              <option value="AP">AP</option>
                            </select>
                          </div>
                        )}
                        {!hasLimitedEmployeePermissions && (
                          <div className="col-6">
                            <label className="form-label small mb-1 fw-semibold text-secondary">Statut</label>
                            <select 
                              className="form-select border-0 shadow-sm" 
                              value={editStatus} 
                              onChange={(e) => setEditStatus(e.target.value)}
                              style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.85)' }}
                            >
                              {editStatusOptions.map((option) => (
                                <option key={option.value} value={option.value} disabled={option.disabled || false}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="col-12">
                          <label className="form-label small mb-1 fw-semibold text-secondary">Progression</label>
                          <input 
                            type="number" 
                            className="form-control border-0 shadow-sm" 
                            min={0} 
                            max={100} 
                            value={editPourcentage} 
                            onChange={(e) => setEditPourcentage(Math.min(100, Math.max(0, Number(e.target.value))))}
                            style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.85)' }}
                          />
                        </div>
                        {!hasLimitedEmployeePermissions && (
                          <div className="col-6">
                            <label className="form-label small mb-1 fw-semibold text-secondary">Source (optionnel)</label>
                            <input
                              className="form-control border-0 shadow-sm"
                              placeholder="Lien ou référence..."
                              value={editSource}
                              onChange={(e) => setEditSource(e.target.value)}
                              style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.8)', padding: '10px 12px' }}
                            />
                          </div>
                        )}
                      </div>

                      {!hasLimitedEmployeePermissions && (
                        <div className="mb-3">
                          <label className="form-label small mb-1 fw-semibold text-secondary d-flex align-items-center gap-1">
                            <Icon icon="mdi:attachment" style={{ fontSize: '0.9rem' }} />
                            Pièces jointes existantes
                          </label>
                          {editExistingAttachments.length === 0 ? (
                            <p className="text-muted small mb-2">Aucun document associé.</p>
                          ) : (
                            <div className="d-flex flex-wrap gap-1 mb-2">
                              {editExistingAttachments.map((att) => (
                                <div key={att.id} className="d-flex align-items-center gap-1 " style={{ 
                                
                                  minWidth: 0,
                                  maxWidth: 200
                                }}>
                                  <Icon 
                                    icon="mdi:file" 
                                    className="text-primary flex-shrink-0" 
                                    style={{ fontSize: '0.9rem' }} 
                                  />
                                  <span 
                                    className="text-truncate small fw-medium text-dark" 
                                    style={{ maxWidth: 120, fontSize: '0.65rem', cursor: 'pointer' }}
                                    onClick={() => handleDownloadAttachment(att)}
                                    title={`Télécharger ${att.original_name || att.file_name || `Pièce ${att.id}`}`}
                                  >
                                    {att.original_name || att.file_name || `Pièce ${att.id}`}
                                  </span>
                                  {!hasLimitedEmployeePermissions && (
                                    <button
                                      type="button"
                                      className="btn btn-link p-0 text-danger flex-shrink-0"
                                      onClick={() => markAttachmentForRemoval(att.id)}
                                      style={{ 
                                        fontSize: '0.8rem',
                                        lineHeight: 1,
                                        textDecoration: 'none'
                                      }}
                                      title="Supprimer ce fichier"
                                    >
                                      <Icon icon="mdi:trash-can" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {attachmentsToRemove.length > 0 && (
                            <div className="alert alert-warning py-2 px-3 mt-2" style={{ borderRadius: '8px', fontSize: '0.8rem' }}>
                              <Icon icon="mdi:information" className="me-1" />
                              {attachmentsToRemove.length} document(s) seront supprimés à la sauvegarde.
                            </div>
                          )}
                        </div>
                      )}

                      {!hasLimitedEmployeePermissions && (
                        <div className="mb-3">
                          <label className="form-label small mb-1 fw-semibold text-secondary">Ajouter de nouveaux documents</label>
                          <input
                            type="file"
                            multiple
                            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.xlsm,.txt"
                            className="form-control border-0 shadow-sm"
                            onChange={handleEditAttachmentChange}
                            disabled={hasLimitedEmployeePermissions}
                            style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.8)', padding: '10px 12px' }}
                          />
                          {editNewAttachments.length > 0 && (
                            <div className="mt-2" style={{ maxHeight: 150, overflowY: 'auto' }}>
                              <div className="d-flex flex-wrap gap-1">
                                {editNewAttachments.map((file, idx) => {
                                  const getFileIcon = (fileName) => {
                                    const ext = fileName.split('.').pop()?.toLowerCase();
                                    switch (ext) {
                                      case 'pdf': return 'mdi:file-pdf';
                                      case 'doc':
                                      case 'docx': return 'mdi:file-word';
                                      case 'xls':
                                      case 'xlsx':
                                      case 'xlsm': return 'mdi:file-excel';
                                      case 'jpg':
                                      case 'jpeg':
                                      case 'png':
                                      case 'gif': return 'mdi:file-image';
                                      case 'txt': return 'mdi:file-document';
                                      default: return 'mdi:file';
                                    }
                                  };

                                  return (
                                    <div
                                      key={`new-attachment-${idx}`}
                                      className="d-flex align-items-center gap-1 "
                                      style={{
                                        
                                        minWidth: 0,
                                        maxWidth: 200
                                      }}
                                    >
                                      <Icon 
                                        icon={getFileIcon(file.name)} 
                                        className="text-primary flex-shrink-0" 
                                        style={{ fontSize: '0.9rem' }} 
                                      />
                                      <span 
                                        className="text-truncate small fw-medium text-dark" 
                                        style={{ maxWidth: 120, fontSize: '0.65rem' }}
                                        title={file.name}
                                      >
                                        {file.name}
                                      </span>
                                      <button
                                        type="button"
                                        className="btn btn-link p-0 text-danger flex-shrink-0"
                                        onClick={() => removeEditNewAttachmentAt(idx)}
                                        disabled={hasLimitedEmployeePermissions}
                                        style={{ 
                                          fontSize: '0.8rem',
                                          lineHeight: 1,
                                          textDecoration: 'none'
                                        }}
                                        title="Supprimer ce fichier"
                                      >
                                        <Icon icon="mdi:trash-can" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {hasLimitedEmployeePermissions && (
                        <div className="mb-3">
                          <label className="form-label small mb-1 fw-semibold text-secondary d-flex align-items-center gap-1">
                            <Icon icon="mdi:check-decagram" className="text-success" style={{ fontSize: '0.9rem' }} />
                            Preuves de réalisation (optionnel)
                          </label>
                          <input
                            type="file"
                            multiple
                            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.xlsm,.txt"
                            className="form-control border-0 shadow-sm"
                            onChange={handleCompletionProofsChange}
                            style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.8)', padding: '10px 12px' }}
                          />
                          <small className="text-muted">Formats acceptés : images, PDF, documents bureautiques (20&nbsp;Mo max par fichier).</small>
                          {editCompletionProofs.length > 0 && (
                            <div className="mt-3" style={{ maxHeight: 150, overflowY: 'auto' }}>
                              <div className="d-flex flex-wrap gap-2 no-column">
                                {editCompletionProofs.map((file, idx) => {
                                  const getFileIcon = (fileName) => {
                                    const ext = fileName.split('.').pop()?.toLowerCase();
                                    switch (ext) {
                                      case 'pdf': return 'mdi:file-pdf';
                                      case 'doc':
                                      case 'docx': return 'mdi:file-word';
                                      case 'xls':
                                      case 'xlsx':
                                      case 'xlsm': return 'mdi:file-excel';
                                      case 'jpg':
                                      case 'jpeg':
                                      case 'png':
                                      case 'gif': return 'mdi:file-image';
                                      case 'txt': return 'mdi:file-document';
                                      default: return 'mdi:file';
                                    }
                                  };

                                  return (
                                    <div
                                      key={`proof-${file.name}-${idx}`}
                                      className="d-flex align-items-center gap-2 no-column bg-light rounded-full"
                                      style={{
                                        
                                        minWidth: 0,
                                        maxWidth: 'fit-content'
                                      }}
                                    >
                                      <Icon 
                                        icon={getFileIcon(file.name)} 
                                        className="text-primary flex-shrink-0" 
                                        style={{ fontSize: '1.2rem' }} 
                                      />
                                      <span 
                                        className="text-truncate small fw-medium text-dark" 
                                        style={{ maxWidth: 160 }}
                                        title={file.name}
                                      >
                                        {file.name}
                                      </span>
                                      <button
                                        type="button"
                                        className="btn btn-link p-0 text-danger flex-shrink-0"
                                        onClick={() => removeCompletionProofAt(idx)}
                                        style={{ 
                                          fontSize: '1.1rem',
                                          lineHeight: 1,
                                          textDecoration: 'none'
                                        }}
                                        title="Supprimer ce fichier"
                                      >
                                        <Icon icon="mdi:trash-can" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="d-flex gap-2 no-column mt-3">
                        <button 
                          className="btn btn-sm d-flex align-items-center justify-content-center gap-1 flex-grow-1 fw-semibold" 
                          type="submit" 
                          disabled={editLoading}
                          style={{ 
                            borderRadius: '10px', 
                            padding: '10px 16px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            border: 'none',
                            color: '#fff',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!editLoading) {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                          }}
                        >
                          {editLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                              Sauvegarde...
                            </>
                          ) : (
                            <>
                              <Icon icon="mdi:check" style={{ fontSize: '1rem' }} /> 
                              Sauvegarder
                            </>
                          )}
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-sm d-flex align-items-center justify-content-center gap-1" 
                          onClick={cancelEdit}
                          style={{ 
                            borderRadius: '10px', 
                            padding: '10px 16px',
                            background: 'rgba(107, 114, 128, 0.1)',
                            border: 'none',
                            color: '#6b7280',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(107, 114, 128, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(107, 114, 128, 0.1)';
                          }}
                        >
                          <Icon icon="mdi:close" /> Annuler
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {/* Header with status and actions */}
                      <div className="d-flex align-items-start justify-content-between gap-2 no-column">
                        <div className="d-flex align-items-center gap-2 flex-wrap no-column">
                          {/* Modern status badge */}
                          <div 
                            className="d-inline-flex align-items-center gap-1 px-2 py-1 no-column" 
                            style={{ 
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              borderRadius: '8px',
                              background: task.status === 'Terminée' 
                                ? 'rgba(16, 185, 129, 0.1)' 
                                : task.status === 'En cours'
                                ? 'rgba(59, 130, 246, 0.1)'
                                : task.status === 'Annulé'
                                ? 'rgba(239, 68, 68, 0.1)'
                                : 'rgba(245, 158, 11, 0.1)',
                              color: task.status === 'Terminée' 
                                ? '#059669' 
                                : task.status === 'En cours'
                                ? '#2563eb'
                                : task.status === 'Annulé'
                                ? '#dc2626'
                                : '#d97706'
                            }}
                          >
                            <span style={{ fontSize: '0.85rem' }}>
                              {task.status === 'Terminée' ? '✓' : 
                               task.status === 'En cours' ? '◐' : 
                               task.status === 'Annulé' ? '✕' : '○'}
                            </span>
                            {task.status || 'Non commencée'}
                          </div>
                          
                          {/* Type badge - minimalist */}
                          <span 
                            className="d-inline-flex align-items-center gap-1 px-2 py-1 no-column" 
                            style={{ 
                              borderRadius: '8px', 
                              fontSize: '0.7rem', 
                              fontWeight: '600',
                              background: task.type === 'AC' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: task.type === 'AC' ? '#667eea' : '#10b981'
                            }}
                          >
                            {typeLabel}
                          </span>
                          
                          {/* Progress percentage badge */}
                          {task.pourcentage > 0 && (
                            <div 
                              className="d-inline-flex align-items-center px-2 py-1 no-column" 
                              style={{ 
                                borderRadius: '8px', 
                                fontSize: '0.7rem', 
                                fontWeight: '600',
                                background: 'rgba(59, 130, 246, 0.1)',
                                color: '#3b82f6'
                              }}
                            >
                              {task.pourcentage}%
                            </div>
                          )}
                        </div>
                        
                        {/* Action buttons - compact and minimalist */}
                        <div className="d-flex flex-row flex-wrap gap-1 no-column" style={{ flexShrink: 0 }}>
                        {!(hasLimitedEmployeePermissions && normalizedStatus.includes('annul')) && (
                          <>
                            {isTaskAssignedToCurrentUser(task) && (
                              <>
                                {/* Si une demande d'annulation est en cours, afficher le bouton pour l'annuler */}
                                {pendingCancellation ? (
                                  <button
                                    type="button"
                                    className="btn btn-sm d-inline-flex align-items-center justify-content-center no-column"
                                    onClick={() => handleCancelCancellationRequest(task)}
                                    aria-label="Annuler la demande d'annulation"
                                    title="Retirer la demande d'annulation"
                                    disabled={cancelLoadingTaskId === task.id}
                                    style={{ 
                                      width: 32, 
                                      height: 32, 
                                      minWidth: 32,
                                      maxWidth: 32,
                                      flex: '0 0 auto',
                                      padding: 0,
                                      borderRadius: '10px',
                                      border: 'none',
                                      background: 'rgba(245, 158, 11, 0.1)',
                                      color: '#d97706',
                                      transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)';
                                      e.currentTarget.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                                      e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                  >
                                    {cancelLoadingTaskId === task.id ? (
                                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    ) : (
                                      <Icon icon="mdi:close-circle" style={{ fontSize: '1.1rem' }} />
                                    )}
                                  </button>
                                ) : (
                                  /* Sinon, afficher le bouton pour demander l'annulation */
                                  <button
                                    type="button"
                                    className="btn btn-sm d-inline-flex align-items-center justify-content-center no-column"
                                    onClick={() => handleCancellationRequest(task)}
                                    aria-label="Demander l'annulation"
                                    title={cancellationButtonTitle}
                                    disabled={!canRequestCancellation || cancelLoadingTaskId === task.id}
                                    style={{ 
                                      width: 32, 
                                      height: 32, 
                                      minWidth: 32,
                                      maxWidth: 32,
                                      flex: '0 0 auto',
                                      padding: 0,
                                      borderRadius: '10px',
                                      border: 'none',
                                      background: 'rgba(245, 158, 11, 0.1)',
                                      color: '#d97706',
                                      transition: 'all 0.2s ease',
                                      opacity: !canRequestCancellation ? 0.5 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                      if (canRequestCancellation) {
                                        e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)';
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                                      e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                  >
                                    {cancelLoadingTaskId === task.id ? (
                                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    ) : (
                                      <Icon icon="mdi:cancel" style={{ fontSize: '1rem' }} />
                                    )}
                                  </button>
                                )}
                              </>
                            )}
                            
                            {/* Boutons d'approbation/rejet pour RH/gest_rh si demande d'annulation en cours */}
                            {userHasAdvancedAccess && pendingCancellation && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm d-inline-flex align-items-center justify-content-center no-column"
                                  onClick={() => handleApproveCancellationRequest(task)}
                                  aria-label="Accepter la demande d'annulation"
                                  title="Accepter la demande d'annulation"
                                  disabled={cancelLoadingTaskId === task.id}
                                  style={{ 
                                    width: 32, 
                                    height: 32, 
                                    minWidth: 32,
                                    maxWidth: 32,
                                    flex: '0 0 auto',
                                    padding: 0,
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    color: '#059669',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }}
                                >
                                  {cancelLoadingTaskId === task.id ? (
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                  ) : (
                                    <Icon icon="mdi:check-circle" style={{ fontSize: '1.1rem' }} />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm d-inline-flex align-items-center justify-content-center no-column"
                                  onClick={() => handleRejectCancellationRequest(task)}
                                  aria-label="Refuser la demande d'annulation"
                                  title="Refuser la demande d'annulation"
                                  disabled={cancelLoadingTaskId === task.id}
                                  style={{ 
                                    width: 32, 
                                    height: 32, 
                                    minWidth: 32,
                                    maxWidth: 32,
                                    flex: '0 0 auto',
                                    padding: 0,
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: '#dc2626',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }}
                                >
                                  {cancelLoadingTaskId === task.id ? (
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                  ) : (
                                    <Icon icon="mdi:close-circle" style={{ fontSize: '1.1rem' }} />
                                  )}
                                </button>
                              </>
                            )}
                            
                            {task.pourcentage == 100 && task.status !== 'Terminée' && (
                              <button
                                type="button"
                                className="btn btn-sm d-inline-flex align-items-center justify-content-center no-column"
                                onClick={() => handleCloseTask(task.id)}
                                aria-label="Clôturer"
                                title="Clôturer la tâche"
                                style={{ 
                                  width: 32, 
                                  height: 32, 
                                  minWidth: 32,
                                  maxWidth: 32,
                                  flex: '0 0 auto',
                                  padding: 0,
                                  borderRadius: '10px',
                                  border: 'none',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  color: '#059669',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                              >
                                <Icon icon="mdi:check-circle" style={{ fontSize: '1.1rem' }} />
                              </button>
                            )}

                            {/* Selection checkbox for bulk reminders - RH and gest_projet only */}
                            {/* Show only for tasks: (En cours with <100%) OR (Non commencée) - Hide for Terminée/Annulé */}
                            {userHasAdvancedAccess && 
                              !normalizedStatus.includes('termin') && 
                              !normalizedStatus.includes('annul') &&
                              (
                                normalizedStatus.includes('non') || 
                                (normalizedStatus.includes('cours') && task.pourcentage < 100)
                              ) && (
                              <button
                                type="button"
                                className="btn btn-sm d-inline-flex align-items-center justify-content-center no-column"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTaskSelection(task.id);
                                }}
                                aria-label={isSelected ? "Désélectionner pour rappel WhatsApp" : "Sélectionner pour rappel WhatsApp"}
                                title={isSelected ? "Désélectionner pour rappel WhatsApp" : "Sélectionner pour rappel WhatsApp"}
                                style={{ 
                                  width: 32, 
                                  height: 32, 
                                  minWidth: 32,
                                  maxWidth: 32,
                                  flex: '0 0 auto',
                                  padding: 0,
                                  borderRadius: '10px',
                                  border: `2px solid ${isSelected ? '#25D366' : 'rgba(37, 211, 102, 0.3)'}`,
                                  background: isSelected 
                                    ? 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)'
                                    : 'rgba(37, 211, 102, 0.05)',
                                  color: isSelected ? '#fff' : '#25D366',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (isSelected) {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #1fb855 0%, #0e7a6e 100%)';
                                  } else {
                                    e.currentTarget.style.background = 'rgba(37, 211, 102, 0.15)';
                                  }
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  if (isSelected) {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)';
                                  } else {
                                    e.currentTarget.style.background = 'rgba(37, 211, 102, 0.05)';
                                  }
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                              >
                                <Icon 
                                  icon={isSelected ? "mdi:whatsapp" : "mdi:whatsapp"} 
                                  style={{ fontSize: '1.1rem' }} 
                                />
                              </button>
                            )}

                            {!hasLimitedEmployeePermissions && (
                              <button
                                type="button"
                                className="btn btn-sm d-inline-flex align-items-center justify-content-center no-column"
                                onClick={() => handleDuplicateTask(task)}
                                aria-label="Dupliquer"
                                title="Dupliquer la tâche"
                                style={{ 
                                  width: 32, 
                                  height: 32, 
                                  minWidth: 32,
                                  maxWidth: 32,
                                  flex: '0 0 auto',
                                  padding: 0,
                                  borderRadius: '10px',
                                  border: 'none',
                                  background: 'rgba(107, 114, 128, 0.1)',
                                  color: '#6b7280',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(107, 114, 128, 0.2)';
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(107, 114, 128, 0.1)';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                              >
                                <Icon icon="mdi:content-copy" style={{ fontSize: '1rem' }} />
                              </button>
                            )}

                            <button
                              type="button"
                              className="btn btn-sm d-inline-flex align-items-center justify-content-center no-column"
                              onClick={() => toggleCommentsSection(task.id)}
                              aria-label="Afficher les commentaires"
                              title={commentsOpen ? 'Masquer les commentaires' : 'Afficher les commentaires'}
                              style={{ 
                                width: 32, 
                                height: 32, 
                                minWidth: 32,
                                maxWidth: 32,
                                flex: '0 0 auto',
                                padding: 0,
                                borderRadius: '10px',
                                border: 'none',
                                background: commentsOpen ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(102, 126, 234, 0.1)',
                                color: commentsOpen ? '#fff' : '#667eea',
                                position: 'relative',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (!commentsOpen) {
                                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!commentsOpen) {
                                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }
                              }}
                            >
                              <Icon icon={commentsOpen ? 'mdi:comment-text' : 'mdi:comment-text-outline'} style={{ fontSize: '1rem' }} />
                              {commentCount > 0 && (
                                <span
                                  className="position-absolute badge rounded-pill"
                                  style={{ 
                                    fontSize: '0.55rem',
                                    minWidth: 16,
                                    height: 16,
                                    top: -4,
                                    right: -4,
                                    background: commentsOpen ? '#fff' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: commentsOpen ? '#667eea' : '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 4px'
                                  }}
                                >
                                  {commentCount > 99 ? '99+' : commentCount}
                                </span>
                              )}
                            </button>

                            {/* Boutons Temps: Début / Pause / Terminer (sans compteur live), avec styles distincts pause vs terminé */}
                            {(() => {
                              const entry = activeByTask?.[task.id];
                              const isAutoPaused = autoPausedTasksRef.current.has(task.id);
                              const percentValue = Number(task.pourcentage ?? task.progression ?? 0);
                              const showPlay = !entry || isAutoPaused;
                              const isFinished = String(task.status || '').toLowerCase().includes('termin');
                              const isCancelled = String(task.status || '').toLowerCase().includes('annul');
                              const isDone = isFinished || percentValue >= 100;
                              const allowed = canWorkOnTask(task);
                              const summary = dailyByTask?.[task.id];
                              const canShowDaily = summary && summary.date === todayDate;
                              const shouldRenderDailyBadge = false && canShowDaily;
                              const myMinutesToday = summary?.my_minutes ?? 0;
                              const mySegmentsToday = summary?.my_segments ?? 0;
                              const sessionLabel = mySegmentsToday === 1 ? 'session' : 'sessions';
                              const markManualControl = () => {
                                manualTimerControlRef.current.add(task.id);
                                autoPausedTasksRef.current.delete(task.id);
                              };
                              const deny = (actionLabel) => {
                                showSwal({ icon: 'error', title: 'Accès refusé', text: `Vous n'avez pas la permission de ${actionLabel} cette tâche`, toast: true, timer: 2200, position: 'top-end', showConfirmButton: false });
                              };
                              const handleStart = async () => {
                                if (!allowed) {
                                  deny('démarrer');
                                  return;
                                }
                                try {
                                  markManualControl();
                                  await dispatch(startTaskTimer(task.id)).unwrap();
                                } catch (err) {
                                  showSwal({ icon: 'error', title: 'Impossible de démarrer', text: String(err || 'Erreur inconnue'), toast: true, timer: 2200, position: 'top-end', showConfirmButton: false });
                                }
                              };
                              const handlePause = async () => {
                                if (!allowed) {
                                  deny('mettre en pause');
                                  return;
                                }
                                try {
                                  markManualControl();
                                  await dispatch(pauseTaskTimer(task.id)).unwrap();
                                } catch (err) {
                                  showSwal({ icon: 'error', title: 'Impossible de mettre en pause', text: String(err || 'Aucune progression en cours'), toast: true, timer: 2200, position: 'top-end', showConfirmButton: false });
                                }
                              };
                              const handleFinish = async () => {
                                if (!allowed) {
                                  deny('terminer');
                                  return;
                                }
                                try {
                                  markManualControl();
                                  const choice = await showSwal({
                                    icon: 'question',
                                    title: 'Terminer la tâche ?',
                                    text: 'Souhaitez-vous également mettre la progression à 100% ?',
                                    showCancelButton: true,
                                    showDenyButton: true,
                                    cancelButtonText: 'Annuler',
                                    confirmButtonText: 'Terminer',
                                    denyButtonText: 'Terminer et mettre 100%'
                                  });

                                  if (!choice.isConfirmed && !choice.isDenied) {
                                    return;
                                  }

                                  const markHundred = choice.isDenied;

                                  await dispatch(finishTask(task.id)).unwrap();

                                  if (markHundred) {
                                    await dispatch(updateTask({ id: task.id, data: { pourcentage: 100 } })).unwrap();
                                  }

                                  await dispatch(fetchActiveEntry(task.id));

                                  showSwal({
                                    icon: 'success',
                                    title: 'Tâche terminée',
                                    text: markHundred ? 'Progression fixée à 100%.' : 'Progression conservée.',
                                    toast: true,
                                    timer: 2200,
                                    position: 'top-end',
                                    showConfirmButton: false
                                  });
                                } catch (err) {
                                  showSwal({ icon: 'error', title: 'Impossible de terminer', text: String(err || 'Erreur inconnue'), toast: true, timer: 2200, position: 'top-end', showConfirmButton: false });
                                }
                              };
                              if (isCancelled) {
                                return (
                                  <span
                                    className="badge d-inline-flex align-items-center justify-content-center"
                                    title="Tâche annulée"
                                    style={{ fontSize: '0.65rem', height: 24, borderRadius: 12, background: 'rgba(239,68,68,0.15)', color: '#dc2626' }}
                                  >
                                    <Icon icon="mdi:close-circle" className="me-1" /> Annulé
                                  </span>
                                );
                              }
                              if (isDone) {
                                return (
                                  <span
                                    className="badge d-inline-flex align-items-center justify-content-center"
                                    title="Tâche terminée"
                                    style={{ fontSize: '0.65rem', height: 24, borderRadius: 12, background: 'rgba(16,185,129,0.15)', color: '#059669' }}
                                  >
                                    <Icon icon="mdi:check-circle" className="me-1" /> Terminé
                                  </span>
                                );
                              }
                              return showPlay ? (
                                <>
                                  {shouldRenderDailyBadge && (
                                    <div className="d-inline-flex align-items-center gap-1 mb-1 px-2 py-1 no-column"
                                      style={{ borderRadius: 999, background: 'rgba(59,130,246,0.12)', color: '#1d4ed8', fontSize: '0.65rem', fontWeight: 600 }}>
                                      <Icon icon="mdi:clock-time-three" style={{ fontSize: '0.9rem' }} />
                                      Aujourd'hui : {formatMinutesLabel(myMinutesToday)}
                                      <span style={{ opacity: 0.7 }}>· {mySegmentsToday} {sessionLabel}</span>
                                    </div>
                                  )}
                                  {/* En pause par défaut si aucune entrée active et non terminé/annulé */}
                                  {true && (
                                    <span
                                      className="badge d-inline-flex align-items-center justify-content-center"
                                      title="En pause"
                                      style={{ fontSize: '0.65rem', height: 24, borderRadius: 12, background: 'rgba(245,158,11,0.15)', color: '#d97706' }}
                                    >
                                      <Icon icon="mdi:pause-circle" className="me-1" /> En pause
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    className="btn btn-sm d-inline-flex align-items-center justify-content-center no-column"
                                    onClick={handleStart}
                                    aria-label="Débuter la progression"
                                    title="Débuter la progression"
                                    style={{ 
                                      width: 32, height: 32, minWidth: 32, maxWidth: 32, flex: '0 0 auto', padding: 0,
                                      borderRadius: '10px', border: 'none',
                                      background: allowed ? 'rgba(16,185,129,0.15)' : 'rgba(209,213,219,0.4)',
                                      color: allowed ? '#10b981' : '#9ca3af',
                                      transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => { if (!allowed) return; e.currentTarget.style.background = 'rgba(16,185,129,0.25)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                    onMouseLeave={(e) => { if (!allowed) return; e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                    disabled={!allowed}
                                  >
                                    <Icon icon="mdi:play" style={{ fontSize: '1rem' }} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  {shouldRenderDailyBadge && (
                                    <div className="d-inline-flex align-items-center gap-1 mb-1 px-2 py-1 no-column"
                                      style={{ borderRadius: 999, background: 'rgba(59,130,246,0.12)', color: '#1d4ed8', fontSize: '0.65rem', fontWeight: 600 }}>
                                      <Icon icon="mdi:clock-time-three" style={{ fontSize: '0.9rem' }} />
                                      Aujourd'hui : {formatMinutesLabel(myMinutesToday)}
                                      <span style={{ opacity: 0.7 }}>· {mySegmentsToday} {sessionLabel}</span>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    className="btn btn-sm d-inline-flex align-items-center justify-content-center no-column"
                                    onClick={handlePause}
                                    aria-label="Pause"
                                    title="Mettre en pause"
                                    style={{ 
                                      width: 32, height: 32, minWidth: 32, maxWidth: 32, flex: '0 0 auto', padding: 0,
                                      borderRadius: '10px', border: 'none',
                                      background: allowed ? 'rgba(245,158,11,0.15)' : 'rgba(209,213,219,0.4)',
                                      color: allowed ? '#d97706' : '#9ca3af',
                                      transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => { if (!allowed) return; e.currentTarget.style.background = 'rgba(245,158,11,0.25)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                    onMouseLeave={(e) => { if (!allowed) return; e.currentTarget.style.background = 'rgba(245,158,11,0.15)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                    disabled={!allowed}
                                  >
                                    <Icon icon="mdi:pause" style={{ fontSize: '1rem' }} />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm d-inline-flex align-items-center justify-content-center no-column"
                                    onClick={handleFinish}
                                    aria-label="Terminer"
                                    title="Terminer la tâche"
                                    style={{ 
                                      width: 32, height: 32, minWidth: 32, maxWidth: 32, flex: '0 0 auto', padding: 0,
                                      borderRadius: '10px', border: 'none',
                                      background: allowed ? 'rgba(239,68,68,0.15)' : 'rgba(209,213,219,0.4)',
                                      color: allowed ? '#dc2626' : '#9ca3af',
                                      transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => { if (!allowed) return; e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                    onMouseLeave={(e) => { if (!allowed) return; e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                    disabled={!allowed}
                                  >
                                    <Icon icon="mdi:stop" style={{ fontSize: '1rem' }} />
                                  </button>
                                </>
                              );
                            })()}
                            
                            {!normalizedStatus.includes('annul') && (
                              <button
                                type="button"
                                className="btn btn-sm d-inline-flex align-items-center justify-content-center no-column"
                                onClick={() => startEdit(task)}
                                aria-label="Modifier"
                                title="Modifier"
                                style={{ 
                                  width: 32, 
                                  height: 32, 
                                  minWidth: 32,
                                  maxWidth: 32,
                                  flex: '0 0 auto',
                                  padding: 0,
                                  borderRadius: '10px',
                                  border: 'none',
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  color: '#3b82f6',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                              >
                                <Icon icon="mdi:pencil" style={{ fontSize: '1.1rem' }} />
                              </button>
                            )}
                            {!hasLimitedEmployeePermissions && (
                              <button
                                type="button"
                                className="btn btn-sm d-inline-flex align-items-center justify-content-center no-column"
                                onClick={() => handleDelete(task.id)}
                                aria-label="Supprimer"
                                title="Supprimer"
                                style={{ 
                                  width: 32, 
                                  height: 32, 
                                  minWidth: 32,
                                  maxWidth: 32,
                                  flex: '0 0 auto',
                                  padding: 0,
                                  borderRadius: '10px',
                                  border: 'none',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: '#dc2626',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                              >
                                <Icon icon="mdi:delete" style={{ fontSize: '1rem' }} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      </div>
                      
                      {/* Task title - clean typography */}
                      <div className="mt-2">
                        <h6 className="mb-0 fw-semibold" style={{ 
                          fontSize: '1.05rem', 
                          lineHeight: '1.4',
                          color: '#1f2937',
                          letterSpacing: '-0.01em'
                        }}>
                          {task.description}
                        </h6>
                      </div>
                      
                      {/* Progress bar - minimalist */}
                      {task.pourcentage > 0 && (
                        <div className="mt-2">
                          <div 
                            className="d-flex align-items-center justify-content-between mb-1" 
                            style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: '500' }}
                          >
                            <span>Progression</span>
                            <span>{task.pourcentage}%</span>
                          </div>
                          <div style={{ 
                            height: 4, 
                            background: 'rgba(102, 126, 234, 0.08)', 
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div
                              role="progressbar"
                              aria-valuenow={Number(task.pourcentage || 0)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              style={{ 
                                width: `${Math.max(0, Math.min(100, Number(task.pourcentage || 0)))}%`, 
                                height: '100%',
                                background: 'linear-gradient(90deg, #667eea, #764ba2)',
                                transition: 'width 0.3s ease'
                              }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Task metadata - clean icons and text */}
                      <div className="mt-2">
                        <div className="d-flex align-items-center gap-3 flex-wrap no-column" style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                            {task.start_date && (
                              <span className="d-inline-flex align-items-center gap-1 no-column">
                                <Icon icon="mdi:calendar-start" style={{ fontSize: '0.85rem', opacity: 0.6 }} />
                                <span style={{ fontWeight: '500' }}>{new Date(task.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                              </span>
                            )}
                            {(task.start_date && task.end_date) && (
                              <span style={{ opacity: 0.4 }}>→</span>
                            )}
                            {task.end_date && (
                              <span className="d-inline-flex align-items-center gap-1 no-column">
                                <Icon icon="mdi:calendar-end" style={{ fontSize: '0.85rem', opacity: 0.6 }} />
                                <span style={{ fontWeight: '500' }}>{new Date(task.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                              </span>
                            )}
                            {task.source && (
                              <span className="d-inline-flex align-items-center gap-1 no-column">
                                <Icon icon="mdi:link-variant" style={{ fontSize: '0.85rem', opacity: 0.6 }} />
                                {/^https?:\/\//i.test(task.source) ? (
                                  <a 
                                    href={task.source} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-decoration-none" 
                                    style={{ 
                                      color: '#667eea', 
                                      fontWeight: '500',
                                      wordBreak: 'break-word'
                                    }}
                                  >
                                    Lien
                                  </a>
                                ) : (
                                  <span style={{ fontWeight: '500', wordBreak: 'break-word' }}>{task.source}</span>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="d-flex align-items-center gap-3 flex-wrap mt-1 no-column" style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                            <span className="d-inline-flex align-items-center gap-1 no-column">
                              <Icon icon="mdi:folder-outline" style={{ fontSize: '0.85rem', opacity: 0.6 }} />
                              <span style={{ fontWeight: '500' }}>{task.projectTitle && String(task.projectTitle).trim() ? task.projectTitle : 'Sans projet'}</span>
                            </span>
                            <span className="d-inline-flex align-items-center gap-1 no-column">
                              <Icon icon="mdi:format-list-bulleted" style={{ fontSize: '0.85rem', opacity: 0.6 }} />
                              <span style={{ fontWeight: '500' }}>{task.listTitle || 'Sans liste'}</span>
                            </span>
                          </div>
                        </div>
                        
                        {/* Assignees - clean badges */}
                        {(() => {
                          const rawAssignees = Array.isArray(task.assignees) && task.assignees.length > 0
                            ? task.assignees
                            : (task.assigned_to ? [{ id: task.assigned_to }] : []);

                          if (!rawAssignees.length) {
                            return null;
                          }

                          return (
                            <div className="mt-2">
                              <div className="d-flex flex-wrap gap-1 no-column">
                                {rawAssignees.map((assignee) => {
                                  const normalized = typeof assignee === 'object' && assignee !== null ? assignee : { id: assignee };
                                  const user = (normalized && normalized.prenom !== undefined) ? normalized : getUserById(normalized.id);
                                  const label = buildUserLabel(user || normalized) || `Utilisateur ${normalized.id}`;
                                  const initials = label.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                  
                                  return (
                                    <div
                                      key={`task-${task.id}-assignee-${normalized.id}`}
                                      className="d-inline-flex align-items-center gap-1 px-2 py-1 no-column"
                                      style={{ 
                                        borderRadius: '10px',
                                        background: 'rgba(102, 126, 234, 0.08)',
                                        fontSize: '0.7rem',
                                        fontWeight: '500',
                                        color: '#667eea'
                                      }}
                                      title={label}
                                    >
                                      <div 
                                        className="rounded-circle d-flex align-items-center justify-content-center"
                                        style={{
                                          width: 20,
                                          height: 20,
                                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                          color: '#fff',
                                          fontSize: '0.6rem',
                                          fontWeight: '600'
                                        }}
                                      >
                                        {initials}
                                      </div>
                                      <span className="text-truncate" style={{ maxWidth: '120px' }}>
                                        {label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {pendingCancellations.length > 0 && (
                          <div className="mt-2" style={{ fontSize: '0.75rem' }}>
                            <hr className='mt-0'/>
                            <div className="d-flex flex-column gap-2">
                              {pendingCancellations.map((req) => (
                                <div key={`pending-${req.id || Math.random()}`} className="card p-2 border-0" style={{ background: 'rgba(255,243,205,0.6)', borderRadius: 10 }}>
                                  <div className="d-flex align-items-start justify-content-between no-column">
                                    <div>
                                      <div className="d-flex align-items-center gap-2 mb-1 no-column">
                                        <span className="badge bg-warning text-dark d-inline-flex align-items-center gap-1 no-column" style={{ borderRadius: '12px', padding: '4px 8px' }}>
                                          <Icon icon="mdi:clock-alert" style={{ fontSize: '0.85rem' }} />
                                          Demande d'annulation en attente
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '0.85rem' }}>
                                        {req.requester && (
                                          <div className="mb-1"><span className='text-warning fw-bold'>Demandée par</span> {buildUserLabel(req.requester)}</div>
                                        )}
                                        {req.reason && (
                                          <div className="text-muted small"><span className='text-warning fw-bold'>Motif : </span>{req.reason}</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {processedCancellations.length > 0 && canSeeCancellationDetails && (
                          <div className="mt-2" style={{ fontSize: '0.75rem' }}>
                            <hr className='mt-0' />
                            <div className="d-flex flex-column gap-2">
                              {processedCancellations.map((proc) => (
                                <div key={`proc-${proc.id || Math.random()}`} className="card p-2 border-0" style={{ background: 'rgba(232,245,233,0.6)', borderRadius: 10 }}>
                                  <div className="d-flex align-items-center gap-2 mb-1 no-column">
                                    <span className={`badge d-inline-flex align-items-center gap-1 no-column ${proc.status === 'approved' ? 'bg-success' : 'bg-danger'}`} style={{ borderRadius: '12px', padding: '4px 8px' }}>
                                      <Icon icon={proc.status === 'approved' ? 'mdi:check-circle' : 'mdi:close-circle'} style={{ fontSize: '0.85rem' }} />
                                      {proc.status === 'approved' ? 'Annulation acceptée' : 'Annulation refusée'}
                                    </span>
                                  </div>
                                  {proc.requester && (
                                    <div className="text-muted small mt-1">Demandée par {buildUserLabel(proc.requester)}</div>
                                  )}
                                  {proc.reason && (
                                    <div className="text-muted small" style={{ lineHeight: 1.3 }}>Motif initial : {proc.reason}</div>
                                  )}
                                  {proc.resolution_note && (
                                    <div className="text-muted small mt-1" style={{ lineHeight: 1.3 }}>Réponse : {proc.resolution_note}</div>
                                  )}
                                  {proc.reviewed_by && proc.reviewer && (
                                    <div className="text-muted small" style={{ lineHeight: 1.3 }}>
                                      Décision par {buildUserLabel(proc.reviewer)}
                                      {proc.reviewed_at && (
                                        <>
                                          {' '}•{' '}
                                          {new Date(proc.reviewed_at).toLocaleDateString('fr-FR')}
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {commentsOpen && (
                          <div className="mt-3 col-12" style={{ fontSize: '0.75rem' }}>
                            

                            <div className="mb-3">
                              <div  className="">
                                <div style={{justifyContent:"space-between", width: '100%'}}  className="row ">
                                <div  className="col-6"><div
                                  className="rounded-circle d-flex align-items-center justify-content-center"
                                  style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', fontWeight: 600 }}
                                >
                                  {(authUser?.prenom?.[0] || authUser?.name?.[0] || '?').toUpperCase()}
                                </div></div>
                                <div className="col-6"><div className="d-flex align-items-center gap-2 mb-2 no-column" style={{ justifyContent: 'flex-end' }}>
                              <Icon icon="mdi:comment-text-outline" className="text-info" style={{ fontSize: '1rem' }} />
                              <span className="fw-semibold text-muted">Commentaires</span>
                              {commentCount > 0 && (
                                <span className="badge bg-info text-white" style={{ borderRadius: '10px' }}>
                                  {commentCount}
                                </span>
                              )}
                            </div></div>
                                </div>
                                
                                <div className="flex-grow-1 w-100 row align-items-stretch gap-2" >
                                  <textarea
                                    className="form-control form-control-sm flex-grow-1 col-10"
                                    rows={1}
                                    ref={(el) => {
                                      commentInputRefs.current[task.id] = el;
                                      if (el) {
                                        el.style.height = 'auto';
                                        el.style.height = Math.min(el.scrollHeight, 300) + 'px';
                                      }
                                    }}
                                    value={editingCommentIds[task.id] ? (editCommentInputs[task.id] || '') : (commentInputs[task.id] || '')}
                                    onChange={(e) => {
                                      if (editingCommentIds[task.id]) {
                                        handleEditCommentInputChange(task.id, e.target.value);
                                      } else {
                                        handleCommentInputChange(task.id, e.target.value);
                                      }
                                      const el = e.target;
                                      el.style.height = 'auto';
                                      el.style.height = Math.min(el.scrollHeight, 300) + 'px';
                                    }}
                                    style={{ 
                                      borderRadius: '12px', 
                                      backgroundColor: '#f8f9fa', 
                                      resize: 'none', 
                                      overflow: 'hidden', 
                                      lineHeight: '1.3'
                                    }}
                                    placeholder={editingCommentIds[task.id] ? 'Modifier votre commentaire...' : 'Ajoutez un commentaire...'}
                                  />
                                  {editingCommentIds[task.id] ? (
                                    <div className="d-flex flex-column gap-2 no-column" style={{ minWidth: '110px' }}>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1 text-center w-100"
                                        onClick={() => handleUpdateComment(task.id)}
                                        disabled={!editCommentInputs[task.id]?.trim()}
                                        style={{ borderRadius: '10px',justifyContent: 'center', fontWeight: '600' }}
                                      >
                                        <Icon icon="mdi:check" />
                                        Sauver
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary w-100"
                                        onClick={() => cancelEditingComment(task.id)}
                                        style={{ borderRadius: '10px' }}
                                      >
                                        Annuler
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn col-2 btn-sm btn-primary d-inline-flex align-items-center gap-1 align-self-start"
                                      onClick={() => handleAddComment(task.id)}
                                      disabled={!commentInputs[task.id]?.trim()}
                                      style={{ borderRadius: '10px', whiteSpace: 'nowrap', fontWeight: '600' }}
                                    >
                                      Publier<Icon icon="mdi:send" />
                                      
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="d-flex flex-column gap-2" style={{ maxHeight: 220, overflowY: 'auto' }}>
                              {taskCommentsState.isLoading && taskComments.length === 0 ? (
                                <div className="text-center py-2">
                                  <div className="spinner-border spinner-border-sm text-info" role="status">
                                    <span className="visually-hidden">Chargement...</span>
                                  </div>
                                </div>
                              ) : taskComments.length === 0 ? (
                                <p className="text-muted mb-0">Aucun commentaire pour le moment.</p>
                              ) : (
                                taskComments.map((comment) => {
                                  const authorLabel = comment.user
                                    ? buildUserLabel(comment.user)
                                    : (comment.user_name || comment.author_name || `Utilisateur ${comment.user_id || ''}`);
                                  const commentBody = getCommentBody(comment);

                                  return (
                                    <div
                                      key={comment.id || `comment-${comment.created_at}`}
                                      className="p-2 rounded-3 border bg-light-subtle"
                                    >
                                      <div className="row g-0 align-items-start">
                                        <div className={`${canEditComment(comment) ? 'col-10' : 'col-12'}`}>
                                          <div className="fw-semibold" style={{ fontSize: '0.78rem' }}>
                                            {authorLabel}
                                            {String(comment.user_id) === String(authUser?.id) && (
                                              <span className="badge bg-primary ms-2" style={{ fontSize: '0.6rem' }}>Vous</span>
                                            )}
                                          </div>
                                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>{formatCommentDate(comment.created_at)}</div>
                                        </div>
                                        {canEditComment(comment) && (
                                          <div className="col-2 d-flex justify-content-end gap-1">
                                            <button
                                              type="button"
                                              className="btn btn-sm p-1 d-inline-flex align-items-center justify-content-center btn-outline-primary border-0"
                                              onClick={() => startEditingComment(task.id, comment)}
                                              aria-label="Modifier le commentaire"
                                              title="Modifier"
                                              style={{ width: 28, height: 28, borderRadius: '6px' }}
                                            >
                                              <Icon icon="mdi:pencil" style={{ fontSize: '0.9rem' }} />
                                            </button>
                                            <button
                                              type="button"
                                              className="btn btn-sm p-1 d-inline-flex align-items-center justify-content-center btn-outline-danger border-0"
                                              onClick={() => handleDeleteComment(task.id, comment.id)}
                                              aria-label="Supprimer le commentaire"
                                              title="Supprimer"
                                              style={{ width: 28, height: 28, borderRadius: '6px' }}
                                            >
                                              <Icon icon="mdi:trash-can" style={{ fontSize: '0.9rem' }} />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      <div className="mt-1 text-dark" style={{ fontSize: '0.78rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {commentBody || <span className="text-muted">(Commentaire vide)</span>}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                        {Array.isArray(task.attachments) && task.attachments.length > 0 && (
                          <div className="mt-2" style={{ fontSize: '0.75rem' }}>
                            <div className="text-muted d-flex align-items-center gap-1 mb-1">
                              <Icon icon="mdi:paperclip" className="text-primary" style={{ fontSize: '0.8rem' }} />
                              <span>Documents</span>
                            </div>
                            <ul className="list-unstyled mb-0 d-flex flex-wrap gap-1" style={{ maxHeight: 140, overflowY: 'auto' }}>
                              {task.attachments.map((att) => (
                                <li key={att.id} className="d-flex align-items-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                                    onClick={() => handleDownloadAttachment(att)}
                                    style={{ 
                                      borderRadius: '8px',
                                      fontSize: '0.7rem',
                                      padding: '3px 6px',
                                      border: '1px solid #e3f2fd',
                                      background: 'rgba(25, 118, 210, 0.05)'
                                    }}
                                  >
                                    <Icon icon="mdi:eye" style={{ fontSize: '0.8rem' }} />
                                    <span className="text-truncate" style={{ maxWidth: 80 }}>
                                      {att.original_name || att.file_name || `Doc ${att.id}`}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {Array.isArray(task.proofs) && task.proofs.length > 0 && (
                          <div className="mt-2" style={{ fontSize: '0.75rem' }}>
                            <div className="text-muted d-flex align-items-center gap-1 mb-1">
                              <Icon icon="mdi:check-decagram" className="text-success" style={{ fontSize: '0.8rem' }} />
                              <span>Preuves de réalisation</span>
                            </div>
                            <div className="d-flex flex-wrap gap-1" style={{ maxHeight: 140, overflowY: 'auto' }}>
                              {task.proofs.map((proof) => {
                                const getFileIcon = (fileName) => {
                                  if (!fileName) return 'mdi:file';
                                  const ext = fileName.split('.').pop()?.toLowerCase();
                                  switch (ext) {
                                    case 'pdf': return 'mdi:file-pdf';
                                    case 'doc':
                                    case 'docx': return 'mdi:file-word';
                                    case 'xls':
                                    case 'xlsx':
                                    case 'xlsm': return 'mdi:file-excel';
                                    case 'jpg':
                                    case 'jpeg':
                                    case 'png':
                                    case 'gif': return 'mdi:file-image';
                                    case 'txt': return 'mdi:file-document';
                                    default: return 'mdi:file';
                                  }
                                };

                                return (
                                  <div
                                    key={`task-${task.id}-proof-${proof.id}`}
                                    className="d-flex align-items-center gap-1 px-2 py-1 rounded-pill shadow-sm border"
                                    style={{
                                      background: 'linear-gradient(45deg, rgba(25,135,84,0.08), rgba(40,167,69,0.08))',
                                      borderColor: 'rgba(25,135,84,0.2)',
                                      minWidth: 0,
                                      maxWidth: 180,
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => handleDownloadAttachment(proof)}
                                    title={`Télécharger ${proof.original_name || `Preuve ${proof.id}`}`}
                                  >
                                    <Icon 
                                      icon={getFileIcon(proof.original_name)} 
                                      className="text-success flex-shrink-0" 
                                      style={{ fontSize: '0.9rem' }} 
                                    />
                                    <span 
                                      className="text-truncate small fw-medium text-success" 
                                      style={{ maxWidth: 120, fontSize: '0.65rem' }}
                                    >
                                      {proof.original_name || `Preuve ${proof.id}`}
                                    </span>
                                    <Icon 
                                      icon="mdi:eye" 
                                      className="text-success flex-shrink-0" 
                                      style={{ fontSize: '0.8rem' }} 
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
  <div className="d-flex justify-content-between align-items-center mt-3 text-muted" style={{ fontSize: '0.85rem' }}>
          <button
            type="button"
            className="btn btn-sm btn-outline-light"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
          >
            Précédent
          </button>
          <div>
            Page {Math.min(currentPage, totalPages)} sur {totalPages}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-light"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
          >
            Suivant
          </button>
        </div>
      )}

      {/* Floating circular Add button (fixed bottom-right) */}
      {!hasLimitedEmployeePermissions && (
        <div style={{ position: 'fixed', right: 20, bottom: 70, zIndex: 1200 }}>
          <button
            className="btn-lg rounded-circle shadow-lg"
            onClick={handleAddToggle}
            aria-expanded={showAdd}
            aria-label={showAdd ? 'Fermer le formulaire d ajout' : 'Ajouter une tâche'}
            title={showAdd ? 'Fermer' : 'Ajouter une tâche'}
            style={{ 
              width: 60, 
              height: 60, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: showAdd 
                ? 'rgba(255,255,255,0.95)' 
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: showAdd ? '2px solid rgba(102, 126, 234, 0.3)' : 'none',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: showAdd ? 'rotate(45deg)' : 'rotate(0deg)',
              boxShadow: showAdd 
                ? '0 4px 20px rgba(102, 126, 234, 0.2)' 
                : '0 6px 24px rgba(102, 126, 234, 0.4)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!showAdd) {
                e.currentTarget.style.transform = 'rotate(0deg) scale(1.1)';
                e.currentTarget.style.boxShadow = '0 8px 28px rgba(102, 126, 234, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = showAdd ? 'rotate(45deg) scale(1)' : 'rotate(0deg) scale(1)';
              e.currentTarget.style.boxShadow = showAdd 
                ? '0 4px 20px rgba(102, 126, 234, 0.2)' 
                : '0 6px 24px rgba(102, 126, 234, 0.4)';
            }}
          >
            <Icon 
              icon={showAdd ? 'mdi:close' : 'mdi:plus'} 
              style={{ 
                fontSize: '1.6rem', 
                color: showAdd ? '#667eea' : '#fff',
                transition: 'all 0.3s ease'
              }} 
            />
          </button>
        </div>
      )}
    </div>
  );
};

export default TasksPhoneView;

