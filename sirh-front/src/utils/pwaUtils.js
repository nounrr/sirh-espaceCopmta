// Fonction pour vérifier si l'application est déjà installée (mode standalone)
export const isInStandaloneMode = () => {
  // Vérifier display-mode standalone
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Vérifier navigator.standalone pour iOS Safari
  if (window.navigator && window.navigator.standalone === true) {
    return true;
  }

  return false;
};

// Capture globale du beforeinstallprompt pour ne pas rater l'événement
export const initPWAInstallCapture = () => {
  if (typeof window === 'undefined') return;
  if (window.__pwaInstallCaptureInit) return;
  window.__pwaInstallCaptureInit = true;

  window.addEventListener('beforeinstallprompt', (e) => {
    try {
      // Empêcher l'infobar automatique
      e.preventDefault();
    } catch {}
    window.__deferredPWAInstallPrompt = e;
    // Notifier les composants intéressés
    window.dispatchEvent(new CustomEvent('pwa:beforeinstallprompt'));
  });

  window.addEventListener('appinstalled', () => {
    window.__deferredPWAInstallPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa:installed'));
  });
};

export const getDeferredPrompt = () => {
  return typeof window !== 'undefined' ? (window.__deferredPWAInstallPrompt || null) : null;
};

// Fonction pour détecter si l'installation PWA est supportée
export const isPWAInstallSupported = () => {
  // Vérifier si serviceWorker est supporté
  if (!('serviceWorker' in navigator)) {
    return false;
  }
  
  // Vérifier si beforeinstallprompt est supporté (Chrome, Edge, Samsung Internet)
  let hasBeforeInstallPrompt = false;
  
  const handler = () => {
    hasBeforeInstallPrompt = true;
  };
  
  window.addEventListener('beforeinstallprompt', handler, { once: true });
  
  // Pour iOS Safari, toujours considérer comme supporté (installation manuelle)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  return hasBeforeInstallPrompt || isIOS;
};

// Fonction pour obtenir le statut d'installation
export const getPWAInstallStatus = () => {
  return {
    isInstalled: isInStandaloneMode(),
    isSupported: isPWAInstallSupported(),
    canPrompt: 'beforeinstallprompt' in window
  };
};
