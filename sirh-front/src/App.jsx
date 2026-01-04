import MasterLayout from './masterLayout/MasterLayout'
// (imports consolidated below)
import { fetchClients, fetchPortefeuilles } from './Redux/Slices/clientsSlice'
import { Route, Routes, useNavigate } from 'react-router-dom'
import Login from './Pages/Login'
import Dashboard from './Pages/Dashboard'
import ViewProfileLayer from './Pages/ViewProfileLayer'
import { AuthProvider } from './context/AuthContext'
import PresenceDashboard from './Components/Statistique/PresenceDashboard'
import UserPointagesPeriode from './Components/Statistique/UserPointagesPeriode'
import BulkAddDepartmentPage from './Pages/BulkAddDepartmentPage'
import DepartmentsListPage from './Pages/DepartmentsListPage'
import EditDepartmentPage from './Pages/EditDepartmentPage'
import UsersListPage from './Pages/UsersListPage'
import ClientsListPage from './Pages/ClientsListPage'
import ClientFormPage from './Pages/ClientFormPage'
import UserFormPage from './Pages/UserFormPage'
import AbsenceRequestsListPage from './Pages/AbsenceRequestsListPage'
import AddAbsenceRequestPage from './Pages/AddAbsenceRequestPage'
import EditAbsenceRequestPage from './Pages/EditAbsenceRequestPage'
import PointagesListPage from './Pages/PointagesListPage'
import AddPointagePage from './Pages/AddPointagePage'
import EditPointagePage from './Pages/EditPointagePage'
import PrivateRoute from './PrivateRoute'
import NotFound from './Pages/NotFound'
import SocietesListPage from './Pages/SocietesListPage'; // Ajout de l'import pour la page des sociétés
import AbsenceRequestsCalendar from './Pages/AbsenceRequestsCalendar';
import PointagesPage from './Pages/PointagesPageExport';
import "./degrade.css"
import TypeDocsListPage from './Pages/TypeDocsListPage';
import UserDocsPage from './Pages/UserDocsPage';
import PointagePage from './Pages/PointagePage'
import PublicationList from './Pages/Publication/PublicationList';
import PublicationDetail from './Pages/Publication/PublicationDetail';
import PublicationCreate from './Pages/Publication/PublicationCreate';
import PublicationListCards from './Pages/Publication/PublicationListCards';
import SondageListCards from './Pages/Publication/SondageListCards';
import TodoListBoard from './Pages/todo/TodoListBoard';
import CreateTodoPage from './Pages/todo/CreateTodoPage';
import AddTaskPage from './Pages/todo/AddTaskPage';
import TasksPhoneView from './Pages/todo/TasksPhoneView';
import TodoListsCrudPage from './Pages/todo/TodoListsCrudPage';
import ProjectListPage from './Pages/projets/ProjectListPage';
import CreateProjectPage from './Pages/projets/CreateProjectPage';
import ProjectDetailPage from './Pages/projets/ProjectDetailPage.jsx';
import ProjectTablePage from './Pages/projets/ProjectTablePage.jsx';
import ProjectReportPage from './Pages/projets/ProjectReportPage.jsx';
import InfoRequestsPage from './Pages/InfoRequestsPage';
import OneSignal from 'react-onesignal'; // Make sure you have this package installed
import ModalNotif from './ModalNotif'
// Leave Management System - Soldes d'équipe uniquement
import LeaveBalancesPage from './Pages/LeaveBalancesPage';
import AuditPage from './Pages/AuditPage';
import ErrorBoundary from './components/ErrorBoundary';
import SalairePage from './components/SalairePage';
import ChargePersonnelPage from './Pages/ChargePersonnelPage';
import PrivateRouteWithRole from './PrivateRouteWithRole';
//fetch slices

// Composants de mise à jour PWA
import UpdateManager from './components/UpdateManager';
import PWADebug from './PWADebug';

// Hooks and Redux
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers } from './Redux/Slices/userSlice';
import { fetchDepartments } from './Redux/Slices/departementSlice';
import { fetchAbsenceRequests } from './Redux/Slices/absenceRequestSlice';
import { fetchPointages } from './Redux/Slices/pointageSlice';
import { fetchPresenceStats } from './Redux/Slices/presenceStatsSlice';
import { fetchSocietes } from './Redux/Slices/societeSlice';
import {fetchUserDocs} from './Redux/Slices/userDocsSlice';
import {fetchTypeDocs} from './Redux/Slices/typeDocSlice';
import { fetchPublications } from './Redux/Slices/publicationSlice';
import { fetchVotes } from './Redux/slices/voteSlice';
import { fetchTodoLists } from './Redux/Slices/todoListSlice';
import { fetchProjects } from './Redux/Slices/projectSlice';
import OneSignalSetup from './OneSignalSetup';
import HealthCheckPage from './Pages/HealthCheckPage';


