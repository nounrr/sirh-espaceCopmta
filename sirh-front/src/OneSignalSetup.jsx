import { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { savePlayerId } from "./Redux/Slices/authSlice";

const OneSignalSetup = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const playerIdFromRedux = user?.onesignal_player_id;
  const dispatch = useDispatch();
  const hasSentPlayerId = useRef(false);
  const checkIntervalRef = useRef(null);

  // Utiliser le playerIdFromDevice déjà initialisé
  const playerIdFromDevice = window.__oneSignalPlayerId || null;

  console.log(
  "OneSignalSetup - user.id:", user?.id, "playerIdFromDevice:", playerIdFromDevice);

  useEffect(() => {
    // Fonction pour vérifier si OneSignal est initialisé
    const checkOneSignalInitialized = () => {
      if (window.OneSignal && window.__oneSignalInitialized) {
        console.log("✅ OneSignal est maintenant initialisé");
        setIsInitialized(true);
        
        // Arrêter la vérification périodique une fois initialisé
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
        return true;
      }
      return false;
    };
    
    // Vérifier immédiatement
    if (!checkOneSignalInitialized()) {
      // Si pas initialisé, vérifier toutes les 500ms
      console.log("⏳ Mise en place d'une vérification périodique pour OneSignal");
      checkIntervalRef.current = setInterval(checkOneSignalInitialized, 500);
      
      // Arrêter la vérification après 20 secondes pour éviter une boucle infinie
      setTimeout(() => {
        if (checkIntervalRef.current) {
          console.log("⚠️ Arrêt de la vérification après 20 secondes");
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
      }, 20000);
    }

    // Si l'utilisateur est connecté et que nous avons un playerIdFromDevice
    if (user && playerIdFromDevice) {
      // Toujours mettre à jour le playerId en base si différent (nouveau playerId détecté)
      if (playerIdFromRedux !== playerIdFromDevice && !hasSentPlayerId.current) {
        console.log("Mise à jour du Player ID dans Redux:", playerIdFromDevice);
        dispatch(savePlayerId(playerIdFromDevice));
        hasSentPlayerId.current = true;
      }
    }
    
    // Nettoyage à la destruction du composant
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [user, playerIdFromRedux, playerIdFromDevice, dispatch]);

  const subscribeManually = async () => {
    if (!window.OneSignal) {
      alert("OneSignal n'est pas disponible");
      return;
    }
    try {
      await window.OneSignal.User.PushSubscription.optIn();
      console.log("Abonnement demandé");
      
      // Attendre que le Player ID soit disponible après l'abonnement
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        const id = window.OneSignal.User.PushSubscription.id;
        if (id) {
          console.log("Player ID obtenu après abonnement:", id);
          window.__oneSignalPlayerId = id;
          
          // Mettre à jour Redux si l'utilisateur est connecté
          if (user && (playerIdFromRedux !== id || !hasSentPlayerId.current)) {
            console.log("Sauvegarde du nouveau Player ID dans Redux:", id);
            dispatch(savePlayerId(id));
            hasSentPlayerId.current = true;
          }
          return id;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }
      
      throw new Error("Impossible d'obtenir le Player ID après abonnement");
    } catch (error) {
      console.error("Erreur abonnement:", error);
      throw error;
    }
  };

  return {
    playerId: playerIdFromRedux || playerIdFromDevice,
    isInitialized: isInitialized, // Utiliser l'état local au lieu de window.__oneSignalInitialized
    subscribeManually,
  };
};

export default OneSignalSetup;
