/**
 * Service de calcul des congés
 * Gère le calcul des congés totaux, consommés et acquis
 */

/**
 * Calcule les jours de récupération (dimanches et jours fériés travaillés)
 */
export const calculateRecoveryDays = (userId, pointages, holidays) => {
  if (!pointages || pointages.length === 0 || !userId) return 0;
  
  const currentYear = new Date().getFullYear();
  const userPointages = pointages.filter(p => 
    p.user_id === userId && 
    new Date(p.date).getFullYear() === currentYear &&
    // Ne compter que les jours où l'employé était présent ou en retard
    (p.statutJour === 'present' || p.statutJour === 'retard')
  );
  
  // Créer un set des dates de jours fériés pour l'année courante
  const holidayDates = new Set();
  if (holidays && holidays.length > 0) {
    holidays.forEach(holiday => {
      const holidayDate = new Date(holiday.date);
      if (holidayDate.getFullYear() === currentYear && holiday.actif !== false) {
        const formattedDate = formatYMD(holidayDate);
        holidayDates.add(formattedDate);
      }
    });
  }
  
  let recoveryDays = 0;
  
  userPointages.forEach(pointage => {
    const pointageDate = new Date(pointage.date);
    const dayOfWeek = pointageDate.getDay(); // 0 = dimanche, 6 = samedi
    const dateString = formatYMD(pointageDate);
    
    // Un jour peut être à la fois dimanche ET jour férié
    // On compte une fois pour chaque condition remplie
    let dayRecoveryCount = 0;
    
    // Vérifier si c'est un dimanche travaillé (présent ou en retard)
    if (dayOfWeek === 0) {
      dayRecoveryCount++;
    }
    
    // Vérifier si c'est un jour férié travaillé (présent ou en retard)
    if (holidayDates.has(dateString)) {
      dayRecoveryCount++;
    }
    
    recoveryDays += dayRecoveryCount;
  });

  return recoveryDays;
};

/**
 * Détails des jours de récupération (liste des dimanches et des fériés travaillés)
 */

/**
 * Calcule le nombre de jours entre deux dates
 */
export const calculateDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Formatteur YYYY-MM-DD en local (évite les décalages UTC)
const formatYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Construit un Set des dates fériées actives (YYYY-MM-DD)
 */
const buildHolidaySet = (holidays = [], yearFilter = null) => {
  const set = new Set();
  (holidays || []).forEach(h => {
    if (!h) return;
    const d = new Date(h.date);
    if (h.actif !== false && (!yearFilter || d.getFullYear() === yearFilter)) {
      set.add(formatYMD(d));
    }
  });
  return set;
};

/**
 * Calcule les jours de congé effectifs sur une période inclusive en retirant:
 * - les jours fériés (uniquement)
 * - les dimanches non fériés (pour éviter double soustraction)
 * Si un 'year' est fourni, ne compte que les jours tombant dans cette année.
 */
export const calculateEffectiveLeaveDays = (startDate, endDate, holidays = [], year = null) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end) || end < start) return 0;

  // Appliquer un filtre d'année si fourni en bornant l'intervalle
  let rangeStart = new Date(start);
  let rangeEnd = new Date(end);
  if (year) {
    const yStart = new Date(year, 0, 1); // Jan 1
    const yEnd = new Date(year, 11, 31, 23, 59, 59, 999); // Dec 31
    if (rangeEnd < yStart || rangeStart > yEnd) return 0; // hors de l'année
    if (rangeStart < yStart) rangeStart = yStart;
    if (rangeEnd > yEnd) rangeEnd = yEnd;
  }

  const holidaySet = buildHolidaySet(holidays, year || null);
  let count = 0;
  // Itérer jour par jour (granularité journée)
  for (let d = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()); d <= new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate()); d.setDate(d.getDate() + 1)) {
    const iso = formatYMD(d);
    const isHoliday = holidaySet.has(iso);
    const isSunday = d.getDay() === 0;
    if (isHoliday) continue; // exclure fériés
    if (isSunday) continue;  // exclure dimanches non fériés
    count += 1;
  }
  return count;
};

/**
 * Calcule la date de reprise: le premier jour après endDate qui n'est ni dimanche ni férié.
 * Retourne une chaîne YYYY-MM-DD.
 */
export const calculateReturnDate = (endDate, holidays = []) => {
  if (!endDate) return null;
  const holidaySet = buildHolidaySet(holidays);
  let d = new Date(endDate);
  d.setDate(d.getDate() + 1);
  while (true) {
  const iso = formatYMD(d);
    const isSunday = d.getDay() === 0;
    const isHoliday = holidaySet.has(iso);
    if (!isSunday && !isHoliday) return iso;
    d.setDate(d.getDate() + 1);
  }
};

