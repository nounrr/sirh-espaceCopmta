// Fichier pour s'assurer que le service worker est correctement enregistré
// À inclure dans le HTML ou importer dans le fichier principal

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker enregistré avec succès:', registration.scope);
          
          // Vérifier les mises à jour toutes les 60 minutes
          setInterval(() => {
            registration.update()
              .then(() => console.log('Service Worker: recherche de mise à jour effectuée'))
              .catch(err => console.error('Service Worker: erreur lors de la recherche de mise à jour:', err));
          }, 60 * 60 * 1000);
        })
        .catch(error => {
          console.error('Échec de l\'enregistrement du Service Worker:', error);
        });
    });
  } else {
    console.warn('Les Service Workers ne sont pas supportés par ce navigateur');
  }
}

// Fonction pour installer manuellement la PWA (pour les navigateurs qui ne supportent pas beforeinstallprompt)
export function promptInstall() {
  // Pour iOS Safari qui n'a pas de prompt automatique
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  const isSafari = /safari/i.test(navigator.userAgent) && !/chrome|android/i.test(navigator.userAgent);
  
  if (isIOS && isSafari) {
    // Afficher instructions pour iOS
    alert("Pour installer l'application: appuyez sur le bouton 'Partager' puis 'Sur l'écran d'accueil'");
    return;
  }
  
  // Pour les autres navigateurs qui pourraient avoir une méthode d'installation
  if (navigator.getInstalledRelatedApps) {
    navigator.getInstalledRelatedApps()
      .then(relatedApps => {
        if (relatedApps.length === 0) {
          // Suggérer l'installation manuellement
          alert("Pour installer l'application, utilisez l'option 'Installer' ou 'Ajouter à l'écran d'accueil' du menu de votre navigateur.");
        }
      })
      .catch(error => {
        console.error("Erreur lors de la vérification des applications installées:", error);
      });
  }
}
