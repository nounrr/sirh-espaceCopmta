// src/Components/NotificationRequiredModal.js
import React from 'react';

export default function NotificationRequiredModal({ onAllow }) {
  return (
    <div style={{
      position: "fixed", zIndex: 9999, top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#fff", padding: 40, borderRadius: 10, textAlign: "center", maxWidth: 400, boxShadow: "0 0 20px #3334"
      }}>
        <h2>Notifications requises</h2>
        <p>Pour accéder à la plateforme, vous devez activer les notifications.<br/>
        Veuillez cliquer sur le bouton ci-dessous pour autoriser les notifications.</p>
        <button onClick={onAllow} style={{
          background: "#2b7dfa", color: "#fff", border: "none", padding: "12px 32px", borderRadius: 8, fontSize: 18, marginTop: 30
        }}>Autoriser les notifications</button>
      </div>
    </div>
  );
}