/**
 * Détail par demande de congé: jours effectifs + liste des dates effectives + date de reprise
 */
// getLeaveBreakdown earlier variant removed in favor of the unified version with an optional 'year' parameter below.

/**
 * Liste les dates effectives de congé entre startDate et endDate (inclus)
 * en excluant fériés et dimanches non fériés. Retourne une liste YYYY-MM-DD.
 */
export const listEffectiveLeaveDates = (startDate, endDate, holidays = []) => {
  if (!startDate || !endDate) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end) || end < start) return [];
  const holidaySet = buildHolidaySet(holidays);
  const days = [];
  for (let d = new Date(start.getFullYear(), start.getMonth(), start.getDate()); d <= new Date(end.getFullYear(), end.getMonth(), end.getDate()); d.setDate(d.getDate() + 1)) {
  const iso = formatYMD(d);
    const isHoliday = holidaySet.has(iso);
    const isSunday = d.getDay() === 0;
    if (isHoliday) continue;
    if (isSunday) continue;
    days.push(iso);
  }
  return days;
};

/**
 * Détails des jours de récupération pour un utilisateur (année courante):
 * renvoie { total, sundays: string[], holidays: string[] }
 * Note: une date qui est à la fois dimanche et férié apparaîtra dans les deux listes.
 */
export const calculateRecoveryDetails = (userId, pointages = [], holidays = []) => {
  const currentYear = new Date().getFullYear();
  const holidaySet = buildHolidaySet(holidays, currentYear);
  // Ne compter que les pointages où l'employé était présent ou en retard
  const userPointages = (pointages || []).filter(p => 
    p.user_id === userId && 
    new Date(p.date).getFullYear() === currentYear &&
    (p.statutJour === 'present' || p.statutJour === 'retard')
  );
  
  const sundays = [];
  const hols = [];
  
  userPointages.forEach(p => {
    const d = new Date(p.date);
    const iso = formatYMD(d);
    if (d.getDay() === 0) sundays.push(iso);
    if (holidaySet.has(iso)) hols.push(iso);
  });
  
  return {
    total: sundays.length + hols.length,
    sundays,
    holidays: hols,
  };
};

/**
 * Détaille les demandes de congé approuvées (approuvé/validé) d'un utilisateur, avec
 * jours effectifs, dates effectives et date de reprise calculée.
 */
export const getLeaveBreakdown = (absenceRequests, userId, holidays = [], year = null) => {
  const approved = (absenceRequests || []).filter(req =>
    req.user_id === userId &&
    req.type === 'Congé' &&
    (req.statut === 'approuvé' || req.statut === 'validé')
  );

  return approved
    .filter(req => {
      if (!year) return true;
      const s = new Date(req.dateDebut);
      const e = new Date(req.dateFin);
      return (
        s.getFullYear() === year ||
        e.getFullYear() === year ||
        (s.getFullYear() < year && e.getFullYear() > year)
      );
    })
    .map(req => {
      const effectiveDays = calculateEffectiveLeaveDays(req.dateDebut, req.dateFin, holidays, year || null);
      const effectiveDates = listEffectiveLeaveDates(req.dateDebut, req.dateFin, holidays);
      const returnDate = calculateReturnDate(req.dateFin, holidays);
      return {
        id: req.id,
        start: req.dateDebut,
        end: req.dateFin,
        effectiveDays,
        effectiveDates,
        returnDate,
        statut: req.statut,
      };
    });
};

/**
 * Calcule l'ancienneté d'un employé en années et mois
 */
export const calculateSeniority = (dateEmbauche) => {
  if (!dateEmbauche) return { years: 0, months: 0, totalMonths: 0 };
  
  const hireDate = new Date(dateEmbauche);
  const currentDate = new Date();
  
  let years = currentDate.getFullYear() - hireDate.getFullYear();
  let months = currentDate.getMonth() - hireDate.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  const totalMonths = years * 12 + months;
  
  return { years, months, totalMonths };
};

/**
 * Calcule les congés totaux annuels selon l'ancienneté et le rôle
 * Règles : 
 * - Chef_Dep : 26 jours/an (toujours, indépendamment de la date d'embauche)
 * - Autres rôles : 18 jours/an standard + bonus selon ancienneté
 * - Jours supplémentaires selon l'ancienneté
 */
