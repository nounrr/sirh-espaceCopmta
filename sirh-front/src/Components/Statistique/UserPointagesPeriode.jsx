
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setSelectedUserId,
  clearSelectedUserId,
  setSelectedPeriode,
  setSelectedDates,
  getPointagesOfSelectedUserAndPeriod,
} from '../../Redux/Slices/pointageSlice';
import { Icon } from '@iconify/react';

// Utilitaire pour générer la liste des années (7 dernières)
const yearsList = (yearsBack = 7) => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: yearsBack }, (_, i) => `${currentYear - i}`);
};

// Calcul des stats
const getStats = (pointages) => ({
  present: pointages.filter(p => p.statutJour === 'present').length,
  absent: pointages.filter(p => p.statutJour === 'absent').length,
  retard: pointages.filter(p => p.statutJour === 'retard').length,
});

// Carte statistique moderne
const StatCard = ({ icon, label, value, color }) => (
  <div
    className="flex-1 min-w-[120px] bg-white rounded-3 shadow-sm p-3 d-flex flex-column align-items-center border-0"
    style={{ borderTop: `4px solid ${color}` }}
  >
    <div className="d-flex align-items-center gap-2 mb-1">
      <Icon icon={icon} width={20} height={20} style={{ color }} />
      <span className="fw-semibold" style={{ color }}>{label}</span>
    </div>
    <div className="fs-3 fw-bold" style={{ color }}>{value}</div>
  </div>
);

