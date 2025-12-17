import { useEffect, useState } from "react";

const OneSignalInit = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [playerIdFromDevice, setPlayerIdFromDevice] = useState(null);

  useEffect(() => {
    // Initialisation OneSignal dès le chargement de l'application
    const initializeOneSignal = async () => {
      try {
        if (!window.OneSignal) {
          console.log("OneSignal n'est pas disponible");
          return;
        }
        
        // Skip OneSignal initialization in development (localhost)
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.includes('localhost');
        
        if (isLocalhost) {
          console.log("OneSignal désactivé en développement local");
          return;
        }
        
        // Empêche l'init multiple
        if (window.__oneSignalInitialized) {
          console.log("OneSignal déjà initialisé");
          setIsInitialized(true);
          await checkForPlayerId();
          return;
        }

        console.log("Initialisation de OneSignal...");
        await window.OneSignal.init({
          appId: "7d3c9662-61d2-47bd-8f2d-dd448659fc79",
      safari_web_id: "web.onesignal.auto.630456c0-6fee-4c63-83c2-4e6e2f9684cf",
          notifyButton: { enable:false },
          autoPrompt: false,
          allowLocalhostAsSecureOrigin: true,
        });

        // Définir la variable globale APRÈS l'initialisation réussie
        console.log("🚀 Définition de window.__oneSignalInitialized = true");
        window.__oneSignalInitialized = true;
        setIsInitialized(true);
        console.log("OneSignal initialisé avec succès");

        // Vérifier si l'utilisateur est déjà abonné
        const isOptedIn = window.OneSignal.User.PushSubscription.optedIn;
        if (isOptedIn) {
          console.log("Utilisateur déjà abonné aux notifications");
          await checkForPlayerId();
        }

        // Écouter les changements d'abonnement
        window.OneSignal.User.PushSubscription.addEventListener(
          "change",
          async (event) => {
            console.log("Changement d'abonnement:", event);
            if (event.current.optedIn) {
              console.log("Utilisateur abonné");
              await checkForPlayerId();
            } else {
              console.log("Utilisateur désabonné");
              setPlayerIdFromDevice(null);
              window.__oneSignalPlayerId = null;
            }
          }
        );
      } catch (error) {
        console.error("Échec de l'initialisation OneSignal:", error);
      }
    };

    const checkForPlayerId = async () => {
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        try {
          if (
            window.OneSignal &&
            window.OneSignal.User &&
            window.OneSignal.User.PushSubscription
          ) {
            const id = window.OneSignal.User.PushSubscription.id;
            if (id) {
              console.log("✅ Player ID obtenu dès l'initialisation:", id);
              setPlayerIdFromDevice(id);
              // Stocker globalement pour y accéder facilement
              window.__oneSignalPlayerId = id;
              return id;
            }
          }
        } catch (error) {
          console.error("Erreur récupération Player ID:", error);
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }
      console.warn("Impossible d'obtenir le Player ID après plusieurs tentatives");
      return null;
    };

    initializeOneSignal();

    return () => {
      // Nettoyage si nécessaire
    };
  }, []);

  // Return a React component (can be empty)
  return null;
};

export default OneSignalInit;