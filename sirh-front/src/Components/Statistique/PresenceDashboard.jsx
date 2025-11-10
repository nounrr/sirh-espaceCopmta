import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPresenceStats } from '../../Redux/Slices/presenceStatsSlice';
import { Icon } from '@iconify/react';
import PresenceEvaluationChart from './PresenceEvaluationChart';
import PresenceCircleChart from './PresenceCircleChart';
import ContractTypeCircleChart from './ContractTypeCircleChart';
import PresenceStatsCard from './PresenceStatsCard';
import { ResponsiveButton } from '../Common/ResponsiveButton';
import ResponsiveTable from '../Common/ResponsiveTable';
import MobilePageHeader from '../Common/MobilePageHeader';
import { useIsMobile } from '../../utils/responsiveUtils.jsx';

// ---------- Helpers ----------
const norm = (v) => String(v ?? '');
const getUserId = (u) => norm(u?.id ?? u?._id);
const getPointageUserId = (p) => norm(p?.user_id);
const sameUser = (u, p) => getUserId(u) === getPointageUserId(p);

// Calcul heures même si sortie après minuit
function calcHours(heureEntree, heureSortie) {
  if (!heureEntree || !heureSortie) return 0;
  const [hE, mE] = heureEntree.split(':').map(Number);
  const [hS, mS] = heureSortie.split(':').map(Number);
  let minutesEntree = hE * 60 + mE;
  let minutesSortie = hS * 60 + mS;
  if (minutesSortie < minutesEntree) minutesSortie += 24 * 60;
  const diff = minutesSortie - minutesEntree;
  return diff > 0 ? +(diff / 60).toFixed(2) : 0;
}

