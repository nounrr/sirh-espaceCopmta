// src/hooks/useOneSignal.js
import { useEffect, useCallback } from 'react';
import OneSignal from 'react-onesignal';

export const useOneSignal = (isAuthenticated, userId) => {
  const handleActivateNotifications = useCallback(async () => {
    try {
      await OneSignal.init({
        appId: "685f188c-1532-4ba4-b96a-919233c9eae2",
        allowLocalhostAsSecureOrigin: true,
      });

      const permission = await OneSignal.Notifications.permission;
      
      if (!permission) {
        const accepted = window.confirm("Voulez-vous activer les notifications ?");
        if (accepted) {
          const result = await OneSignal.Notifications.requestPermission();
          if (result) {
            const playerId = await OneSignal.User.pushSubscription.getId();
            await fetch(`http://127.0.0.1:8001/api/users/${userId}/onesignal-player-id`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({ onesignal_player_id: playerId }),
            });
          }
        }
      }
    } catch (error) {
      console.error("Erreur OneSignal:", error);
    }
  }, [userId]);

  return { handleActivateNotifications };
};
