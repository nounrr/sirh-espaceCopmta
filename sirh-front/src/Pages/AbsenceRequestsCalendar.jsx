

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAbsenceRequests } from '../Redux/Slices/absenceRequestSlice';
import { fetchUsers } from '../Redux/Slices/userSlice';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Icon } from '@iconify/react/dist/iconify.js';
import Swal from 'sweetalert2';
import { toErrorMessage } from '../utils/errorUtils';

import "../assets/css/fullcalendar.css";

const AbsenceRequestsCalendar = () => {
  const dispatch = useDispatch();
  const { items: absenceRequests, status, error } = useSelector((state) => state.absenceRequests);
  const { items: users } = useSelector((state) => state.users);
  const [events, setEvents] = useState([]);
  const [filterStatus, setFilterStatus] = useState('approuvé');
  const [filterType, setFilterType] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    dispatch(fetchAbsenceRequests());
    dispatch(fetchUsers());
  }, [dispatch]);

  useEffect(() => {
    const filteredRequests = absenceRequests.filter((request) => {
      const matchesStatus = !filterStatus || request.statut === filterStatus;
      const matchesType = !filterType || request.type === filterType;
      return matchesStatus && matchesType;
    });

    const formattedEvents = filteredRequests.map((request) => {
      const user = users.find(u => u.id === request.user_id);
      
      // Couleurs améliorées selon le type de demande
      let backgroundColor, borderColor, textColor;
      switch (request.type?.toLowerCase()) {
        case 'congé':
          backgroundColor = '#059669'; // Vert émeraude plus foncé
          borderColor = '#047857';
          textColor = '#FFFFFF';
          break;
        case 'maladie':
          backgroundColor = '#DC2626'; // Rouge plus visible
          borderColor = '#B91C1C';
          textColor = '#FFFFFF';
          break;
        case 'attestationtravail':
          backgroundColor = '#2563EB'; // Bleu royal
          borderColor = '#1D4ED8';
          textColor = '#FFFFFF';
          break;
        case 'autre':
          backgroundColor = '#7C3AED'; // Violet plus profond
          borderColor = '#6D28D9';
          textColor = '#FFFFFF';
          break;
        case 'formation':
          backgroundColor = '#F59E0B'; // Orange pour formation
          borderColor = '#D97706';
          textColor = '#FFFFFF';
          break;
        case 'mission':
          backgroundColor = '#0891B2'; // Cyan pour mission
          borderColor = '#0E7490';
          textColor = '#FFFFFF';
          break;
        case 'récupération':
          backgroundColor = '#65A30D'; // Vert lime pour récupération
          borderColor = '#4D7C0F';
          textColor = '#FFFFFF';
          break;
        default:
          backgroundColor = '#4B5563'; // Gris plus foncé
          borderColor = '#374151';
          textColor = '#FFFFFF';
      }

      // Calculer la date de fin pour inclure le dernier jour
      const startDate = request.date_debut || request.dateDebut;
      const endDate = request.date_fin || request.dateFin;
      
      // Ajouter un jour à la date de fin pour l'inclure dans l'affichage
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);

      return {
        id: request.id,
        title: user ? `${user.name} ${user.prenom}` : 'Utilisateur inconnu',
        start: startDate,
        end: adjustedEndDate.toISOString().split('T')[0],
        backgroundColor,
        borderColor,
        textColor,
        extendedProps: {
          motif: request.motif,
          type: request.type,
          statut: request.statut,
          user: user,
          originalEndDate: endDate // Garder la date de fin originale pour l'affichage
        }
      };
    });

    setEvents(formattedEvents);
  }, [absenceRequests, users, filterStatus, filterType]);

  const handleEventClick = (info) => {
    const { title, start, extendedProps } = info.event;
    const originalEndDate = extendedProps.originalEndDate || info.event.end;
    
    // Icônes et couleurs selon le type
    let icon, iconColor;
    switch (extendedProps.type?.toLowerCase()) {
      case 'congé':
        icon = '🏖️';
        iconColor = '#059669';
        break;
      case 'maladie':
        icon = '🏥';
        iconColor = '#DC2626';
        break;
      case 'attestationtravail':
        icon = '📄';
        iconColor = '#2563EB';
        break;
      case 'autre':
        icon = '📋';
        iconColor = '#7C3AED';
        break;
      case 'formation':
        icon = '🎓';
        iconColor = '#F59E0B';
        break;
      case 'mission':
        icon = '🚀';
        iconColor = '#0891B2';
        break;
      case 'récupération':
        icon = '⏰';
        iconColor = '#65A30D';
        break;
      default:
        icon = 'ℹ️';
        iconColor = '#4B5563';
    }

    Swal.fire({
      title: `<div style="display: flex; align-items: center; gap: 10px; justify-content: center;">
                <span style="font-size: 20px;">${icon}</span>
                <span style="color: #1F2937; font-size: 1.2rem; font-weight: 600;">${title}</span>
              </div>`,
      html: `
        <div style="text-align: left; background: #f8f9fa; padding: 24px; border-radius: 16px; margin: 15px 0; border: 1px solid #e9ecef; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding: 12px; background: white; border-radius: 10px; border-left: 4px solid ${iconColor};">
            <i class="fas fa-user" style="color: ${iconColor}; width: 18px; font-size: 16px;"></i>
            <div>
              <strong style="color: #374151; font-size: 14px;">Employé</strong>
              <div style="color: #1F2937; font-weight: 600; font-size: 16px; margin-top: 2px;">${title}</div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div style="background: white; padding: 12px; border-radius: 10px; border-left: 4px solid ${iconColor};">
              <div style="display: flex; align-items-center; gap: 8px; margin-bottom: 6px;">
                <i class="fas fa-tag" style="color: ${iconColor}; width: 16px; font-size: 14px;"></i>
                <strong style="color: #374151; font-size: 13px;">Type</strong>
              </div>
              <span style="background: ${iconColor}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block;">
                ${extendedProps.type}
              </span>
            </div>
            
            <div style="background: white; padding: 12px; border-radius: 10px; border-left: 4px solid #10B981;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <i class="fas fa-check-circle" style="color: #10B981; width: 16px; font-size: 14px;"></i>
                <strong style="color: #374151; font-size: 13px;">Statut</strong>
              </div>
              <span style="color: #10B981; font-weight: 600; background: #D1FAE5; padding: 6px 12px; border-radius: 16px; font-size: 12px; display: inline-block;">
                ${extendedProps.statut}
              </span>
            </div>
          </div>
          
          <div style="background: white; padding: 16px; border-radius: 10px; margin-bottom: 16px; border-left: 4px solid ${iconColor};">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <i class="fas fa-comment" style="color: ${iconColor}; width: 16px; font-size: 14px;"></i>
              <strong style="color: #374151; font-size: 14px;">Motif</strong>
            </div>
            <p style="color: #1F2937; margin: 0; line-height: 1.5; font-size: 14px;">${extendedProps.motif || 'Non spécifié'}</p>
          </div>
          
          <div style="background: white; padding: 16px; border-radius: 10px; border-left: 4px solid ${iconColor};">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <i class="fas fa-calendar-alt" style="color: ${iconColor}; width: 16px; font-size: 14px;"></i>
              <strong style="color: #374151; font-size: 14px;">Période d'absence</strong>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div style="text-align: center; padding: 8px; background: #f1f5f9; border-radius: 8px;">
                <div style="color: #64748b; font-size: 12px; font-weight: 500; margin-bottom: 4px;">DÉBUT</div>
                <div style="color: #1F2937; font-weight: 600; font-size: 14px;">${new Date(start).toLocaleDateString('fr-FR')}</div>
              </div>
              <div style="text-align: center; padding: 8px; background: #f1f5f9; border-radius: 8px;">
                <div style="color: #64748b; font-size: 12px; font-weight: 500; margin-bottom: 4px;">FIN</div>
                <div style="color: #1F2937; font-weight: 600; font-size: 14px;">${new Date(originalEndDate).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
          </div>
        </div>
      `,
      confirmButtonColor: '#667eea',
      confirmButtonText: 'Fermer',
      width: '500px',
      customClass: {
        popup: 'swal-custom-popup',
        title: 'swal-custom-title'
      }
    });
  };

  const getStatsData = () => {
    const currentMonthEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.getMonth() === selectedMonth && eventDate.getFullYear() === selectedYear;
    });

    return {
      total: currentMonthEvents.length,
      conge: currentMonthEvents.filter(e => e.extendedProps.type?.toLowerCase() === 'congé').length,
      maladie: currentMonthEvents.filter(e => e.extendedProps.type?.toLowerCase() === 'maladie').length,
      attestation: currentMonthEvents.filter(e => e.extendedProps.type?.toLowerCase() === 'attestationtravail').length,
      autre: currentMonthEvents.filter(e => e.extendedProps.type?.toLowerCase() === 'autre').length,
      formation: currentMonthEvents.filter(e => e.extendedProps.type?.toLowerCase() === 'formation').length,
      mission: currentMonthEvents.filter(e => e.extendedProps.type?.toLowerCase() === 'mission').length,
      recuperation: currentMonthEvents.filter(e => e.extendedProps.type?.toLowerCase() === 'récupération').length
    };
  };

  const stats = getStatsData();

  if (status === 'loading') {
    return (
      <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <div className="d-flex align-items-center justify-content-center gap-2">
              <Icon icon="fluent:calendar-24-filled" style={{ fontSize: '1.5rem', color: '#6c757d' }} />
              <p className="text-muted mb-0">Chargement du calendrier...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
        <div className="alert alert-danger" role="alert">
          <div className="d-flex align-items-center">
            <Icon icon="fluent:warning-24-filled" className="me-2" />
            <div>
              <h5 className="alert-heading">Erreur de chargement</h5>
              <p className="mb-0">Impossible de charger le calendrier: {toErrorMessage(error)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <div className="container-fluid px-4">
        {/* En-tête */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="card-body p-4" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-3 rounded-circle bg-white bg-opacity-20">
                      <Icon icon="fluent:calendar-24-filled" style={{ fontSize: '2rem' }} />
                    </div>
                    <div>
                      <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>Calendrier des Absences</h1>
                      <p className="mb-0 opacity-90">Visualisez toutes les demandes d'absence approuvées</p>
                    </div>
                  </div>
                  
                  <div className="d-flex align-items-center gap-3">
                    <div className="text-center">
                      <div className="fs-2 fw-bold">{stats.total}</div>
                      <small className="opacity-75">Total ce mois</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <h5 className="mb-3 d-flex align-items-center gap-2">
                  <Icon icon="fluent:data-bar-24-filled" width={20} height={20} className="text-success" />
                  Statistiques du mois
                </h5>
                <div className="row g-3">
                  <div className="col-lg-2 col-md-4 col-sm-6">
                    <div className="d-flex align-items-center gap-3 p-3 rounded-3 border-0" style={{ backgroundColor: '#D1FAE5' }}>
                      <div className="p-2 rounded-circle" style={{ backgroundColor: '#059669' }}>
                        <Icon icon="fluent:beach-24-filled" width={20} height={20} className="text-white" />
                      </div>
                      <div>
                        <div className="fw-bold text-dark">{stats.conge}</div>
                        <small className="text-muted">Congés</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-2 col-md-4 col-sm-6">
                    <div className="d-flex align-items-center gap-3 p-3 rounded-3 border-0" style={{ backgroundColor: '#FEE2E2' }}>
                      <div className="p-2 rounded-circle" style={{ backgroundColor: '#DC2626' }}>
                        <Icon icon="fluent:heart-pulse-24-filled" width={20} height={20} className="text-white" />
                      </div>
                      <div>
                        <div className="fw-bold text-dark">{stats.maladie}</div>
                        <small className="text-muted">Maladie</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-2 col-md-4 col-sm-6">
                    <div className="d-flex align-items-center gap-3 p-3 rounded-3 border-0" style={{ backgroundColor: '#DBEAFE' }}>
                      <div className="p-2 rounded-circle" style={{ backgroundColor: '#2563EB' }}>
                        <Icon icon="fluent:document-24-filled" width={20} height={20} className="text-white" />
                      </div>
                      <div>
                        <div className="fw-bold text-dark">{stats.attestation}</div>
                        <small className="text-muted">Attestations</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-2 col-md-4 col-sm-6">
                    <div className="d-flex align-items-center gap-3 p-3 rounded-3 border-0" style={{ backgroundColor: '#EDE9FE' }}>
                      <div className="p-2 rounded-circle" style={{ backgroundColor: '#7C3AED' }}>
                        <Icon icon="fluent:clipboard-24-filled" width={20} height={20} className="text-white" />
                      </div>
                      <div>
                        <div className="fw-bold text-dark">{stats.autre}</div>
                        <small className="text-muted">Autres</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-2 col-md-4 col-sm-6">
                    <div className="d-flex align-items-center gap-3 p-3 rounded-3 border-0" style={{ backgroundColor: '#FEF3C7' }}>
                      <div className="p-2 rounded-circle" style={{ backgroundColor: '#F59E0B' }}>
                        <Icon icon="fluent:hat-graduation-24-filled" width={20} height={20} className="text-white" />
                      </div>
                      <div>
                        <div className="fw-bold text-dark">{stats.formation}</div>
                        <small className="text-muted">Formation</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-2 col-md-4 col-sm-6">
                    <div className="d-flex align-items-center gap-3 p-3 rounded-3 border-0" style={{ backgroundColor: '#CFFAFE' }}>
                      <div className="p-2 rounded-circle" style={{ backgroundColor: '#0891B2' }}>
                        <Icon icon="fluent:rocket-24-filled" width={20} height={20} className="text-white" />
                      </div>
                      <div>
                        <div className="fw-bold text-dark">{stats.mission}</div>
                        <small className="text-muted">Mission</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <h5 className="mb-3 d-flex align-items-center gap-2">
                  <Icon icon="fluent:filter-24-filled" width={20} height={20} className="text-primary" />
                  Filtres
                </h5>
                <div className="row g-3 align-items-center">
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">
                      <Icon icon="fluent:status-24-filled" width={16} height={16} className="me-1" />
                      Statut
                    </label>
                    <select 
                      className="form-select"
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                    >
                      <option value="">Tous les statuts</option>
                      <option value="approuvé">Approuvé</option>
                      <option value="validé">Validé</option>
                      <option value="en_attente">En attente</option>
                      <option value="rejeté">Rejeté</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">
                      <Icon icon="fluent:tag-24-filled" width={16} height={16} className="me-1" />
                      Type
                    </label>
                    <select 
                      className="form-select"
                      value={filterType}
                      onChange={e => setFilterType(e.target.value)}
                    >
                      <option value="">Tous les types</option>
                      <option value="Congé">Congé</option>
                      <option value="maladie">Maladie</option>
                      <option value="AttestationTravail">Attestation</option>
                      <option value="formation">Formation</option>
                      <option value="mission">Mission</option>
                      <option value="récupération">Récupération</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">
                      <Icon icon="fluent:calendar-month-24-filled" width={16} height={16} className="me-1" />
                      Mois
                    </label>
                    <select 
                      className="form-select"
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(parseInt(e.target.value))}
                    >
                      {Array.from({length: 12}, (_, i) => (
                        <option key={i} value={i}>
                          {new Date(2024, i, 1).toLocaleDateString('fr-FR', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">
                      <Icon icon="fluent:calendar-year-24-filled" width={16} height={16} className="me-1" />
                      Année
                    </label>
                    <select 
                      className="form-select"
                      value={selectedYear}
                      onChange={e => setSelectedYear(parseInt(e.target.value))}
                    >
                      {Array.from({length: 5}, (_, i) => (
                        <option key={i} value={new Date().getFullYear() - 2 + i}>
                          {new Date().getFullYear() - 2 + i}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendrier */}
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="card-body p-0">
                <div className="p-4 border-bottom" style={{ backgroundColor: '#f8f9fa' }}>
                  <h5 className="mb-0 d-flex align-items-center gap-2">
                    <Icon icon="fluent:calendar-month-24-filled" width={20} height={20} className="text-info" />
                    Calendrier des absences
                  </h5>
                </div>
                <div className="p-4">
                  <FullCalendar
                    plugins={[dayGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    events={events}
                    eventClick={handleEventClick}
                    headerToolbar={{
                      left: 'prev,next today',
                      center: 'title',
                      right: 'dayGridMonth,dayGridWeek'
                    }}
                    height="auto"
                    locale="fr"
                    firstDay={1}
                    eventDisplay="block"
                    displayEventTime={false}
                    eventMaxStack={3}
                    moreLinkClick="popover"
                    dayMaxEvents={3}
                    eventClassNames="custom-event"
                    buttonText={{
                      today: 'Aujourd\'hui',
                      month: 'Mois',
                      week: 'Semaine',
                      day: 'Jour',
                      list: 'Liste'
                    }}
                    dayHeaderFormat={{ weekday: 'long' }}
                    titleFormat={{ year: 'numeric', month: 'long' }}
                    moreLinkText="plus"
                    noEventsText="Aucune absence"
                    allDayText="Toute la journée"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS personnalisé */}
      <style jsx>{`
        .custom-event {
          border-radius: 6px !important;
          font-weight: 500 !important;
          font-size: 12px !important;
          padding: 2px 6px !important;
          margin: 1px !important;
        }
        
        .fc-event-title {
          font-weight: 600 !important;
        }
        
        .fc-toolbar-title {
          font-size: 1.5rem !important;
          font-weight: 700 !important;
          color: #374151 !important;
        }
        
        .fc-button-primary {
          background-color: #667eea !important;
          border-color: #667eea !important;
          color: white !important;
        }
        
        .fc-button-primary:hover {
          background-color: #5a67d8 !important;
          border-color: #5a67d8 !important;
          color: white !important;
        }
        
        .fc-button-primary:not(:disabled):active,
        .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #4c51bf !important;
          border-color: #4c51bf !important;
          color: white !important;
        }
        
        .fc-icon {
          color: white !important;
        }
        
        .fc-prev-button .fc-icon,
        .fc-next-button .fc-icon {
          color: white !important;
        }
        
        .fc-daygrid-day-number {
          color: #374151 !important;
          font-weight: 600 !important;
        }
        
        .fc-col-header-cell {
          background-color: #f8f9fa !important;
          font-weight: 700 !important;
          color: #374151 !important;
        }
        
        .swal-custom-popup {
          border-radius: 16px !important;
        }
        
        .swal-custom-title {
          padding: 16px 24px 8px !important;
          font-size: 1.2rem !important;
        }
        
        .card {
          transition: all 0.3s ease;
        }
        
        .card:hover {
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default AbsenceRequestsCalendar;
