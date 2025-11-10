import { useEffect, useState } from 'react';

export const useAppVersion = () => {
  const [currentVersion, setCurrentVersion] = useState(null);
  const [latestVersion, setLatestVersion] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fonction pour obtenir la version actuelle depuis le localStorage ou défaut
  const getCurrentVersion = () => {
    return localStorage.getItem('app-version') || '3.1.0';
  };

  // Fonction pour vérifier la version sur le serveur
  const checkForUpdates = async () => {
    setLoading(true);
    try {
      // Ajouter un cache buster pour éviter le cache du navigateur
      const cacheBuster = Date.now();
      const response = await fetch(`/version.json?v=${cacheBuster}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const versionData = await response.json();
        const serverVersion = versionData.version;
        const current = getCurrentVersion();
        
        setCurrentVersion(current);
        setLatestVersion(serverVersion);
        
        // Comparer les versions
        const isUpdateNeeded = isVersionGreater(serverVersion, current);
        setUpdateAvailable(isUpdateNeeded);
        
        if (isUpdateNeeded) {
          console.log(`Mise à jour disponible: ${current} → ${serverVersion}`);
        }
        
        return isUpdateNeeded;
      } else {
        throw new Error('Impossible de récupérer la version');
      }
    } catch (error) {
      console.warn('Erreur lors de la vérification de version:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour comparer les versions (format x.y.z)
  const isVersionGreater = (newVersion, currentVersion) => {
    const parseVersion = (version) => {
      return version.split('.').map(num => parseInt(num, 10));
    };
    
    const newParts = parseVersion(newVersion);
    const currentParts = parseVersion(currentVersion);
    
    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
      const newPart = newParts[i] || 0;
      const currentPart = currentParts[i] || 0;
      
      if (newPart > currentPart) return true;
      if (newPart < currentPart) return false;
    }
    
    return false;
  };

  // Fonction pour forcer la mise à jour
  const forceUpdate = () => {
    // Sauvegarder la nouvelle version
    if (latestVersion) {
      localStorage.setItem('app-version', latestVersion);
    }
    
    // Supprimer tous les caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Supprimer le cache localStorage de l'app (optionnel)
    // localStorage.clear();
    
    // Recharger avec force refresh
    window.location.reload(true);
  };

  // Fonction pour ignorer cette version
  const skipVersion = () => {
    if (latestVersion) {
      localStorage.setItem('app-version', latestVersion);
      setUpdateAvailable(false);
    }
  };

  // Vérification automatique au démarrage
  useEffect(() => {
    setCurrentVersion(getCurrentVersion());
    checkForUpdates();
  }, []);

  // Vérification périodique (toutes les 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      checkForUpdates();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Vérification quand l'onglet devient actif
  useEffect(() => {
    const handleFocus = () => {
      checkForUpdates();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkForUpdates();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  return {
    currentVersion,
    latestVersion,
    updateAvailable,
    loading,
    checkForUpdates,
    forceUpdate,
    skipVersion
  };
};
