import { useState, useEffect } from 'react';

// Hook pour détecter si l'écran est mobile
export const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Vérification initiale
    checkIsMobile();

    // Écouter les changements de taille d'écran
    window.addEventListener('resize', checkIsMobile);

    // Nettoyer l'event listener
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, [breakpoint]);

  return isMobile;
};

// Hook pour détecter la taille d'écran (breakpoints Bootstrap)
export const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState('lg');

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 576) {
        setScreenSize('xs');
      } else if (width < 768) {
        setScreenSize('sm');
      } else if (width < 992) {
        setScreenSize('md');
      } else if (width < 1200) {
        setScreenSize('lg');
      } else {
        setScreenSize('xl');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  return screenSize;
};