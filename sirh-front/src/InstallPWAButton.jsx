import { useEffect, useState } from "react";
import { isInStandaloneMode, getDeferredPrompt } from "./utils/pwaUtils";

function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showButton, setShowButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
  // iOS: on n'affiche pas ce bouton (utiliser InstallPWAButtonIOSNotice)
  // Vérifier si déjà installé
  if (isInStandaloneMode()) {
      console.log('PWA: Already in standalone mode, hiding install button');
      setIsInstalled(true);
      return;
    }

    console.log('PWA: Not in standalone mode, checking if installable');
    
    // Vérifier les critères d'installation
    const checkInstallability = () => {
      console.log('PWA Debug:', {
        https: window.location.protocol === 'https:',
        manifest: !!document.querySelector('link[rel="manifest"]'),
        serviceWorker: 'serviceWorker' in navigator,
        isStandalone: isInStandaloneMode(),
        navigator: navigator.userAgent
      });
    };
    
    checkInstallability();

  // Gestionnaire pour l'événement beforeinstallprompt
    const handler = (e) => {
      console.log('PWA: beforeinstallprompt event fired!');
      // Empêche Chrome d'afficher automatiquement la bannière
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };
    
    window.addEventListener("beforeinstallprompt", handler);
    // Si l'événement a déjà eu lieu avant le montage, récupérer le prompt différé
    const existing = getDeferredPrompt();
    if (existing) {
      setDeferredPrompt(existing);
      setShowButton(true);
    }
    // Écouter l'événement custom émis par l'init globale
    const globalHandler = () => {
      const dp = getDeferredPrompt();
      if (dp) {
        setDeferredPrompt(dp);
        setShowButton(true);
      }
    };
    window.addEventListener('pwa:beforeinstallprompt', globalHandler);

    // Gestionnaire pour après installation
    const installedHandler = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setShowButton(false);
      setDeferredPrompt(null);
    };
    
    window.addEventListener('appinstalled', installedHandler);

    // Vérification périodique pour détecter l'installation
    const checkInstallation = setInterval(() => {
      if (isInStandaloneMode()) {
        setIsInstalled(true);
        setShowButton(false);
        clearInterval(checkInstallation);
      }
    }, 1000);

  // Nettoyage
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
  window.removeEventListener('appinstalled', installedHandler);
  window.removeEventListener('pwa:beforeinstallprompt', globalHandler);
      clearInterval(checkInstallation);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('No install prompt available');
      return;
    }

    try {
      // Afficher le prompt d'installation
      deferredPrompt.prompt();
      
      // Attendre la réponse de l'utilisateur
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setShowButton(false);
      } else {
        console.log('User dismissed the install prompt');
      }
      
      // Nettoyer le prompt
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error during installation:', error);
    }
  };

  // Ne pas afficher le bouton si déjà installé
  if (isInstalled) {
    return null;
  }

  // Pas de bouton sur iOS (utiliser l'aide iOS)
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    return null;
  }

  // Ne pas afficher le bouton si pas de prompt disponible
  if (!showButton || !deferredPrompt) {
    return null;
  }

  return (
    <div style={{ textAlign: 'center', margin: '20px 0' }}>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '15px',
        borderRadius: '10px',
        marginBottom: '10px'
      }}>
        <div style={{ fontSize: '2em', marginBottom: '10px' }}>📱</div>
        <h4 style={{ margin: '0 0 10px 0' }}>Installer l'application</h4>
        <p style={{ margin: '0 0 15px 0', fontSize: '14px', opacity: 0.9 }}>
          Accès rapide, notifications et fonctionnement hors-ligne
        </p>
        <button 
          onClick={handleInstallClick}
          className="btn btn-success"
          style={{
            background: '#4CAF50',
            border: 'none',
            padding: '12px 30px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            color: 'white'
          }}
        >
          🚀 Installer maintenant
        </button>
      </div>
    </div>
  );
}

export default InstallPWAButton;
