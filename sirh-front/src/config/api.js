const apiUrl = import.meta.env.VITE_API_URL_API;
// const API_URL = apiUrl+'api';
const API_URL = apiUrl+'public/api';
// 
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: `${API_URL}/auth/login`,
    LOGOUT: `${API_URL}/auth/logout`,
    CURRENT_USER: `${API_URL}/auth/me`,
  },

  // Users
  USERS: {
    BASE: `${API_URL}/employes`,
    BY_ID: (id) => `${API_URL}/employes/${id}`,
  },
  // Clients
  CLIENTS: {
    BASE: `${API_URL}/clients`,
    BY_ID: (id) => `${API_URL}/clients/${id}`,
    UPDATE: (id) => `${API_URL}/clients/update/${id}`,
    PORTEFEUILLES: `${API_URL}/clients/portefeuilles`,
  },
  USERSTEMP:{
    BASE: `${API_URL}/employes/temp`,
  },

  // Departments
  DEPARTMENTS: {
    BASE: `${API_URL}/departements`,
    BY_ID: (id) => `${API_URL}/departements/${id}`,
  },

  // Time Tracking (Pointages)
  POINTAGES: {
    BASE: `${API_URL}/pointages`,
    BY_ID: (id) => `${API_URL}/pointages/${id}`,
  },

  // Absence Requests
  ABSENCE_REQUESTS: {
    BASE: `${API_URL}/absences`,
    BY_ID: (id) => `${API_URL}/absences/${id}`,
    STATUS: (id) => `${API_URL}/absences/${id}/status`,
  },

  // Time Tracking for tasks
  TIME_TRACKING: {
    ACTIVE: (taskId) => `${API_URL}/tasks/${taskId}/timer/active`,
    START: (taskId) => `${API_URL}/tasks/${taskId}/timer/start`,
    PAUSE: (taskId) => `${API_URL}/tasks/${taskId}/timer/pause`,
    DAILY_SUMMARY: (taskId, date) => `${API_URL}/tasks/${taskId}/timer/daily-summary${date ? `?date=${date}` : ''}`,
  },
};
