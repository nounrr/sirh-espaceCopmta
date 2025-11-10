import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

const ResponsiveTable = ({ 
  headers, 
  data, 
  actions = null, 
  title = null,
  searchable = false,
  className = ""
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filtrage des données
  const filteredData = searchable && searchTerm 
    ? data.filter(row => 
        Object.values(row).some(value => 
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : data;

  // Rendu mobile (cartes)
  const MobileView = () => (
    <div className="mobile-card-table show-mobile">
      {title && (
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-md-center mb-3 gap-2">
          <h5 className="mb-0 page-title">{title}</h5>
          {searchable && (
            <div className="w-100 w-md-auto">
              <div className="input-group">
                <span className="input-group-text">
                  <Icon icon="fluent:search-24-regular" width="16" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}
      
      {filteredData.length === 0 ? (
        <div className="text-center py-4">
          <Icon icon="fluent:inbox-24-regular" width="48" className="text-muted mb-2" />
          <p className="text-muted">Aucune donnée disponible</p>
        </div>
      ) : (
        filteredData.map((row, index) => {
          const entries = Object.entries(row).filter(([k]) => k !== '_subRow');
          return (
            <div key={index} className="table-card">
              <div className="table-card-header">
                {headers[0]}: {row[entries[0][0]]}
              </div>
              {entries.slice(1).map(([key, value], idx) => (
                <div key={idx} className="table-card-row">
                  <span className="table-card-label">{headers[entries.findIndex(e => e[0] === key)]}</span>
                  <span className="table-card-value">
                    {value && typeof value === 'object' && value.type === 'component' && value.render
                      ? value.render()
                      : typeof value === 'object' && value !== null
                      ? String(value)
                      : value}
                  </span>
                </div>
              ))}
              {row._subRow && (
                <div className="table-card-row mt-2 pt-2" style={{ borderTop: '2px solid #e9ecef' }}>
                  <span className="table-card-label">Détails</span>
                  <div className="table-card-value">
                    {row._subRow && row._subRow.type === 'component' ? row._subRow.render() : row._subRow}
                  </div>
                </div>
              )}
              {actions && (
                <div className="table-card-row mt-2 pt-2" style={{ borderTop: '2px solid #e9ecef' }}>
                  <span className="table-card-label">Actions</span>
                  <div className="table-card-value">
                    {actions(row, index)}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  // Rendu desktop (tableau classique)
  const DesktopView = () => (
    <div className="desktop-table">
      {title && (
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-md-center mb-3 gap-2 page-header">
          <h5 className="mb-0 page-title">{title}</h5>
          {searchable && (
            <div className="w-100 w-md-auto page-actions">
              <div className="input-group">
                <span className="input-group-text">
                  <Icon icon="fluent:search-24-regular" width="16" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="table-responsive">
        <table className={`table table-hover align-middle ${className}`}>
          <thead className="table-light">
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="fw-semibold">
                  {header}
                </th>
              ))}
              {actions && <th className="fw-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={headers.length + (actions ? 1 : 0)} className="text-center py-4">
                  <Icon icon="fluent:inbox-24-regular" width="48" className="text-muted mb-2 d-block mx-auto" />
                  <span className="text-muted">Aucune donnée disponible</span>
                </td>
              </tr>
            ) : (
              filteredData.map((row, index) => {
                const entries = Object.entries(row).filter(([k]) => k !== '_subRow');
                return (
                  <React.Fragment key={index}>
                    <tr>
                      {entries.map(([key, value], idx) => (
                        <td key={idx}>
                          {value && typeof value === 'object' && value.type === 'component' && value.render
                            ? value.render()
                            : typeof value === 'object' && value !== null
                            ? String(value)
                            : value}
                        </td>
                      ))}
                      {actions && (
                        <td>
                          {actions(row, index)}
                        </td>
                      )}
                    </tr>
                    {row._subRow && (
                      <tr className="table-active">
                        <td colSpan={headers.length + (actions ? 1 : 0)}>
                          {row._subRow.type === 'component' ? row._subRow.render() : row._subRow}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return isMobile ? <MobileView /> : <DesktopView />;
};

export default ResponsiveTable;
