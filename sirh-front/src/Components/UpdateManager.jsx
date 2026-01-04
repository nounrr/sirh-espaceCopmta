import { useState, useEffect, useRef } from 'react';
import { useAppVersion } from '../hooks/useAppVersion';
import './UpdateManager.css';

const UpdateManager = () => {
  const {
    currentVersion,
    latestVersion,
    updateAvailable,
    loading,
    forceUpdate,
    skipVersion,
    checkForUpdates
  } = useAppVersion();

  const [showNotification, setShowNotification] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const hasPromptedRef = useRef(false);

  // Afficher une seule fois par version et éviter les doublons (double-montage / vérifs périodiques)
  useEffect(() => {
    if (!updateAvailable || !latestVersion) return;

    const shownKey = `update:prompt:shown:${latestVersion}`;

    // Évite le double affichage en dev (StrictMode) et les re-renders rapides
    if (hasPromptedRef.current) return;

    // Si déjà montré pour cette version, ne plus l'afficher
    if (localStorage.getItem(shownKey)) {
      setShowNotification(false);
      return;
    }

    localStorage.setItem(shownKey, '1');
    hasPromptedRef.current = true;
    setShowNotification(true);
  }, [updateAvailable, latestVersion]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    // Petite animation de chargement
    setTimeout(() => {
      forceUpdate();
    }, 1000);
  };

  const handleSkip = () => {
    skipVersion();
    setShowNotification(false);
  };

  const handleRefresh = () => {
    checkForUpdates();
  };

  if (!showNotification) {
    return null;
  }

  return (
    <div className="update-manager">
      <div className="update-notification">
        <div className="update-header">
          <div className="update-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path 
                d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" 
                fill="#4CAF50"
                stroke="#4CAF50" 
                strokeWidth="1"
              />
            </svg>
          </div>
          <div className="update-title">
            <h3>Mise à jour disponible</h3>
            <p className="version-info">
              Version actuelle: <span className="version-current">{currentVersion}</span>
              <br />
              Nouvelle version: <span className="version-latest">{latestVersion}</span>
            </p>
          </div>
        </div>

        <div className="update-content">
          <p>
            Une nouvelle version de SMART RH est disponible avec des améliorations 
            et des corrections de bugs.
          </p>
          <div className="update-features">
            <ul>
              <li>🚀 Performances améliorées</li>
              <li>🔧 Corrections de bugs</li>
              <li>✨ Nouvelles fonctionnalités</li>
              <li>🔒 Améliorations de sécurité</li>
            </ul>
          </div>
        </div>

        <div className="update-actions">
          <button 
            onClick={handleUpdate}
            className="btn-update-now"
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <span className="loading-spinner"></span>
                Mise à jour...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path 
                    d="M4 12a8 8 0 0 1 8-8V2.5L16 6l-4 3.5V8a6 6 0 0 0-6 6"
                    stroke="currentColor" 
                    strokeWidth="2" 
                    fill="none"
                  />
                </svg>
                Mettre à jour maintenant
              </>
            )}
          </button>
          
          <button 
            onClick={handleSkip}
            className="btn-skip"
            disabled={isUpdating}
          >
            Ignorer cette version
          </button>
        </div>

        <div className="update-note">
          <small>
            ℹ️ La mise à jour rechargera automatiquement l'application
          </small>
        </div>
      </div>
    </div>
  );
};

export default UpdateManager;
