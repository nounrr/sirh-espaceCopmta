import React from 'react';
import { useIsMobile, responsiveClasses } from '../../utils/responsiveUtils.jsx';
import { Icon } from '@iconify/react';

/**
 * Wrapper automatique pour rendre n'importe quel composant responsive
 */
const AutoMobileWrapper = ({ 
  children, 
  containerClass = '', 
  enableAutoCards = true,
  enableAutoButtons = true,
  enableAutoTables = true 
}) => {
  const isMobile = useIsMobile();

  const processChildren = (children) => {
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;

      // Auto-transformation des éléments selon leur type
      const elementType = child.type;
      const props = child.props;

      // Cards automatiques
      if (enableAutoCards && (elementType === 'div' && props.className?.includes('card'))) {
        return React.cloneElement(child, {
          ...props,
          className: `${props.className} ${isMobile ? 'shadow-sm rounded-3 mb-3' : ''}`,
          children: processChildren(props.children)
        });
      }

      // Boutons automatiques
      if (enableAutoButtons && (elementType === 'button' || props.className?.includes('btn'))) {
        return React.cloneElement(child, {
          ...props,
          className: `${props.className} ${isMobile ? 'w-100 mb-2' : ''}`,
          children: processChildren(props.children)
        });
      }

      // Tables automatiques
      if (enableAutoTables && elementType === 'table') {
        return isMobile ? (
          <div className="table-mobile-wrapper">
            <div className="alert alert-info">
              <Icon icon="fluent:phone-24-regular" width={16} className="me-2" />
              Tableau optimisé pour mobile
            </div>
            {/* Convertir en format cards */}
            <div className="mobile-table-cards">
              {processTableToCards(child)}
            </div>
          </div>
        ) : child;
      }

      // Récursivement traiter les enfants
      if (props.children) {
        return React.cloneElement(child, {
          ...props,
          children: processChildren(props.children)
        });
      }

      return child;
    });
  };

  const processTableToCards = (tableElement) => {
    // Extraction des données du tableau pour créer des cards
    const thead = tableElement.props.children?.find(child => child.type === 'thead');
    const tbody = tableElement.props.children?.find(child => child.type === 'tbody');
    
    if (!thead || !tbody) return tableElement;

    const headers = thead.props.children.props.children.map(th => th.props.children);
    const rows = Array.isArray(tbody.props.children) ? tbody.props.children : [tbody.props.children];

    return rows.map((row, index) => {
      const cells = Array.isArray(row.props.children) ? row.props.children : [row.props.children];
      
      return (
        <div key={index} className="card mb-3 border-start border-primary border-3">
          <div className="card-body p-3">
            {cells.map((cell, cellIndex) => (
              <div key={cellIndex} className="row mb-2">
                <div className="col-4 fw-bold text-muted small">
                  {headers[cellIndex]}
                </div>
                <div className="col-8">
                  {cell.props.children}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  return (
    <div className={`auto-mobile-wrapper ${containerClass} ${isMobile ? 'mobile-optimized' : 'desktop-view'}`}>
      {processChildren(children)}
    </div>
  );
};

/**
 * HOC pour rendre automatiquement un composant responsive
 */
export const withAutoMobile = (WrappedComponent) => {
  return (props) => {
    const isMobile = useIsMobile();
    
    return (
      <AutoMobileWrapper>
        <WrappedComponent {...props} isMobile={isMobile} />
      </AutoMobileWrapper>
    );
  };
};

/**
 * Composant pour forcer l'affichage mobile en dev/test
 */
export const ForceMobileView = ({ children, force = false }) => {
  const realIsMobile = useIsMobile();
  
  // Override le hook pour forcer le mode mobile
  React.useEffect(() => {
    if (force) {
      // Temporary override window width for testing
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
    }
  }, [force]);

  return (
    <div className={`${force || realIsMobile ? 'force-mobile-view' : ''}`}>
      {children}
    </div>
  );
};

/**
 * Détecteur de changement d'orientation
 */
export const OrientationHandler = ({ children, onOrientationChange }) => {
  React.useEffect(() => {
    const handleOrientationChange = () => {
      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      onOrientationChange?.(orientation);
    };

    window.addEventListener('resize', handleOrientationChange);
    return () => window.removeEventListener('resize', handleOrientationChange);
  }, [onOrientationChange]);

  return children;
};

export default AutoMobileWrapper;
