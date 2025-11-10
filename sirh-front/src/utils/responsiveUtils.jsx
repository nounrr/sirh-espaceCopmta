// Utilitaires pour la gestion mobile responsive
import React, { useState, useEffect } from 'react';

/**
 * Hook pour détecter si on est sur mobile
 */
export const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= breakpoint);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);
  
  return isMobile;
};

/**
 * Hook pour différents breakpoints
 */
export const useBreakpoints = () => {
  const [breakpoints, setBreakpoints] = useState({
    xs: window.innerWidth <= 480,
    sm: window.innerWidth <= 576,
    md: window.innerWidth <= 768,
    lg: window.innerWidth <= 992,
    xl: window.innerWidth <= 1200,
    xxl: window.innerWidth > 1200
  });
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setBreakpoints({
        xs: width <= 480,
        sm: width <= 576,
        md: width <= 768,
        lg: width <= 992,
        xl: width <= 1200,
        xxl: width > 1200
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return breakpoints;
};

/**
 * Génère les classes CSS responsives automatiquement
 */
export const generateResponsiveClasses = (baseClasses, mobileClasses) => {
  const isMobile = window.innerWidth <= 768;
  return isMobile ? `${baseClasses} ${mobileClasses}` : baseClasses;
};

/**
 * Configuration responsive pour les tableaux
 */
export const getTableConfig = (isMobile) => {
  return {
    showPagination: !isMobile,
    itemsPerPage: isMobile ? 5 : 10,
    showSearch: true,
    cardView: isMobile,
    compactMode: isMobile
  };
};

/**
 * Configuration responsive pour les boutons
 */
export const getButtonConfig = (isMobile) => {
  return {
    size: isMobile ? 'sm' : 'md',
    fullWidth: isMobile,
    stackVertical: isMobile,
    showIconOnly: isMobile,
    compactText: isMobile
  };
};

/**
 * Configuration responsive pour les modales
 */
export const getModalConfig = (isMobile) => {
  return {
    size: isMobile ? 'fullscreen' : 'lg',
    backdrop: isMobile ? 'static' : true,
    keyboard: !isMobile,
    centered: !isMobile,
    scrollable: true
  };
};

/**
 * Configuration responsive pour les cards
 */
export const getCardConfig = (isMobile) => {
  return {
    border: !isMobile,
    shadow: isMobile ? 'sm' : 'md',
    rounded: isMobile ? 'rounded-3' : 'rounded',
    padding: isMobile ? 'p-3' : 'p-4',
    margin: isMobile ? 'mb-3' : 'mb-4'
  };
};

/**
 * Adapte automatiquement les props d'un composant pour mobile
 */
export const adaptPropsForMobile = (props, componentType = 'default') => {
  const isMobile = window.innerWidth <= 768;
  
  if (!isMobile) return props;
  
  const adaptations = {
    button: {
      size: 'sm',
      className: `${props.className || ''} w-100 mb-2`
    },
    card: {
      className: `${props.className || ''} shadow-sm rounded-3 mb-3`
    },
    modal: {
      ...props,
      size: 'fullscreen',
      className: `${props.className || ''} mobile-modal`
    },
    table: {
      ...props,
      responsive: true,
      size: 'sm',
      className: `${props.className || ''} mobile-table`
    },
    form: {
      ...props,
      className: `${props.className || ''} mobile-form`
    }
  };
  
  return {
    ...props,
    ...adaptations[componentType]
  };
};

/**
 * Classes CSS responsives prédéfinies
 */
export const responsiveClasses = {
  container: {
    base: 'container-fluid',
    mobile: 'px-2'
  },
  row: {
    base: 'row',
    mobile: 'g-2'
  },
  col: {
    base: 'col',
    mobile: 'col-12'
  },
  card: {
    base: 'card',
    mobile: 'card shadow-sm rounded-3 mb-3'
  },
  button: {
    base: 'btn',
    mobile: 'btn w-100 mb-2'
  },
  table: {
    base: 'table',
    mobile: 'table table-sm table-responsive'
  },
  text: {
    title: {
      base: 'h3 mb-3',
      mobile: 'h5 mb-2'
    },
    subtitle: {
      base: 'h5 text-muted',
      mobile: 'h6 text-muted'
    }
  }
};

/**
 * Générateur de styles inline responsifs
 */
export const responsiveStyles = {
  container: (isMobile) => ({
    padding: isMobile ? '0.5rem' : '1rem',
    margin: isMobile ? '0' : 'auto'
  }),
  button: (isMobile) => ({
    fontSize: isMobile ? '0.875rem' : '1rem',
    padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
    width: isMobile ? '100%' : 'auto',
    marginBottom: isMobile ? '0.5rem' : '0'
  }),
  table: (isMobile) => ({
    fontSize: isMobile ? '0.8rem' : '1rem',
    marginBottom: isMobile ? '1rem' : '1.5rem'
  }),
  card: (isMobile) => ({
    marginBottom: isMobile ? '1rem' : '1.5rem',
    borderRadius: isMobile ? '0.75rem' : '0.5rem',
    boxShadow: isMobile ? '0 2px 4px rgba(0,0,0,0.1)' : '0 4px 6px rgba(0,0,0,0.1)'
  })
};

/**
 * Utilitaire pour créer des composants wrapper responsifs
 */
export const withResponsive = (Component) => {
  return (props) => {
    const isMobile = useIsMobile();
    const adaptedProps = adaptPropsForMobile(props, props.componentType || 'default');
    
    return <Component {...adaptedProps} isMobile={isMobile} />;
  };
};

/**
 * Détection du type d'appareil
 */
export const getDeviceType = () => {
  const width = window.innerWidth;
  
  if (width <= 480) return 'mobile';
  if (width <= 768) return 'tablet';
  if (width <= 1024) return 'laptop';
  return 'desktop';
};

/**
 * Orientation de l'appareil
 */
export const useOrientation = () => {
  const [orientation, setOrientation] = useState(
    window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  );
  
  useEffect(() => {
    const handleResize = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      );
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return orientation;
};

export default {
  useIsMobile,
  useBreakpoints,
  generateResponsiveClasses,
  getTableConfig,
  getButtonConfig,
  getModalConfig,
  getCardConfig,
  adaptPropsForMobile,
  responsiveClasses,
  responsiveStyles,
  withResponsive,
  getDeviceType,
  useOrientation
};
