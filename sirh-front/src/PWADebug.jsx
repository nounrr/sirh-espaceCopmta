import { useEffect, useState } from "react";
import { isInStandaloneMode } from "./utils/pwaUtils";

function PWADebug() {
  const [pwaStatus, setPwaStatus] = useState({
    isHttps: false,
    hasManifest: false,
    hasServiceWorker: false,
    isStandalone: false,
    promptEventSupported: false,
    navigator: '',
    registeredWorkers: []
  });

  useEffect(() => {
    const checkPWAStatus = async () => {
      // Check basic PWA requirements
      const status = {
        isHttps: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
        hasManifest: !!document.querySelector('link[rel="manifest"]'),
        hasServiceWorker: 'serviceWorker' in navigator,
        isStandalone: isInStandaloneMode(),
        promptEventSupported: 'BeforeInstallPromptEvent' in window || 'onbeforeinstallprompt' in window,
        navigator: navigator.userAgent,
        registeredWorkers: []
      };

      // Check for registered service workers
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          status.registeredWorkers = registrations.map(reg => ({
            scope: reg.scope,
            active: !!reg.active,
            installing: !!reg.installing,
            waiting: !!reg.waiting,
            updateViaCache: reg.updateViaCache
          }));
        } catch (e) {
          console.error('Error checking service workers:', e);
        }
      }

      setPwaStatus(status);
    };

    checkPWAStatus();

    // Add event listener for beforeinstallprompt
    const handleBeforeInstallPrompt = () => {
      setPwaStatus(prev => ({...prev, promptEventFired: true}));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Only show in development mode
  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px',
      maxHeight: '200px',
      overflow: 'auto'
    }}>
      <h4 style={{margin: '0 0 5px 0'}}>PWA Debug</h4>
      <ul style={{margin: 0, padding: '0 0 0 15px'}}>
        <li>HTTPS: {pwaStatus.isHttps ? '✅' : '❌'}</li>
        <li>Manifest: {pwaStatus.hasManifest ? '✅' : '❌'}</li>
        <li>Service Worker API: {pwaStatus.hasServiceWorker ? '✅' : '❌'}</li>
        <li>Standalone: {pwaStatus.isStandalone ? '✅' : '❌'}</li>
        <li>Install Prompt API: {pwaStatus.promptEventSupported ? '✅' : '❌'}</li>
        <li>Prompt Fired: {pwaStatus.promptEventFired ? '✅' : '❌'}</li>
      </ul>
      <div style={{fontSize: '10px', marginTop: '5px'}}>
        {pwaStatus.registeredWorkers.length > 0 ? (
          <>
            <strong>Service Workers:</strong>
            <ul style={{margin: 0, padding: '0 0 0 15px'}}>
              {pwaStatus.registeredWorkers.map((worker, idx) => (
                <li key={idx}>
                  Scope: {worker.scope.split('/').pop()}, 
                  Status: {worker.active ? 'Active' : (worker.waiting ? 'Waiting' : 'Installing')}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p style={{margin: 0}}>No service workers registered</p>
        )}
      </div>
    </div>
  );
}

export default PWADebug;
