import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Icon } from '@iconify/react';
import { 
  generateLeaveReport, 
  validateLeaveRequest, 
  calculateDaysBetween 
} from '../services/leaveCalculationService';

const LeaveValidationWidget = ({ 
  userId, 
  startDate, 
  endDate, 
  requestType = 'Congé',
  onValidationChange = () => {},
  showDetails = true 
}) => {
  const { items: absenceRequests } = useSelector((state) => state.absenceRequests);
  const { items: users } = useSelector((state) => state.users);
  
  const [employee, setEmployee] = useState(null);
  const [leaveReport, setLeaveReport] = useState(null);
  const [validation, setValidation] = useState(null);
  const [requestDays, setRequestDays] = useState(0);

  // Récupérer l'employé
  useEffect(() => {
    if (userId && users.length > 0) {
      const user = users.find(u => u.id === userId);
      setEmployee(user);
    }
  }, [userId, users]);

  // Calculer le rapport de congés
  useEffect(() => {
    if (employee && absenceRequests.length >= 0) {
      const report = generateLeaveReport(employee, absenceRequests);
      setLeaveReport(report);
    }
  }, [employee, absenceRequests]);

  // Calculer les jours de la demande
  useEffect(() => {
    if (startDate && endDate) {
      const days = calculateDaysBetween(startDate, endDate) + 1;
      setRequestDays(days);
    } else {
      setRequestDays(0);
    }
  }, [startDate, endDate]);

  // Valider la demande
  useEffect(() => {
    if (employee && startDate && endDate && requestType === 'Congé' && leaveReport) {
      const validationResult = validateLeaveRequest(employee, absenceRequests, startDate, endDate);
      setValidation(validationResult);
      onValidationChange(validationResult);
    } else {
      setValidation(null);
      onValidationChange(null);
    }
  }, [employee, startDate, endDate, requestType, leaveReport, absenceRequests, onValidationChange]);

  // Si ce n'est pas une demande de congé, ne rien afficher
  if (requestType !== 'Congé') {
    return null;
  }

  // Si pas d'employé ou de données, afficher le chargement
  if (!employee || !leaveReport) {
    return (
      <div className="card border-0 bg-light">
        <div className="card-body p-3 text-center">
          <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <small className="text-muted">Calcul des congés...</small>
        </div>
      </div>
    );
  }

  const getValidationColor = () => {
    if (!validation) return 'secondary';
    return validation.valid ? 'success' : 'danger';
  };

  const getValidationIcon = () => {
    if (!validation) return 'mdi:clock-outline';
    return validation.valid ? 'mdi:check-circle' : 'mdi:alert-circle';
  };

  return (
    <div className={`card border-0 bg-${getValidationColor()}-subtle`}>
      <div className="card-body p-3">
        <div className="d-flex align-items-center gap-2 mb-3">
          <Icon 
            icon={getValidationIcon()} 
            className={`text-${getValidationColor()}`}
            style={{ fontSize: '1.2rem' }}
          />
          <h6 className={`fw-bold mb-0 text-${getValidationColor()}`}>
            Validation Congés
          </h6>
        </div>

        {/* Résumé rapide */}
        <div className="row g-2 mb-3">
          <div className="col-6">
            <div className="text-center p-2 bg-white rounded">
              <small className="text-muted d-block">Demandé</small>
              <strong className={`text-${validation?.valid ? 'primary' : 'danger'}`}>
                {requestDays} jour{requestDays > 1 ? 's' : ''}
              </strong>
            </div>
          </div>
          <div className="col-6">
            <div className="text-center p-2 bg-white rounded">
              <small className="text-muted d-block">Disponible</small>
              <strong className="text-success">
                {leaveReport.leave.remainingLeave} jour{leaveReport.leave.remainingLeave > 1 ? 's' : ''}
              </strong>
            </div>
          </div>
        </div>

        {/* Message de validation */}
        {validation && (
          <div className={`alert alert-${getValidationColor()} p-2 mb-3`}>
            <small className="d-flex align-items-center gap-1">
              <Icon icon={getValidationIcon()} />
              {validation.message}
            </small>
          </div>
        )}

        {/* Détails supplémentaires */}
        {showDetails && (
          <div className="border-top pt-3">
            <div className="row g-2 text-sm">
              <div className="col-6">
                <small className="text-muted">Acquis cette année :</small>
                <div className="fw-semibold text-success">
                  {leaveReport.leave.acquiredLeave} jours
                </div>
              </div>
              <div className="col-6">
                <small className="text-muted">Déjà pris :</small>
                <div className="fw-semibold text-danger">
                  {leaveReport.leave.consumedLeave} jours
                </div>
              </div>
              <div className="col-12 mt-2">
                <small className="text-muted">Utilisation :</small>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <div className="progress flex-grow-1" style={{ height: '6px' }}>
                    <div 
                      className={`progress-bar bg-${
                        leaveReport.leave.usagePercentage > 80 ? 'danger' : 
                        leaveReport.leave.usagePercentage > 60 ? 'warning' : 'success'
                      }`}
                      style={{ width: `${Math.min(leaveReport.leave.usagePercentage, 100)}%` }}
                    ></div>
                  </div>
                  <small className="text-muted fw-semibold">
                    {leaveReport.leave.usagePercentage}%
                  </small>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Détails de la validation si disponibles */}
        {validation?.details && (
          <div className="border-top pt-3 mt-3">
            <small className="text-muted">Détails :</small>
            <div className="mt-1">
              {validation.valid && validation.details.remainingAfterRequest !== undefined && (
                <small className="d-block text-success">
                  <Icon icon="mdi:information" className="me-1" />
                  Restant après cette demande : {validation.details.remainingAfterRequest} jour(s)
                </small>
              )}
              {!validation.valid && validation.details.shortfall && (
                <small className="d-block text-danger">
                  <Icon icon="mdi:alert" className="me-1" />
                  Manque : {validation.details.shortfall} jour(s)
                </small>
              )}
            </div>
          </div>
        )}

        {/* Warning pour ancienneté faible */}
        {leaveReport.employee.seniority.totalMonths < 6 && (
          <div className="border-top pt-3 mt-3">
            <small className="text-warning d-flex align-items-center gap-1">
              <Icon icon="mdi:clock-alert" />
              Employé récent (moins de 6 mois) - Congés limités
            </small>
          </div>
        )}
      </div>

      {/* CSS pour améliorer l'apparence */}
      <style jsx>{`
        .text-sm {
          font-size: 0.875rem;
        }
        .bg-success-subtle {
          background-color: rgba(25, 135, 84, 0.1) !important;
        }
        .bg-danger-subtle {
          background-color: rgba(220, 53, 69, 0.1) !important;
        }
        .bg-secondary-subtle {
          background-color: rgba(108, 117, 125, 0.1) !important;
        }
      `}</style>
    </div>
  );
};

export default LeaveValidationWidget;
