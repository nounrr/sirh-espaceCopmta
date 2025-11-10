import { useEffect, useState } from "react";
import { isInStandaloneMode } from "./utils/pwaUtils"; // Chemin corrigé

function InstallPWAButtonIOSNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isIOSSafari = isIOS && /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    
    // Afficher seulement pour iOS Safari et si pas déjà installé
    if (isIOSSafari && !isInStandaloneMode()) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        background: "#fffbe7",
        padding: "1.2em",
        border: "1px solid #ecd992",
        borderRadius: "10px",
        color: "#664c0f",
        fontSize: "1rem",
        maxWidth: 400,
        margin: "2em auto",
        boxShadow: "0 2px 8px rgba(220,180,80,0.1)",
      }}
    >
      <span style={{ fontSize: "1.4em" }}>📲</span> <br />
      Pour installer cette application&nbsp;: <br />
      <b>
        Touchez <span style={{ fontSize: "1.1em" }}> <u>Partager</u> <span role="img" aria-label="Share">🔗</span> </span>
        puis «&nbsp;Sur l’écran d’accueil&nbsp;»
      </b>
      <div style={{fontSize:".9em",marginTop:"0.7em"}}>
        <em>
          Astuce : l’icône <b>Partager</b> ressemble à ceci : <span role="img" aria-label="Share">⬆️</span> (en bas de l’écran)
        </em>
      </div>
      {/* Optionnel: capture écran d’exemple
      <img src="/images/ios-install-guide.png" alt="Guide iOS" style={{maxWidth:'80%',marginTop:'1em'}} />
      */}
    </div>
  );
}

export default InstallPWAButtonIOSNotice;