export const calculateTotalAnnualLeave = (dateEmbauche, userRole = null) => {
  const seniority = calculateSeniority(dateEmbauche);

  // Logique spéciale pour Chef_Dep : 26 jours/an (optionnel si convention interne)
  if (userRole === 'Chef_Dep') {
    return 26;
  }

  // Congés de base pour les autres rôles : 18 jours/an (1.5 jours/mois)
  let totalDays = 18;

  // Bonus selon ancienneté tous les 5 ans (ajout de 1.5 jour tous les 5 ans)
  if (seniority.years >= 5) {
    totalDays += 1.5;
  }
  if (seniority.years >= 10) {
    totalDays += 1.5;
  }
  if (seniority.years >= 15) {
    totalDays += 1.5;
  }
  if (seniority.years >= 20) {
    totalDays += 1.5;
  }

  return Math.round(totalDays * 10) / 10; // arrondi à 1 chiffre après virgule
};


/**
 * Calcule les congés reportés de l'année précédente
 */
export const calculateCarryOverLeave = (dateEmbauche, absenceRequests, userId, userRole = null, holidays = []) => {
  if (!userId) {
    return 0;
  }

  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;
  const hireYear = new Date(dateEmbauche).getFullYear();
  // Année 2024 annulée: aucun report pour 2025 depuis 2024, et en 2024 afficher 0
  if (currentYear === 2024 || lastYear === 2024) return 0;
  
  // Ne calculer le report que si l'employé était déjà en poste l'année précédente
  if (hireYear > lastYear) return 0;
  
  const lastYearTotalAnnual = calculateTotalAnnualLeave(dateEmbauche, userRole);
  const lastYearConsumed = calculateConsumedLeave(absenceRequests, userId, lastYear, holidays);
  
  const carryOver = Math.max(0, lastYearTotalAnnual - lastYearConsumed);
  
  return carryOver;
};

/**
 * Calcule les congés acquis depuis le début de l'année avec report de l'année précédente + jours de récupération
 * Congés acquis = (mois écoulés / 12) * congés totaux annuels + congés reportés de l'année précédente + jours récupération
 * Seuls les congés de l'année précédente (N-1) sont reportés, pas ceux d'avant (N-2, N-3, etc.)
 */
export const calculateAcquiredLeave = (dateEmbauche, userRole = null, absenceRequests = [], userId = null, pointages = [], holidays = []) => {
  if (!dateEmbauche) return 0;
  
  const totalAnnualLeave = calculateTotalAnnualLeave(dateEmbauche, userRole);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  // Année 2024: tout à 0
  if (currentYear === 2024) return 0;
  const currentMonth = currentDate.getMonth() + 1; // getMonth() retourne 0-11
  
  // Si l'employé a été embauché cette année
  const hireDate = new Date(dateEmbauche);
  const hireYear = hireDate.getFullYear();
  
  let monthsWorked;
  if (hireYear === currentYear) {
    // Embauché cette année : compter depuis le mois d'embauche
    monthsWorked = currentMonth - (hireDate.getMonth() + 1) + 1;
    monthsWorked = Math.max(0, monthsWorked);
  } else {
    // Embauché les années précédentes : tous les mois de l'année actuelle
    monthsWorked = currentMonth;
  }
  
  // Calcul des congés acquis pour l'année actuelle
  const currentYearAcquired = (monthsWorked / 12) * totalAnnualLeave;
  
  // Pour les employés embauchés cette année avec un mois de travail incomplet, 
  // s'assurer qu'ils ont au moins des congés proratisés pour le mois en cours
  const minAcquiredForNewEmployees = hireYear === currentYear ? Math.max(totalAnnualLeave / 12, 0) : 0;
  
  // Calcul du report de l'année précédente
  const carryOverFromLastYear = calculateCarryOverLeave(dateEmbauche, absenceRequests, userId, userRole, holidays);
  
  // Calcul des jours de récupération (si userId et pointages sont fournis)
  const recoveryDays = userId ? calculateRecoveryDays(userId, pointages, holidays) : 0;
  
  // Assurons-nous que chaque composant est bien un nombre
  const safeCurrentYearAcquired = isNaN(currentYearAcquired) ? 0 : currentYearAcquired;
  const safeCarryOver = isNaN(carryOverFromLastYear) ? 0 : carryOverFromLastYear;
  const safeRecoveryDays = isNaN(recoveryDays) ? 0 : recoveryDays;
  
  // Pour les nouveaux employés embauchés récemment qui n'ont pas encore de mois complet
  const adjustedCurrentYearAcquired = hireYear === currentYear && monthsWorked === 0 ? 
    minAcquiredForNewEmployees : safeCurrentYearAcquired;
  
  // CORRECTION: Assurer que le report de l'année précédente est TOUJOURS ajouté 
  // aux congés acquis, même si les congés acquis de l'année en cours sont à 0
  const totalAcquired = adjustedCurrentYearAcquired + safeCarryOver + safeRecoveryDays;
  
  // Si un employé a un report ou des jours de récupération, il doit avoir au moins ce montant en congés acquis
  if (safeCarryOver > 0 || safeRecoveryDays > 0) {
    // Toujours inclure au moins le report et les jours de récupération
    return Math.floor((safeCarryOver + safeRecoveryDays + adjustedCurrentYearAcquired) * 10) / 10;
  }
  
  return Math.floor(totalAcquired * 10) / 10; // Arrondir à 1 décimale
};

