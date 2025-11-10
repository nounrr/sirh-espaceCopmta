import { useEffect, useState } from 'react';
import './PWAUpdateNotifier.css';

const PWAUpdateNotifier = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Vérifier si on est dans un navigateur et si le service worker est supporté
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      
      // Fonction pour vérifier les mises à jour
      const checkForUpdates = async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            // Forcer la vérification d'une nouvelle version
            await registration.update();
          }
        } catch (error) {
          console.log('Erreur lors de la vérification des mises à jour:', error);
        }
      };

      // Vérifier les mises à jour toutes les 30 secondes
      const updateInterval = setInterval(checkForUpdates, 30000);

      // Écouter les événements du service worker
      const handleSWUpdate = (registration) => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // Nouvelle version disponible
                setWaitingWorker(installingWorker);
                setUpdateAvailable(true);
                setIsVisible(true);
              }
            }
          });
        }
      };

      // Gérer les mises à jour en attente
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Service worker mis à jour, recharger la page
        window.location.reload();
      });

      // Vérifier s'il y a déjà un service worker en attente
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration && registration.waiting) {
          setWaitingWorker(registration.waiting);
          setUpdateAvailable(true);
          setIsVisible(true);
        }
      });

      // Écouter les nouvelles installations
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
          setUpdateAvailable(true);
          setIsVisible(true);
        }
      });

      return () => {
        clearInterval(updateInterval);
      };
    }
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      // Dire au service worker en attente de prendre le contrôle
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Recharger la page pour forcer la mise à jour
      window.location.reload(true);
    }
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Masquer pour 1 heure (3600000 ms)
    setTimeout(() => setIsVisible(true), 3600000);
  };

  if (!updateAvailable || !isVisible) {
    return null;
  }

  return (
    <div className="pwa-update-notifier">
      <div className="pwa-update-content">
        <div className="pwa-update-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="#4CAF50"/>
            <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" stroke="#4CAF50" strokeWidth="2"/>
          </svg>
        </div>
        <div className="pwa-update-text">
          <h4>Nouvelle version disponible !</h4>
          <p>Une mise à jour de l'application est disponible. Cliquez sur "Mettre à jour" pour profiter des dernières améliorations.</p>
        </div>
        <div className="pwa-update-actions">
          <button onClick={handleUpdate} className="btn-update">
            Mettre à jour
          </button>
          <button onClick={handleDismiss} className="btn-dismiss">
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdateNotifier;
