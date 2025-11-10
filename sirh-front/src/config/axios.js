import axios from 'axios';
const apiUrl = import.meta.env.VITE_API_URL_API;

const api = axios.create({
  baseURL: apiUrl+'api',
  // baseURL: apiUrl+'public/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// ➕ Ajouter automatiquement le token d'auth si présent
api.interceptors.request.use((config) => {
  const user = localStorage.getItem('user');
  if (user) {
    const userData = JSON.parse(user);
    const token = userData?.access_token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('Aucun access_token trouvé dans les données utilisateur:', userData);
    }
  } else {
    console.warn('Aucune donnée utilisateur trouvée dans localStorage');
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercepteur de réponse pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Erreur d\'authentification détectée:', error.response.data);
      // Optionnel: rediriger vers la page de connexion
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;