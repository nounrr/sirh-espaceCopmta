import React from 'react';
import { Icon } from '@iconify/react';

const AuditDetailsModal = ({ audit, isOpen, onClose }) => {
  if (!isOpen || !audit) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getEntityTypeLabel = (type) => {
    switch (type) {
      case 'App\\Models\\Project': return 'Projet';
      case 'App\\Models\\TodoList': return 'Liste de tâches';
      case 'App\\Models\\TodoTask': return 'Tâche';
      default: return type;
    }
  };

  const getEventLabel = (event) => {
    switch (event) {
      case 'created': return 'Création';
      case 'updated': return 'Modification';
      case 'deleted': return 'Suppression';
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

  const renderValues = (values, title) => {
    if (!values || typeof values !== 'object') return null;

    return (
      <div className="mb-4">
        <h6 className="fw-bold text-muted mb-3">{title}</h6>
        <div className="bg-light rounded p-3">
          {Object.entries(values).map(([key, value]) => (
            <div key={key} className="row mb-2">
              <div className="col-4">
                <strong className="text-muted">{key}:</strong>
              </div>
              <div className="col-8">
                <span className="text-dark">
                  {value === null ? (
                    <em className="text-muted">null</em>
                  ) : typeof value === 'boolean' ? (
                    value ? 'Vrai' : 'Faux'
                  ) : (
                    String(value)
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderChanges = () => {
    if (!audit.old_values || !audit.new_values) return null;

    const oldValues = audit.old_values;
    const newValues = audit.new_values;
    const changedFields = [];

    // Comparer les anciennes et nouvelles valeurs
    Object.keys(newValues).forEach(key => {
      if (oldValues[key] !== newValues[key]) {
        changedFields.push({
          field: key,
          oldValue: oldValues[key],
          newValue: newValues[key]
        });
      }
    });

    if (changedFields.length === 0) return null;

    return (
      <div className="mb-4">
        <h6 className="fw-bold text-muted mb-3">Modifications détaillées</h6>
        <div className="table-responsive">
          <table className="table table-sm table-bordered">
            <thead className="table-light">
              <tr>
                <th>Champ</th>
                <th>Ancienne valeur</th>
                <th>Nouvelle valeur</th>
              </tr>
            </thead>
            <tbody>
              {changedFields.map(({ field, oldValue, newValue }) => (
                <tr key={field}>
                  <td className="fw-bold">{field}</td>
                  <td>
                    <span className="text-danger">
                      {oldValue === null ? <em>null</em> : String(oldValue)}
                    </span>
                  </td>
                  <td>
                    <span className="text-success">
                      {newValue === null ? <em>null</em> : String(newValue)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
      <div className="modal-backdrop fade show" onClick={onClose}></div>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <div className="d-flex align-items-center gap-3">
              <div 
                className="p-2 rounded-circle"
                style={{ 
                  backgroundColor: `${getEventColor(audit.event)}20`,
                  color: getEventColor(audit.event)
                }}
              >
                <Icon icon={getEventIcon(audit.event)} style={{ fontSize: '1.5rem' }} />
              </div>
              <div>
                <h5 className="modal-title mb-0">Détails de l'audit</h5>
                <small className="text-muted">
                  {getEventLabel(audit.event)} - {getEntityTypeLabel(audit.auditable_type)}
                </small>
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
            {/* Informations générales */}
            <div className="mb-4">
              <h6 className="fw-bold text-muted mb-3">Informations générales</h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="d-flex align-items-center gap-2 p-3 bg-light rounded">
                    <Icon icon="mdi:calendar-clock" className="text-primary" />
                    <div>
                      <small className="text-muted d-block">Date et heure</small>
                      <strong>{formatDate(audit.created_at)}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center gap-2 p-3 bg-light rounded">
                    <Icon icon="mdi:account" className="text-primary" />
                    <div>
                      <small className="text-muted d-block">Utilisateur</small>
                      <strong>
                        {audit.user ? `${audit.user.prenom} ${audit.user.name}` : 'Système'}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center gap-2 p-3 bg-light rounded">
                    <Icon icon="mdi:shape" className="text-primary" />
                    <div>
                      <small className="text-muted d-block">Type d'entité</small>
                      <strong>{getEntityTypeLabel(audit.auditable_type)}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center gap-2 p-3 bg-light rounded">
                    <Icon icon="mdi:identifier" className="text-primary" />
                    <div>
                      <small className="text-muted d-block">ID de l'entité</small>
                      <strong>{audit.auditable_id}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center gap-2 p-3 bg-light rounded">
                    <Icon icon="mdi:ip-network" className="text-primary" />
                    <div>
                      <small className="text-muted d-block">Adresse IP</small>
                      <strong>{audit.ip_address || 'Non disponible'}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center gap-2 p-3 bg-light rounded">
                    <Icon icon="mdi:link" className="text-primary" />
                    <div>
                      <small className="text-muted d-block">URL</small>
                      <strong className="text-break">
                        {audit.url || 'Non disponible'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modifications détaillées pour les mises à jour */}
            {audit.event === 'updated' && renderChanges()}

            {/* Anciennes valeurs (pour les suppressions) */}
            {audit.event === 'deleted' && audit.old_values && 
              renderValues(audit.old_values, "Données supprimées")
            }

            {/* Nouvelles valeurs (pour les créations) */}
            {audit.event === 'created' && audit.new_values && 
              renderValues(audit.new_values, "Données créées")
            }

            {/* Données complètes si pas de modifications détaillées */}
            {audit.event === 'updated' && (!audit.old_values || !audit.new_values) && (
              <>
                {audit.old_values && renderValues(audit.old_values, "Anciennes valeurs")}
                {audit.new_values && renderValues(audit.new_values, "Nouvelles valeurs")}
              </>
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
  );
};

export default AuditDetailsModal;
