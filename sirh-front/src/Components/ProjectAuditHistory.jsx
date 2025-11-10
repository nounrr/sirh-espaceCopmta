import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Icon } from '@iconify/react';
import { fetchEntityHistory } from '../Redux/Slices/auditSlice';
import AuditDetailsModal from './AuditDetailsModal';

const ProjectAuditHistory = ({ projectId, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { entityHistory, status } = useSelector(state => state.audits);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    if (isOpen && projectId) {
      dispatch(fetchEntityHistory({ entityType: 'project', entityId: projectId }));
    }
  }, [dispatch, isOpen, projectId]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventLabel = (event) => {
    switch (event) {
      case 'created': return 'Créé';
      case 'updated': return 'Modifié';
      case 'deleted': return 'Supprimé';
      default: return event;
    }
  };

  const getEventIcon = (event) => {
    switch (event) {
      case 'created': return 'mdi:plus-circle';
      case 'updated': return 'mdi:pencil-circle';
      case 'deleted': return 'mdi:delete-circle';
      default: return 'mdi:circle';
    }
  };

  const getEventColor = (event) => {
    switch (event) {
      case 'created': return '#28a745';
      case 'updated': return '#ffc107';
      case 'deleted': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const handleShowDetails = (audit) => {
    setSelectedAudit(audit);
    setShowDetailsModal(true);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
        <div className="modal-backdrop fade show" onClick={onClose}></div>
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <div className="d-flex align-items-center gap-3">
                <div className="p-2 rounded-circle bg-primary bg-opacity-10">
                  <Icon icon="mdi:history" style={{ fontSize: '1.5rem', color: '#0d6efd' }} />
                </div>
                <div>
                  <h5 className="modal-title mb-0">Historique d'audit du projet</h5>
                  <small className="text-muted">Toutes les modifications apportées à ce projet</small>
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Fermer"
              ></button>
            </div>
            
            <div className="modal-body">
              {status === 'loading' ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary mb-3">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                  <p className="text-muted">Chargement de l'historique...</p>
                </div>
              ) : entityHistory.length === 0 ? (
                <div className="text-center py-5">
                  <Icon icon="mdi:history" style={{ fontSize: '4rem', color: '#6c757d' }} />
                  <h5 className="text-muted mt-3">Aucun historique</h5>
                  <p className="text-muted">Aucune modification n'a été enregistrée pour ce projet</p>
                </div>
              ) : (
                <div className="timeline">
                  {entityHistory.map((audit, index) => (
                    <div key={audit.id} className="timeline-item mb-4">
                      <div className="d-flex gap-3">
                        <div className="flex-shrink-0 d-flex flex-column align-items-center">
                          <div 
                            className="p-2 rounded-circle"
                            style={{ 
                              backgroundColor: `${getEventColor(audit.event)}20`,
                              color: getEventColor(audit.event),
                              border: `2px solid ${getEventColor(audit.event)}`
                            }}
                          >
                            <Icon icon={getEventIcon(audit.event)} style={{ fontSize: '1.2rem' }} />
                          </div>
                          {index < entityHistory.length - 1 && (
                            <div 
                              style={{ 
                                width: '2px', 
                                height: '60px', 
                                backgroundColor: '#e9ecef',
                                marginTop: '8px'
                              }}
                            ></div>
                          )}
                        </div>
                        
                        <div className="flex-grow-1">
                          <div className="card border-0 shadow-sm">
                            <div className="card-body p-3">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                  <h6 className="mb-1">
                                    <span style={{ color: getEventColor(audit.event) }}>
                                      {getEventLabel(audit.event)}
                                    </span>
                                    {' par '}
                                    <strong>
                                      {audit.user ? `${audit.user.prenom} ${audit.user.name}` : 'Système'}
                                    </strong>
                                  </h6>
                                  <small className="text-muted">
                                    <Icon icon="mdi:clock-outline" className="me-1" />
                                    {formatDate(audit.created_at)}
                                  </small>
                                </div>
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleShowDetails(audit)}
                                >
                                  <Icon icon="mdi:eye" className="me-1" />
                                  Détails
                                </button>
                              </div>
                              
                              {audit.ip_address && (
                                <div className="mt-2">
                                  <small className="text-muted">
                                    <Icon icon="mdi:ip-network" className="me-1" />
                                    IP: {audit.ip_address}
                                  </small>
                                </div>
                              )}
                              
                              {/* Aperçu des modifications pour les updates */}
                              {audit.event === 'updated' && audit.old_values && audit.new_values && (
                                <div className="mt-3">
                                  <small className="text-muted">Champs modifiés:</small>
                                  <div className="mt-1">
                                    {Object.keys(audit.new_values).filter(key => 
                                      audit.old_values[key] !== audit.new_values[key]
                                    ).map(field => (
                                      <span key={field} className="badge bg-light text-dark me-1 mb-1">
                                        {field}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal des détails d'audit */}
      <AuditDetailsModal
        audit={selectedAudit}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedAudit(null);
        }}
      />
    </>
  );
};

export default ProjectAuditHistory;
