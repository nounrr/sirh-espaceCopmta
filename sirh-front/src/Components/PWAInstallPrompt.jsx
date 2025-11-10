import { useEffect, useState } from "react";

// Fonction pour détecter le système d'exploitation
const detectOS = () => {
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
  const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
  const iosPlatforms = ['iPhone', 'iPad', 'iPod'];
  
  if (macosPlatforms.indexOf(platform) !== -1) {
    return 'Mac OS';
  } else if (iosPlatforms.indexOf(platform) !== -1) {
    return 'iOS';
  } else if (windowsPlatforms.indexOf(platform) !== -1) {
    return 'Windows';
  } else if (/Android/.test(userAgent)) {
    return 'Android';
  } else if (/Linux/.test(platform)) {
    return 'Linux';
  }
  return 'Unknown';
};

// Fonction pour détecter le navigateur
const detectBrowser = () => {
  const userAgent = window.navigator.userAgent;
  
  if (userAgent.indexOf('Chrome') > -1) {
    return 'Chrome';
  } else if (userAgent.indexOf('Firefox') > -1) {
    return 'Firefox';
  } else if (userAgent.indexOf('Safari') > -1) {
    return 'Safari';
  } else if (userAgent.indexOf('Edge') > -1) {
    return 'Edge';
  }
  return 'Unknown';
};

// Fonction pour vérifier si déjà en mode standalone
const isInStandaloneMode = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showButton, setShowButton] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [os, setOS] = useState('');
  const [browser, setBrowser] = useState('');

  useEffect(() => {
    const detectedOS = detectOS();
    const detectedBrowser = detectBrowser();
    setOS(detectedOS);
    setBrowser(detectedBrowser);

    // Vérifier si déjà installé
    if (isInStandaloneMode()) {
      setIsInstalled(true);
      return;
    }

    // Gestion de l'événement beforeinstallprompt (Chrome, Edge, Samsung Internet)
    const handler = (e) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Gestion spéciale pour iOS
    if (detectedOS === 'iOS' && detectedBrowser === 'Safari') {
      // Sur iOS Safari, il n'y a pas d'événement beforeinstallprompt
      setShowIOSInstructions(true);
    } else if (!deferredPrompt && (detectedBrowser === 'Firefox' || detectedOS === 'Unknown')) {
      // Pour Firefox et autres navigateurs sans support beforeinstallprompt
      setTimeout(() => {
        if (!deferredPrompt) {
          setShowManualInstructions(true);
        }
      }, 3000); // Attendre 3 secondes avant d'afficher les instructions manuelles
    }

    // Événement après installation réussie
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setShowButton(false);
      setShowIOSInstructions(false);
      setShowManualInstructions(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [deferredPrompt]);

  // Gérer le clic d'installation
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        setShowButton(false);
      }
      setDeferredPrompt(null);
    }
  };

  // Instructions manuelles selon le navigateur/OS
  const getManualInstructions = () => {
    if (os === 'Windows' && browser === 'Chrome') {
      return (
        <div>
          <p><strong>Chrome sur Windows :</strong></p>
          <p>1. Cliquez sur l'icône <strong>⋮</strong> (menu) en haut à droite</p>
          <p>2. Sélectionnez <strong>"Installer SMART RH..."</strong></p>
          <p>3. Confirmez l'installation</p>
        </div>
      );
    } else if (os === 'Windows' && browser === 'Edge') {
      return (
        <div>
          <p><strong>Edge sur Windows :</strong></p>
          <p>1. Cliquez sur <strong>⋯</strong> (menu) en haut à droite</p>
          <p>2. Sélectionnez <strong>"Applications" → "Installer cette application"</strong></p>
        </div>
      );
    } else if (os === 'Android' && browser === 'Chrome') {
      return (
        <div>
          <p><strong>Chrome sur Android :</strong></p>
          <p>1. Tapez sur <strong>⋮</strong> (menu) en haut à droite</p>
          <p>2. Sélectionnez <strong>"Ajouter à l'écran d'accueil"</strong></p>
          <p>3. Tapez sur <strong>"Installer"</strong></p>
        </div>
      );
    } else if (browser === 'Firefox') {
      return (
        <div>
          <p><strong>Firefox :</strong></p>
          <p>1. Cliquez sur <strong>☰</strong> (menu) en haut à droite</p>
          <p>2. Sélectionnez <strong>"Installer"</strong> ou <strong>"Ajouter à l'écran d'accueil"</strong></p>
        </div>
      );
    }
    return (
      <div>
        <p>Cherchez l'option <strong>"Installer"</strong> ou <strong>"Ajouter à l'écran d'accueil"</strong> dans le menu de votre navigateur.</p>
      </div>
    );
  };

  // Si déjà installé, ne rien afficher
  if (isInstalled) {
    return null;
  }

  return (
    <div style={{ margin: '20px 0' }}>
      {/* Bouton d'installation automatique */}
      {showButton && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '15px',
          borderRadius: '10px',
          textAlign: 'center',
          marginBottom: '10px'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>📱 Installer l'application</h4>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px' }}>
            Installez SMART RH sur votre appareil pour un accès rapide et hors-ligne
          </p>
          <button 
            onClick={handleInstallClick}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '12px 30px',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🚀 Installer maintenant
          </button>
        </div>
      )}

      {/* Instructions pour iOS */}
      {showIOSInstructions && (
        <div style={{
          background: '#fffbe7',
          padding: '15px',
          border: '1px solid #ecd992',
          borderRadius: '10px',
          color: '#664c0f',
          marginBottom: '10px'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>📲 Installation sur iOS</h4>
          <p style={{ margin: '0 0 10px 0' }}>
            Pour installer cette application sur votre iPhone/iPad :
          </p>
          <ol style={{ margin: '0', paddingLeft: '20px' }}>
            <li>Tapez sur l'icône <strong>Partager</strong> <span style={{ fontSize: '18px' }}>⬆️</span> en bas de l'écran</li>
            <li>Faites défiler et sélectionnez <strong>"Sur l'écran d'accueil"</strong></li>
            <li>Tapez sur <strong>"Ajouter"</strong></li>
          </ol>
        </div>
      )}

      {/* Instructions manuelles pour autres navigateurs */}
      {showManualInstructions && (
        <div style={{
          background: '#f0f8ff',
          padding: '15px',
          border: '1px solid #b6d7ff',
          borderRadius: '10px',
          color: '#1e3a8a',
          marginBottom: '10px'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>🔧 Installation manuelle</h4>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
            Détecté : {browser} sur {os}
          </p>
          {getManualInstructions()}
          <button
            onClick={() => setShowManualInstructions(false)}
            style={{
              background: 'transparent',
              border: '1px solid #1e3a8a',
              color: '#1e3a8a',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Masquer
          </button>
        </div>
      )}

      {/* Informations supplémentaires */}
      <div style={{
        fontSize: '12px',
        color: '#666',
        textAlign: 'center',
        marginTop: '10px'
      }}>
        💡 Une fois installée, l'app fonctionnera même hors-ligne
      </div>
    </div>
  );
}

export default PWAInstallPrompt;