const NotificationButton = () => {
  const { playerId, subscribeManually } = OneSignalSetup();
  const [notifError, setNotifError] = useState(null);
  // Initialiser dynamiquement la permission de notification
  const [permission, setPermission] = useState(() => {
    if (typeof window !== 'undefined' && window.Notification) {
      return window.Notification.permission;
    }
    return 'default';
  });
  const user = useSelector((state) => state.auth.user);
  const playerIdFromRedux = user?.onesignal_player_id;
  const playerIdFromDevice = typeof window !== 'undefined' ? window.__oneSignalPlayerId : undefined;

  // Si les deux playerId existent et sont différents, AFFICHER le bouton (désynchronisation)
  const isDesync = playerIdFromRedux && playerIdFromDevice && playerIdFromRedux !== playerIdFromDevice;
  const [show, setShow] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  // (supprimé, déjà déclaré plus haut)
  const isAuthenticated = useSelector((state) => state.auth.isSuccess);

  useEffect(() => {
    // Détecter si mobile (largeur <= 600px)
    const checkMobile = () => setIsMobile(window.innerWidth <= 600);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    // Vérifier la permission de notification
    if (window.Notification && window.Notification.permission) {
      setPermission(window.Notification.permission);
    }
    // Ecouter le changement de permission (si supporté)
    const permissionInterval = setInterval(() => {
      if (window.Notification && window.Notification.permission !== permission) {
        setPermission(window.Notification.permission);
      }
    }, 500);
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearInterval(permissionInterval);
    };
  }, [permission]);



  // Afficher le bouton si désynchronisation (playerId Redux ≠ navigateur)
  if (!isAuthenticated || !show || ((permission === 'granted' && playerId) && !isDesync)) {
    return (
      <>
        {notifError && (
          <div style={{
            position: 'fixed',
            bottom: 140,
            left: 0,
            right: 0,
            zIndex: 99999,
            background: '#c62828',
            color: '#fff',
            fontSize: '15px',
            padding: '10px',
            textAlign: 'center',
            pointerEvents: 'none',
          }}>
            {notifError}
          </div>
        )}
     
      </>
    );
  }

  return (
    <>
  
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ position: 'relative', pointerEvents: 'auto' }}>
          {!isMobile && (
            <button
              onClick={() => setShow(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '-16px',
                background: 'rgb(33 15 15 / 54%)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                color: '#fff',
                fontSize: '1.2rem',
                cursor: 'pointer',
                zIndex: 2,
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                textAlign: 'center',
              }}
              aria-label="Fermer"
            >
              ×
            </button>
          )}
          <button
            onClick={async () => {
              try {
                setNotifError(null);
                await subscribeManually();
              } catch (e) {
                if (e && e.message && (e.message.includes('blocked') || e.message.includes('denied') || e.message.includes('permission'))) {
                  setNotifError("Impossible d'activer les notifications : permission bloquée ou refusée dans votre navigateur. Veuillez vérifier les paramètres du site.");
                } else {
                  setNotifError("Erreur lors de l'activation des notifications. Détail : " + (e && e.message ? e.message : e));
                }
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(90deg, #ff9800 0%, #ffc107 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '25px',
              padding: '12px 28px',
              fontSize: '1rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              cursor: 'pointer',
              transition: 'background 0.2s',
              margin: '24px 0',
              outline: 'none',
              pointerEvents: 'auto',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C9.243 2 7 4.243 7 7V8.222C7 10.09 5.926 11.782 4.222 12.447C3.5 12.726 3 13.44 3 14.222V16C3 16.552 3.448 17 4 17H20C20.552 17 21 16.552 21 16V14.222C21 13.44 20.5 12.726 19.778 12.447C18.074 11.782 17 10.09 17 8.222V7C17 4.243 14.757 2 12 2Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 21C9.552 21.607 10.255 22 11 22H13C13.745 22 14.448 21.607 15 21" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Autoriser les notifications
          </button>
        </div>
      </div>
    </>
  );
};

const updateFavicon = (url) => {
  const favicon = document.getElementById("dynamic-favicon");
  if (favicon) {
    favicon.href = url;
  }
};
const App = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const user = useSelector((state) => state.auth.user);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const playerId = OneSignalSetup();
  
  // Guard: ensure role checks are safe to avoid rendering non-elements
  const hasRhRole = (role) => typeof role === 'string' && role.toLowerCase().includes('rh');
const roles = useSelector((state) => state.auth.roles || []);
  const ISGestProjet = Array.isArray(roles)&& roles.some(r => ["Gest_Projet"].includes(r));
  const ISRespCom = Array.isArray(roles)&& roles.some(r => ["Resp_Com"].includes(r));

  // Charger les données après auth
  useEffect(() => {
    if (auth.isAuthenticated) {
      // Preload clients and portfolios once authenticated
      dispatch(fetchClients());
      dispatch(fetchPortefeuilles());
      // dispatch(fetchUserData()); // TODO: Ajouter cette fonction si nécessaire
      // dispatch(fetchNotifications()); // TODO: Ajouter cette fonction si nécessaire
    }
  }, [auth.isAuthenticated, dispatch]);


  useEffect(() => {
    if (auth.isSuccess && auth.token) {
      if (ISGestProjet) {
        // Gest_Projet: fetch only slices needed for todo, project, employees, departments, and audit/tasks
        dispatch(fetchUsers());
        dispatch(fetchDepartments());
        dispatch(fetchTodoLists());
        dispatch(fetchProjects());
        dispatch(fetchAbsenceRequests()); // Needed for audit/tasks (if tasks reference absences)
        // Add other slices here ONLY if strictly needed for todo/project work
        // Redirect Gest_Projet to TasksPhoneView on connect (default landing)
        const p = typeof window !== 'undefined' ? window.location.pathname : '';
        if (p === '/' || p === '/dashboard' || p === '/login') {
          navigate('/todo/phone', { replace: true });
        }
      } else if (ISRespCom) {
        // Resp_Com: fetch slices needed for info requests and publications
        dispatch(fetchUsers()); // Needed for assignees
        dispatch(fetchClients()); // Needed for info requests
        dispatch(fetchPublications());
        dispatch(fetchAbsenceRequests());
        
        const p = typeof window !== 'undefined' ? window.location.pathname : '';
        if (p === '/' || p === '/dashboard' || p === '/login') {
          navigate('/info-requests', { replace: true });
        }
      } else {

        // Other roles: fetch all slices as before
        dispatch(fetchUsers());
        dispatch(fetchDepartments());
        dispatch(fetchAbsenceRequests());
        dispatch(fetchPointages());
        dispatch(fetchSocietes());
        dispatch(fetchTypeDocs())
        dispatch(fetchUserDocs())
        dispatch(fetchPublications());
        dispatch(fetchVotes());
        dispatch(fetchTodoLists());
        dispatch(fetchProjects());
        const currentMonth = new Date().toISOString().slice(0, 7);
        dispatch(fetchPresenceStats({ periode: 'mois', mois: currentMonth }));
      }
    }
  }, [auth.isSuccess, auth.token, dispatch, ISGestProjet]);
  
  const societe_id = useSelector((state) => state.auth.user?.societe_id);

  useEffect(() => {
    // Minimal debug: diagnose malformed values that can trigger React error #31
    if (auth.isSuccess && user && user.role && typeof user.role !== 'string') {
      // eslint-disable-next-line no-console
      console.debug('[App] user.role is not a string:', user.role);
    }
    const getFaviconUrl = () => {
      // if (societe_id === 1) return "/assets/images/smee.webp";
      // if (societe_id === 2) return "/assets/images/dct.webp";
      return "/assets/images/gestion-icon.svg";
    };

    const faviconUrl = getFaviconUrl();
    updateFavicon(faviconUrl);

  }, [societe_id]);


  return (
    <AuthProvider>
      {/* Composants de mise à jour PWA */}
      <UpdateManager />
  {/* {import.meta.env.DEV ? <PWADebug /> : null} */}
      
       {/* <NotificationButton /> */}
  <ErrorBoundary>
  <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />
      <Route path="/Notif" element={<ModalNotif />} />

        {/* Protected routes with MasterLayout */}
        <Route element={  <PrivateRoute requirePlayerId={false}>
                            <MasterLayout />
                          </PrivateRoute>}>
          <Route  path="/" element={ISGestProjet ? <TasksPhoneView /> : (ISRespCom ? <InfoRequestsPage /> : <Dashboard />)} />
          <Route path="/view-profile" element={<ViewProfileLayer />} />
          <Route path='/dashboard' element={ISGestProjet ? <TasksPhoneView /> : (ISRespCom ? <InfoRequestsPage /> : <Dashboard />)} />
          <Route path='/statistiques' element={<PresenceDashboard/>} />
          <Route path='/pointagedetails'element={<UserPointagesPeriode userId={user?.id} />} />

          <Route path="users" element={<UsersListPage />} />
        <Route path="users/add" element={<UserFormPage />} />
        <Route path="users/:id/edit" element={<UserFormPage />} />
        <Route path="clients" element={<ClientsListPage />} />
        <Route path="clients/add" element={<ClientFormPage />} />
        <Route path="clients/:id/edit" element={<ClientFormPage />} />
       
        <Route path="societes" element={<SocietesListPage />} />
    
          {/* Department routes */}
          <Route path="/departments" element={<DepartmentsListPage />} />
          <Route path="/departments/add" element={<BulkAddDepartmentPage />} />
          <Route path="/departments/:id/edit" element={<EditDepartmentPage />} />
          
           {/* Module To-Do List */}
    <Route path="/todo" element={<TodoListBoard />} />
    <Route path="/todo/create" element={<CreateTodoPage />} />
    <Route path="/todo/:id/add-task" element={<AddTaskPage />} />
  <Route path="/todo/phone" element={<TasksPhoneView />} />
  <Route path="/todo/lists" element={<TodoListsCrudPage />} />

    {/* Projets */}
    <Route path="/projets" element={<ProjectListPage />} />
    <Route path="/projets/creer" element={<CreateProjectPage />} />
    <Route path="/projets/:id" element={<ProjectDetailPage />} />
    <Route path="/projets-table" element={<ProjectTablePage />} />
    <Route path="/projets-rapport" element={<ProjectReportPage />} />

    {/* Demandes d'information */}
    <Route path="/info-requests" element={<InfoRequestsPage />} />

    {/* Audit route */}
    <Route path="/audit" element={<AuditPage />} />
     
          {/* Absence request routes */}
          <Route path="/absences" element={<AbsenceRequestsListPage />} />
          <Route path="/absences/calendar" element={<AbsenceRequestsCalendar/>} />
          <Route path="/absences/add" element={<AddAbsenceRequestPage />} />
          <Route path="/absences/:id/edit" element={<EditAbsenceRequestPage />} />
          
          {/* Leave Management System - Soldes d'équipe uniquement */}
          <Route path="/conges/soldes" element={<LeaveBalancesPage />} />
          
          {/* Salaires - Accès RH uniquement */}
          <Route 
            path="/salaires" 
            element={
              <PrivateRouteWithRole allowedRoles={['RH']}>
                <SalairePage />
              </PrivateRouteWithRole>
            } 
          />
          {/* Charge Personnel - Accès RH uniquement */}
          <Route 
            path="/charges-personnel" 
            element={
              <PrivateRouteWithRole allowedRoles={['RH']}>
                <ChargePersonnelPage />
              </PrivateRouteWithRole>
            } 
          />
          
          {/* Pointage routes */}
          <Route path="/pointages" element={<PointagePage />} />
          {/* <Route path="/pointages" element={<PointagesListPage />} /> */}
          <Route path="/pointages/add" element={<AddPointagePage />} />
          <Route path="/pointages/:id/edit" element={<EditPointagePage />} />
          <Route path="/export" element={<PointagesPage />} />
          <Route path="/type-docs" element={<TypeDocsListPage />} />
          <Route path="/documents" element={<UserDocsPage />} />

      {/* Route Notif accessible sans PrivateRoute */}



          <Route
  path="/publications"
  element={
    hasRhRole(user?.role) ? <PublicationList /> : <PublicationListCards />
  }
/>
          <Route path="/sondages" element={<SondageListCards />} />
          <Route path="/publications/:id" element={<PublicationDetail />} />
          <Route path="/publications/nouveau" element={<PublicationCreate />} />
          <Route path="/health" element={<HealthCheckPage />} />
          {/* Page introuvable */}
          <Route path="*" element={<NotFound />} />

        </Route>
  </Routes>
  </ErrorBoundary>
    </AuthProvider>
  )
}

export default App