const PresenceDashboard = ({ isDashboard = false }) => {
  const dispatch = useDispatch();
  const isMobile = useIsMobile();

  // Filtres globaux
  const [periode, setPeriode] = useState('jour');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0]);
  const [dateFin, setDateFin] = useState(new Date().toISOString().split('T')[0]);
  const [mois, setMois] = useState(new Date().toISOString().slice(0, 7));
  const [typeContrat, setTypeContrat] = useState('');

  // Détails
  const [showDetail, setShowDetail] = useState(false);
  const [detailType, setDetailType] = useState(''); // 'present' | 'absent' | 'retard'

  // Filtres détail
  const [filtreContrat, setFiltreContrat] = useState('');
  const [filtreDepartement, setFiltreDepartement] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Redux
  const { loading } = useSelector((state) => state.presence);
  const pointages = useSelector((state) => state.pointages.items || []);
  const users = useSelector((state) => state.users.items || []);
  const departments = useSelector((state) => state.departments.items || []);
  const absenceRequests = useSelector((state) => state.absenceRequests.items || []);
  const roles = useSelector((state) => state.auth.roles || []);
  const isRH = roles.includes('RH') ||  roles.includes('Gest_RH');
  const isEMP = roles.includes('Employe');

  // Charger/rafraîchir stats quand filtres changent
  useEffect(() => {
    if (!['jour', 'semaine', 'mois'].includes(periode)) {
      setPeriode('jour');
      return;
    }
    let params = {};
    switch (periode) {
      case 'jour': params = { periode, date }; break;
      case 'semaine': params = { periode, dateDebut, dateFin }; break;
      case 'mois': params = { periode, mois }; break;
      default: params = { periode: 'jour', date };
    }
    if (typeContrat) params.typeContrat = typeContrat;

    dispatch(fetchPresenceStats(params));
    // reset du bloc détail à chaque changement de périmètre
    setShowDetail(false);
    setDetailType('');
  }, [periode, date, dateDebut, dateFin, mois, typeContrat, dispatch]);

  // Filtrage des pointages par période avec déduplication par utilisateur
  let filteredPointages = [];
  if (periode === 'jour') {
    filteredPointages = pointages.filter(p => p.date === date);
  } else if (periode === 'semaine') {
    filteredPointages = pointages.filter(p => p.date >= dateDebut && p.date <= dateFin);
  } else if (periode === 'mois') {
    filteredPointages = pointages.filter(p => p.date && p.date.startsWith(mois));
  }

  // Déduplication par utilisateur et par date pour les statistiques des cartes
  const userStatsByDate = {};
  const statutPriority = { absent: 3, retard: 2, present: 1 };
  filteredPointages.forEach((p) => {
    const userId = p.user_id;
    const d = p.date;
    const key = `${userId}_${d}`;
    const current = userStatsByDate[key];
    const newStatut = p.statutJour || p.statut;
    const currentStatut = current ? (current.statutJour || current.statut) : null;
    const newPriority = statutPriority[newStatut] || 0;
    const currentPriority = statutPriority[currentStatut] || 0;
    if (!current || newPriority > currentPriority) {
      userStatsByDate[key] = p;
    }
  });
  
  // Extraire les pointages uniques pour les calculs de statistiques
  const uniquePointages = Object.values(userStatsByDate);
  
  // Calculer des statistiques locales basées sur les pointages uniques (sans doublons)
  const localStats = useMemo(() => {
    let present = 0, absent = 0, retard = 0;
    // Appliquer le filtre de contrat pour les stats
    let filteredUsers = users.filter(u => u.active !== false);
    if (typeContrat === 'Permanent') {
      filteredUsers = filteredUsers.filter(u => u.typeContrat === 'Permanent');
    } else if (typeContrat === 'Temporaire') {
      filteredUsers = filteredUsers.filter(u => u.typeContrat === 'Temporaire');
    }

    // Filtrer les pointages selon le contrat choisi
    let filteredUniquePointages = uniquePointages;
    if (typeContrat === 'Permanent') {
      filteredUniquePointages = uniquePointages.filter(p => {
        const user = users.find(u => (u.id || u._id) === p.user_id);
        return user && user.typeContrat === 'Permanent';
      });
    } else if (typeContrat === 'Temporaire') {
      filteredUniquePointages = uniquePointages.filter(p => {
        const user = users.find(u => (u.id || u._id) === p.user_id);
        return user && user.typeContrat === 'Temporaire';
      });
    }

    // Comptage des présents et retards
    filteredUniquePointages.forEach((p) => {
      const st = p.statutJour || p.statut;
      if (st === 'present') present++;
      if (st === 'retard') retard++;
    });

  // Nouveau comptage des absents : uniquement les pointages avec statut 'absent'
  absent = filteredUniquePointages.filter(p => (p.statutJour || p.statut) === 'absent').length;

    return {
      present,
      absent,
      en_retard: retard
    };
  }, [uniquePointages, users, periode, typeContrat, absenceRequests, date]);

  // Utiliser les stats locales au lieu des stats Redux pour corriger les doublons
  const finalStats = localStats;;

  // Agrégats pour semaine/mois (par user)
  let usersStats = {};
  if (showDetail && (periode === 'semaine' || periode === 'mois')) {
    uniquePointages.forEach(p => {
      const user = users.find(u => sameUser(u, p));
      if (!user) return;
      const key = getUserId(user);
      if (!usersStats[key]) {
        usersStats[key] = { user, present: 0, absent: 0, retard: 0, heures: 0 };
      }
      const st = p.statutJour || p.statut;
      if (st === 'present') usersStats[key].present += 1;
      if (st === 'absent') usersStats[key].absent += 1;
      if (st === 'retard') usersStats[key].retard += 1;
      if (p.heureEntree && p.heureSortie && st !== 'absent') {
        usersStats[key].heures += calcHours(p.heureEntree, p.heureSortie);
      }
    });
  }

  // --- Construction des lignes du tableau détail ---
  let tableRows = [];
  if (showDetail && detailType) {
    if (periode === 'jour') {
      // Si vous devez restreindre par société du RH connecté
      let societeId = null;
      if (isRH && users.length > 0) {
        const rhUser = users.find(u => u.role === 'RH');
        if (rhUser?.societe_id) societeId = rhUser.societe_id;
      }
      const usersBySociete = users.filter(u => !(isRH && societeId && u.societe_id && u.societe_id !== societeId));

      if (detailType === 'absent') {
        // Uniquement les utilisateurs ayant un pointage 'absent'
        let rows = filteredPointages
          .filter(p => (p.statutJour || p.statut) === 'absent')
          .map(p => {
            const user = usersBySociete.find(u => sameUser(u, p));
            const dept = departments.find(d => d.id === user?.departement_id);
            return { ...p, user, dept };
          })
          .filter(row => {
            if (!row.user) return false;
            if (filtreContrat && row.user.typeContrat !== filtreContrat) return false;
            if (filtreDepartement && row.user.departement_id !== +filtreDepartement) return false;
            if (searchTerm && !( (row.user.name + ' ' + (row.user.prenom || '')).toLowerCase().includes(searchTerm.toLowerCase()) )) return false;
            return true;
          });

        // Unicité par user
        const seen = new Set();
        rows = rows.filter(row => {
          const id = getUserId(row.user);
          if (seen.has(id)) return false;
          seen.add(id);
            return true;
        });

        tableRows = rows;
      }

      if (detailType === 'present') {
        // Uniquement PRESENT (ne pas inclure retard)
        let rows = filteredPointages
          .filter(p => (p.statutJour || p.statut) === 'present')
          .map(p => {
            const user = usersBySociete.find(u => sameUser(u, p));
            const dept = departments.find(d => d.id === user?.departement_id);
            return { ...p, user, dept };
          })
          .filter(row => {
            if (!row.user) return false;
            if (filtreContrat && row.user.typeContrat !== filtreContrat) return false;
            if (filtreDepartement && row.user.departement_id !== +filtreDepartement) return false;
            if (searchTerm && !( (row.user.name + ' ' + (row.user.prenom || '')).toLowerCase().includes(searchTerm.toLowerCase()) )) return false;
            return true;
          });

        // Unicité par user
        const seen = new Set();
        rows = rows.filter(row => {
          const id = getUserId(row.user);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        tableRows = rows;
      }

      if (detailType === 'retard') {
        let rows = filteredPointages
          .filter(p => (p.statutJour || p.statut) === 'retard')
          .map(p => {
            const user = usersBySociete.find(u => sameUser(u, p));
            const dept = departments.find(d => d.id === user?.departement_id);
            return { ...p, user, dept };
          })
          .filter(row => {
            if (!row.user) return false;
            if (filtreContrat && row.user.typeContrat !== filtreContrat) return false;
            if (filtreDepartement && row.user.departement_id !== +filtreDepartement) return false;
            if (searchTerm && !( (row.user.name + ' ' + (row.user.prenom || '')).toLowerCase().includes(searchTerm.toLowerCase()) )) return false;
            return true;
          });

        // Unicité par user
        const seen = new Set();
        rows = rows.filter(row => {
          const id = getUserId(row.user);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        tableRows = rows;
      }
    } else {
      // SEMAINE / MOIS : n’afficher que ceux qui ont AU MOINS 1 occurrence du type choisi
      const rows = Object.values(usersStats).map(stat => {
        const dept = departments.find(d => d.id === stat.user?.departement_id);
        return { ...stat, dept };
      }).filter(row => {
        if (!row.user) return false;
        // Garder uniquement ceux concernés par le type demandé
        if (detailType === 'present' && row.present <= 0) return false;
        if (detailType === 'absent' && row.absent <= 0) return false;
        if (detailType === 'retard' && row.retard <= 0) return false;

        if (filtreContrat && row.user.typeContrat !== filtreContrat) return false;
        if (filtreDepartement && row.user.departement_id !== +filtreDepartement) return false;
        if (searchTerm && !( (row.user.name + ' ' + (row.user.prenom || '')).toLowerCase().includes(searchTerm.toLowerCase()) )) return false;
        return true;
      });

      tableRows = rows;
    }
  }

  // Options filtres dynamiques basées sur la table visible
  const contratOptions = [...new Set(tableRows.map(r => r.user?.typeContrat).filter(Boolean))];
  const departementOptions = departments;

  // Ouverture du détail
  const handleShowDetail = (type) => {
    setDetailType(type);        // 'present' | 'absent' | 'retard'
    setShowDetail(true);
    // Initialiser le filtre contrat détail avec le filtre global sélectionné
    setFiltreContrat(typeContrat || '');
    setFiltreDepartement('');
    setSearchTerm('');
  };

  // Garder le panneau détail cohérent si l'utilisateur change le type de contrat global pendant qu'il est ouvert
  useEffect(() => {
    if (showDetail) {
      // Si un type global est défini, on l'applique; sinon on laisse le choix actuel
      if (typeContrat && filtreContrat !== typeContrat) {
        setFiltreContrat(typeContrat);
      }
      if (!typeContrat && filtreContrat) {
        // Si le global est remis à vide, on peut conserver ou réinitialiser; ici on réinitialise pour afficher tout
        setFiltreContrat('');
      }
    }
  }, [typeContrat, showDetail]);

  return (
    <div className="h-100" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh', padding: isMobile ? '0.5rem' : '1rem' }}>
      <div className={`container-fluid ${isMobile ? 'px-2' : 'px-4'}`}>

        {/* Header */}
        <MobilePageHeader
          title="Statistiques de Présence"
          subtitle="Tableau de bord des présences et absences"
          breadcrumb={[
            { text: 'Dashboard', icon: 'fluent:home-24-regular' },
            { text: 'Statistiques', icon: 'fluent:chart-multiple-24-regular' },
            { text: 'Présences' }
          ]}
          actions={[
            <ResponsiveButton
              key="export"
              variant="outline-primary"
              size={isMobile ? "sm" : "md"}
              onClick={() => console.log('Export')}
            >
              <Icon icon="fluent:document-arrow-down-24-regular" width={16} className="me-2" />
              Exporter
            </ResponsiveButton>,
            <ResponsiveButton
              key="refresh"
              variant="primary"
              size={isMobile ? "sm" : "md"}
              onClick={() => window.location.reload()}
            >
              <Icon icon="fluent:arrow-clockwise-24-regular" width={16} className="me-2" />
              Actualiser
            </ResponsiveButton>
          ]}
        />

        {/* Filtres principaux */}
        <div className={`row ${isMobile ? 'g-2 mb-3' : 'g-3 mb-4'}`}>
          <div className="col-12 col-md-3">
            <label htmlFor="typeContrat" className="form-label small fw-semibold text-muted">Type de Contrat</label>
            <select
              id="typeContrat"
              className="form-select"
              value={typeContrat}
              onChange={e => setTypeContrat(e.target.value)}
            >
              <option value="">Tous les contrats</option>
              <option value="Permanent">Permanent</option>
              <option value="Temporaire">Temporaire</option>
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label htmlFor="periode" className="form-label small fw-semibold text-muted">Période</label>
            <select
              id="periode"
              className="form-select"
              value={periode}
              onChange={e => setPeriode(e.target.value)}
            >
              <option value="jour">Par Jour</option>
              <option value="semaine">Entre 2 Jours</option>
              <option value="mois">Par Mois</option>
            </select>
          </div>
          {periode === 'jour' && (
            <div className="col-12 col-md-3">
              <label htmlFor="date" className="form-label small fw-semibold text-muted">Date</label>
              <input
                id="date"
                type="date"
                className="form-control"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          )}
          {periode === 'semaine' && (
            <>
              <div className="col-12 col-md-3">
                <label htmlFor="dateDebut" className="form-label small fw-semibold text-muted">Date début</label>
                <input
                  id="dateDebut"
                  type="date"
                  className="form-control"
                  value={dateDebut}
                  onChange={e => setDateDebut(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-3">
                <label htmlFor="dateFin" className="form-label small fw-semibold text-muted">Date fin</label>
                <input
                  id="dateFin"
                  type="date"
                  className="form-control"
                  value={dateFin}
                  onChange={e => setDateFin(e.target.value)}
                />
              </div>
            </>
          )}
          {periode === 'mois' && (
            <div className="col-12 col-md-3">
              <label htmlFor="mois" className="form-label small fw-semibold text-muted">Mois</label>
              <input
                id="mois"
                type="month"
                className="form-control"
                value={mois}
                onChange={e => setMois(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Cartes stats */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner-border-modern text-primary" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="text-muted mt-3">Chargement des statistiques...</p>
          </div>
        ) : finalStats ? (
          <>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <PresenceStatsCard
                  label="Total Présent"
                  value={(finalStats.present || 0)} // détail 'present' ne montrera que presents
                  icon="mdi:account-check"
                  showDetailsBtn={true}
                  onDetailsClick={() => handleShowDetail('present')}
                  selectorClass="animate-fade-in-up animate-delay-1"
                />
              </div>
              <div className="col-md-4">
                <PresenceStatsCard
                  label="Total Absent"
                  value={finalStats.absent || 0}
                  icon="mdi:account-off"
                  showDetailsBtn={true}
                  onDetailsClick={() => handleShowDetail('absent')}
                  selectorClass="animate-fade-in-up animate-delay-2"
                />
              </div>
              <div className="col-md-4">
                <PresenceStatsCard
                  label="Total En Retard"
                  value={finalStats.en_retard || 0}
                  icon="mdi:clock-alert"
                  showDetailsBtn={true}
                  onDetailsClick={() => handleShowDetail('retard')}
                  selectorClass="animate-fade-in-up animate-delay-3"
                />
              </div>
            </div>

            {/* Bloc détail */}
            {showDetail && detailType && (
              <div className="card my-4 shadow-sm border-0" style={{ borderRadius: 16 }}>
                <div className={`card-header ${isMobile ? 'flex-column align-items-start' : 'd-flex flex-wrap align-items-center'} gap-2 py-3 bg-primary-light`} style={{ borderRadius: '16px 16px 0 0', background: '#EFF6FF' }}>
                  <div className="d-flex align-items-center gap-2 mb-2 mb-md-0">
                    <span className="d-inline-flex align-items-center justify-content-center rounded-circle p-2 bg-white" style={{ color: '#0284C7', width: 38, height: 38 }}>
                      <Icon icon="mdi:account-group" className="fs-4" />
                    </span>
                    <div>
                      <h5 className="mb-0 fw-bold" style={{ color: '#0284C7', fontSize: isMobile ? '1rem' : '1.25rem' }}>
                        {detailType === 'present' ? 'Détail Présents' : detailType === 'absent' ? 'Détail Absents' : 'Détail Retards'}
                      </h5>
                      <span className="badge bg-primary text-white mt-1">{tableRows.length} employés</span>
                      {periode === 'jour' && <small className="d-block text-muted mt-1">du {date}</small>}
                      {periode === 'semaine' && <small className="d-block text-muted mt-1">du {dateDebut} au {dateFin}</small>}
                      {periode === 'mois' && <small className="d-block text-muted mt-1">({mois})</small>}
                    </div>
                  </div>
                  <ResponsiveButton
                    variant="outline-secondary"
                    size="sm"
                    icon="fluent:dismiss-24-regular"
                    mobileText="Fermer"
                    onClick={() => { setShowDetail(false); setDetailType(''); }}
                    className="ms-auto"
                    fullWidthMobile={false}
                  >
                    Fermer
                  </ResponsiveButton>
                </div>

                {/* Filtres RH + recherche */}
                {isRH && (
                  <div className={`${isMobile ? 'd-flex flex-column' : 'd-flex flex-wrap justify-content-center'} gap-3 align-items-end px-4 py-3`} style={{ background: '#F3F8FE', borderBottom: '1px solid #EEF2FB' }}>
                    <div className={isMobile ? 'w-100' : 'text-center'}>
                      <label className="text-primary fw-semibold mb-1" htmlFor="contratSelect">Type contrat</label>
                      <select id="contratSelect" className="form-select form-select-sm shadow-sm border-primary w-100" value={filtreContrat} onChange={e => setFiltreContrat(e.target.value)}>
                        <option value="">Tous</option>
                        {contratOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className={isMobile ? 'w-100' : 'text-center'}>
                      <label className="text-primary fw-semibold mb-1" htmlFor="departementSelect">Département</label>
                      <select id="departementSelect" className="form-select form-select-sm shadow-sm border-primary w-100" value={filtreDepartement} onChange={e => setFiltreDepartement(e.target.value)}>
                        <option value="">Tous</option>
                        {departementOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.nom}</option>)}
                      </select>
                    </div>
                    <div className={isMobile ? 'w-100' : 'text-center'}>
                      <label className="text-primary fw-semibold mb-1" htmlFor="searchName">Recherche</label>
                      <input id="searchName" className="form-control form-control-sm shadow-sm w-100" type="text" placeholder="Nom ou prénom" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                  </div>
                )}

                {/* Tableau */}
                <div className="card-body py-3 px-2">
                  <ResponsiveTable
                    headers={
                      periode === 'jour'
                        ? ['Nom', 'Prénom', 'Département', 'Type contrat', 'Entrée', 'Sortie', 'Heures supp.']
                        : ['Nom', 'Prénom', 'Département', 'Type contrat', 'Jours Présents', 'Jours Absents', 'En Retard', 'Heures totales']
                    }
                    data={tableRows.map(row => {
                      if (periode === 'jour') {
                        const heures = (row.heureEntree && row.heureSortie && row.statutJour !== 'absent')
                          ? calcHours(row.heureEntree, row.heureSortie)
                          : 0;
                        const supp = heures > 9 ? (heures - 9).toFixed(2) : 0;
                        return {
                          nom: row.user?.name || '',
                          prenom: row.user?.prenom || '',
                          departement: row.dept ? row.dept.nom : '-',
                          typeContrat: row.user?.typeContrat || '-',
                          entree: row.heureEntree || '-',
                          sortie: row.heureSortie || '-',
                          heuresSupp: supp > 0 ? supp : '0'
                        };
                      } else {
                        return {
                          nom: row.user?.name || '',
                          prenom: row.user?.prenom || '',
                          departement: row.dept ? row.dept.nom : '-',
                          typeContrat: row.user?.typeContrat || '-',
                          joursPresents: row.present || 0,
                          joursAbsents: row.absent || 0,
                          enRetard: row.retard || 0,
                          heuresTotales: row.heures ? row.heures.toFixed(2) : '0'
                        };
                      }
                    })}
                    className="mb-0"
                  />
                </div>
              </div>
            )}

            {/* Graphiques */}
            <div className="row g-2 g-md-4 mt-3 mt-md-4">
              <div className={`${isEMP ? 'col-12' : 'col-12 col-md-6'}`}>
                <div className="card border-0 shadow-sm rounded-4">
                  <div className={`card-header bg-transparent border-0 ${isMobile ? 'p-2' : 'p-3'}`}>
                    <h6 className="fw-bold mb-0 text-primary" style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}>
                      <Icon icon="mdi:chart-pie" className="me-2" />
                      <span className="d-none d-md-inline">Répartition des Présences</span>
                      <span className="d-md-none">Présences</span>
                    </h6>
                  </div>
                  <div className={`card-body ${isMobile ? 'p-1' : 'p-3'}`}>
                    <PresenceCircleChart
                      periode={periode}
                      date={date}
                      dateDebut={dateDebut}
                      dateFin={dateFin}
                      mois={mois}
                      isMobile={isMobile}
                    />
                  </div>
                </div>
              </div>

              {!isEMP && (
                <div className="col-12 col-md-6">
                  <div className="card border-0 shadow-sm rounded-4">
                    <div className={`card-header bg-transparent border-0 ${isMobile ? 'p-2' : 'p-3'}`}>
                      <h6 className="fw-bold mb-0 text-success" style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}>
                        <Icon icon="mdi:account-group" className="me-2" />
                        <span className="d-none d-md-inline">Répartition des Types de Contrat</span>
                        <span className="d-md-none">Contrats</span>
                      </h6>
                    </div>
                    <div className={`card-body ${isMobile ? 'p-1' : 'p-3'}`}>
                      <ContractTypeCircleChart
                        periode={periode}
                        date={date}
                        dateDebut={dateDebut}
                        dateFin={dateFin}
                        mois={mois}
                        isMobile={isMobile}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Évolution */}
            <div className="row mt-3 mt-md-4">
              <div className="col-12">
                <div className="card border-0 shadow-sm rounded-4">
                  <div className={`card-header bg-transparent border-0 ${isMobile ? 'p-2' : 'p-3'}`}>
                    <h6 className="fw-bold mb-0 text-info" style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}>
                      <Icon icon="mdi:chart-timeline-variant" className="me-2" />
                      <span className="d-none d-md-inline">Évolution des Présences</span>
                      <span className="d-md-none">Évolution</span>
                    </h6>
                  </div>
                  <div className={`card-body ${isMobile ? 'p-1' : 'p-3'}`}>
                    <PresenceEvaluationChart
                      periode={periode}
                      date={date}
                      dateDebut={dateDebut}
                      dateFin={dateFin}
                      mois={mois}
                      isMobile={isMobile}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-500">Aucune donnée disponible</p>
        )}
      </div>
    </div>
  );
};

export default PresenceDashboard;
