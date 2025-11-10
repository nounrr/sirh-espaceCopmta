import { useEffect, useState } from "react";
import { isInStandaloneMode } from "./utils/pwaUtils";

function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showButton, setShowButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installé
    if (isInStandaloneMode()) {
      setIsInstalled(true);
      return;
    }

    // Gestionnaire pour l'événement beforeinstallprompt
    const handler = (e) => {
      console.log('beforeinstallprompt event fired');
      // Empêche Chrome d'afficher automatiquement la bannière
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };
    
    window.addEventListener("beforeinstallprompt", handler);

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
