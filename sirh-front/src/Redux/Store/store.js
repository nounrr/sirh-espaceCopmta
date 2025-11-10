
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../Slices/authSlice';
import presenceStatsReducer from '../Slices/presenceStatsSlice';
import userReducer from '../Slices/userSlice';
import departmentReducer from '../Slices/departementSlice';
import absenceRequestReducer from '../Slices/absenceRequestSlice';
import pointageReducer from '../Slices/pointageSlice';
import societeReducer from '../Slices/societeSlice'; // Assurez-vous que ce chemin est correct et que le fichier existe
import typeDocReducer from '../Slices/typeDocSlice';
import userDocsReducer from '../Slices/userDocsSlice';
import publicationsReducer from '../Slices/publicationSlice'
import voteReducer from '../slices/voteSlice';
import todoListReducer from '../Slices/todoListSlice';
import todoTaskReducer from '../Slices/todoTaskSlice';
import taskCommentsReducer from '../Slices/taskCommentsSlice';
import projectsReducer from '../Slices/projectSlice';
import leaveReducer from '../Slices/leaveSlice';
import holidayReducer from '../Slices/holidaySlice';
import auditReducer from '../Slices/auditSlice';
import salaireReducer from '../Slices/salaireSlice';
import chargePersonnelReducer from '../Slices/chargePersonnelSlice';
import clientsReducer from '../Slices/clientsSlice';
import timeTrackingReducer from '../Slices/timeTrackingSlice';
export const store = configureStore({
  reducer: {
    auth: authReducer,
    presence: presenceStatsReducer, 
    users: userReducer,
    departments: departmentReducer,
    absenceRequests: absenceRequestReducer,
    pointages: pointageReducer,
    societes: societeReducer,
    typeDocs: typeDocReducer,
    userDocs: userDocsReducer,
    publications: publicationsReducer,
    vote: voteReducer,
    todoLists: todoListReducer,
    todoTasks: todoTaskReducer, 
    taskComments: taskCommentsReducer,
    projects: projectsReducer,
    leave: leaveReducer,
    holidays: holidayReducer,
    audits: auditReducer,
    salaires: salaireReducer,
    chargePersonnels: chargePersonnelReducer,
    clients: clientsReducer,
    timeTracking: timeTrackingReducer,
  }
});
