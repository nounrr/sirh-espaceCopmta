import { useEffect, useState } from "react";
import { isInStandaloneMode, getPlatformInfo, getBrowserInfo } from "./utils/pwaUtils";

function PWAInstallManager() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platformInfo, setPlatformInfo] = useState(null);
  const [browserInfo, setBrowserInfo] = useState(null);

  useEffect(() => {
    const platform = getPlatformInfo();
    const browser = getBrowserInfo();
    setPlatformInfo(platform);
    setBrowserInfo(browser);

    console.log('Platform info:', platform);
    console.log('Browser info:', browser);

    // Vérifier si déjà installé
    if (isInStandaloneMode()) {
      console.log('PWA is already installed');
      setIsInstalled(true);
      return;
    }

    // Gestionnaire pour Chrome/Edge (Android, Windows, Linux)
    const handleBeforeInstallPrompt = (e) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    // Gestionnaire après installation
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setShowInstallButton(false);
      setShowIOSInstructions(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Pour iOS Safari, afficher les instructions
    if (platform.isIOS && browser.isSafari) {
      console.log('iOS Safari detected, showing iOS instructions');
      setShowIOSInstructions(true);
    }

    // Vérification périodique de l'installation
    const checkInstallation = setInterval(() => {
      if (isInStandaloneMode()) {
        setIsInstalled(true);
        setShowInstallButton(false);
        setShowIOSInstructions(false);
        clearInterval(checkInstallation);
      }
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(checkInstallation);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('No install prompt available');
      return;
    }

    try {
      console.log('Showing install prompt');
      deferredPrompt.prompt();
      
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response: ${outcome}`);
      
      if (outcome === 'accepted') {
        setShowInstallButton(false);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error during installation:', error);
    }
  };

  // Ne rien afficher si déjà installé
  if (isInstalled) {
    return null;
  }

  // Bouton d'installation pour Chrome/Edge
  const InstallButton = () => (
    <div style={{ 
      textAlign: 'center', 
      margin: '20px 0',
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '15px',
      boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
    }}>
      <div style={{ fontSize: '3em', marginBottom: '15px' }}>📱</div>
      <h3 style={{ color: 'white', margin: '0 0 10px 0' }}>Installer l'Application</h3>
      <p style={{ color: 'rgba(255,255,255,0.9)', margin: '0 0 20px 0', fontSize: '16px' }}>
        Accès rapide, notifications push et mode hors-ligne
      </p>
      <button 
        onClick={handleInstallClick}
        style={{
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          padding: '15px 40px',
          borderRadius: '25px',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
          transition: 'all 0.3s ease',
          transform: 'translateY(0)',
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)';
        }}
      >
        🚀 Installer maintenant
      </button>
      <div style={{ 
        marginTop: '15px', 
        fontSize: '14px', 
        color: 'rgba(255,255,255,0.8)' 
      }}>
        {platformInfo?.isAndroid && '📱 Android'} 
        {platformInfo?.isWindows && '💻 Windows'} 
        {platformInfo?.isLinux && '🐧 Linux'}
        {browserInfo?.isChrome && ' • Chrome'}
        {browserInfo?.isEdge && ' • Edge'}
      </div>
    </div>
  );

  // Instructions pour iOS
  const IOSInstructions = () => (
    <div style={{ 
      padding: '20px', 
      background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)',
      color: 'white',
      borderRadius: '15px', 
      margin: '20px 0',
      boxShadow: '0 8px 25px rgba(255, 107, 107, 0.3)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '3em', marginBottom: '10px' }}>📱</div>
        <h3 style={{ margin: '0 0 10px 0' }}>Installer sur iPhone/iPad</h3>
        <p style={{ margin: '0', fontSize: '16px', opacity: '0.9' }}>
          Ajoutez l'app à votre écran d'accueil
        </p>
      </div>

      <div style={{ 
        background: 'rgba(255,255,255,0.15)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ marginBottom: '15px', textAlign: 'center' }}>
          <strong style={{ fontSize: '18px' }}>📋 Instructions d'installation</strong>
        </div>
        
        <div style={{ fontSize: '16px', lineHeight: '1.8' }}>
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ 
              background: 'rgba(255,255,255,0.3)', 
              borderRadius: '50%', 
              width: '30px', 
              height: '30px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginRight: '15px',
              fontSize: '14px',
              fontWeight: 'bold',
              minWidth: '30px'
            }}>1</span>
            <span>Ouvrez ce site dans <strong>Safari</strong> (navigateur par défaut) 🌐</span>
          </div>
          
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ 
              background: 'rgba(255,255,255,0.3)', 
              borderRadius: '50%', 
              width: '30px', 
              height: '30px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginRight: '15px',
              fontSize: '14px',
              fontWeight: 'bold',
              minWidth: '30px'
            }}>2</span>
            <span>Appuyez sur le bouton <strong>Partager</strong> 📤 (en bas de l'écran)</span>
          </div>
          
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ 
              background: 'rgba(255,255,255,0.3)', 
              borderRadius: '50%', 
              width: '30px', 
              height: '30px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginRight: '15px',
              fontSize: '14px',
              fontWeight: 'bold',
              minWidth: '30px'
            }}>3</span>
            <span>Sélectionnez <strong>"Sur l'écran d'accueil"</strong> ➕</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ 
              background: 'rgba(255,255,255,0.3)', 
              borderRadius: '50%', 
              width: '30px', 
              height: '30px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginRight: '15px',
              fontSize: '14px',
              fontWeight: 'bold',
              minWidth: '30px'
            }}>4</span>
            <span>Appuyez sur <strong>"Ajouter"</strong> pour confirmer ✅</span>
          </div>
        </div>
      </div>
      
      <div style={{ 
        textAlign: 'center',
        padding: '15px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '10px',
        fontSize: '16px'
      }}>
        <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>🎉</div>
        <strong>L'app apparaîtra sur votre écran d'accueil !</strong>
        <br />
        <span style={{ opacity: '0.8', fontSize: '14px' }}>
          Accès rapide, notifications et mode hors-ligne disponibles
        </span>
      </div>
    </div>
  );

  // Affichage conditionnel selon la plateforme
  return (
    <div>
      {showInstallButton && deferredPrompt && <InstallButton />}
      {showIOSInstructions && platformInfo?.isIOS && <IOSInstructions />}
      
      {/* Debug info (à supprimer en production) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          background: '#f0f0f0', 
          padding: '10px', 
          margin: '10px 0',
          borderRadius: '5px',
          fontSize: '12px'
        }}>
          <strong>Debug Info:</strong><br />
          Platform: {JSON.stringify(platformInfo)}<br />
          Browser: {JSON.stringify(browserInfo)}<br />
          Has deferredPrompt: {!!deferredPrompt}<br />
          Is installed: {isInstalled}
        </div>
      )}
    </div>
  );
}

export default PWAInstallManager;
