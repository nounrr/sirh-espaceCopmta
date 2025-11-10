import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Icon } from '@iconify/react';
import { fetchAbsenceRequests } from '../Redux/Slices/absenceRequestSlice';
import { fetchUsers } from '../Redux/Slices/userSlice';
import { fetchPointages } from '../Redux/Slices/pointageSlice';
import { fetchHolidays } from '../Redux/Slices/holidaySlice';
import { generateLeaveReport, calculateTeamLeaveStats, calculateSeniority, calculateRecoveryDays, calculateEffectiveLeaveDays, calculateReturnDate, calculateRecoveryDetails, getLeaveBreakdown } from '../services/leaveCalculationService';
import * as XLSX from 'xlsx';

const LeaveBalancesPage = () => {
  const dispatch = useDispatch();
  
  const { items: absenceRequests, status: absenceLoading } = useSelector((state) => state.absenceRequests);
  const { items: users, status: usersLoading } = useSelector((state) => state.users);
  const { items: departments } = useSelector((state) => state.departments);
  const { items: pointages } = useSelector((state) => state.pointages);
  const { items: holidays } = useSelector((state) => state.holidays);
  const holidaysStatus = useSelector(state => state.holidays.status);
  const holidaysError = useSelector(state => state.holidays.error);
  const { user: currentUser } = useSelector((state) => state.auth);
  
  const [leaveReports, setLeaveReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [teamStats, setTeamStats] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // États pour l'export avec filtres
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPeriodType, setExportPeriodType] = useState('all'); // 'all', 'month', 'period', 'day'
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportMonth, setExportMonth] = useState('');

  // Chargements initiaux (sans jours fériés tant que l'utilisateur non authentifié)
  useEffect(() => {
    dispatch(fetchAbsenceRequests());
    dispatch(fetchUsers());
    dispatch(fetchPointages());
  }, [dispatch]);

  // Charger les jours fériés uniquement quand l'utilisateur est authentifié (token dispo)
  useEffect(() => {
    if (currentUser) {
      dispatch(fetchHolidays());
    }
  }, [dispatch, currentUser]);

  // Vérifier si l'utilisateur est RH ou gestionnaire
  const isRHOrManager = currentUser && ['RH', 'Gest_RH'].includes(currentUser.role);

  // Obtenir les jours fériés de l'année courante (par substring pour éviter effets fuseau)
  const getCurrentYearHolidays = () => {
    if (!holidays || holidays.length === 0) return [];
    const currentYear = new Date().getFullYear();
    const currentYearStr = String(currentYear);
    const allActive = holidays.filter(h => h.actif !== false);
    const currentYearList = allActive.filter(h => (h.date || '').substring(0,4) === currentYearStr);
    // Fallback: si pas de jours fériés pour l'année courante mais on a ceux de l'année précédente, proposer fallback
    if (currentYearList.length === 0) {
      const prevYearStr = String(currentYear - 1);
      const prevYearList = allActive.filter(h => (h.date || '').substring(0,4) === prevYearStr);
      console.warn('[HOLIDAYS] Aucun jour férié actif trouvé pour', currentYear, '— fallback affiché année précédente');
      return prevYearList.sort((a,b)=> a.date.localeCompare(b.date));
    }
    return currentYearList.sort((a,b)=> a.date.localeCompare(b.date));
  };

  const currentYearHolidays = getCurrentYearHolidays();

  // Calculer les rapports de congés
  useEffect(() => {
    if (users.length > 0 && absenceRequests.length >= 0) {
      let usersToProcess = users;
      
      // Si l'utilisateur n'est pas RH/Gest_RH, ne traiter que son propre profil
      if (!isRHOrManager && currentUser) {
        usersToProcess = users.filter(user => user.id === currentUser.id);
      }
      
      const reports = usersToProcess.map(user => generateLeaveReport(user, absenceRequests, pointages, holidays))
        .filter(Boolean);
      
      setLeaveReports(reports);
      
      const stats = calculateTeamLeaveStats(usersToProcess, absenceRequests, pointages, holidays);
      setTeamStats(stats);
      
      // Si l'utilisateur n'est pas RH/Gest_RH, afficher automatiquement ses détails
      if (!isRHOrManager && currentUser && reports.length > 0) {
        const userReport = reports.find(r => r.employee.id === currentUser.id);
        if (userReport) {
          handleEmployeeClick(currentUser, userReport);
        }
      }
    }
  }, [users, absenceRequests, pointages, holidays, currentUser, isRHOrManager]);

  // Séparer les utilisateurs avec et sans date d'embauche, et selon le type de contrat
  const getUsersWithoutHireDate = () => {
    return users.filter(user => {
      const role = (user.role || '').trim();
      const status = (user.statut || '').toLowerCase();
      const isInactive = status === 'inactif';
      return (!user.dateEmbauche || user.dateEmbauche === null || user.dateEmbauche === '') && 
             !["RH", "Gest_Projet", "Gest_RH"].includes(role) && 
             !isInactive;
    });
  };

  const getUsersWithTemporaryContract = () => {
    return users.filter(user => {
      const status = (user.statut || '').toLowerCase();
      const isInactive = status === 'inactif';
      return user.dateEmbauche && 
             user.typeContrat && 
             user.typeContrat.toLowerCase() === 'temporaire' &&
             !isInactive;
    });
  };

  const usersWithoutHireDate = getUsersWithoutHireDate();
  const usersWithTemporaryContract = getUsersWithTemporaryContract();

  // Nouvelle logique de filtrage pour la liste unifiée
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    // Commencer avec tous les utilisateurs éligibles
    let filtered = users.filter(user => {
      const role = (user.role || '').trim();
      const status = (user.statut || '').toLowerCase();
      const isExcluded = ["RH", "Gest_Projet", "Gest_RH"].includes(role);
      const isTemporary = (user.typeContrat || '').toLowerCase() === 'temporaire';
      const isInactive = status === 'inactif';
      
      // Si l'utilisateur n'est pas RH/Gest_RH, ne montrer que son propre profil
      if (!isRHOrManager && currentUser) {
        return user.id === currentUser.id && !isInactive;
      }
      
      return !isExcluded && !isTemporary && !isInactive;
    });

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(user =>
        `${user.name} ${user.prenom}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par rôle
    if (roleFilter) {
      filtered = filtered.filter(user => {
        if (roleFilter === 'chef_dep') {
          return user.role === 'Chef_Dep';
        } else if (roleFilter === 'employe') {
          return user.role === 'Employe';
        } else if (roleFilter === 'chef_chant') {
          return user.role === 'Chef_Chant';
        }
        return true;
      });
    }

    // Filtre par statut (seulement pour ceux qui ont des rapports de congés)
    if (statusFilter) {
      filtered = filtered.filter(user => {
        const report = leaveReports.find(r => r.employee.id === user.id);
        if (!report) return statusFilter === 'no_leave'; // Utilisateurs sans rapport = pas de congés
        
        switch (statusFilter) {
          case 'normal':
            return !report.status.isOverused && report.status.warningLevel === 'low';
          case 'warning':
            return report.status.warningLevel === 'high' && !report.status.isOverused;
          case 'overused':
            return report.status.isOverused;
          case 'no_leave':
            return report.leave.remainingLeave === 0;
          default:
            return true;
        }
      });
    }

    // Tri
    filtered.sort((a, b) => {
      const reportA = leaveReports.find(r => r.employee.id === a.id);
      const reportB = leaveReports.find(r => r.employee.id === b.id);
      
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = `${a.name} ${a.prenom}`;
          bValue = `${b.name} ${b.prenom}`;
          break;
        case 'seniority':
          const seniorityA = reportA ? reportA.employee.seniority.totalMonths : 0;
          const seniorityB = reportB ? reportB.employee.seniority.totalMonths : 0;
          aValue = seniorityA;
          bValue = seniorityB;
          break;
        case 'acquired':
          aValue = reportA ? reportA.leave.acquiredLeave : 0;
          bValue = reportB ? reportB.leave.acquiredLeave : 0;
          break;
        case 'current_year':
          aValue = reportA ? reportA.leave.currentYearAcquired : 0;
          bValue = reportB ? reportB.leave.currentYearAcquired : 0;
          break;
        case 'carry_over':
          aValue = reportA ? (reportA.leave.carryOverLeave || 0) : 0;
          bValue = reportB ? (reportB.leave.carryOverLeave || 0) : 0;
          break;
        case 'recovery':
          aValue = reportA ? (reportA.leave.recoveryDays || 0) : calculateRecoveryDays(a.id, pointages, holidays);
          bValue = reportB ? (reportB.leave.recoveryDays || 0) : calculateRecoveryDays(b.id, pointages, holidays);
          break;
        case 'consumed':
          aValue = reportA ? reportA.leave.consumedLeave : 0;
          bValue = reportB ? reportB.leave.consumedLeave : 0;
          break;
        case 'remaining':
          aValue = reportA ? reportA.leave.remainingLeave : 0;
          bValue = reportB ? reportB.leave.remainingLeave : 0;
          break;
        case 'usage':
          aValue = reportA ? reportA.leave.usagePercentage : 0;
          bValue = reportB ? reportB.leave.usagePercentage : 0;
          break;
        default:
          // Tri par ancienneté par défaut (plus ancien en premier)
          const aHas = a.dateEmbauche && a.dateEmbauche !== '' && a.dateEmbauche !== null;
          const bHas = b.dateEmbauche && b.dateEmbauche !== '' && b.dateEmbauche !== null;
          if (aHas && bHas) {
            return new Date(a.dateEmbauche) - new Date(b.dateEmbauche);
          }
          if (aHas) return -1;
          if (bHas) return 1;
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    setFilteredUsers(filtered);
  }, [users, leaveReports, searchTerm, roleFilter, statusFilter, sortBy, sortOrder, isRHOrManager, currentUser]);

  // Maintenir la compatibilité avec filteredReports pour les statistiques
  useEffect(() => {
    const filtered = leaveReports.filter(report => {
      const role = (report.employee.role || '').trim();
      return !["RH", "Gest_Projet", "Gest_RH"].includes(role);
    });
    setFilteredReports(filtered);
  }, [leaveReports]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return 'mdi:sort';
    return sortOrder === 'asc' ? 'mdi:sort-ascending' : 'mdi:sort-descending';
  };

  const getStatusBadge = (report) => {
    if (report.status.isOverused) {
      return <span className="badge bg-danger">Quota dépassé</span>;
    }
    if (report.status.warningLevel === 'high') {
      return <span className="badge bg-warning">Forte utilisation</span>;
    }
    if (report.leave.remainingLeave === 0) {
      return <span className="badge bg-secondary">Épuisé</span>;
    }
    return <span className="badge bg-success">Normal</span>;
  };

  const handleEmployeeClick = (employee, report) => {
    // Calculer les détails supplémentaires
  const recoveryDays = calculateRecoveryDays(employee.id, pointages, holidays);
  const recoveryDetails = calculateRecoveryDetails(employee.id, pointages, holidays);
    const sickLeaveRequests = absenceRequests.filter(req => 
      req.user_id === employee.id && 
      req.type === 'Maladie' && 
      ['approuvé', 'validé'].includes(req.statut)
    );
    const leaveRequests = absenceRequests.filter(req => 
      req.user_id === employee.id && 
      req.type === 'Congé' && 
      ['approuvé', 'validé'].includes(req.statut)
    );
  const leaveBreakdown = getLeaveBreakdown(absenceRequests, employee.id, holidays);
    
    const sickDays = sickLeaveRequests.reduce((total, req) => {
      const start = new Date(req.dateDebut);
      const end = new Date(req.dateFin);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return total + days;
    }, 0);

    setSelectedEmployee({
      ...employee,
      report,
  recoveryDays,
  recoveryDetails,
      sickDays,
      sickLeaveRequests,
  leaveRequests,
  leaveBreakdown
    });
    setShowEmployeeModal(true);
  };

  const openExportModal = () => {
    setShowExportModal(true);
  };

  const handleExport = () => {
    exportToExcel();
    setShowExportModal(false);
  };

  const exportToExcel = () => {
    // Fonction pour vérifier si une absence correspond aux critères de filtrage
    const isAbsenceInPeriod = (absence) => {
      if (exportPeriodType === 'all') return true;
      
      const absenceStartDate = new Date(absence.dateDebut || absence.start_date);
      const absenceEndDate = new Date(absence.dateFin || absence.end_date);
      
      if (exportPeriodType === 'day') {
        if (!exportStartDate) return true;
        const filterDate = new Date(exportStartDate);
        return absenceStartDate <= filterDate && absenceEndDate >= filterDate;
      }
      
      if (exportPeriodType === 'month') {
        if (!exportMonth) return true;
        const [year, month] = exportMonth.split('-');
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
        return (absenceStartDate <= monthEnd && absenceEndDate >= monthStart);
      }
      
      if (exportPeriodType === 'period') {
        if (!exportStartDate || !exportEndDate) return true;
        const periodStart = new Date(exportStartDate);
        const periodEnd = new Date(exportEndDate);
        return (absenceStartDate <= periodEnd && absenceEndDate >= periodStart);
      }
      
      return true;
    };

    // Extraire les données d'absences pour tous les employés
    const exportData = [];
    
    // Date actuelle au format JJ/MM/AAAA
    const dateActuelle = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Générer le titre avec la période sélectionnée
    const getTitleWithPeriod = () => {
      let baseTitile = `LISTE DES ABSENCES DES EMPLOYÉS - ${dateActuelle.toUpperCase()}`;
      
      if (exportPeriodType === 'day' && exportStartDate) {
        const filterDate = new Date(exportStartDate).toLocaleDateString('fr-FR');
        baseTitile += ` - JOUR: ${filterDate.toUpperCase()}`;
      } else if (exportPeriodType === 'month' && exportMonth) {
        const [year, month] = exportMonth.split('-');
        const monthNames = ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 
                           'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'];
        baseTitile += ` - MOIS: ${monthNames[month - 1]} ${year}`;
      } else if (exportPeriodType === 'period' && exportStartDate && exportEndDate) {
        const startDate = new Date(exportStartDate).toLocaleDateString('fr-FR');
        const endDate = new Date(exportEndDate).toLocaleDateString('fr-FR');
        baseTitile += ` - PÉRIODE: ${startDate.toUpperCase()} AU ${endDate.toUpperCase()}`;
      }
      
      return baseTitile;
    };
    
    // Fonction pour formater les dates
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };
    
    // Compter les absences par type
    const absenceStats = {
      'CONGÉ': 0,
      'MALADIE': 0,
      'SANS SOLDE': 0,
      'ABSENCE JUSTIFIÉE': 0,
      'ABSENCE INJUSTIFIÉE': 0,
      'MATERNITÉ': 0,
      'PATERNITÉ': 0,
      'ACCIDENT DE TRAVAIL': 0,
      'FORMATION': 0,
      'MISSION': 0,
      'RÉCUPÉRATION': 0,
      'RTT': 0,
      'ÉVÉNEMENT FAMILIAL': 0,
      'AUTRES': 0
    };
    
    // Préparer les données pour les statistiques individuelles
    const individualStats = [];
    
    // Traiter TOUS les utilisateurs pour les statistiques individuelles
    users.forEach(user => {
      // Récupérer le nom complet et la fonction en majuscules
      const nom = user.name ? user.name.toUpperCase() : '';
      const prenom = user.prenom ? user.prenom.toUpperCase() : '';
      const fonction = user.role ? user.role.toUpperCase() : 'EMPLOYÉ';
      
      // Calculer les statistiques individuelles
      const userReport = leaveReports.find(r => r.employee.id === user.id);
      const recoveryDays = calculateRecoveryDays(user.id, pointages, holidays);
      
      // Filtrer les absences pour cet utilisateur (TOUTES les absences, pas seulement celles de la période)
      const userAbsences = absenceRequests.filter(req => 
        req.user_id === user.id
      );
      
      // Compter toutes les absences de l'utilisateur pour les statistiques individuelles
      const userAbsencesByTypeIndividual = {
        'CONGÉ': 0,
        'MALADIE': 0,
        'AUTRES': 0
      };
      
      // Compter toutes les absences pour les statistiques individuelles
      userAbsences.forEach(absence => {
        const type = absence.type || absence.absence_type || '';
        switch(type.toLowerCase()) {
          case 'congé': 
          case 'conge': 
          case 'congé payé': 
          case 'conge paye': 
            userAbsencesByTypeIndividual['CONGÉ']++;
            break;
            
          case 'maladie': 
            userAbsencesByTypeIndividual['MALADIE']++;
            break;
            
          default: 
            userAbsencesByTypeIndividual['AUTRES']++;
            break;
        }
      });
      
      // Ajouter les statistiques individuelles pour TOUS les employés
      individualStats.push({
        'NOM': nom,
        'PRÉNOM': prenom,
        'FONCTION': fonction,
        'ANCIENNETÉ (ANNÉES)': userReport ? userReport.employee.seniority.years : 0,
        'DATE D\'EMBAUCHE': user.dateEmbauche ? formatDate(user.dateEmbauche) : '',
        'CONGÉS ACQUIS': userReport ? userReport.leave.acquiredLeave.toFixed(2) : '0',
        'CONGÉS PRIS': userReport ? userReport.leave.consumedLeave.toFixed(2) : '0',
        'CONGÉS RESTANTS': userReport ? userReport.leave.remainingLeave.toFixed(2) : '0',
        'JOURS RÉCUPÉRATION': recoveryDays,
        'UTILISATION (%)': userReport ? userReport.leave.usagePercentage.toFixed(1) + '%' : '0%',
        'NB CONGÉS': userAbsencesByTypeIndividual['CONGÉ'],
        'NB MALADIES': userAbsencesByTypeIndividual['MALADIE'],
        'NB AUTRES ABSENCES': userAbsencesByTypeIndividual['AUTRES'],
        'TOTAL ABSENCES': userAbsences.length
      });
    });
    
    // Traiter uniquement les utilisateurs avec des absences FILTRÉES pour l'export principal
    users.forEach(user => {
      // Mais pour l'export principal, utiliser les absences filtrées par période
      const userAbsencesFiltered = absenceRequests.filter(req => 
        req.user_id === user.id && isAbsenceInPeriod(req)
      );
      
      if (userAbsencesFiltered && userAbsencesFiltered.length > 0) {
        // Récupérer le nom complet et la fonction en majuscules
        const nom = user.name ? user.name.toUpperCase() : '';
        const prenom = user.prenom ? user.prenom.toUpperCase() : '';
        const fonction = user.role ? user.role.toUpperCase() : 'EMPLOYÉ';
        
        // Compter les absences par type pour cet utilisateur (pour les statistiques générales)
        const userAbsencesByType = {
          'CONGÉ': 0,
          'MALADIE': 0,
          'AUTRES': 0
        };
        
        // Pour chaque absence, créer une ligne dans le rapport
        userAbsencesFiltered.forEach(absence => {
          // Utiliser dateDebut ou start_date selon ce qui est disponible
          let dateDebut = '';
          if (absence.dateDebut) {
            dateDebut = formatDate(absence.dateDebut);
          } else if (absence.start_date) {
            dateDebut = formatDate(absence.start_date);
          }
          
          // Utiliser dateFin ou end_date selon ce qui est disponible
          let dateFin = '';
          if (absence.dateFin) {
            dateFin = formatDate(absence.dateFin);
          } else if (absence.end_date) {
            dateFin = formatDate(absence.end_date);
          }
          
          // Calculer la date de reprise (jour après la fin)
          const dateReprise = (() => {
            const endDate = absence.dateFin || absence.end_date;
            if (!endDate) return '';
            const date = new Date(endDate);
            date.setDate(date.getDate() + 1);
            return formatDate(date);
          })();
          
          // Déterminer le type d'absence en majuscules
          const typeAbsence = (() => {
            // Utiliser le champ type ou absence_type selon ce qui est disponible
            const type = absence.type || absence.absence_type || '';
            
            switch(type.toLowerCase()) {
              case 'congé': 
              case 'conge': 
              case 'congé payé': 
              case 'conge paye': 
                absenceStats['CONGÉ']++;
                userAbsencesByType['CONGÉ']++;
                return 'CONGÉ';
                
              case 'maladie': 
                absenceStats['MALADIE']++;
                userAbsencesByType['MALADIE']++;
                return 'MALADIE';
                
              case 'sans solde': 
                absenceStats['SANS SOLDE']++;
                userAbsencesByType['AUTRES']++;
                return 'SANS SOLDE';
                
              case 'absence justifiée': 
              case 'absence justifiee':
                absenceStats['ABSENCE JUSTIFIÉE']++;
                userAbsencesByType['AUTRES']++;
                return 'ABSENCE JUSTIFIÉE';
                
              case 'absence injustifiée': 
              case 'absence injustifiee':
                absenceStats['ABSENCE INJUSTIFIÉE']++;
                userAbsencesByType['AUTRES']++;
                return 'ABSENCE INJUSTIFIÉE';
                
              case 'maternité': 
              case 'maternite':
                absenceStats['MATERNITÉ']++;
                userAbsencesByType['AUTRES']++;
                return 'MATERNITÉ';
                
              case 'paternité':
              case 'paternite': 
                absenceStats['PATERNITÉ']++;
                userAbsencesByType['AUTRES']++;
                return 'PATERNITÉ';
                
              case 'accident de travail': 
                absenceStats['ACCIDENT DE TRAVAIL']++;
                userAbsencesByType['AUTRES']++;
                return 'ACCIDENT DE TRAVAIL';
                
              case 'formation': 
                absenceStats['FORMATION']++;
                userAbsencesByType['AUTRES']++;
                return 'FORMATION';
                
              case 'mission': 
                absenceStats['MISSION']++;
                userAbsencesByType['AUTRES']++;
                return 'MISSION';
                
              case 'récupération':
              case 'recuperation': 
                absenceStats['RÉCUPÉRATION']++;
                userAbsencesByType['AUTRES']++;
                return 'RÉCUPÉRATION';
                
              case 'rtt': 
                absenceStats['RTT']++;
                userAbsencesByType['AUTRES']++;
                return 'RTT';
                
              case 'événement familial':
              case 'evenement familial': 
                absenceStats['ÉVÉNEMENT FAMILIAL']++;
                userAbsencesByType['AUTRES']++;
                return 'ÉVÉNEMENT FAMILIAL';
                
              default: 
                absenceStats['AUTRES']++;
                userAbsencesByType['AUTRES']++;
                return type.toUpperCase();
            }
          })();
          
          // Ajouter une ligne pour cette absence
          exportData.push({
            'NOM': nom,
            'PRÉNOM': prenom,
            'FONCTION': fonction,
            'TYPE D\'ABSENCE': typeAbsence,
            'DATE DE DÉBUT': dateDebut,
            'DATE DE FIN': dateFin,
            'DATE DE REPRISE': dateReprise
          });
        });
      }
    });
    
    // Créer le classeur Excel
    const wb = XLSX.utils.book_new();
    
    // COULEURS DÉFINIES
    const colors = {
      primaryBlue: '4472C4',
      lightBlue: 'E6F3FF',
      green: '70AD47',
      lightGreen: 'E2EFDA',
      orange: 'FFC000',
      lightOrange: 'FFF2CC',
      red: 'C5504B',
      lightRed: 'FCE4D6',
      purple: '7030A0',
      lightPurple: 'F2E6FF',
      gray: '7F7F7F',
      lightGray: 'F2F2F2'
    };
    
    // ================================
    // FEUILLE 1: ABSENCES
    // ================================
    const ws1 = XLSX.utils.aoa_to_sheet([]);
    
    // Ajouter le titre principal
    XLSX.utils.sheet_add_aoa(ws1, [
      [getTitleWithPeriod()],
      [''] // Ligne vide
    ], { origin: 'A1' });
    
    // Ajouter les données avec en-têtes
    XLSX.utils.sheet_add_json(ws1, exportData, { origin: 'A3' });
    
    // Style du titre principal
    ws1['A1'].s = {
      font: { bold: true, size: 16, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: { fgColor: { rgb: colors.primaryBlue } }
    };
    
    // Style des en-têtes de données
    const headerRange1 = XLSX.utils.decode_range(ws1['!ref']);
    for (let col = headerRange1.s.c; col <= headerRange1.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 2, c: col });
      if (!ws1[cellAddress]) continue;
      ws1[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, size: 12 },
        fill: { fgColor: { rgb: colors.green } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
    }
    
    // Style des données avec alternance de couleurs
    for (let row = 3; row < headerRange1.e.r + 1; row++) {
      const isEvenRow = (row - 3) % 2 === 0;
      const bgColor = isEvenRow ? 'FFFFFF' : colors.lightGray;
      
      for (let col = headerRange1.s.c; col <= headerRange1.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws1[cellAddress]) continue;
        
        // Couleur spéciale selon le type d'absence
        let cellBgColor = bgColor;
        if (col === 3) { // Colonne TYPE D'ABSENCE
          const cellValue = ws1[cellAddress].v;
          if (cellValue === 'CONGÉ') cellBgColor = colors.lightGreen;
          else if (cellValue === 'MALADIE') cellBgColor = colors.lightRed;
          else if (cellValue && cellValue !== '') cellBgColor = colors.lightOrange;
        }
        
        ws1[cellAddress].s = {
          fill: { fgColor: { rgb: cellBgColor } },
          border: {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
          },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
    }
    
    // Fusionner les cellules pour le titre
    ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
    
    // Ajuster la largeur des colonnes
    ws1['!cols'] = [
      { width: 20 }, // NOM
      { width: 20 }, // PRÉNOM
      { width: 15 }, // FONCTION
      { width: 25 }, // TYPE D'ABSENCE
      { width: 15 }, // DATE DE DÉBUT
      { width: 15 }, // DATE DE FIN
      { width: 15 }  // DATE DE REPRISE
    ];
    
    // Ajouter la première feuille au classeur
    XLSX.utils.book_append_sheet(wb, ws1, 'ABSENCES');
    
    // ================================
    // FEUILLE 2: STATISTIQUES GÉNÉRALES
    // ================================
    const statsData = [];
    
    // Ajouter les statistiques générales
    if (teamStats) {
      statsData.push({
        'CATÉGORIE': 'NOMBRE TOTAL D\'EMPLOYÉS',
        'VALEUR': teamStats.totalEmployees
      });
      
      statsData.push({
        'CATÉGORIE': 'TOTAL DES CONGÉS ACQUIS',
        'VALEUR': teamStats.totals.acquiredLeave.toFixed(2)
      });
      
      statsData.push({
        'CATÉGORIE': 'TOTAL DES CONGÉS PRIS',
        'VALEUR': teamStats.totals.consumedLeave.toFixed(2)
      });
      
      statsData.push({
        'CATÉGORIE': 'TOTAL DES CONGÉS RESTANTS',
        'VALEUR': teamStats.totals.remainingLeave.toFixed(2)
      });
      
      statsData.push({
        'CATÉGORIE': 'EMPLOYÉS TEMPORAIRES',
        'VALEUR': usersWithTemporaryContract.length
      });
    }
    
    // Ajouter une ligne vide
    statsData.push({ 'CATÉGORIE': '', 'VALEUR': '' });
    
    // Ajouter le comptage par type d'absence
    statsData.push({ 'CATÉGORIE': 'RÉPARTITION PAR TYPE D\'ABSENCE', 'VALEUR': '' });
    
    // Ajouter uniquement les types avec au moins une absence
    Object.entries(absenceStats).forEach(([type, count]) => {
      if (count > 0) {
        statsData.push({
          'CATÉGORIE': type,
          'VALEUR': count
        });
      }
    });
    
    // Créer la feuille de statistiques générales
    const ws2 = XLSX.utils.aoa_to_sheet([]);
    
    // Ajouter le titre principal
    XLSX.utils.sheet_add_aoa(ws2, [
      [`STATISTIQUES GÉNÉRALES - ${getTitleWithPeriod().replace('LISTE DES ABSENCES DES EMPLOYÉS - ', '')}`],
      [''] // Ligne vide
    ], { origin: 'A1' });
    
    // Ajouter les données avec en-têtes
    XLSX.utils.sheet_add_json(ws2, statsData, { origin: 'A3' });
    
    // Style du titre principal
    ws2['A1'].s = {
      font: { bold: true, size: 16, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: { fgColor: { rgb: colors.orange } }
    };
    
    // Style des en-têtes de données
    const statsHeaderRange = XLSX.utils.decode_range(ws2['!ref']);
    for (let col = statsHeaderRange.s.c; col <= statsHeaderRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 2, c: col });
      if (!ws2[cellAddress]) continue;
      ws2[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, size: 12 },
        fill: { fgColor: { rgb: colors.purple } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
    }
    
    // Style des données avec couleurs spécifiques
    for (let row = 3; row < statsHeaderRange.e.r + 1; row++) {
      for (let col = statsHeaderRange.s.c; col <= statsHeaderRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws2[cellAddress]) continue;
        
        let bgColor = 'FFFFFF';
        const cellValue = ws2[cellAddress].v;
        
        // Colorer selon le contenu
        if (col === 0 && cellValue) { // Colonne catégorie
          const cellValueStr = String(cellValue);
          if (cellValueStr.includes('RÉPARTITION')) bgColor = colors.lightPurple;
          else if (cellValueStr.includes('TOTAL')) bgColor = colors.lightBlue;
          else if (cellValue === 'CONGÉ') bgColor = colors.lightGreen;
          else if (cellValue === 'MALADIE') bgColor = colors.lightRed;
        }
        
        ws2[cellAddress].s = {
          fill: { fgColor: { rgb: bgColor } },
          border: {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
          },
          alignment: { horizontal: col === 0 ? 'left' : 'center', vertical: 'center' },
          font: { bold: cellValue && String(cellValue).includes('RÉPARTITION') }
        };
      }
    }
    
    // Fusionner les cellules pour le titre
    ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    
    // Ajuster la largeur des colonnes
    ws2['!cols'] = [
      { width: 35 }, // CATÉGORIE
      { width: 15 }  // VALEUR
    ];
    
    // Ajouter la deuxième feuille au classeur
    XLSX.utils.book_append_sheet(wb, ws2, 'STATISTIQUES GÉNÉRALES');
    
    // ================================
    // FEUILLE 3: STATISTIQUES INDIVIDUELLES
    // ================================
    const ws3 = XLSX.utils.aoa_to_sheet([]);
    
    // Ajouter le titre principal
    XLSX.utils.sheet_add_aoa(ws3, [
      [`STATISTIQUES INDIVIDUELLES - TOUTES PÉRIODES`],
      [''] // Ligne vide
    ], { origin: 'A1' });
    
    // Ajouter les données avec en-têtes
    XLSX.utils.sheet_add_json(ws3, individualStats, { origin: 'A3' });
    
    // Style du titre principal
    ws3['A1'].s = {
      font: { bold: true, size: 16, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: { fgColor: { rgb: colors.red } }
    };
    
    // Style des en-têtes de données
    const individualHeaderRange = XLSX.utils.decode_range(ws3['!ref']);
    for (let col = individualHeaderRange.s.c; col <= individualHeaderRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 2, c: col });
      if (!ws3[cellAddress]) continue;
      ws3[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, size: 11 },
        fill: { fgColor: { rgb: colors.gray } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
    }
    
    // Style des données avec alternance et indicateurs de performance
    for (let row = 3; row < individualHeaderRange.e.r + 1; row++) {
      const isEvenRow = (row - 3) % 2 === 0;
      const bgColor = isEvenRow ? 'FFFFFF' : colors.lightGray;
      
      for (let col = individualHeaderRange.s.c; col <= individualHeaderRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws3[cellAddress]) continue;
        
        let cellBgColor = bgColor;
        const cellValue = ws3[cellAddress].v;
        
        // Couleurs spéciales selon les colonnes
        if (col === 9) { // Colonne UTILISATION (%)
          const usage = parseFloat(cellValue);
          if (usage > 80) cellBgColor = colors.lightRed;
          else if (usage > 60) cellBgColor = colors.lightOrange;
          else cellBgColor = colors.lightGreen;
        } else if (col >= 10 && col <= 13) { // Colonnes de comptage d'absences
          if (cellValue > 5) cellBgColor = colors.lightRed;
          else if (cellValue > 2) cellBgColor = colors.lightOrange;
          else if (cellValue > 0) cellBgColor = colors.lightBlue;
        }
        
        ws3[cellAddress].s = {
          fill: { fgColor: { rgb: cellBgColor } },
          border: {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
          },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
    }
    
    // Fusionner les cellules pour le titre
    ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 14 } }];
    
    // Ajuster la largeur des colonnes
    ws3['!cols'] = [
      { width: 18 }, // NOM
      { width: 18 }, // PRÉNOM
      { width: 12 }, // FONCTION
      { width: 12 }, // ANCIENNETÉ
      { width: 15 }, // DATE EMBAUCHE
      { width: 12 }, // CONGÉS ACQUIS
      { width: 12 }, // CONGÉS PRIS
      { width: 12 }, // CONGÉS RESTANTS
      { width: 12 }, // JOURS RÉCUPÉRATION
      { width: 12 }, // UTILISATION (%)
      { width: 10 }, // NB CONGÉS
      { width: 12 }, // NB MALADIES
      { width: 15 }, // NB AUTRES ABSENCES
      { width: 12 }, // TOTAL ABSENCES
    ];
    
    // Ajouter la troisième feuille au classeur
    XLSX.utils.book_append_sheet(wb, ws3, 'STATISTIQUES INDIVIDUELLES');
    
    // Enregistrer le fichier Excel
    XLSX.writeFile(wb, `ABSENCES_EMPLOYES_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setStatusFilter('');
    setSortBy('name');
    setSortOrder('asc');
  };

  if (absenceLoading === 'loading' || usersLoading === 'loading') {
    return (
      <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="text-muted">Calcul des soldes de congés...</p>
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
                      <Icon icon="mdi:calendar-account-outline" style={{ fontSize: '2rem' }} />
                    </div>
                    <div>
                      <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>
                        {isRHOrManager ? 'Soldes de Congés' : 'Mes Congés'}
                      </h1>
                      <p className="mb-0 opacity-90">
                        {isRHOrManager ? 'Récapitulatif des congés des employés permanents' : 'Récapitulatif de vos congés'}
                      </p>
                    </div>
                  </div>
                  
                  {isRHOrManager && (
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-light d-flex align-items-center gap-2"
                      onClick={openExportModal}
                    >
                      <Icon icon="mdi:file-excel" />
                      Exporter Excel
                    </button>
                  </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques globales */}
        {teamStats && (
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-3 text-center">
                  <Icon icon="mdi:account-group" style={{ fontSize: '2rem', color: '#6c5ce7' }} className="mb-2" />
                  <h4 className="fw-bold mb-1">{teamStats.totalEmployees}</h4>
                  <small className="text-muted">Employés Permanents</small>
                  {usersWithTemporaryContract.length > 0 && (
                    <div className="mt-1">
                      <small className="text-warning">
                        +{usersWithTemporaryContract.length} temporaire{usersWithTemporaryContract.length > 1 ? 's' : ''}
                      </small>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-3 text-center">
                  <Icon icon="mdi:calendar-check" style={{ fontSize: '2rem', color: '#00b894' }} className="mb-2" />
                  <h4 className="fw-bold mb-1">{teamStats.totals.acquiredLeave.toFixed(2)}</h4>
                  <small className="text-muted">Congés Acquis (Total)</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-3 text-center">
                  <Icon icon="mdi:calendar-minus" style={{ fontSize: '2rem', color: '#e17055' }} className="mb-2" />
                  <h4 className="fw-bold mb-1">{teamStats.totals.consumedLeave.toFixed(2)}</h4>
                  <small className="text-muted">Congés Pris (Total)</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-3 text-center">
                  <Icon icon="mdi:calendar-clock" style={{ fontSize: '2rem', color: '#fdcb6e' }} className="mb-2" />
                  <h4 className="fw-bold mb-1">{teamStats.totals.remainingLeave.toFixed(2)}</h4>
                  <small className="text-muted">Congés Restants (Total)</small>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtres */}
        {isRHOrManager && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <div className="row g-3 align-items-center">
                  <div className="col-md-4">
                    <div className="position-relative">
                      <Icon icon="mdi:magnify" className="position-absolute start-0 top-50 translate-middle-y ms-3 text-secondary" />
                      <input
                        type="text"
                        className="form-control ps-5"
                        placeholder="Rechercher un employé..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <select
                      className="form-select"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="">Tous les rôles</option>
                      <option value="chef_dep">Chef Département</option>
                      <option value="employe">Employé</option>
                      <option value="chef_chant">Chef Chantier</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <select
                      className="form-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">Tous les statuts</option>
                      <option value="normal">Normal</option>
                      <option value="warning">Forte utilisation</option>
                      <option value="overused">Quota dépassé</option>
                      <option value="no_leave">Épuisé</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <select
                      className="form-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="name">Trier par nom</option>
                      <option value="seniority">Par ancienneté</option>
                      <option value="carry_over">Par solde N-1</option>
                      <option value="current_year">Par acquis N</option>
                      <option value="recovery">Par jours récupération</option>
                      <option value="acquired">Par total disponibles</option>
                      <option value="consumed">Par congés pris</option>
                      <option value="remaining">Par solde restant</option>
                      <option value="usage">Par utilisation</option>
                    </select>
                  </div>
                  <div className="col-md-1">
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      <Icon icon={sortOrder === 'asc' ? 'mdi:sort-ascending' : 'mdi:sort-descending'} />
                    </button>
                  </div>
                  <div className="col-md-2">
                    <button
                      className="btn btn-outline-danger w-100"
                      onClick={resetFilters}
                    >
                      <Icon icon="mdi:filter-remove" className="me-1" />
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        

        {/* Tableau des soldes */}
        {isRHOrManager && (
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold mb-0">
                    Soldes de Congés - Employés Permanents ({filteredUsers.length} employé{filteredUsers.length > 1 ? 's' : ''})
                    <div className="mt-1" style={{fontSize:"19px"}}>
                      <small className="text-success">
                        {filteredUsers.filter(u => u.dateEmbauche && u.dateEmbauche !== '' && u.dateEmbauche !== null).length} permanent{filteredUsers.filter(u => u.dateEmbauche && u.dateEmbauche !== '' && u.dateEmbauche !== null).length > 1 ? 's' : ''} avec congés
                      </small>
                      {filteredUsers.filter(u => !u.dateEmbauche || u.dateEmbauche === '' || u.dateEmbauche === null).length > 0 && (
                        <small className="text-danger ms-3">
                          {filteredUsers.filter(u => !u.dateEmbauche || u.dateEmbauche === '' || u.dateEmbauche === null).length} sans date d'embauche
                        </small>
                      )}
                      {usersWithTemporaryContract.length > 0 && (
                        <small className="text-muted ms-3">
                          ({usersWithTemporaryContract.length} temporaire{usersWithTemporaryContract.length > 1 ? 's' : ''} masqué{usersWithTemporaryContract.length > 1 ? 's' : ''})
                        </small>
                      )}
                    </div>
                  </h5>
                  
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-light d-flex align-items-center gap-2"
                      onClick={openExportModal}
                    >
                      <Icon icon="mdi:file-excel" />
                      Exporter Excel
                    </button>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('name')}
                        >
                          <div className="d-flex align-items-center gap-1">
                            Employé
                            <Icon icon={getSortIcon('name')} />
                          </div>
                        </th>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('seniority')}
                        >
                          <div className="d-flex align-items-center gap-1">
                            Ancienneté
                            <Icon icon={getSortIcon('seniority')} />
                          </div>
                        </th>
                        <th 
                          className="text-center"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('carry_over')}
                        >
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            Solde N-1
                            <Icon icon={getSortIcon('carry_over')} />
                          </div>
                        </th>
                        <th 
                          className="text-center"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('current_year')}
                        >
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            Acquis N
                            <Icon icon={getSortIcon('current_year')} />
                          </div>
                        </th>
                        <th 
                          className="text-center"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('recovery')}
                        >
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            Jours de récupération
                            <Icon icon={getSortIcon('recovery')} />
                          </div>
                        </th>
                        <th 
                          className="text-center"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('acquired')}
                        >
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            Total congés disponibles
                            <Icon icon={getSortIcon('acquired')} />
                          </div>
                        </th>
                        <th 
                          className="text-center"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('consumed')}
                        >
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            Congés pris
                            <Icon icon={getSortIcon('consumed')} />
                          </div>
                        </th>
                        <th 
                          className="text-center"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('remaining')}
                        >
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            Solde congés restants
                            <Icon icon={getSortIcon('remaining')} />
                          </div>
                        </th>
                        <th 
                          className="text-center"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('usage')}
                        >
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            Utilisation
                            <Icon icon={getSortIcon('usage')} />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Unified list using filteredUsers with proper sorting and filtering */}
                      {filteredUsers.map(user => {
                        const report = leaveReports.find(r => r.employee.id === user.id);
                        const hasHireDate = user.dateEmbauche && user.dateEmbauche !== '' && user.dateEmbauche !== null;
                        const recoveryDays = report ? Number(report.leave.recoveryDays).toFixed(2) : calculateRecoveryDays(user.id, pointages, holidays);
                        const seniority = report ? report.employee.seniority : (user.dateEmbauche ? calculateSeniority(user.dateEmbauche) : { years: 0, months: 0 });
                        // Calculer un petit indicateur des derniers congés (optionnel, mieux dans modal)
                        const lastLeave = absenceRequests
                          .filter(req => req.user_id === user.id && req.type === 'Congé' && ['approuvé','validé'].includes(req.statut))
                          .sort((a,b)=> new Date(b.dateDebut) - new Date(a.dateDebut))[0];
                        const effectiveDays = lastLeave ? calculateEffectiveLeaveDays(lastLeave.dateDebut, lastLeave.dateFin, holidays) : 0;
                        const returnDate = lastLeave ? calculateReturnDate(lastLeave.dateFin, holidays) : null;
                        return (
                          <tr key={user.id}>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className={hasHireDate ? "bg-primary rounded-circle d-flex align-items-center justify-content-center text-white" : "bg-danger rounded-circle d-flex align-items-center justify-content-center text-white"}
                                  style={{ width: '32px', height: '32px', fontSize: '14px' }}
                                >
                                  {user.name.charAt(0)}
                                </div>
                                <div>
                                  <button
                                    className={hasHireDate ? "btn btn-link p-0 text-start fw-semibold text-decoration-none" : "btn btn-link p-0 text-start fw-semibold text-decoration-none text-danger"}
                                    onClick={() => report ? handleEmployeeClick(user, report) : null}
                                    style={{ color: hasHireDate ? '#0d6efd' : '#dc3545', cursor: report ? 'pointer' : 'not-allowed' }}
                                    disabled={!report}
                                  >
                                    {user.name} {user.prenom}
                                  </button>
                                  {user.role === 'Chef_Dep' && (
                                    <div>
                                      <span className="badge bg-info text-white small">Chef Département</span>
                                    </div>
                                  )}
                                  {!hasHireDate && (
                                    <div>
                                      <span className="badge bg-danger text-white small">
                                        <Icon icon="mdi:alert" className="me-1" />
                                        Date d'embauche manquante
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span></span>
                              {seniority.years}a {seniority.months}m
                            </td>
                            <td className="text-center">
                              <span className={hasHireDate ? "badge bg-secondary-subtle text-secondary" : "badge bg-danger-subtle text-danger"}>
                                {report ? Number(report.leave.carryOverLeave || 0).toFixed(2) : 0}
                                {report && (report.leave.carryOverLeave || 0) > 0 && (
                                  <small className="d-block" style={{ fontSize: '0.65rem' }}>
                                    de {new Date().getFullYear() - 1}
                                  </small>
                                )}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={hasHireDate ? "badge bg-primary-subtle text-primary" : "badge bg-danger-subtle text-danger"}>
                                {report ? Number(report.leave.currentYearAcquired).toFixed(2) : 0}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={hasHireDate ? "badge bg-info-subtle text-info" : "badge bg-danger-subtle text-danger"}>
                                {recoveryDays}
                                {recoveryDays > 0 && (
                                  <small className="d-block" style={{ fontSize: '0.65rem' }}>
                                    jours
                                  </small>
                                )}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={hasHireDate ? "badge bg-success-subtle text-success" : "badge bg-danger-subtle text-danger"}>
                                {report ? Number(report.leave.acquiredLeave).toFixed(2) : 0}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={hasHireDate ? "badge bg-danger-subtle text-danger" : "badge bg-danger-subtle text-danger"}>
                                {report ? Number(report.leave.consumedLeave).toFixed(2) : 0}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={hasHireDate ? "badge bg-warning-subtle text-warning" : "badge bg-danger-subtle text-danger"}>
                                {report ? Number(report.leave.remainingLeave).toFixed(2) : 0}
                              </span>
                            </td>
                            <td className="text-center">
                              <div className="d-flex align-items-center justify-content-center gap-2">
                                <div className="progress" style={{ height: '8px', width: '60px' }}>
                                  <div
                                    className={`progress-bar ${hasHireDate ? (report && report.leave.usagePercentage > 80 ? 'bg-danger' : report && report.leave.usagePercentage > 60 ? 'bg-warning' : 'bg-success') : 'bg-danger'}`}
                                    style={{ width: `${hasHireDate && report ? Math.min(report.leave.usagePercentage, 100) : 0}%` }}
                                  ></div>
                                </div>
                                <small className={hasHireDate ? "text-muted fw-semibold" : "text-danger fw-semibold"}>
                                  {hasHireDate && report ? report.leave.usagePercentage : 0}%
                                </small>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredUsers.length === 0 && (
                  <div className="text-center py-5">
                    <Icon icon="mdi:calendar-remove" style={{ fontSize: '3rem', color: '#ccc' }} />
                    <p className="text-muted mt-3">Aucun employé trouvé avec ces critères</p>
                  </div>
                )}

                {/* Message informatif pour les utilisateurs temporaires */}
                {usersWithTemporaryContract.length > 0 && (
                  <div className="alert alert-info mt-3" role="alert">
                    <div className="d-flex align-items-center gap-2">
                      <Icon icon="mdi:information" style={{ fontSize: '1.25rem' }} />
                      <div>
                        <strong>Information :</strong> {usersWithTemporaryContract.length} utilisateur{usersWithTemporaryContract.length > 1 ? 's ont' : ' a'} 
                        un contrat temporaire et {usersWithTemporaryContract.length > 1 ? 'ne sont pas affichés' : 'n\'est pas affiché'} dans ce tableau car 
                        {usersWithTemporaryContract.length > 1 ? 'ils ne bénéficient' : 'il ne bénéficie'} pas de congés payés.
                      </div>
                    </div>
                  </div>
                )}

               
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Jours fériés de l'année courante (déplacé sous le tableau) */}
        {isRHOrManager && (
          <div className="row mb-4 mt-3">
            <div className="col-12">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="card-title mb-0 d-flex align-items-center">
                      <Icon icon="mdi:calendar-star" style={{ fontSize: '1.5rem', color: '#6c5ce7' }} className="me-2" />
                      Jours fériés {new Date().getFullYear()} ({currentYearHolidays.length} jours)
                    </h5>
                    <span className="badge bg-light text-dark border">status: {holidaysStatus}</span>
                  </div>
                  {holidaysError && (
                    <div className="alert alert-danger py-1 mb-2 small">
                      Erreur chargement jours fériés: {holidaysError?.message || JSON.stringify(holidaysError)}
                    </div>
                  )}
                  {currentYearHolidays.length > 0 ? (
                    <div className="row">
                      {currentYearHolidays.map((holiday, index) => {
                        const holidayDate = new Date(holiday.date);
                        const formattedDate = holidayDate.toLocaleDateString('fr-FR', {
                          weekday: 'long', day: 'numeric', month: 'long'
                        });
                        return (
                          <div key={index} className="col-sm-6 col-md-4 col-lg-3 mb-2">
                            <div className="bg-light rounded-3 p-2 h-100 d-flex flex-column justify-content-center text-center">
                              <div className="fw-bold text-primary" style={{ fontSize: '0.85rem' }}>{holiday.nom}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{formattedDate}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-muted py-3">
                      <Icon icon="mdi:calendar-remove" style={{ fontSize: '3rem' }} className="mb-2 d-block mx-auto" />
                      Aucun jour férié configuré pour {new Date().getFullYear()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal détails employé - seulement pour RH/Gest_RH */}
      {showEmployeeModal && selectedEmployee && isRHOrManager && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl" style={{ maxWidth: '95vw', width: '95vw' }}>
            <div className="modal-content">
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <Icon icon="mdi:account-details" />
                  Détails de {selectedEmployee.name} {selectedEmployee.prenom}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowEmployeeModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row">
                  {/* Informations personnelles */}
                  <div className="col-12">
                    <div className="card border-0 shadow-sm rounded-4 mb-3">
                      <div className="card-header bg-primary-subtle">
                        <h6 className="mb-0 text-primary fw-bold">
                          <Icon icon="mdi:account" className="me-2" />
                          Informations Personnelles
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="flex flex-wrap justify-content-between">
                        <div className="">
                          <small className="info-label">Nom complet :</small>
                          <span className="info-value">{selectedEmployee.name} {selectedEmployee.prenom}</span>
                        </div>
                        <div className="">
                          <small className="info-label">Email :</small>
                          <span className="info-value">{selectedEmployee.email}</span>
                        </div>
                        <div className="">
                          <small className="info-label">Téléphone :</small>
                          <span className="info-value">{selectedEmployee.tel || 'N/A'}</span>
                        </div>
                        <div className="">
                          <small className="info-label">Date d'embauche :</small>
                          <span className="info-value">{new Date(selectedEmployee.dateEmbauche).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="">
                          <small className="info-label">Ancienneté :</small>
                          <span className="info-value">{selectedEmployee.report.employee.seniority.years}a {selectedEmployee.report.employee.seniority.months}m</span>
                        </div>
                      </div>
                      </div>
                    </div>
                  </div>

                  {/* Résumé des congés */}
                  <div className="col-12">
                    <div className="card border-0 shadow-sm rounded-4 mb-3">
                      <div className="card-header bg-success-subtle">
                        <h6 className="mb-0 text-success fw-bold">
                          <Icon icon="mdi:calendar-check" className="me-2" />
                          Résumé des Congés
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="flex flex-wrap justify-content-between">
                        <div className="">
                          <small className="info-label">Acquis :</small>
                          <span className="info-value text-success">{selectedEmployee.report.leave.acquiredLeave} jours</span>
                        </div>
                        <div className="">
                          <small className="info-label">Pris :</small>
                          <span className="info-value text-danger">{selectedEmployee.report.leave.consumedLeave} jours</span>
                        </div>
                        <div className="">
                          <small className="info-label">Restant :</small>
                          <span className="info-value text-warning">{selectedEmployee.report.leave.remainingLeave} jours</span>
                        </div>
                        <div className="">
                          <small className="info-label">Jours récup :</small>
                          <span className="info-value text-info">{selectedEmployee.recoveryDays} jours</span>
                        </div>
                        <div className="">
                          <small className="info-label">Utilisation :</small>
                          <span className="info-value">{selectedEmployee.report.leave.usagePercentage}%</span>
                        </div>
                      </div>
                        </div>
                    </div>
                  </div>

                  {/* Détails Jours de récupération */}
                  <div className="col-12">
                    <div className="card border-0 shadow-sm rounded-4 mb-3">
                      <div className="card-header bg-info-subtle">
                        <h6 className="mb-0 text-info fw-bold">
                          <Icon icon="mdi:calendar-weekend" className="me-2" />
                          Détails Jours de Récupération
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-2 small text-muted">Total: {selectedEmployee.recoveryDetails?.total || 0}</div>
                        <div className="info-line small">
                          <small className="info-label">Dimanches travaillés :</small>
                          <div className="chips">
                            {(selectedEmployee.recoveryDetails?.sundays || []).length > 0 ? (
                              selectedEmployee.recoveryDetails.sundays.map((d, i) => (
                                <span key={i} className="chip">{new Date(d).toLocaleDateString('fr-FR')}</span>
                              ))
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </div>
                        </div>
                        <div className="info-line small">
                          <small className="info-label">Jours fériés travaillés :</small>
                          <div className="chips">
                            {(selectedEmployee.recoveryDetails?.holidays || []).length > 0 ? (
                              selectedEmployee.recoveryDetails.holidays.map((d, i) => (
                                <span key={i} className="chip">{new Date(d).toLocaleDateString('fr-FR')}</span>
                              ))
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Détail des congés approuvés */}
                  <div className="col-12">
                    <div className="card border-0 shadow-sm rounded-4 mb-3">
                      <div className="card-header bg-warning-subtle">
                        <h6 className="mb-0 text-warning fw-bold">
                          <Icon icon="mdi:clipboard-list" className="me-2" />
                          Détail des Congés (jours effectifs et dates)
                        </h6>
                      </div>
                      <div className="card-body">
                        {selectedEmployee.leaveBreakdown && selectedEmployee.leaveBreakdown.length > 0 ? (
                          <div className="table-responsive">
                            <table className="table table-sm align-middle">
                              <thead>
                                <tr>
                                  <th>Période</th>
                                  <th>Jours effectifs</th>
                                  <th>Dates effectives</th>
                                  <th>Date reprise</th>
                                  <th>Statut</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedEmployee.leaveBreakdown.map((item) => (
                                  <tr key={item.id}>
                                    <td>{new Date(item.start).toLocaleDateString('fr-FR')} → {new Date(item.end).toLocaleDateString('fr-FR')}</td>
                                    <td>
                                      <span className="badge bg-secondary-subtle text-secondary">{item.effectiveDays}</span>
                                    </td>
                                    <td>
                                      <div className="chips small" style={{ maxHeight: 90 }}>
                                        {item.effectiveDates.length > 0 ? item.effectiveDates.map((d, i) => (
                                          <span key={i} className="chip">{new Date(d).toLocaleDateString('fr-FR')}</span>
                                        )) : <span className="text-muted">—</span>}
                                      </div>
                                    </td>
                                    <td>{item.returnDate ? new Date(item.returnDate).toLocaleDateString('fr-FR') : '—'}</td>
                                    <td>
                                      <span className={`badge ${item.statut === 'validé' ? 'bg-success' : 'bg-info'}`}>{item.statut}</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-muted">Aucun congé approuvé.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Congés de maladie */}
                  <div className="col-12">
                    <div className="card border-0 shadow-sm rounded-4 mb-3">
                      <div className="card-header bg-danger-subtle">
                        <h6 className="mb-0 text-danger fw-bold">
                          <Icon icon="mdi:medical-bag" className="me-2" />
                          Congés Maladie
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="info-line">
                          <small className="info-label">Total jours maladie :</small>
                          <span className="info-value text-danger">{selectedEmployee.sickDays} jours</span>
                        </div>
                        <div className="mt-2">
                          <small className="text-muted">Dernières demandes :</small>
                          <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                            {selectedEmployee.sickLeaveRequests.length > 0 ? (
                              selectedEmployee.sickLeaveRequests.slice(0, 3).map((req, index) => (
                                <div key={index} className="small border-bottom py-1">
                                  {new Date(req.dateDebut).toLocaleDateString('fr-FR')} - {new Date(req.dateFin).toLocaleDateString('fr-FR')}
                                  <span className="badge bg-danger ms-2 small">{req.statut}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-muted small">Aucun congé maladie</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

      {/* Derniers congés */}
      <div className="col-12">
                    <div className="card border-0 shadow-sm rounded-4 mb-3">
                      <div className="card-header bg-warning-subtle">
                        <h6 className="mb-0 text-warning fw-bold">
                          <Icon icon="mdi:calendar-month" className="me-2" />
                          Derniers Congés
                        </h6>
                      </div>
                      <div className="card-body">
        <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                          {selectedEmployee.leaveRequests.length > 0 ? (
                            selectedEmployee.leaveRequests.slice(0, 4).map((req, index) => (
                              <div key={index} className="small border-bottom py-1">
                                <div className="d-flex justify-content-between">
                                  <span>{new Date(req.dateDebut).toLocaleDateString('fr-FR')} - {new Date(req.dateFin).toLocaleDateString('fr-FR')}</span>
                                  <span className="badge bg-success small">{req.statut}</span>
                                </div>
                                {req.motif && <div className="text-muted" style={{ fontSize: '0.7rem' }}>{req.motif}</div>}
                              </div>
                            ))
                          ) : (
                            <div className="text-muted small">Aucun congé pris</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowEmployeeModal(false)}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Détails employé en div - pour les utilisateurs non-RH */}
      {selectedEmployee && !isRHOrManager && (
        <div className="container-fluid px-4 mt-4">
          <div className="row">
            <div className="col-12">
              <div className="card border-0 shadow-lg rounded-4">
                <div className="card-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                  <h5 className="mb-0 d-flex align-items-center gap-2">
                    <Icon icon="mdi:account-details" />
                    Mes Détails - {selectedEmployee.name} {selectedEmployee.prenom}
                  </h5>
                </div>
                <div className="card-body p-4">
                  <div className="row">
                    {/* Informations personnelles */}
                    <div className="col-12">
                      <div className="card border-0 shadow-sm rounded-4 mb-3">
                        <div className="card-header bg-primary-subtle">
                          <h6 className="mb-0 text-primary fw-bold">
                            <Icon icon="mdi:account" className="me-2" />
                            Informations Personnelles
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="flex flex-wrap justify-content-between">
                          <div className="">
                            <small className="info-label">Nom complet :</small>
                            <span className="info-value">{selectedEmployee.name} {selectedEmployee.prenom}</span>
                          </div>
                          <div className="">
                            <small className="info-label">Email :</small>
                            <span className="info-value">{selectedEmployee.email}</span>
                          </div>
                          <div className="">
                            <small className="info-label">Téléphone :</small>
                            <span className="info-value">{selectedEmployee.tel || 'N/A'}</span>
                          </div>
                          <div className="">
                            <small className="info-label">Date d'embauche :</small>
                            <span className="info-value">{new Date(selectedEmployee.dateEmbauche).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div className="">
                            <small className="info-label">Ancienneté :</small>
                            <span className="info-value">{selectedEmployee.report.employee.seniority.years}a {selectedEmployee.report.employee.seniority.months}m</span>
                          </div>
                        </div>
                        </div>
                      </div>
                    </div>

                    {/* Résumé des congés */}
                    <div className="col-12">
                      <div className="card border-0 shadow-sm rounded-4 mb-3">
                        <div className="card-header bg-success-subtle">
                          <h6 className="mb-0 text-success fw-bold">
                            <Icon icon="mdi:calendar-check" className="me-2" />
                            Résumé des Congés
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="flex flex-wrap justify-content-between">
                          <div className="">
                            <small className="info-label">Acquis :</small>
                            <span className="info-value text-success">{selectedEmployee.report.leave.acquiredLeave} jours</span>
                          </div>
                          <div className="">
                            <small className="info-label">Pris :</small>
                            <span className="info-value text-danger">{selectedEmployee.report.leave.consumedLeave} jours</span>
                          </div>
                          <div className="">
                            <small className="info-label">Restant :</small>
                            <span className="info-value text-warning">{selectedEmployee.report.leave.remainingLeave} jours</span>
                          </div>
                          <div className="">
                            <small className="info-label">Jours récup :</small>
                            <span className="info-value text-info">{selectedEmployee.recoveryDays} jours</span>
                          </div>
                          <div className="">
                            <small className="info-label">Utilisation :</small>
                            <span className="info-value">{selectedEmployee.report.leave.usagePercentage}%</span>
                          </div>
                        </div>
                          </div>
                      </div>
                    </div>

                    {/* Détails Jours de récupération */}
                    <div className="col-12">
                      <div className="card border-0 shadow-sm rounded-4 mb-3">
                        <div className="card-header bg-info-subtle">
                          <h6 className="mb-0 text-info fw-bold">
                            <Icon icon="mdi:calendar-weekend" className="me-2" />
                            Détails Jours de Récupération
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="mb-2 small text-muted">Total: {selectedEmployee.recoveryDetails?.total || 0}</div>
                          <div className="info-line small">
                            <small className="info-label">Dimanches travaillés :</small>
                            <div className="chips">
                              {(selectedEmployee.recoveryDetails?.sundays || []).length > 0 ? (
                                selectedEmployee.recoveryDetails.sundays.map((d, i) => (
                                  <span key={i} className="chip">{new Date(d).toLocaleDateString('fr-FR')}</span>
                                ))
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </div>
                          </div>
                          <div className="info-line small">
                            <small className="info-label">Jours fériés travaillés :</small>
                            <div className="chips">
                              {(selectedEmployee.recoveryDetails?.holidays || []).length > 0 ? (
                                selectedEmployee.recoveryDetails.holidays.map((d, i) => (
                                  <span key={i} className="chip">{new Date(d).toLocaleDateString('fr-FR')}</span>
                                ))
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Détail des congés approuvés */}
                    <div className="col-12">
                      <div className="card border-0 shadow-sm rounded-4 mb-3">
                        <div className="card-header bg-warning-subtle">
                          <h6 className="mb-0 text-warning fw-bold">
                            <Icon icon="mdi:clipboard-list" className="me-2" />
                            Détail des Congés (jours effectifs et dates)
                          </h6>
                        </div>
                        <div className="card-body">
                          {selectedEmployee.leaveBreakdown && selectedEmployee.leaveBreakdown.length > 0 ? (
                            <div className="table-responsive">
                              <table className="table table-sm align-middle">
                                <thead>
                                  <tr>
                                    <th>Période</th>
                                    <th>Jours effectifs</th>
                                    <th>Dates effectives</th>
                                    <th>Date reprise</th>
                                    <th>Statut</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedEmployee.leaveBreakdown.map((item) => (
                                    <tr key={item.id}>
                                      <td>{new Date(item.start).toLocaleDateString('fr-FR')} → {new Date(item.end).toLocaleDateString('fr-FR')}</td>
                                      <td>
                                        <span className="badge bg-secondary-subtle text-secondary">{item.effectiveDays}</span>
                                      </td>
                                      <td>
                                        <div className="chips small" style={{ maxHeight: 90 }}>
                                          {item.effectiveDates.length > 0 ? item.effectiveDates.map((d, i) => (
                                            <span key={i} className="chip">{new Date(d).toLocaleDateString('fr-FR')}</span>
                                          )) : <span className="text-muted">—</span>}
                                        </div>
                                      </td>
                                      <td>{item.returnDate ? new Date(item.returnDate).toLocaleDateString('fr-FR') : '—'}</td>
                                      <td>
                                        <span className={`badge ${item.statut === 'validé' ? 'bg-success' : 'bg-info'}`}>{item.statut}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-muted">Aucun congé approuvé.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Congés de maladie */}
                    <div className="col-12">
                      <div className="card border-0 shadow-sm rounded-4 mb-3">
                        <div className="card-header bg-danger-subtle">
                          <h6 className="mb-0 text-danger fw-bold">
                            <Icon icon="mdi:medical-bag" className="me-2" />
                            Congés Maladie
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="info-line">
                            <small className="info-label">Total jours maladie :</small>
                            <span className="info-value text-danger">{selectedEmployee.sickDays} jours</span>
                          </div>
                          <div className="mt-2">
                            <small className="text-muted">Dernières demandes :</small>
                            <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                              {selectedEmployee.sickLeaveRequests.length > 0 ? (
                                selectedEmployee.sickLeaveRequests.slice(0, 3).map((req, index) => (
                                  <div key={index} className="small border-bottom py-1">
                                    {new Date(req.dateDebut).toLocaleDateString('fr-FR')} - {new Date(req.dateFin).toLocaleDateString('fr-FR')}
                                    <span className="badge bg-danger ms-2 small">{req.statut}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-muted small">Aucun congé maladie</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Derniers congés */}
                    <div className="col-12">
                      <div className="card border-0 shadow-sm rounded-4 mb-3">
                        <div className="card-header bg-warning-subtle">
                          <h6 className="mb-0 text-warning fw-bold">
                            <Icon icon="mdi:calendar-month" className="me-2" />
                            Derniers Congés
                          </h6>
                        </div>
                        <div className="card-body">
                          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                            {selectedEmployee.leaveRequests.length > 0 ? (
                              selectedEmployee.leaveRequests.slice(0, 4).map((req, index) => (
                                <div key={index} className="small border-bottom py-1">
                                  <div className="d-flex justify-content-between">
                                    <span>{new Date(req.dateDebut).toLocaleDateString('fr-FR')} - {new Date(req.dateFin).toLocaleDateString('fr-FR')}</span>
                                    <span className="badge bg-success small">{req.statut}</span>
                                  </div>
                                  {req.motif && <div className="text-muted" style={{ fontSize: '0.7rem' }}>{req.motif}</div>}
                                </div>
                              ))
                            ) : (
                              <div className="text-muted small">Aucun congé pris</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'export avec options de filtrage */}
      {showExportModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', color: 'white' }}>
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <Icon icon="mdi:file-export" />
                  Options d'Export Excel
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowExportModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-4">
                  <h6 className="fw-bold mb-3">
                    <Icon icon="mdi:calendar-filter" className="me-2" />
                    Filtrer par période
                  </h6>
                  
                  <div className="row g-3">
                    <div className="col-12">
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="radio" 
                          name="periodType" 
                          id="all"
                          value="all"
                          checked={exportPeriodType === 'all'}
                          onChange={(e) => setExportPeriodType(e.target.value)}
                        />
                        <label className="form-check-label fw-bold" htmlFor="all">
                          <Icon icon="mdi:calendar-multiple" className="me-2 text-primary" />
                          Toutes les absences
                        </label>
                        <small className="d-block text-muted ms-4">Exporter toutes les absences sans filtre</small>
                      </div>
                    </div>
                    
                    <div className="col-12">
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="radio" 
                          name="periodType" 
                          id="day"
                          value="day"
                          checked={exportPeriodType === 'day'}
                          onChange={(e) => setExportPeriodType(e.target.value)}
                        />
                        <label className="form-check-label fw-bold" htmlFor="day">
                          <Icon icon="mdi:calendar-today" className="me-2 text-success" />
                          Jour spécifique
                        </label>
                        <small className="d-block text-muted ms-4">Absences actives pendant un jour donné</small>
                      </div>
                      {exportPeriodType === 'day' && (
                        <div className="mt-2 ms-4">
                          <input 
                            type="date" 
                            className="form-control" 
                            value={exportStartDate}
                            onChange={(e) => setExportStartDate(e.target.value)}
                            placeholder="Sélectionner le jour"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="col-12">
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="radio" 
                          name="periodType" 
                          id="month"
                          value="month"
                          checked={exportPeriodType === 'month'}
                          onChange={(e) => setExportPeriodType(e.target.value)}
                        />
                        <label className="form-check-label fw-bold" htmlFor="month">
                          <Icon icon="mdi:calendar-month" className="me-2 text-warning" />
                          Mois spécifique
                        </label>
                        <small className="d-block text-muted ms-4">Absences qui chevauchent avec le mois sélectionné</small>
                      </div>
                      {exportPeriodType === 'month' && (
                        <div className="mt-2 ms-4">
                          <input 
                            type="month" 
                            className="form-control" 
                            value={exportMonth}
                            onChange={(e) => setExportMonth(e.target.value)}
                            placeholder="Sélectionner le mois"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="col-12">
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="radio" 
                          name="periodType" 
                          id="period"
                          value="period"
                          checked={exportPeriodType === 'period'}
                          onChange={(e) => setExportPeriodType(e.target.value)}
                        />
                        <label className="form-check-label fw-bold" htmlFor="period">
                          <Icon icon="mdi:calendar-range" className="me-2 text-info" />
                          Période personnalisée
                        </label>
                        <small className="d-block text-muted ms-4">Absences qui chevauchent avec la période définie</small>
                      </div>
                      {exportPeriodType === 'period' && (
                        <div className="row mt-2 ms-2">
                          <div className="col-6">
                            <label className="form-label small">Date de début</label>
                            <input 
                              type="date" 
                              className="form-control" 
                              value={exportStartDate}
                              onChange={(e) => setExportStartDate(e.target.value)}
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label small">Date de fin</label>
                            <input 
                              type="date" 
                              className="form-control" 
                              value={exportEndDate}
                              onChange={(e) => setExportEndDate(e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="alert alert-info">
                  <Icon icon="mdi:information" className="me-2" />
                  <strong>Information :</strong> L'export comprendra 3 feuilles :
                  <ul className="mb-0 mt-2">
                    <li>Liste des absences (filtrées selon vos critères)</li>
                    <li>Statistiques générales</li>
                    <li>Statistiques individuelles de chaque employé</li>
                  </ul>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowExportModal(false)}
                >
                  <Icon icon="mdi:close" className="me-1" />
                  Annuler
                </button>
                <button 
                  type="button" 
                  className="btn btn-success" 
                  onClick={handleExport}
                >
                  <Icon icon="mdi:file-excel" className="me-1" />
                  Exporter Excel
                </button>
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
        .table tbody tr:hover {
          background-color: rgba(0, 123, 255, 0.05);
        }
        th[style*="cursor"] {
          user-select: none;
        }
        .bg-success-subtle {
          background-color: rgba(25, 135, 84, 0.1) !important;
        }
        .bg-danger-subtle {
          background-color: rgba(220, 53, 69, 0.1) !important;
        }
        .bg-warning-subtle {
          background-color: rgba(255, 193, 7, 0.1) !important;
        }
        .bg-primary-subtle {
          background-color: rgba(13, 110, 253, 0.1) !important;
        }
        .bg-secondary-subtle {
          background-color: rgba(108, 117, 125, 0.1) !important;
        }
        .bg-info-subtle {
          background-color: rgba(13, 202, 240, 0.1) !important;
        }
        .text-info-emphasis {
          color: #055160 !important;
        }
        .bg-danger-subtle {
          background-color: rgba(220, 53, 69, 0.1) !important;
        }
        tr[style*="background-color: #ffebee"] {
          border-left: 4px solid #dc3545 !important;
        }
        tr[style*="background-color: #ffebee"]:hover {
          background-color: rgba(255, 235, 238, 0.8) !important;
        }
        tr[style*="background-color: #fff8e7"] {
          border-left: 4px solid #ffc107 !important;
        }
        tr[style*="background-color: #fff8e7"]:hover {
          background-color: rgba(255, 248, 231, 0.8) !important;
        }
        .bg-warning-subtle {
          background-color: rgba(255, 193, 7, 0.1) !important;
        }

        /* Modal helpers */
        .info-line {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: nowrap;
          margin-bottom: 8px;
          justify-content: flex-start;
        }
        .info-label {
          color: #6c757d;
          min-width: 150px;
          flex-shrink: 0;
          font-size: 0.9rem;
        }
        .info-value {
          font-weight: 600;
          word-break: break-word;
          flex: 1;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          max-height: 120px;
          overflow-y: auto;
        }
        .chip {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          background: rgba(13,110,253,0.08);
          color: #0d6efd;
          font-size: 0.78rem;
          border: 1px solid rgba(13,110,253,0.2);
        }

        /* Mobile tweaks */
        @media (max-width: 576px) {
          .modal-dialog.modal-xl { width: 98vw !important; max-width: 98vw !important; margin: 0; }
          .info-line { flex-wrap: wrap; }
          .info-label { min-width: 110px; font-size: 0.85rem; }
          .chips { max-height: 160px; }
        }
      `}</style>
    </div>
  );
};

export default LeaveBalancesPage;
