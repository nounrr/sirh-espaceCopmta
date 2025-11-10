import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { PageHeader, ResponsiveButton, ResponsiveButtonGroup } from './ResponsiveButton';

const MobileCard = ({ title, children, className = "", icon = null }) => {
  return (
    <div className={`mobile-card p-3 mb-3 bg-white rounded shadow-sm ${className}`}>
      {title && (
        <div className="mobile-card-header d-flex align-items-center mb-2 pb-2 border-bottom">
          {icon && <Icon icon={icon} width={20} className="me-2 text-primary" />}
          <h6 className="mb-0 fw-semibold">{title}</h6>
        </div>
      )}
      <div className="mobile-card-body">
        {children}
      </div>
    </div>
  );
};

const MobileStatCard = ({ label, value, icon, color = "primary", onClick = null }) => {
  const colorClasses = {
    primary: "text-primary bg-primary bg-opacity-10",
    success: "text-success bg-success bg-opacity-10", 
    danger: "text-danger bg-danger bg-opacity-10",
    warning: "text-warning bg-warning bg-opacity-10",
    info: "text-info bg-info bg-opacity-10"
  };

  return (
    <div 
      className={`mobile-stat-card p-3 rounded-3 text-center ${colorClasses[color]} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {icon && (
        <div className="mb-2">
          <Icon icon={icon} width={24} className={`text-${color}`} />
        </div>
      )}
      <div className={`h4 mb-1 fw-bold text-${color}`}>{value}</div>
      <div className="small text-muted">{label}</div>
    </div>
  );
};

const MobileFilterPanel = ({ children, isOpen, onToggle, title = "Filtres" }) => {
  return (
    <div className="mobile-filter-panel mb-3">
      <ResponsiveButton
        variant="outline-primary"
        icon="fluent:filter-24-regular"
        onClick={onToggle}
        className="w-100 mb-2"
      >
        {title}
        <Icon 
          icon={isOpen ? "fluent:chevron-up-24-regular" : "fluent:chevron-down-24-regular"} 
          width={16} 
          className="ms-auto" 
        />
      </ResponsiveButton>
      
      {isOpen && (
        <div className="mobile-filter-content p-3 bg-light rounded">
          {children}
        </div>
      )}
    </div>
  );
};

const MobileActionSheet = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="mobile-action-sheet">
      <div className="mobile-action-overlay" onClick={onClose}></div>
      <div className="mobile-action-content">
        <div className="mobile-action-header p-3 border-bottom">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">{title}</h6>
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>
              <Icon icon="fluent:dismiss-24-regular" width={16} />
            </button>
          </div>
        </div>
        <div className="mobile-action-body p-3">
          {children}
        </div>
      </div>
    </div>
  );
};

const ResponsivePage = ({ 
  title, 
  subtitle = null, 
  actions = null, 
  breadcrumb = null,
  filters = null,
  stats = null,
  children,
  className = ""
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showFilters, setShowFilters] = useState(false);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`responsive-page ${className}`} style={{ 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
      minHeight: '100vh', 
      padding: isMobile ? '0.5rem' : '1rem' 
    }}>
      <div className={`container-fluid ${isMobile ? 'px-2' : 'px-4'}`}>
        
        {/* Header */}
        <PageHeader
          title={title}
          subtitle={subtitle}
          breadcrumb={breadcrumb}
          actions={actions}
        />

        {/* Filtres mobiles */}
        {filters && isMobile && (
          <MobileFilterPanel
            isOpen={showFilters}
            onToggle={() => setShowFilters(!showFilters)}
          >
            {filters}
          </MobileFilterPanel>
        )}

        {/* Filtres desktop */}
        {filters && !isMobile && (
          <div className="filters-section mb-4">
            {filters}
          </div>
        )}

        {/* Statistiques */}
        {stats && (
          <div className={`stats-section mb-4 ${isMobile ? 'row g-2' : 'row g-3'}`}>
            {stats}
          </div>
        )}

        {/* Contenu principal */}
        <div className="main-content">
          {children}
        </div>
      </div>

      {/* Styles pour le mobile action sheet */}
      <style jsx>{`
        .mobile-action-sheet .mobile-action-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1040;
        }
        
        .mobile-action-sheet .mobile-action-content {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-radius: 1rem 1rem 0 0;
          z-index: 1050;
          max-height: 80vh;
          overflow-y: auto;
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
        
        .cursor-pointer:hover {
          transform: translateY(-2px);
          transition: transform 0.2s ease;
        }
      `}</style>
    </div>
  );
};

export { 
  ResponsivePage, 
  MobileCard, 
  MobileStatCard, 
  MobileFilterPanel, 
  MobileActionSheet 
};
export default ResponsivePage;
