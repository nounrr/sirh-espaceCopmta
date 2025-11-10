import { useRegisterSW } from 'virtual:pwa-register/react';
import { useState } from 'react';

export default function UpdatePWAButton() {
  const { needRefresh, updateServiceWorker } = useRegisterSW();
  const [updated, setUpdated] = useState(false);

  const handleUpdate = () => {
    updateServiceWorker(true);
    setUpdated(true);
  };

  if (updated) {
    return <span style={{color: 'green'}}>Mise à jour appliquée, veuillez patienter...</span>;
  }

  return needRefresh ? (
    <button
      style={{
        backgroundColor: "rgb(249 223 255)",
        color: "rgb(181 38 220)",
        borderRadius: "8px",
        padding: "8px",
        fontWeight: 500,
        transition: "all 0.3s ease",
      }}
      onClick={handleUpdate}
    >
      Nouvelle version disponible – Cliquez pour mettre à jour
    </button>
  ) : null;
}