/**
 * Calcule les congés consommés à partir des demandes d'absence approuvées
 */
export const calculateConsumedLeave = (absenceRequests, userId, year = null, holidays = []) => {
  if (!absenceRequests || !userId) {
    return 0;
  }
  
  const currentYear = year || new Date().getFullYear();
  // Année 2024 annulée
  if (currentYear === 2024) return 0;
  
  const approvedLeaveRequests = absenceRequests.filter(request => {
    const isApproved = request.statut === 'approuvé' || request.statut === 'validé';
    const isLeave = request.type === 'Congé';
    // On ne filtre pas uniquement par l'année de début: une demande peut chevaucher l'année
    const start = new Date(request.dateDebut);
    const end = new Date(request.dateFin);
    const overlapsYear = (
      start.getFullYear() === currentYear ||
      end.getFullYear() === currentYear ||
      (start.getFullYear() < currentYear && end.getFullYear() > currentYear)
    );
    const isUserRequest = request.user_id === userId;
    
    return isApproved && isLeave && overlapsYear && isUserRequest;
  });
  
  let totalConsumedDays = 0;
  
  approvedLeaveRequests.forEach(request => {
    totalConsumedDays += calculateEffectiveLeaveDays(request.dateDebut, request.dateFin, holidays, currentYear);
  });
  
  return totalConsumedDays;
};

/**
 * Calcule le solde de congés restant avec les nouvelles règles incluant les jours de récupération
 */
export const calculateRemainingLeave = (dateEmbauche, absenceRequests, userId, userRole = null, pointages = [], holidays = []) => {
  const currentYear = new Date().getFullYear();
  if (currentYear === 2024) return 0;
  const acquiredLeave = calculateAcquiredLeave(dateEmbauche, userRole, absenceRequests.filter(req => req.user_id === userId), userId, pointages, holidays);
  const consumedLeave = calculateConsumedLeave(absenceRequests, userId, null, holidays);
  
  return Math.max(0, acquiredLeave - consumedLeave);
};

/**
 * Génère un rapport complet des congés pour un employé avec les nouvelles règles incluant jours de récupération
 * Seuls les employés avec un contrat permanent ont droit aux congés
 */
export const generateLeaveReport = (employee, absenceRequests, pointages = [], holidays = []) => {
  if (!employee) return null;
  
  // Vérifier le type de contrat - seuls les employés permanents ont droit aux congés
  if (!employee.typeContrat || employee.typeContrat.toLowerCase() !== 'permanent') {
    return null;
  }
  
  const seniority = calculateSeniority(employee.dateEmbauche);
  
  // Déterminer le rôle de l'utilisateur (chercher dans roles ou role) sans ternaire imbriqué
  let userRole = employee.role;
  if (employee.roles) {
    if (Array.isArray(employee.roles)) {
      const chef = employee.roles.find(r => r.name === 'Chef_Dep');
      userRole = chef ? chef.name : userRole;
    } else {
      userRole = employee.roles;
    }
  }
  
  const totalAnnualLeave = calculateTotalAnnualLeave(employee.dateEmbauche, userRole);
  const acquiredLeave = calculateAcquiredLeave(employee.dateEmbauche, userRole, absenceRequests.filter(req => req.user_id === employee.id), employee.id, pointages, holidays);
  const consumedLeave = calculateConsumedLeave(absenceRequests, employee.id, null, holidays);
  const remainingLeave = calculateRemainingLeave(employee.dateEmbauche, absenceRequests, employee.id, userRole, pointages, holidays);
  const carryOverLeave = calculateCarryOverLeave(employee.dateEmbauche, absenceRequests, employee.id, userRole, holidays);
  const recoveryDays = calculateRecoveryDays(employee.id, pointages, holidays);
  
  // Calculer les congés de l'année actuelle seulement (sans report ni récupération)
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const hireDate = new Date(employee.dateEmbauche);
  const hireYear = hireDate.getFullYear();
  
  let monthsWorked;
  if (hireYear === currentYear) {
    monthsWorked = currentMonth - (hireDate.getMonth() + 1) + 1;
    monthsWorked = Math.max(0, monthsWorked);
  } else {
    monthsWorked = currentMonth;
  }
  
  const currentYearAcquired = currentYear === 2024 ? 0 : Math.floor(((monthsWorked / 12) * totalAnnualLeave) * 10) / 10;
  
  // Calculer le pourcentage d'utilisation
  const usagePercentage = acquiredLeave > 0 ? (consumedLeave / acquiredLeave) * 100 : 0;
  
  // Pré-calculer certaines valeurs pour éviter les ternaires dans l'objet retourné
  const carryOverLeaveValue = currentYear === 2024 ? 0 : carryOverLeave;
  const remainingLeaveValue = currentYear === 2024 ? 0 : remainingLeave;

  return {
    employee: {
      id: employee.id,
      name: `${employee.name} ${employee.prenom}`,
      dateEmbauche: employee.dateEmbauche,
      role: userRole,
      seniority
    },
    leave: {
      totalAnnualLeave,
  acquiredLeave,
  currentYearAcquired,
  carryOverLeave: carryOverLeaveValue,
      recoveryDays,
      consumedLeave,
  remainingLeave: remainingLeaveValue,
      usagePercentage: Math.round(usagePercentage * 100) / 100
    },
    status: {
      isOverused: consumedLeave > acquiredLeave,
      canTakeLeave: remainingLeave > 0,
      warningLevel: usagePercentage > 80 ? 'high' : usagePercentage > 60 ? 'medium' : 'low'
    }
  };
};

