import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import {store} from './Redux/Store/store';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import './index.css';
import './styles/mobile-responsive.css';
import './styles/swal-custom.css';
import OneSignalInit from './OneSignalInit';
import { registerServiceWorker } from './utils/serviceWorkerRegistration';
import { initPWAInstallCapture } from './utils/pwaUtils';

// Enregistrer le service worker manuellement pour plus de contrôle
registerServiceWorker();

// Initialiser la capture globale du beforeinstallprompt
initPWAInstallCapture();

createRoot(document.getElementById('root')).render(
  <Provider store={store}>  
    <BrowserRouter>
      <OneSignalInit />
      <App />
    </BrowserRouter>  
  </Provider>
);
