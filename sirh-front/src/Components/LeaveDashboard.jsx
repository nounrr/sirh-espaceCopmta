import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Icon } from '@iconify/react';
import { fetchAbsenceRequests } from '../Redux/Slices/absenceRequestSlice';
import { generateLeaveReport, calculateTeamLeaveStats } from '../services/leaveCalculationService';

const LeaveDashboard = ({ userId = null, showTeamStats = false }) => {
  const dispatch = useDispatch();
  const { items: absenceRequests } = useSelector((state) => state.absenceRequests);
  const { items: users } = useSelector((state) => state.users);
  const { user: currentUser } = useSelector((state) => state.auth);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [leaveReport, setLeaveReport] = useState(null);
  const [teamStats, setTeamStats] = useState(null);

  // Utiliser l'utilisateur spécifié ou l'utilisateur connecté
  const targetUserId = userId || currentUser?.id;

  useEffect(() => {
    dispatch(fetchAbsenceRequests());
  }, [dispatch]);

  useEffect(() => {
    if (targetUserId && users.length > 0) {
      const employee = users.find(user => user.id === targetUserId);
      setSelectedEmployee(employee);
    }
  }, [targetUserId, users]);

  useEffect(() => {
    if (selectedEmployee && absenceRequests.length >= 0) {
      const report = generateLeaveReport(selectedEmployee, absenceRequests);
      setLeaveReport(report);
    }
  }, [selectedEmployee, absenceRequests]);

  useEffect(() => {
    if (showTeamStats && users.length > 0 && absenceRequests.length >= 0) {
      const stats = calculateTeamLeaveStats(users, absenceRequests);
      setTeamStats(stats);
    }
  }, [showTeamStats, users, absenceRequests]);

  if (!leaveReport) {
    return (
      <div className="card border-0 shadow-lg rounded-4">
        <div className="card-body p-4 text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="text-muted">Calcul des congés en cours...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      default: return '#28a745';
    }
  };

  const getProgressBarColor = (percentage) => {
    if (percentage > 80) return 'bg-danger';
    if (percentage > 60) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <div className="row g-4">
      {/* Solde de congés principal */}
      <div className="col-12">
        <div className="card border-0 shadow-lg rounded-4">
          <div className="card-body p-4">
            <div className="d-flex align-items-center gap-3 mb-4">
              <div className="p-3 rounded-circle" style={{ backgroundColor: '#e3f2fd' }}>
                <Icon icon="mdi:calendar-check" style={{ fontSize: '2rem', color: '#1976d2' }} />
              </div>
              <div>
                <h4 className="fw-bold mb-1">Solde de Congés</h4>
                <p className="text-muted mb-0">{leaveReport.employee.name}</p>
              </div>
            </div>

            <div className="row g-4">
              {/* Congés acquis */}
              <div className="col-md-3">
                <div className="text-center p-3 rounded-3" style={{ backgroundColor: '#f8f9fa' }}>
                  <Icon icon="mdi:calendar-plus" style={{ fontSize: '2.5rem', color: '#28a745' }} className="mb-2" />
                  <h3 className="fw-bold mb-1 text-success">{leaveReport.leave.acquiredLeave}</h3>
                  <p className="text-muted mb-0 small">Congés Acquis</p>
                </div>
              </div>

              {/* Congés consommés */}
              <div className="col-md-3">
                <div className="text-center p-3 rounded-3" style={{ backgroundColor: '#f8f9fa' }}>
                  <Icon icon="mdi:calendar-minus" style={{ fontSize: '2.5rem', color: '#dc3545' }} className="mb-2" />
                  <h3 className="fw-bold mb-1 text-danger">{leaveReport.leave.consumedLeave}</h3>
                  <p className="text-muted mb-0 small">Congés Pris</p>
                </div>
              </div>

              {/* Congés restants */}
              <div className="col-md-3">
                <div className="text-center p-3 rounded-3" style={{ backgroundColor: '#f8f9fa' }}>
                  <Icon icon="mdi:calendar-clock" style={{ fontSize: '2.5rem', color: '#ffc107' }} className="mb-2" />
                  <h3 className="fw-bold mb-1 text-warning">{leaveReport.leave.remainingLeave}</h3>
                  <p className="text-muted mb-0 small">Congés Restants</p>
                </div>
              </div>

              {/* Total annuel */}
              <div className="col-md-3">
                <div className="text-center p-3 rounded-3" style={{ backgroundColor: '#f8f9fa' }}>
                  <Icon icon="mdi:calendar-text" style={{ fontSize: '2.5rem', color: '#6f42c1' }} className="mb-2" />
                  <h3 className="fw-bold mb-1 text-primary">{leaveReport.leave.totalAnnualLeave}</h3>
                  <p className="text-muted mb-0 small">Total Annuel</p>
                </div>
              </div>
            </div>

            {/* Barre de progression */}
            <div className="mt-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-semibold">Utilisation des congés</span>
                <span className="badge bg-secondary">{leaveReport.leave.usagePercentage}%</span>
              </div>
              <div className="progress" style={{ height: '12px' }}>
                <div 
                  className={`progress-bar ${getProgressBarColor(leaveReport.leave.usagePercentage)}`}
                  role="progressbar" 
                  style={{ width: `${Math.min(leaveReport.leave.usagePercentage, 100)}%` }}
                ></div>
              </div>
              <div className="d-flex justify-content-between mt-2">
                <small className="text-muted">0 jours</small>
                <small className="text-muted">{leaveReport.leave.acquiredLeave} jours</small>
              </div>
            </div>

            {/* Alertes */}
            {leaveReport.status.isOverused && (
              <div className="alert alert-danger d-flex align-items-center mt-4" role="alert">
                <Icon icon="mdi:alert-circle" className="me-2" />
                <div>
                  <strong>Attention !</strong> Vous avez dépassé votre quota de congés acquis.
                </div>
              </div>
            )}

            {leaveReport.status.warningLevel === 'high' && !leaveReport.status.isOverused && (
              <div className="alert alert-warning d-flex align-items-center mt-4" role="alert">
                <Icon icon="mdi:alert" className="me-2" />
                <div>
                  <strong>Avertissement !</strong> Vous avez utilisé plus de 80% de vos congés acquis.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Détails supplémentaires */}
      <div className="col-md-6">
        <div className="card border-0 shadow-lg rounded-4">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <Icon icon="mdi:information" className="text-primary" />
              Informations Employé
            </h5>
            
            <div className="row g-3">
              <div className="col-12">
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Date d'embauche :</span>
                  <span className="fw-semibold">
                    {new Date(leaveReport.employee.dateEmbauche).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
              <div className="col-12">
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Ancienneté :</span>
                  <span className="fw-semibold">
                    {leaveReport.employee.seniority.years} ans {leaveReport.employee.seniority.months} mois
                  </span>
                </div>
              </div>
              <div className="col-12">
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Statut :</span>
                  <span className={`badge ${leaveReport.status.canTakeLeave ? 'bg-success' : 'bg-danger'}`}>
                    {leaveReport.status.canTakeLeave ? 'Peut prendre des congés' : 'Quota épuisé'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques de l'équipe (si activées) */}
      {showTeamStats && teamStats && (
        <div className="col-md-6">
          <div className="card border-0 shadow-lg rounded-4">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <Icon icon="mdi:account-group" className="text-primary" />
                Statistiques Équipe
              </h5>
              
              <div className="row g-3">
                <div className="col-12">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Total employés :</span>
                    <span className="fw-semibold">{teamStats.totalEmployees}</span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Utilisation moyenne :</span>
                    <span className="fw-semibold">{teamStats.averages.usagePercentage}%</span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Congés restants (total) :</span>
                    <span className="fw-semibold">{teamStats.totals.remainingLeave} jours</span>
                  </div>
                </div>
                {teamStats.alerts.employeesWithHighUsage > 0 && (
                  <div className="col-12">
                    <div className="alert alert-warning p-2 mb-0">
                      <small>
                        <Icon icon="mdi:alert" className="me-1" />
                        {teamStats.alerts.employeesWithHighUsage} employé(s) avec forte utilisation
                      </small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS pour les animations */}
      <style jsx>{`
        .card {
          transition: all 0.3s ease;
        }
        .card:hover {
          transform: translateY(-2px);
        }
        .progress-bar {
          transition: width 0.6s ease;
        }
      `}</style>
    </div>
  );
};

export default LeaveDashboard;
