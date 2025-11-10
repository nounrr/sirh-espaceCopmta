import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

const MobilePageHeader = ({ 
  title, 
  subtitle = null, 
  actions = null, 
  breadcrumb = null,
  className = "",
  centerOnMobile = false,
  stackActions = true
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const headerClasses = isMobile 
    ? `header-with-actions ${centerOnMobile ? 'text-center' : ''} ${className}`
    : `d-flex justify-content-between align-items-center ${className}`;

  return (
    <div className={`page-header mb-4 ${headerClasses}`}>
      {/* Breadcrumb */}
      {breadcrumb && (
        <nav aria-label="breadcrumb" className="mb-2 w-100">
          <ol className="breadcrumb mb-0">
            {breadcrumb.map((item, index) => (
              <li 
                key={index} 
                className={`breadcrumb-item ${index === breadcrumb.length - 1 ? 'active' : ''}`}
                {...(index === breadcrumb.length - 1 ? { 'aria-current': 'page' } : {})}
              >
                {item.icon && <Icon icon={item.icon} width={14} className="me-1" />}
                {item.href ? (
                  <a href={item.href} className="text-decoration-none">
                    {item.text}
                  </a>
                ) : (
                  item.text
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      
      {/* Section titre et sous-titre */}
      <div className={`header-title ${isMobile ? 'w-100 mb-3' : ''}`}>
        <h1 className={`page-title mb-1 ${isMobile ? 'fs-4' : 'fs-3'}`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`text-muted mb-0 ${isMobile ? 'small' : ''}`}>
            {subtitle}
          </p>
        )}
      </div>
      
      {/* Actions/Boutons */}
      {actions && (
        <div className={`header-actions ${
          isMobile 
            ? 'w-100 d-flex flex-column gap-2' 
            : 'd-flex gap-2 align-items-center'
        }`}>
          {Array.isArray(actions) ? (
            actions.map((action, index) => (
              <div key={index} className={isMobile ? 'w-100' : ''}>
                {action}
              </div>
            ))
          ) : (
            <div className={isMobile ? 'w-100' : ''}>
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MobileCardHeader = ({ 
  title, 
  subtitle = null, 
  actions = null, 
  icon = null,
  className = "" 
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`card-header ${isMobile ? 'd-flex flex-column align-items-start' : 'd-flex justify-content-between align-items-center'} ${className}`}>
      {/* Titre avec icône */}
      <div className={`d-flex align-items-center ${isMobile ? 'mb-2 w-100' : ''}`}>
        {icon && (
          <Icon icon={icon} width={isMobile ? 20 : 24} className="me-2 text-primary" />
        )}
        <div>
          <h5 className={`mb-0 fw-bold ${isMobile ? 'fs-6' : 'fs-5'}`}>
            {title}
          </h5>
          {subtitle && (
            <small className="text-muted d-block">
              {subtitle}
            </small>
          )}
        </div>
      </div>
      
      {/* Actions */}
      {actions && (
        <div className={`${
          isMobile 
            ? 'w-100 d-flex flex-column gap-2' 
            : 'd-flex gap-2'
        }`}>
          {Array.isArray(actions) ? (
            actions.map((action, index) => (
              <div key={index} className={isMobile ? 'w-100' : ''}>
                {action}
              </div>
            ))
          ) : (
            <div className={isMobile ? 'w-100' : ''}>
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MobileModalHeader = ({ 
  title, 
  onClose, 
  actions = null,
  className = "" 
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`modal-header ${isMobile ? 'modal-header-responsive' : ''} ${className}`}>
      {/* Titre */}
      <div className={`d-flex align-items-center ${isMobile ? 'w-100 justify-content-between' : ''}`}>
        <h5 className="modal-title mb-0">
          {title}
        </h5>
        {!isMobile && (
          <button 
            type="button" 
            className="btn-close" 
            onClick={onClose}
            aria-label="Close"
          />
        )}
      </div>
      
      {/* Actions mobiles */}
      {actions && (
        <div className={`modal-actions ${
          isMobile 
            ? 'w-100 d-flex flex-column gap-2' 
            : 'd-flex gap-2 me-3'
        }`}>
          {Array.isArray(actions) ? (
            actions.map((action, index) => (
              <div key={index} className={isMobile ? 'w-100' : ''}>
                {action}
              </div>
            ))
          ) : (
            <div className={isMobile ? 'w-100' : ''}>
              {actions}
            </div>
          )}
        </div>
      )}
      
      {/* Bouton fermer mobile */}
      {isMobile && (
        <button 
          type="button" 
          className="btn btn-outline-secondary w-100" 
          onClick={onClose}
        >
          <Icon icon="fluent:dismiss-24-regular" width={16} className="me-2" />
          Fermer
        </button>
      )}
    </div>
  );
};

// Composant d'aide pour automatiquement wrapper les layouts existants
const AutoMobileLayout = ({ children, type = "page" }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isMobile) return children;

  // Transform desktop layout to mobile on the fly
  return (
    <div className="auto-mobile-layout">
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        
        // Add mobile classes automatically
        const newProps = {
          ...child.props,
          className: `${child.props.className || ''} mobile-responsive`,
        };
        
        return React.cloneElement(child, newProps);
      })}
    </div>
  );
};

export { 
  MobilePageHeader, 
  MobileCardHeader, 
  MobileModalHeader, 
  AutoMobileLayout 
};
export default MobilePageHeader;
