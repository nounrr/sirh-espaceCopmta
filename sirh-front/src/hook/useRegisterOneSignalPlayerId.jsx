// src/hook/useRegisterOneSignalPlayerId.js
import { useEffect } from "react";
import OneSignal from "react-onesignal";
import api from "../config/axios";

export default function useRegisterOneSignalPlayerId(userId) {
  useEffect(() => {
    if (!userId || !window.OneSignal) return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      const register = async () => {
        const playerId = await OneSignal.getUserId();
        if (playerId) {
          await api.post(`/users/${userId}/onesignal`, { player_id: playerId });
        }
      };

      // Déjà abonné ? Enregistre tout de suite
      const enabled = await OneSignal.isPushNotificationsEnabled();
      if (enabled) {
        register();
      }

      // S’abonne maintenant ? Écoute le changement
      OneSignal.on('subscriptionChange', (isSubscribed) => {
        if (isSubscribed) {
          register();
        }
      });
    });
  }, [userId]);
}
