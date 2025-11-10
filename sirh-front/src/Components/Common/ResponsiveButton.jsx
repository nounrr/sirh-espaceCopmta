import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

const ResponsiveButton = ({ 
  children, 
  icon = null, 
  variant = "primary", 
  size = "md", 
  className = "", 
  mobileText = null,
  mobileIcon = null,
  fullWidthMobile = true,
  ...props 
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const baseClasses = `btn btn-${variant}`;
  const sizeClasses = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  const mobileClasses = isMobile && fullWidthMobile ? "w-100 mb-2" : "";
  const finalClasses = `${baseClasses} ${sizeClasses} ${mobileClasses} ${className}`.trim();

  const displayText = isMobile && mobileText ? mobileText : children;
  const displayIcon = isMobile && mobileIcon ? mobileIcon : icon;

  return (
    <button className={finalClasses} {...props}>
      {displayIcon && (
        <Icon icon={displayIcon} width={isMobile ? 16 : 18} className="me-2" />
      )}
      <span className={isMobile ? "d-inline" : "d-none d-md-inline"}>
        {displayText}
      </span>
      {isMobile && typeof displayText === 'string' && displayText.length > 10 && (
        <span className="d-md-none">
          {displayText.substring(0, 10)}...
        </span>
      )}
    </button>
  );
};

const ResponsiveButtonGroup = ({ 
  children, 
  className = "", 
  vertical = false,
  mobileVertical = true 
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isVertical = isMobile ? mobileVertical : vertical;
  const groupClasses = isVertical 
    ? `btn-group-vertical w-100 ${className}` 
    : `btn-group ${className}`;

  return (
    <div className={groupClasses} role="group">
      {children}
    </div>
  );
};

// Composant pour les actions de page (titre + boutons)
const PageHeader = ({ 
  title, 
  subtitle = null, 
  actions = null, 
  breadcrumb = null,
  className = "" 
}) => {
  return (
    <div className={`page-header mb-4 ${className}`}>
      {breadcrumb && (
        <nav aria-label="breadcrumb" className="mb-2">
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
      
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-md-center gap-3">
        <div className="page-title-section">
          <h1 className="page-title mb-1">{title}</h1>
          {subtitle && (
            <p className="text-muted mb-0 small">{subtitle}</p>
          )}
        </div>
        
        {actions && (
          <div className="page-actions d-flex flex-column flex-md-row gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export { ResponsiveButton, ResponsiveButtonGroup, PageHeader };
export default ResponsiveButton;