const UserPointagesPeriode = ({ userId, onClose }) => {
  const dispatch = useDispatch();
  const pointages = useSelector(getPointagesOfSelectedUserAndPeriod);
  const selectedPeriode = useSelector(state => state.pointages.selectedPeriode);
  const selectedDates = useSelector(state => state.pointages.selectedDates);

  // Sélectionne l'utilisateur à l'ouverture
  useEffect(() => {
    if (userId) dispatch(setSelectedUserId(userId));
    return () => dispatch(clearSelectedUserId());
  }, [userId, dispatch]);

  // Gestion du changement de période
  const handlePeriodeChange = e => {
    dispatch(setSelectedPeriode(e.target.value));
    dispatch(setSelectedDates({ date: null, dateDebut: null, dateFin: null, mois: null, annee: null }));
  };

  // Fonction pour regrouper les shifts de nuit
  const groupNightShifts = (pointages) => {
    const grouped = [];
    const processed = new Set();

    pointages.forEach((pointage, index) => {
      if (processed.has(index)) return;

      // Vérifier si c'est un shift de nuit (commence le soir et se termine tôt le matin)
      const heureEntree = pointage.heureEntree;
      const heureSortie = pointage.heureSortie;
      const currentDate = new Date(pointage.date);
      
      // Shift de nuit typique: entrée >= 18:00 et sortie = 23:59:59
      if (heureEntree >= '18:00:00' && heureSortie === '23:59:59') {
        // Chercher le pointage du lendemain qui commence à 00:00:00
        const nextDay = new Date(currentDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        
        const nextShiftIndex = pointages.findIndex((p, i) => 
          i > index && 
          p.date === nextDayStr && 
          p.heureEntree === '00:00:00' &&
          !processed.has(i)
        );

        if (nextShiftIndex !== -1) {
          const nextShift = pointages[nextShiftIndex];
          // Combiner les deux pointages en un seul shift de nuit
          grouped.push({
            ...pointage,
            id: `${pointage.id}-${nextShift.id}`,
            heureEntree: pointage.heureEntree,
            heureSortie: nextShift.heureSortie,
            isNightShift: true,
            endDate: nextShift.date
          });
          processed.add(index);
          processed.add(nextShiftIndex);
        } else {
          grouped.push(pointage);
          processed.add(index);
        }
      } else {
        grouped.push(pointage);
        processed.add(index);
      }
    });

    return grouped;
  };

  // Trier les pointages par date (ordre chronologique)
  const sortedPointages = [...pointages].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Regrouper les shifts de nuit
  const groupedPointages = groupNightShifts(sortedPointages);

  // Stats
  const stats = getStats(pointages);

  return (
    <div className="p-0">
      {/* Filtres */}
      <div className="border-0 mb-4" style={{ backgroundColor: 'transparent' }}>
        <div className="p-4">
          <h5 className="mb-3 d-flex align-items-center gap-2">
            <Icon icon="fluent:filter-24-filled" width={20} height={20} className="text-primary" />
            Filtres de recherche
          </h5>
          <div className="d-flex flex-wrap align-items-end gap-3">
            <div>
              <label className="form-label mb-1 fw-semibold text-dark">
                <Icon icon="fluent:calendar-24-filled" width={16} height={16} className="me-1" />
                Période
              </label>
              <select
                className="form-select shadow-sm border-0"
                value={selectedPeriode}
                onChange={handlePeriodeChange}
                style={{ minWidth: 110, backgroundColor: '#f8f9fa', borderRadius: '8px' }}
              >
                <option value="jour">Jour</option>
                <option value="semaine">Semaine</option>
                <option value="mois">Mois</option>
                <option value="annee">Année</option>
              </select>
            </div>
              {selectedPeriode === 'jour' && (
                <div>
                  <label className="form-label mb-1 fw-semibold text-dark">
                    <Icon icon="fluent:calendar-day-24-filled" width={16} height={16} className="me-1" />
                    Date
                  </label>
                  <input
                    type="date"
                    className="form-control shadow-sm border-0"
                    value={selectedDates.date || ''}
                    onChange={e => dispatch(setSelectedDates({ date: e.target.value }))}
                    style={{ minWidth: 110, backgroundColor: '#f8f9fa', borderRadius: '8px' }}
                  />
                </div>
              )}
              {selectedPeriode === 'semaine' && (
                <>
                  <div>
                    <label className="form-label mb-1 fw-semibold text-dark">
                      <Icon icon="fluent:calendar-arrow-right-24-filled" width={16} height={16} className="me-1" />
                      Début
                    </label>
                    <input
                      type="date"
                      className="form-control shadow-sm border-0"
                      value={selectedDates.dateDebut || ''}
                      onChange={e => dispatch(setSelectedDates({ dateDebut: e.target.value }))}
                      style={{ minWidth: 110, backgroundColor: '#f8f9fa', borderRadius: '8px' }}
                    />
                  </div>
                  <div>
                    <label className="form-label mb-1 fw-semibold text-dark">
                      <Icon icon="fluent:calendar-checkmark-24-filled" width={16} height={16} className="me-1" />
                      Fin
                    </label>
                    <input
                      type="date"
                      className="form-control shadow-sm border-0"
                      value={selectedDates.dateFin || ''}
                      onChange={e => dispatch(setSelectedDates({ dateFin: e.target.value }))}
                      style={{ minWidth: 110, backgroundColor: '#f8f9fa', borderRadius: '8px' }}
                    />
                  </div>
                </>
              )}
              {selectedPeriode === 'mois' && (
                <div>
                  <label className="form-label mb-1 fw-semibold text-dark">
                    <Icon icon="fluent:calendar-month-24-filled" width={16} height={16} className="me-1" />
                    Mois
                  </label>
                  <input
                    type="month"
                    className="form-control shadow-sm border-0"
                    value={selectedDates.mois || ''}
                    onChange={e => dispatch(setSelectedDates({ mois: e.target.value }))}
                    style={{ minWidth: 110, backgroundColor: '#f8f9fa', borderRadius: '8px' }}
                  />
                </div>
              )}
              {selectedPeriode === 'annee' && (
                <div>
                  <label className="form-label mb-1 fw-semibold text-dark">
                    <Icon icon="fluent:calendar-year-24-filled" width={16} height={16} className="me-1" />
                    Année
                  </label>
                  <select
                    className="form-select shadow-sm border-0"
                    value={selectedDates.annee || ''}
                    onChange={e => dispatch(setSelectedDates({ annee: e.target.value }))}
                    style={{ minWidth: 110, backgroundColor: '#f8f9fa', borderRadius: '8px' }}
                  >
                    <option value="">Année</option>
                    {yearsList(7).map(year => (
                      <option value={year} key={year}>{year}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="d-flex justify-content-end mt-3">
              <button
                type="button"
                className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                onClick={() => dispatch(getPointagesOfSelectedUserAndPeriod())}
                style={{ borderRadius: '8px' }}
              >
                <Icon icon="fluent:arrow-clockwise-24-filled" width={16} height={16} />
                Actualiser
              </button>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="border-0 mb-4" style={{ backgroundColor: 'transparent' }}>
          <div className="p-4">
            <h5 className="mb-3 d-flex align-items-center gap-2">
              <Icon icon="fluent:data-bar-24-filled" width={20} height={20} className="text-success" />
              Statistiques
            </h5>
            <div className="d-flex gap-3 flex-wrap">
              <StatCard icon="fluent:person-checkmark-24-filled" label="Présents" value={stats.present} color="#10B981" />
              <StatCard icon="fluent:clock-alarm-24-filled" label="En retard" value={stats.retard} color="#F59E0B" />
              <StatCard icon="fluent:person-prohibited-24-filled" label="Absents" value={stats.absent} color="#EF4444" />
              <StatCard icon="fluent:people-checkmark-24-filled" label="Présent+Retard" value={stats.present + stats.retard} color="#2563EB" />
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="border-0" style={{ backgroundColor: 'transparent' }}>
          <div className="p-0">
            <div className="p-4 border-bottom bg-light">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <Icon icon="fluent:table-24-filled" width={20} height={20} className="text-info" />
                Liste des pointages
              </h5>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead style={{ backgroundColor: '#f8f9fa' }}>
                  <tr>
                    <th className="border-0 px-4 py-3 fw-semibold text-dark">
                      <Icon icon="fluent:calendar-24-filled" width={16} height={16} className="me-2" />
                      Date
                    </th>
                    <th className="border-0 px-4 py-3 fw-semibold text-dark">
                      <Icon icon="fluent:arrow-enter-24-filled" width={16} height={16} className="me-2" />
                      Entrée
                    </th>
                    <th className="border-0 px-4 py-3 fw-semibold text-dark">
                      <Icon icon="fluent:arrow-exit-24-filled" width={16} height={16} className="me-2" />
                      Sortie
                    </th>
                    <th className="border-0 px-4 py-3 fw-semibold text-dark">
                      <Icon icon="fluent:status-24-filled" width={16} height={16} className="me-2" />
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedPointages.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-5">
                        <div className="d-flex flex-column align-items-center gap-2 text-muted">
                          <Icon icon="fluent:document-search-24-filled" width={48} height={48} className="opacity-50" />
                          <span className="fw-medium">Aucun pointage trouvé</span>
                          <small>Essayez de modifier vos critères de recherche</small>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    groupedPointages.map((p) => (
                      <tr key={p.id} className="border-0">
                        <td className="px-4 py-3">
                          {p.isNightShift ? (
                            <div>
                              <div className="fw-semibold">{p.date}</div>
                              <small className="text-muted">→ {p.endDate}</small>
                            </div>
                          ) : (
                            p.date
                          )}
                        </td>
                        <td className="px-4 py-3">{p.heureEntree}</td>
                        <td className="px-4 py-3">{p.heureSortie}</td>
                        <td className="px-4 py-3">
                          {p.statutJour === 'present' && (
                            <span className="badge rounded-pill px-3 py-2" style={{ backgroundColor: '#d1fae5', color: '#065f46', fontSize: '0.75rem' }}>
                              <Icon icon="fluent:checkmark-circle-24-filled" width={14} height={14} className="me-1" />
                              Présent
                            </span>
                          )}
                          {p.statutJour === 'absent' && (
                            <span className="badge rounded-pill px-3 py-2" style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '0.75rem' }}>
                              <Icon icon="fluent:dismiss-circle-24-filled" width={14} height={14} className="me-1" />
                              Absent
                            </span>
                          )}
                          {p.statutJour === 'retard' && (
                            <span className="badge rounded-pill px-3 py-2" style={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.75rem' }}>
                              <Icon icon="fluent:clock-alarm-24-filled" width={14} height={14} className="me-1" />
                              En retard
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
    </div>
  );
};

export default UserPointagesPeriode;
