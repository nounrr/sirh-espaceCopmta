import React from 'react';
import { useNavigate } from 'react-router-dom';
import OneSignalSetup from './OneSignalSetup';

const ModalNotif = () => {
  const navigate = useNavigate();
  const {
    isInitialized,
    subscribeManually
  } = OneSignalSetup();

  const handleSubscribe = async () => {
    if (!isInitialized) return;

    try {
      await subscribeManually();
      // Affiche une alerte personnalisée obligatoire
      window.alert("Merci d'avoir activé les notifications ! Vous serez informé des nouveautés RH. Cliquez sur OK pour continuer.");
      // Ferme la modale et redirige vers le dashboard
      navigate('/dashboard');
    } catch (error) {
      window.alert("Erreur lors de l'abonnement : " + error.message);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>🔔 Autoriser les notifications</h2>
        <p style={styles.text}>
          Pour continuer, cliquez sur le bouton ci-dessous pour autoriser les notifications push.
        </p>
        <button
          onClick={handleSubscribe}
          style={{
            ...styles.button,
            backgroundColor: isInitialized ? '#28a745' : '#cccccc',
            cursor: isInitialized ? 'pointer' : 'not-allowed',
            opacity: isInitialized ? 1 : 0.6
          }}
        >
          Autoriser les notifications
        </button>
        
        {!isInitialized && (
          <p style={styles.loading}>
            Initialisation en cours... Veuillez patienter quelques secondes.
          </p>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '30px',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
  },
  title: {
    marginBottom: '15px',
    fontSize: '1.6rem',
    color: '#333'
  },
  text: {
    marginBottom: '20px',
    fontSize: '1rem',
    color: '#555'
  },
  loading: {
    marginTop: '15px',
    fontSize: '0.9rem',
    color: '#777'
  },
  button: {
    padding: '12px 25px',
    fontSize: '1rem',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    transition: 'background-color 0.3s ease'
  }
};

export default ModalNotif;