/**
 * Valide si une demande de congé peut être approuvée avec les nouvelles règles
 */
export const validateLeaveRequest = (employee, absenceRequests, requestStartDate, requestEndDate) => {
  const report = generateLeaveReport(employee, absenceRequests);
  if (!report) return { valid: false, message: 'Employé non trouvé' };
  
  const requestDays = calculateDaysBetween(requestStartDate, requestEndDate) + 1;
  const availableDays = report.leave.remainingLeave;
  
  if (requestDays > availableDays) {
    return {
      valid: false,
      message: `Congés insuffisants. Demandé: ${requestDays} jours, Disponible: ${availableDays} jours`,
      details: {
        requestedDays: requestDays,
        availableDays: availableDays,
        shortfall: requestDays - availableDays
      }
    };
  }
  
  return {
    valid: true,
    message: 'Demande de congé valide',
    details: {
      requestedDays: requestDays,
      availableDays: availableDays,
      remainingAfterRequest: availableDays - requestDays
    }
  };
};

/**
 * Calcule les statistiques de congés pour une équipe/département avec jours de récupération
 */
export const calculateTeamLeaveStats = (employees, absenceRequests, pointages = [], holidays = []) => {
  if (!employees || employees.length === 0) return null;
  
  const reports = employees.map(employee => 
    generateLeaveReport(employee, absenceRequests, pointages, holidays)
  ).filter(Boolean);
  
  const totalEmployees = reports.length;
  const totalAnnualLeave = reports.reduce((sum, report) => sum + report.leave.totalAnnualLeave, 0);
  const totalAcquiredLeave = reports.reduce((sum, report) => sum + report.leave.acquiredLeave, 0);
  const totalConsumedLeave = reports.reduce((sum, report) => sum + report.leave.consumedLeave, 0);
  const totalRemainingLeave = reports.reduce((sum, report) => sum + report.leave.remainingLeave, 0);
  
  const employeesOnLeave = reports.filter(report => report.status.isOverused).length;
  const employeesWithHighUsage = reports.filter(report => report.status.warningLevel === 'high').length;
  
  return {
    totalEmployees,
    averages: {
      annualLeave: Math.round((totalAnnualLeave / totalEmployees) * 100) / 100,
      acquiredLeave: Math.round((totalAcquiredLeave / totalEmployees) * 100) / 100,
      consumedLeave: Math.round((totalConsumedLeave / totalEmployees) * 100) / 100,
      remainingLeave: Math.round((totalRemainingLeave / totalEmployees) * 100) / 100,
      usagePercentage: totalAcquiredLeave > 0 ? Math.round((totalConsumedLeave / totalAcquiredLeave) * 10000) / 100 : 0
    },
    totals: {
      annualLeave: totalAnnualLeave,
      acquiredLeave: totalAcquiredLeave,
      consumedLeave: totalConsumedLeave,
      remainingLeave: totalRemainingLeave
    },
    alerts: {
      employeesOnLeave,
      employeesWithHighUsage,
      overusedEmployees: reports.filter(report => report.status.isOverused)
    }
  };
};
