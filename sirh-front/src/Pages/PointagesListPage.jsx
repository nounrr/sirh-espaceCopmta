import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPointages, deletePointages, updatePointage, createPointage, validerPointage, invaliderPointage } from '../Redux/Slices/pointageSlice';
import { fetchUsers, updateUser } from '../Redux/Slices/userSlice';
import { fetchAbsenceRequests } from '../Redux/Slices/absenceRequestSlice';
import { fetchSocietes } from '../Redux/Slices/societeSlice'; // Ajout de l'import pour fetchSocietes
import { fetchDepartments } from '../Redux/Slices/departementSlice';
import { Icon } from '@iconify/react/dist/iconify.js';
import Swal from 'sweetalert2';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import fr from "date-fns/locale/fr";
registerLocale("fr", fr);
const PointageRow = ({
  user,
  pointage,
  isTemp,
  idxTemp,
  isSelected,
  onSelect,
  onFieldChange,
  onSave,
  onRemoveTemp,
  onAddTemp,
  canValidate,
  onValidate,
  canInvalidate,
  onInvalidate,
  onDelete,
  now,
  isToday,
  extractHourMinute,
  calcOvertime,
  Icon,
  disabledStatut = false,
   getFiveMinuteWindow,
  IsRH
  
}) => (
  <tr
    style={{
      backgroundColor: (user?.typeContrat || '').toLowerCase() === 'temporaire' ? "#FFF8E8" : isTemp ? "#F4F7FF" : "#FFFFFF",
      borderRadius: "8px",
      marginBottom: "8px",
      transition: "background-color 0.3s ease",
      borderLeft: (user?.typeContrat || '').toLowerCase() === 'temporaire' ? "4px solid #F59E0B" : "none",
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = (user?.typeContrat || '').toLowerCase() === 'temporaire' ? "#FFF3D3" : "#F3F4F6"}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = (user?.typeContrat || '').toLowerCase() === 'temporaire' ? "#FFF8E8" : (isTemp ? "#F4F7FF" : "#FFFFFF")}
  >
    {/* Checkbox sélection */}
  <td style={{ padding: "12px", width: "32px", minWidth: "32px", maxWidth: "32px" }}>
      <input
        type="checkbox"
        className="form-check-input shadow-sm border border-primary"
        checked={isSelected}
        onChange={e => onSelect(e.target.checked)}
      />
    </td>
    {/* Nom employé */}
    <td style={{ padding: "12px", fontWeight: "500", color: "#374151" }}>
      <div className="d-flex flex-column">
        <div>{user.name} {user.prenom}</div>
        {(user.typeContrat || '').toLowerCase() === 'temporaire' && (
          <span 
            style={{
              fontSize: "11px",
              backgroundColor: "#F59E0B", 
              color: "#FFFFFF", 
              padding: "2px 6px",
              borderRadius: "12px",
              fontWeight: "500",
              display: "inline-block",
              marginTop: "4px",
              width: "fit-content"
            }}
          >
            Temporaire
          </span>
        )}
        {pointage.isNightShift && (
          <span 
            style={{
              fontSize: "11px",
              backgroundColor: "#3B82F6", 
              color: "#FFFFFF", 
              padding: "2px 6px",
              borderRadius: "12px",
              fontWeight: "500",
              display: "inline-block",
              marginTop: "4px",
              width: "fit-content"
            }}
          >
            Équipe de nuit ({pointage.originalDate})
          </span>
        )}
      </div>
    </td>
    {/* Statut */}
    <td style={{ padding: "12px" }}>
      <select
        className="form-select"
        value={pointage.statutJour || ''}
        onChange={e => onFieldChange('statutJour', e.target.value)}
  disabled={disabledStatut || pointage.isAbsent || pointage.valider === 1}
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: "8px",
          padding: "8px 12px",
          fontSize: "14px",
          width: "100%",
          minWidth: "100px",
        }}
      >
        <option value="">Sélectionner...</option>
        <option value="present">Présent</option>
        <option value="absent">Absent</option>
        <option value="retard">Retard</option>
      </select>
    </td>
    {/* Heure d'entrée */}
    <td style={{ padding: "12px" }}>
      <DatePicker
  disabled={disabledStatut || pointage.isAbsent || pointage.valider === 1 || pointage.statutJour === 'absent'}
        selected={
          extractHourMinute(pointage.heureEntree)
            ? new Date(`1970-01-01T${extractHourMinute(pointage.heureEntree)}:00`)
            : null
        }
        onChange={date => {
          if (date) {
            const hh = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            onFieldChange('heureEntree', `${hh}:${mm}:00`);
          } else {
            onFieldChange('heureEntree', '');
          }
        }}
  isClearable
        showTimeSelect
        showTimeSelectOnly
        timeIntervals={5}
        timeCaption="Heure"
        dateFormat="HH:mm"
        timeFormat="HH:mm"
        placeholderText="HH:mm"
        className="form-control"
        onKeyDown={e => e.preventDefault()}
        popperPlacement="bottom"
  // Fenêtre ±5 min seulement pour non-RH, sinon pleine journée
  minTime={!IsRH && isToday ? getFiveMinuteWindow(now).start : new Date(0,0,0,0,0)}
  maxTime={!IsRH && isToday ? getFiveMinuteWindow(now).end   : new Date(0,0,0,23,59)}
      />
    </td>
    {/* Heure de sortie */}
    <td style={{ padding: "12px", minWidth: 170 }}>
      <DatePicker
  disabled={disabledStatut || pointage.isAbsent || pointage.valider === 1 || pointage.statutJour === 'absent'}
        selected={
          extractHourMinute(pointage.heureSortie)
            ? new Date(`1970-01-01T${extractHourMinute(pointage.heureSortie)}:00`)
            : null
        }
        onChange={date => {
          if (!date) {
            onFieldChange('heureSortie', '');
            return;
          }
          let hh = date.getHours();
          let mm = date.getMinutes();
          const val = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
          onFieldChange('heureSortie', val);
        }}
  isClearable
        showTimeSelect
        showTimeSelectOnly
        timeIntervals={5}
  // Fenêtre ±5 min seulement pour non-RH, sinon pleine journée
  minTime={!IsRH && isToday ? getFiveMinuteWindow(now).start : new Date(0,0,0,0,0)}
  maxTime={!IsRH && isToday ? getFiveMinuteWindow(now).end   : new Date(0,0,0,23,59)}
        dateFormat="HH:mm"
        timeFormat="HH:mm"
        timeCaption="Heure"
        className="form-control"
        placeholderText="HH:mm"
        onKeyDown={e => e.preventDefault()}
        popperPlacement="bottom"
      />
    </td>
    {/* Heures supp */}
    <td style={{ padding: "12px" }}>
      <input
        type="number"
        className="form-control"
        value={
          pointage.heureEntree && pointage.heureSortie
            ? calcOvertime(pointage.heureEntree, pointage.heureSortie, pointage.date)
            : 0
        }
        disabled
      />
    </td>
    {/* Actions */}
    <td className={`d-flex align-items-center gap-2 flex-wrap`} style={{ padding: "12px" }}>
      <button
      className={` ${pointage.valider === 1 ? 'd-none' : ''}`}
        style={{
          backgroundColor: "#BFDBFE",
          color: "#1D4ED8",
          padding: "6px 12px",
          borderRadius: "8px",
          fontWeight: "500"
        }}
        onClick={onSave}
disabled={pointage.isAbsent || !pointage.statutJour || pointage.valider === 1}
        title="Enregistrer"
      >
        <Icon icon="mdi:content-save" />
      </button>
      
      {/* Boutons valider/invalider si applicables */}
      {Boolean(canValidate) && (
        <button
          style={{
            backgroundColor: "#D1FAE5",
            color: "#059669",
            padding: "6px 12px",
            borderRadius: "8px",
            fontWeight: "500"
          }}
          onClick={onValidate}
          title="Valider"
          disabled={
            // Si déjà validé ou pas de statut, désactiver
            pointage.valider === 1 || !pointage.statutJour
            // Si statut présent/retard mais une heure manquante, désactiver
            || (["present", "retard"].includes(pointage.statutJour) && (!pointage.heureEntree || !pointage.heureSortie))
          }
        >
          <Icon icon="ph:check-circle-duotone" />
        </button>
      )}
      {canInvalidate && (
        <button
          style={{
            backgroundColor: "#FEE2E2",
            color: "#DC2626",
            padding: "6px 12px",
            borderRadius: "8px",
            fontWeight: "500"
          }}
          onClick={onInvalidate}
          title="Invalider"
        >
          <Icon icon="ph:x-circle-duotone" />
        </button>
      )}
      
      {/* Bouton de suppression - accessible selon les permissions et statut */}
      {onDelete && (
        (isTemp) || // Les lignes temporaires peuvent toujours être supprimées
        (IsRH && pointage.id && pointage.valider !== 1 && 
         // Afficher seulement si le pointage a été effectivement saisi
         // - statut saisi différent de "non_pointe" OU
         // - au moins une heure saisie
         (((pointage.statutJour && pointage.statutJour !== 'non_pointe')) || pointage.heureEntree || pointage.heureSortie)
        )
      ) && (
        <button
          style={{
            backgroundColor: "#FEF2F2",
            color: "#B91C1C",
            border: "1px solid #FCA5A5",
            padding: "6px 12px",
            borderRadius: "8px",
            fontWeight: "500"
          }}
          onClick={onDelete}
          title={
            isTemp 
              ? "Supprimer cette ligne temporaire" 
              : pointage.valider === 1 
                ? "Ce pointage est validé et ne peut pas être supprimé"
                : "Supprimer ce pointage"
          }
        >
          <Icon icon="mdi:delete-outline" />
        </button>
      )}
    </td>
  </tr>
);

const PointagesListPage = () => {
  const dispatch = useDispatch();
  const { items: pointages, status: loading, error } = useSelector((state) => state.pointages);
  const { items: users } = useSelector((state) => state.users);
  const { items: societes } = useSelector((state) => state.societes); // Récupération des sociétés
  const { items: absenceRequests } = useSelector((state) => state.absenceRequests);
  const { items: departments } = useSelector((state) => state.departments);
  const { user: currentUser } = useSelector((state) => state.auth); // Récupérer l'utilisateur actuel
  const canValidateAll = currentUser && ['RH', 'Gest_RH', 'Chef_Dep', 'Chef_Projet'].includes(currentUser.role);
  const canInvalidateAllForRH = currentUser && ['RH', 'Gest_RH'].includes(currentUser.role); // Ajout pour le bouton Invalider Tout
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedKeys, setSelectedKeys] = useState([]);

  const [filters, setFilters] = useState({
    date: '',
    user: '',
    status: '',
    societe: '',
    onlyPresentOrRetard: '',
    typeContrat: '',
    onlyNonPointe: false,
  });
  
  // State pour stocker les utilisateurs temporaires
  const [temporaryUsers, setTemporaryUsers] = useState([]);
  // State pour stocker les clés des pointages récemment modifiés
  const [recentlyModifiedKeys, setRecentlyModifiedKeys] = useState([]);

  const [editablePointages, setEditablePointages] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [usersForPointage, setUsersForPointage] = useState([]);
  const [usersWithAbsence, setUsersWithAbsence] = useState([]);
  const [multiHeureEntree, setMultiHeureEntree] = useState(null);
  const [multiHeureSortie, setMultiHeureSortie] = useState(null);
  const roles = useSelector((state) => state.auth.roles || []);
  const isRH = roles.includes('RH') || roles.includes('Gest_RH');
  const now = new Date();
  const isToday = selectedDate === now.toISOString().split('T')[0];
  const today = new Date();


  // Fenêtre ±5 minutes autour de "now" (sans passer min/max au jour précédent/suivant)
const getFiveMinuteWindow = (nowDate) => {
  const h = nowDate.getHours();
  const m = nowDate.getMinutes();
  const start = new Date(0, 0, 0, h, Math.max(0, m - 5));
  const end = new Date(0, 0, 0, h, Math.min(59, m + 5));
  return { start, end };
};


  // Helper pour vérifier si des employés temporaires sont sélectionnés
  const selectedTempUsers = useMemo(() => {
    const tempUsers = selectedKeys
      .map(key => {
        const pointage = editablePointages[key];
        if (!pointage) return null;
        
        const user = users.find(u => String(u.id) === String(pointage.user_id));
        if (!user || (user.typeContrat || '').toLowerCase() !== 'temporaire') return null;
        
        return user;
      })
      .filter(Boolean);
    
    console.log('selectedKeys:', selectedKeys);
    console.log('selectedTempUsers:', tempUsers);
    console.log('isRH:', isRH);
    
    return tempUsers;
  }, [selectedKeys, editablePointages, users]);

  useEffect(() => {
    dispatch(fetchPointages());
    dispatch(fetchUsers());
    dispatch(fetchAbsenceRequests());
    dispatch(fetchSocietes()); // Appel pour récupérer les sociétés
    dispatch(fetchDepartments());
  }, [dispatch]);
  
  // Effet pour identifier les utilisateurs temporaires
  useEffect(() => {
    const tempUsers = users.filter(user => 
      user && (user.typeContrat || '').toLowerCase() === 'temporaire'
    );
    setTemporaryUsers(tempUsers);
  }, [users]);

  // Réinitialiser la page courante lorsque les filtres ou la date changent
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, searchTerm, selectedDepartment, filters]);

// Sélectionner/Désélectionner un utilisateur
const handleSelectUser = (userId, checked) => {
  setSelectedUsers((prev) => 
    checked ? [...prev, userId] : prev.filter((id) => id !== userId)
  );
};

  useEffect(() => {
  const searchValue = (searchTerm || '').toLowerCase();
  const filteredUsers = users.filter(user => {
  if (!user || typeof user !== 'object') return false;
  const statut = (user.statut || '').trim().toLowerCase();
  // Exclure Inactif
  if (statut === 'inactif') return false;
  // Exclure les utilisateurs "Sortie" uniquement si la date sélectionnée est >= à leur date_sortie
  if (statut === 'sortie') {
    const dateSortieRaw = user.date_sortie || user.dateSortie;
    if (!dateSortieRaw) return true; // si pas de date précisée, on laisse passer pour l'historique
    const sel = new Date(selectedDate);
    const ds = new Date(String(dateSortieRaw).split('T')[0]);
    if (!isNaN(ds.getTime())) {
      // masquer si on consulte à partir (ou après) de la date de sortie
      if (sel >= new Date(ds.getFullYear(), ds.getMonth(), ds.getDate())) return false;
    }
  }
  const absenceType = editablePointages[user.id]?.statutJour;
  if (['Congé', 'maladie', 'autre'].includes(absenceType)) return false;

  // Filtre pour le type de contrat
  if (filters.typeContrat === 'temporaire' && (user.typeContrat || '').toLowerCase() !== 'temporaire') return false;
  if (filters.typeContrat === 'permanent' && (user.typeContrat || '').toLowerCase() === 'temporaire') return false;

  const matchRecherche =
    !searchTerm ||
    ((user.name || '').toLowerCase().includes(searchValue)) ||
    ((user.prenom || '').toLowerCase().includes(searchValue)) ||
    ((user.cin || '').toLowerCase().includes(searchValue));
  const matchDept = !selectedDepartment || user.departement_id === parseInt(selectedDepartment);

  // Nouveau filtre seulement présents/retard
  let matchStatutMulti = true;
  if (filters.onlyPresentOrRetard === 'present') {
    matchStatutMulti = editablePointages[user.id]?.statutJour === 'present';
  } else if (filters.onlyPresentOrRetard === 'retard') {
    matchStatutMulti = editablePointages[user.id]?.statutJour === 'retard';
  } else if (filters.onlyPresentOrRetard === 'absent') {
    matchStatutMulti = editablePointages[user.id]?.statutJour === 'absent';
  } else if (filters.onlyPresentOrRetard === 'present_retard') {
    matchStatutMulti = ['present', 'retard'].includes(editablePointages[user.id]?.statutJour);
  }

  // Filtre aussi par statut simple si coché
  if (!filters.status) {
    return matchRecherche && matchDept && matchStatutMulti;
  }
  const pointageUser = editablePointages[user.id];
  if (!pointageUser) return false;
  return (
    matchRecherche &&
    matchDept &&
    pointageUser.statutJour === filters.status &&
    matchStatutMulti
  );
});


  setUsersForPointage(filteredUsers);
}, [users, searchTerm, selectedDepartment, filters.status, editablePointages]);

  // Fonction pour affecter des utilisateurs au département "Non affecté"
  const handleSetUnassignedDepartment = async () => {
    const selectedUsers = selectedKeys.map(key => {
      const pointage = editablePointages[key];
      return pointage ? users.find(user => user.id === pointage.user_id) : null;
    }).filter(Boolean);

    if (selectedUsers.length === 0) {
      Swal.fire('Information', 'Aucun utilisateur sélectionné.', 'info');
      return;
    }

    // Trouver le département "Non affecté" (ou en créer un si nécessaire)
    const unassignedDept = departments.find(dept => 
      dept.nom === 'Non affecté' || 
      dept.nom.toLowerCase() === 'non affecté' || 
      dept.nom.toLowerCase() === 'non affecte'
    );
    
    if (!unassignedDept) {
      Swal.fire('Erreur', 'Département "Non affecté" introuvable.', 'error');
      return;
    }

    try {
      const result = await Swal.fire({
        title: 'Confirmation',
        text: `Voulez-vous affecter ${selectedUsers.length} utilisateur(s) au département "Non affecté" ?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Oui, affecter',
        cancelButtonText: 'Annuler'
      });

      if (!result.isConfirmed) return;

      Swal.fire({
        title: 'Affectation en cours...',
        text: `Affectation de ${selectedUsers.length} utilisateur(s).`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const promises = selectedUsers.map(user => 
        dispatch(updateUser({ 
          id: user.id, 
          departement_id: unassignedDept.id
        })).unwrap()
      );
      
      await Promise.all(promises);

      // Rafraîchir les données
      await dispatch(fetchUsers());
      
      Swal.fire('Succès!', `${selectedTempUsers.length} employé(s) temporaire(s) affecté(s) avec succès.`, 'success');
      setSelectedKeys([]);
    } catch (error) {
      console.error("Erreur lors de l'affectation:", error);
      Swal.fire('Erreur!', 'L\'affectation des employés temporaires a échoué.', 'error');
    }
  };

  // Fonction pour désaffecter des utilisateurs temporaires
  const handleUnassignTempUsers = async () => {
    if (selectedTempUsers.length === 0) {
      Swal.fire('Information', 'Aucun utilisateur temporaire sélectionné.', 'info');
      return;
    }

    try {
      const result = await Swal.fire({
        title: 'Confirmation',
        text: `Voulez-vous désaffecter ${selectedTempUsers.length} employé(s) temporaire(s) de leur département ?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Oui, désaffecter',
        cancelButtonText: 'Annuler'
      });

      if (!result.isConfirmed) return;

      Swal.fire({
        title: 'Désaffectation en cours...',
        text: `Désaffectation de ${selectedTempUsers.length} employé(s) temporaire(s).`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const promises = selectedTempUsers.map(user => 
        dispatch(updateUser({ 
          id: user.id, 
          departement_id: null
        })).unwrap()
      );
      
      await Promise.all(promises);

      // Rafraîchir les données
      await dispatch(fetchUsers());
      
      Swal.fire('Succès!', `${selectedTempUsers.length} employé(s) temporaire(s) désaffecté(s) avec succès.`, 'success');
      setSelectedKeys([]);
    } catch (error) {
      console.error("Erreur lors de la désaffectation:", error);
      Swal.fire('Erreur!', 'La désaffectation des employés temporaires a échoué.', 'error');
    }
  };

  const handleInvaliderTout = async () => {
  const pointagesAInvalider = selectedKeys.map(key => editablePointages[key]).filter(p => p && p.id && p.valider === 1);

  if (pointagesAInvalider.length === 0) {
    Swal.fire('Information', 'Aucun pointage sélectionné à invalider.', 'info');
    return;
  }

  try {
    const result = await Swal.fire({
      title: 'Confirmation',
      text: `Voulez-vous invalider ${pointagesAInvalider.length} pointage(s) ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, invalider',
      cancelButtonText: 'Annuler'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: 'Invalidation en cours...',
      text: `Invalidation de ${pointagesAInvalider.length} pointage(s).`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const promises = pointagesAInvalider.map(p => dispatch(invaliderPointage(p.id)).unwrap());
    await Promise.all(promises);

    Swal.fire('Succès!', `${pointagesAInvalider.length} pointage(s) invalidé(s) avec succès.`, 'success');
    dispatch(fetchPointages());
    setSelectedKeys([])
  } catch (error) {
    console.error("Erreur lors de l'invalidation groupée:", error);
    Swal.fire('Erreur!', 'L\'invalidation des pointages a échoué.', 'error');
  }
};



  // Helper function to get the leave type and status
  const getLeaveInfo = useCallback((userId) => {
    const selectedDateObj = new Date(selectedDate);
    
    const userAbsence = absenceRequests.find(request => {
      const startDate = new Date(request.dateDebut);
      const endDate = new Date(request.dateFin);
      return request.user_id === userId && 
             request.statut === 'approuvé' &&
             selectedDateObj >= startDate && 
             selectedDateObj <= endDate;
    });

    if (userAbsence) {
      return {
        type: userAbsence.type,
        motif: userAbsence.motif || 'N/A',
        endDate: userAbsence.dateFin
      };
    }
    return null;
  }, [absenceRequests, selectedDate]);

  useEffect(() => {
  const newEditablePointages = {};

  // 1. Ajoute tous les pointages existants pour la date sélectionnée
  pointages.forEach(pointage => {
    if (pointage.date && !isNaN(new Date(pointage.date))) {
  if (new Date(pointage.date).toISOString().split('T')[0] === selectedDate) {
    newEditablePointages[pointage.id] = { ...pointage, isTemp: false };
  }
}

  });

  // 1.5. Gestion des équipes de nuit : afficher les pointages de la veille sans heure de sortie
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const currentDateStr = currentTime.toISOString().split('T')[0];
  
  // Si on est avant 8h00 du matin et qu'on regarde la date d'aujourd'hui, 
  // ou si les RH regardent une date spécifique
  if ((currentHour < 8 && selectedDate === currentDateStr) || isRH) {
    const previousDate = new Date(selectedDate);
    previousDate.setDate(previousDate.getDate() - 1);
    const previousDateStr = previousDate.toISOString().split('T')[0];
    
    pointages.forEach(pointage => {
      if (pointage.date && !isNaN(new Date(pointage.date))) {
        const pointageDate = new Date(pointage.date).toISOString().split('T')[0];
        // Chercher les pointages de la veille qui ont une entrée mais pas de sortie
        if (pointageDate === previousDateStr && 
            pointage.heureEntree && 
            !pointage.heureSortie &&
            pointage.statutJour === 'present') {
          
          const user = users.find(u => u.id === pointage.user_id);
          if (user) {
            // Créer une clé unique pour ce pointage de nuit
            const nightShiftKey = `night-${pointage.id}`;
            newEditablePointages[nightShiftKey] = {
              ...pointage,
              id: pointage.id, // Garder l'ID original pour la mise à jour
              date: selectedDate, // Afficher dans la date actuelle pour faciliter la gestion
              isTemp: false,
              isNightShift: true, // Marquer comme équipe de nuit
              originalDate: pointageDate, // Garder la date originale
              overtimeHours: 0 // Pas de calcul d'heures sup tant que pas de sortie
            };
          }
        }
      }
    });
  }

  // 2. Pour chaque user actif, si aucun pointage trouvé pour la date, ajoute une ligne "vierge"
  users.forEach(user => {
    // Inactifs OUT
    if ((user.statut || '').trim().toLowerCase() === 'inactif') return;

    // Vérifier si l'utilisateur a une absence validée (congé, maladie, autre absence)
    const userAbsenceInfo = getLeaveInfo(user.id);
    if (userAbsenceInfo && ['Congé', 'maladie', 'Autre absence'].includes(userAbsenceInfo.type)) {
      return; // Ne pas ajouter de ligne de pointage pour les utilisateurs en absence validée
    }

    // Si déjà un ou plusieurs pointages ce jour-là -> on saute cette étape pour ce user
    const hasPointage = pointages.some(
      (p) => p.user_id === user.id && new Date(p.date).toISOString().split('T')[0] === selectedDate
    );

    // Vérifier si l'utilisateur est dans le département "Non affecté"
    const userDepartment = departments.find(dept => dept.id === user.departement_id);
    const isUnassignedDept = userDepartment && (
      userDepartment.nom === 'Non affecté' || 
      userDepartment.nom.toLowerCase() === 'non affecté' || 
      userDepartment.nom.toLowerCase() === 'non affecte'
    );
    
    // Si l'utilisateur n'a pas de pointage ET est dans "Non affecté", ne pas l'afficher
    if (!hasPointage && isUnassignedDept) {
      return;
    }

    if (!hasPointage) {
      newEditablePointages[`new-${user.id}`] = {
        id: null,
        user_id: user.id,
        date: selectedDate,
        heureEntree: '',
        heureSortie: '',
        statutJour: '',
        overtimeHours: 0,
        valider: 0,
        isTemp: true,
      };
    }
  });

  // 3. Ajoute une ligne d'absence validée si besoin (pour affichage dans le tableau séparé)
  const currentUsersWithAbsence = [];
  users.forEach(user => {
    const userAbsenceInfo = getLeaveInfo(user.id);
    if (
      userAbsenceInfo &&
      ['Congé', 'maladie', 'Autre absence'].includes(userAbsenceInfo.type)
    ) {
      currentUsersWithAbsence.push({
        ...user,
        absenceType: userAbsenceInfo.type,
        absenceMotif: userAbsenceInfo.motif,
        absenceEndDate: userAbsenceInfo.endDate
      });
    }
  });

  setEditablePointages(newEditablePointages);
  setUsersWithAbsence(currentUsersWithAbsence);
}, [users, pointages, selectedDate, absenceRequests, filters, societes, getLeaveInfo]);

  // Filter pointages based on filters
  const filteredPointages = pointages.filter(pointage => {
    const pointageDate = new Date(pointage.date);
    const filterDate = filters.date ? new Date(filters.date) : null;
    
    return (
      (!filters.date || pointageDate.toDateString() === filterDate.toDateString()) &&
      (!filters.user || pointage.user_id === parseInt(filters.user)) &&
      (!filters.status || pointage.statutJour === filters.status) &&
      (!filters.societe || pointage.societe_id === parseInt(filters.societe)) // Ajout du filtre société
    );
  });

  // Ajoute ce bloc juste avant les calculs de pagination
  const filteredEditableKeys = Object.entries(editablePointages)
    .filter(([pointageKey, p]) => {
      // 1. Pas les absences spéciales dans le tableau principal
      if (p.statutJour && ['Congé', 'maladie', 'Autre absence'].includes(p.statutJour)) return false;
      // 2. Exclure les utilisateurs qui ont une absence validée pour cette date
      const user = users.find(u => String(u.id) === String(p.user_id));
      if (user) {
        const userAbsenceInfo = getLeaveInfo(user.id);
        if (userAbsenceInfo && ['Congé', 'maladie', 'Autre absence'].includes(userAbsenceInfo.type)) {
          return false;
        }
        // Exclure les utilisateurs en statut "Sortie" si la date sélectionnée est >= date_sortie
        const statutLower = (user.statut || '').toLowerCase();
        if (statutLower === 'sortie') {
          const dateSortieRaw = user.date_sortie || user.dateSortie;
          // Si pas de date de sortie: ne rien filtrer (on garde pour l'historique)
          if (dateSortieRaw) {
            const sel = new Date(selectedDate);
            const ds = new Date(String(dateSortieRaw).split('T')[0]);
            if (!isNaN(ds.getTime()) && sel >= new Date(ds.getFullYear(), ds.getMonth(), ds.getDate())) {
              return false;
            }
          }
        }
      }
      // 2.5. Exclure les utilisateurs du département "Non affecté" qui n'ont pas de pointage existant
      if (user && p.isTemp) {
        const userDepartment = departments.find(dept => dept.id === user.departement_id);
        const isUnassignedDept = userDepartment && (
          userDepartment.nom === 'Non affecté' || 
          userDepartment.nom.toLowerCase() === 'non affecté' || 
          userDepartment.nom.toLowerCase() === 'non affecte'
        );
        // Si l'utilisateur est dans "Non affecté" et c'est un pointage temporaire (pas de pointage existant), ne pas l'afficher
        if (isUnassignedDept) {
          return false;
        }
      }
      // 3. Filtre par date
      if (p.date !== selectedDate) return false;
      // 4. Filtre par département
      if (selectedDepartment && users.length) {
        if (!user || String(user.departement_id) !== String(selectedDepartment)) return false;
      }
      // 5. Filtre pour le type de contrat
      if (filters.typeContrat === 'temporaire' && (!user || (user.typeContrat || '').toLowerCase() !== 'temporaire')) {
        return false;
      }
      if (filters.typeContrat === 'permanent' && (!user || (user.typeContrat || '').toLowerCase() === 'temporaire')) {
        return false;
      }
      // 6. Filtre recherche (nom, prénom, CIN)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !user ||
          (
            !(user.name || '').toLowerCase().includes(term) &&
            !(user.prenom || '').toLowerCase().includes(term) &&
            !(user.cin || '').toLowerCase().includes(term)
          )
        ) return false;
      }
      // 6.5. Filtre par rôle
      // Exclure RH, Gest_Projet de la liste (Gest_RH peut pointer maintenant)
      if (user && ["RH", "Gest_Projet"].includes((user.role || "").trim())) {
        return false;
      }
      if (filters.role && (!user || (user.role || '').toLowerCase() !== filters.role.toLowerCase())) {
        return false;
      }
      // 7. Filtre statut simple ou "présent/retard"
      if (filters.onlyPresentOrRetard) {
        if (filters.onlyPresentOrRetard === 'present' && p.statutJour !== 'present') return false;
        if (filters.onlyPresentOrRetard === 'retard' && p.statutJour !== 'retard') return false;
        if (filters.onlyPresentOrRetard === 'absent' && p.statutJour !== 'absent') return false;
        if (filters.onlyPresentOrRetard === 'present_retard' && !['present', 'retard'].includes(p.statutJour)) return false;
      }
      // 8. Filtre "Non pointé seulement"
      if (filters.onlyNonPointe) {
        // Exception 1: toujours montrer les lignes actuellement sélectionnées
        const isSelected = selectedKeys.includes(pointageKey);
        // Exception 2: toujours montrer les lignes récemment modifiées
        const isRecentlyModified = recentlyModifiedKeys.includes(pointageKey);
        
        if (!isSelected && !isRecentlyModified && p.statutJour && p.statutJour !== '' && p.statutJour !== 'non_pointe') {
          return false;
        }
      }

      // 9. Cacher les pointages totalement non pointés (toutes propriétés nulles/vides)
      // On garde affiché si : sélectionné, récemment modifié, ou c'est une ligne temporaire (ajout volontaire)
      const isSelected = selectedKeys.includes(pointageKey);
      const isRecentlyModified = recentlyModifiedKeys.includes(pointageKey);
      const isTempRow = Boolean(p.isTemp);
      const isEmptyPointage =
        (!p.statutJour || p.statutJour === '' || p.statutJour === 'non_pointe') &&
        (!p.heureEntree || p.heureEntree === '') &&
        (!p.heureSortie || p.heureSortie === '') &&
        (p.overtimeHours == null || Number(p.overtimeHours) === 0) &&
        (p.valider == null || Number(p.valider) === 0);

      if (!isSelected && !isRecentlyModified && !isTempRow && isEmptyPointage) {
        return false;
      }
      return true;
    })
    .map(([key]) => key);

  // Fonctions de sélection (après la déclaration de filteredEditableKeys)
  const handleSelect = (key, checked) => {
    setSelectedKeys(prev =>
      checked ? [...prev, key] : prev.filter(k => k !== key)
    );
  };

  const handleSelectAll = checked => {
    // Calculer les clés paginées à l'intérieur de la fonction
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentPageKeys = itemsPerPage === filteredEditableKeys.length ? filteredEditableKeys : filteredEditableKeys.slice(indexOfFirstItem, indexOfLastItem);
    
    if (checked) {
      // Sélectionner seulement les éléments affichés sur la page actuelle
      setSelectedKeys(prev => {
        const newKeys = [...new Set([...prev, ...currentPageKeys])];
        return newKeys;
      });
    } else {
      // Désélectionner seulement les éléments affichés sur la page actuelle
      setSelectedKeys(prev => prev.filter(key => !currentPageKeys.includes(key)));
    }
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  // Correction pagination : si "Tout" sélectionné, afficher tous les items
  const paginatedKeys = itemsPerPage === filteredEditableKeys.length ? filteredEditableKeys : filteredEditableKeys.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = itemsPerPage === filteredEditableKeys.length ? 1 : Math.ceil(filteredEditableKeys.length / itemsPerPage);

  // Vérifie si tous les employés de la page actuelle sont sélectionnés (après la déclaration de paginatedKeys)
  const isAllSelected = paginatedKeys.length > 0 && paginatedKeys.every(key => selectedKeys.includes(key));



  const commonHeureSortie =
  selectedKeys.length > 0
    ? editablePointages[selectedKeys[0]]?.heureSortie
    : '';
const isAllSameHeureSortie = selectedKeys.every(
  (userId) => editablePointages[userId]?.heureSortie === commonHeureSortie
);
// À placer avant le JSX
const commonHeureEntree =
  selectedKeys.length > 0
    ? editablePointages[selectedKeys[0]]?.heureEntree
    : '';
const isAllSameHeureEntree = selectedKeys.every(
  (userId) => editablePointages[userId]?.heureEntree === commonHeureEntree
);

const extractHourMinute = (timeString) => {
  // timeString attendu au format "HH:mm:SS"
  if (!timeString) return "";
  const [hh, mm] = timeString.split(":");
  if (hh && mm) return `${hh}:${mm}`;
  return "";
};




// Utile pour trouver une valeur commune

// Pour initialiser l’affichage (quand on change la sélection)
useEffect(() => {
  // Prend la valeur commune si tous ont la même, sinon vide
  const getCommonValue = (key) => {
    if (selectedKeys.length === 0) return "";
    const firstValue = editablePointages[selectedKeys[0]]?.[key] || "";
    const allSame = selectedKeys.every(
      userId => editablePointages[userId]?.[key] === firstValue
    );
    return allSame ? firstValue : "";
  };

  const heureEntree = getCommonValue("heureEntree");
  const heureSortie = getCommonValue("heureSortie");
  setMultiHeureEntree(
    extractHourMinute(heureEntree)
      ? new Date(`1970-01-01T${extractHourMinute(heureEntree)}:00`)
      : null
  );
  setMultiHeureSortie(
    extractHourMinute(heureSortie)
      ? new Date(`1970-01-01T${extractHourMinute(heureSortie)}:00`)
      : null
  );
}, [selectedKeys, editablePointages]); 




  const timeToMinutes = (time) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
  };
  
function calcOvertime(heureEntree, heureSortie, date = selectedDate) {
  if (!heureEntree || !heureSortie) return 0;
  
  // Vérifier si c'est un weekend (samedi = 6, dimanche = 0)
  const workDate = new Date(date);
  const dayOfWeek = workDate.getDay();
  
  // Si c'est samedi (6) ou dimanche (0), pas d'heures supplémentaires
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 0;
  }
  
  const [hEnt, mEnt] = heureEntree.split(':').map(Number);
  const [hSort, mSort] = heureSortie.split(':').map(Number);

  let minutesEntree = hEnt * 60 + mEnt;
  let minutesSortie = hSort * 60 + mSort;

  // Si la sortie est inférieure à l'entrée, on considère que c'est le lendemain
  if (minutesSortie <= minutesEntree) {
    minutesSortie += 24 * 60;
  }

  const diff = minutesSortie - minutesEntree;
  if (diff <= 0) return 0;
  // 9 heures = 540 min
  return diff > 540 ? Math.round((diff - 540) / 60 * 100) / 100 : 0;
}

const handleFieldChange = (key, field, value) => {
  // Si on change le statut d'une ligne, on l'ajoute aux lignes récemment modifiées
  if (field === 'statutJour' && filters.onlyNonPointe) {
    setRecentlyModifiedKeys(prev => {
      if (!prev.includes(key)) {
        return [...prev, key];
      }
      return prev;
    });
  }
  
  setEditablePointages((prev) => {
    const prevPointage = prev[key] || {};
    let newPointage = { ...prevPointage, [field]: value };

    // Si statut devient absent ou non_pointé, réinitialiser les heures
    if (field === 'statutJour' && (value === 'absent' || value === 'non_pointe')) {
      newPointage.heureEntree = '';
      newPointage.heureSortie = '';
    }

    // Recalcul des heures supp si besoin
    if (['statutJour', 'heureEntree', 'heureSortie'].includes(field)) {
      if (!['absent', 'non_pointe'].includes(newPointage.statutJour) && newPointage.heureEntree && newPointage.heureSortie) {
        newPointage.overtimeHours = calcOvertime(newPointage.heureEntree, newPointage.heureSortie, newPointage.date || selectedDate);
      } else {
        newPointage.overtimeHours = 0;
      }
    }

    return { ...prev, [key]: newPointage };
  });
};
  

const handleSavePointage = async (key) => {
  const pointage = editablePointages[key];

  // Vérifie statut
  if (!pointage.statutJour) {
    Swal.fire({
      icon: 'error',
      title: "Statut non sélectionné",
      text: "Veuillez sélectionner un statut (présent/absent/retard) avant de sauvegarder.",
    });
    return; // Stop la fonction
  }

  try {
    const pointageData = {
      user_id: pointage.user_id,
      date: pointage.isNightShift ? pointage.originalDate : selectedDate, // Utiliser la date originale pour les équipes de nuit
      heureEntree: ['absent', 'non_pointe'].includes(pointage.statutJour) ? null : pointage.heureEntree,
      heureSortie: ['absent', 'non_pointe'].includes(pointage.statutJour) ? null : pointage.heureSortie,
      statutJour: pointage.statutJour,
  overtimeHours: ['absent', 'non_pointe'].includes(pointage.statutJour) ? 0 : (pointage.overtimeHours || 0),
    };

    if (pointage.id) {
      // Modification d’un pointage existant
      await dispatch(updatePointage({ id: pointage.id, ...pointageData })).unwrap();
    } else {
      // Création d’un nouveau pointage
      await dispatch(createPointage(pointageData)).unwrap();
    }

    // Retire la ligne temporaire si c’était une création
    if (!pointage.id && key.startsWith("temp-")) {
      setEditablePointages(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }

    // Retirer les pointages d'équipes de nuit après sauvegarde si heure de sortie complétée
    if (pointage.isNightShift && pointage.heureSortie && key.startsWith("night-")) {
      setEditablePointages(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }

    // Si pointage.statutJour n'est pas "non_pointe", on peut retirer la clé
    // des lignes récemment modifiées puisque la modification a été sauvegardée
    if (pointage.statutJour !== 'non_pointe') {
      setRecentlyModifiedKeys(prev => prev.filter(k => k !== key));
    }

    await dispatch(fetchPointages()).unwrap();

    Swal.fire(
      'Succès!',
      'Le pointage a été enregistré avec succès.',
      'success'
    );
  } catch (error) {
    console.error('Error saving pointage:', error);
    Swal.fire(
      'Erreur!',
      'Une erreur est survenue lors de l\'enregistrement du pointage.',
      'error'
    );
  }
};
const handleRemoveTempPointage = (key) => {
  setEditablePointages(prev => {
    const copy = { ...prev };
    delete copy[key];
    return copy;
  });
};

// Fonction pour supprimer un pointage persistant (déjà sauvegardé)
const handleDeletePointage = async (pointageId, key) => {
  try {
    // Vérification des permissions
    if (!isRH) {
      await Swal.fire(
        'Accès refusé',
        'Seul le RH peut supprimer des pointages.',
        'error'
      );
      return;
    }

    // Vérification si le pointage est validé
    const pointage = editablePointages[key];
    if (pointage && pointage.valider === 1) {
      await Swal.fire(
        'Suppression impossible',
        'Ce pointage est validé et ne peut pas être supprimé.',
        'error'
      );
      return;
    }

    const result = await Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Cette action supprimera définitivement ce pointage.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      await dispatch(deletePointages([pointageId])).unwrap();
      
      // Supprimer aussi du state local
      setEditablePointages(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });

      // Supprimer de la sélection si nécessaire
      setSelectedKeys(prev => prev.filter(k => k !== key));

      await Swal.fire(
        'Supprimé !',
        'Le pointage a été supprimé avec succès.',
        'success'
      );
      
      // Recharger les pointages pour être sûr
      dispatch(fetchPointages());
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du pointage:', error);
    await Swal.fire(
      'Erreur!',
      'Une erreur est survenue lors de la suppression du pointage.',
      'error'
    );
  }
};

// Fonction utilitaire pour compter les pointages supprimables parmi la sélection
const getDeletableCount = () => {
  if (!isRH || selectedKeys.length === 0) return { deletable: 0, validated: 0, notPointed: 0 };
  
  let deletable = 0;
  let validated = 0;
  let notPointed = 0;
  
  selectedKeys.forEach(key => {
    const pointage = editablePointages[key];
    if (pointage) {
      if (pointage.id === null) {
        // Pointage temporaire - toujours supprimable
        deletable++;
      } else {
        // Vérifier si le pointage a été effectivement pointé
        const isPointed = pointage.statutJour || pointage.heureEntree || pointage.heureSortie;
        
        if (!isPointed) {
          // Pointage non pointé - ne peut pas être supprimé
          notPointed++;
        } else if (pointage.valider === 1) {
          // Pointage validé - ne peut pas être supprimé
          validated++;
        } else {
          // Pointage pointé mais non validé - peut être supprimé
          deletable++;
        }
      }
    }
  });
  
  return { deletable, validated, notPointed };
};

// Fonction pour supprimer plusieurs pointages sélectionnés
const handleDeleteSelected = async () => {
  try {
    // Vérification des permissions
    if (!isRH) {
      await Swal.fire(
        'Accès refusé',
        'Seul le RH peut supprimer des pointages.',
        'error'
      );
      return;
    }

    if (selectedKeys.length === 0) {
      await Swal.fire(
        'Aucune sélection',
        'Veuillez sélectionner au moins un pointage à supprimer.',
        'warning'
      );
      return;
    }

    // Séparer les pointages selon leur type et statut
    const tempKeys = [];
    const deletableIds = [];
    const deletableKeys = [];
    const validatedCount = [];
    const notPointedCount = [];

    selectedKeys.forEach(key => {
      const pointage = editablePointages[key];
      if (pointage) {
        if (pointage.id === null) {
          // Pointage temporaire - toujours supprimable
          tempKeys.push(key);
        } else {
          // Vérifier si le pointage a été effectivement pointé
          const isPointed = pointage.statutJour || pointage.heureEntree || pointage.heureSortie;
          
          if (!isPointed) {
            // Pointage non pointé - ne peut pas être supprimé
            notPointedCount.push(key);
          } else if (pointage.valider === 1) {
            // Pointage validé - ne peut pas être supprimé
            validatedCount.push(key);
          } else {
            // Pointage pointé mais non validé - peut être supprimé
            deletableIds.push(pointage.id);
            deletableKeys.push(key);
          }
        }
      }
    });

    const deletableCount = tempKeys.length + deletableIds.length;
    const validatedCountTotal = validatedCount.length;
    const notPointedCountTotal = notPointedCount.length;

    // Aucun pointage supprimable
    if (deletableCount === 0) {
      let errorMessage = 'Aucun des pointages sélectionnés ne peut être supprimé.';
      const reasons = [];
      
      if (validatedCountTotal > 0) {
        reasons.push(`${validatedCountTotal} pointage(s) sont validés`);
      }
      if (notPointedCountTotal > 0) {
        reasons.push(`${notPointedCountTotal} pointage(s) ne sont pas encore pointés`);
      }
      
      if (reasons.length > 0) {
        errorMessage = `Suppression impossible : ${reasons.join(' et ')}.`;
      }
      
      await Swal.fire(
        'Suppression impossible',
        errorMessage,
        'warning'
      );
      return;
    }

    // Message d'avertissement adapté
    let message = `Cette action supprimera définitivement ${deletableCount} pointage(s).`;
    const warnings = [];
    
    if (validatedCountTotal > 0) {
      warnings.push(`${validatedCountTotal} pointage(s) validé(s) ne seront pas supprimés`);
    }
    if (notPointedCountTotal > 0) {
      warnings.push(`${notPointedCountTotal} pointage(s) non pointés ne seront pas supprimés`);
    }
    
    if (warnings.length > 0) {
      message += `\n\n⚠️ ${warnings.join('\n⚠️ ')}.`;
    }
    
    const result = await Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: message,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      // Supprimer les pointages persistants supprimables via l'API
      if (deletableIds.length > 0) {
        await dispatch(deletePointages(deletableIds)).unwrap();
      }
      
      // Supprimer les pointages supprimables du state local
      setEditablePointages(prev => {
        const copy = { ...prev };
        [...tempKeys, ...deletableKeys].forEach(key => {
          delete copy[key];
        });
        return copy;
      });

      // Mettre à jour la sélection (garder seulement les pointages validés)
      setSelectedKeys(validatedCount);

      let successMessage = `${deletableCount} pointage(s) supprimé(s) avec succès.`;
      if (validatedCountTotal > 0) {
        successMessage += ` ${validatedCountTotal} pointage(s) validé(s) conservé(s).`;
      }

      await Swal.fire(
        'Suppression terminée !',
        successMessage,
        'success'
      );
      
      // Recharger les pointages si des pointages persistants ont été supprimés
      if (deletableIds.length > 0) {
        dispatch(fetchPointages());
      }
    }
  } catch (error) {
    console.error('Erreur lors de la suppression des pointages:', error);
    await Swal.fire(
      'Erreur!',
      'Une erreur est survenue lors de la suppression des pointages.',
      'error'
    );
  }
};


const handleAddMultiplePointages = () => {
  const now = Date.now();
  setEditablePointages(prev => {
    const updated = { ...prev };
    selectedKeys.forEach(key => {
      const userId = editablePointages[key]?.user_id;
      if (!userId) return;
      const tempKey = `temp-${userId}-${now}-${Math.random()}`;
      updated[tempKey] = {
        user_id: userId,
        date: selectedDate,
        heureEntree: '',
        heureSortie: '',
        statutJour: '',
        overtimeHours: 0,
        isTemp: true
      };
    });
    setSelectedKeys([]);
    return updated;
  });
};

// VALIDER uniquement les pointages sélectionnés
const handleValiderTout = async () => {
  const pointagesAValider = selectedKeys
    .map(key => ({ key, pointage: editablePointages[key] }))
    .filter(({ pointage }) => pointage && Number(pointage.valider) !== 1);

  if (pointagesAValider.length === 0) {
    Swal.fire('Information', 'Aucun pointage sélectionné à valider.', 'info');
    return;
  }

  let nbValidés = 0;
  let erreurs = [];

  for (const { key, pointage } of pointagesAValider) {
    if (!pointage.statutJour ||
      (["present", "retard"].includes(pointage.statutJour) &&
        (!pointage.heureEntree || !pointage.heureSortie))) {
      erreurs.push(key);
      continue;
    }

    try {
      let finalId = pointage.id;
      if (!finalId) {
        const created = await dispatch(createPointage(pointage)).unwrap();
        finalId = created.id;
        setEditablePointages(prev => ({
          ...prev,
          [key]: { ...prev[key], id: finalId }
        }));
      } else {
        await dispatch(updatePointage({ ...pointage, id: finalId })).unwrap();
      }
      await dispatch(validerPointage(finalId)).unwrap();
      setEditablePointages(prev => ({
        ...prev,
        [key]: { ...prev[key], valider: 1 }
      }));
      nbValidés++;
    } catch (error) {
      erreurs.push(key);
    }
  }

  await dispatch(fetchPointages());
  setSelectedKeys([]); // 👈 Vider la sélection APRÈS le traitement

  if (nbValidés > 0) {
    Swal.fire('Succès', `${nbValidés} pointage(s) validé(s).`, 'success');
  }
  if (erreurs.length > 0) {
    Swal.fire('Erreur', `${erreurs.length} pointage(s) non valides ou incomplets.`, 'warning');
  }
};




const handleSaveAll = async () => {
  const updates = selectedKeys
    .map(key => editablePointages[key])
    .filter(pointage => pointage && pointage.statutJour);

  if (updates.length === 0) {
    Swal.fire({ icon: 'info', title: 'Aucune sélection', text: 'Sélectionnez des pointages à sauvegarder.' });
    return;
  }

  try {
    await Promise.all(updates.map(async pointage => {
      if (pointage.id) {
        await dispatch(updatePointage({ ...pointage, id: pointage.id })).unwrap();
      } else {
        await dispatch(createPointage(pointage)).unwrap();
      }
    }));
    
    // Après la sauvegarde, mettre à jour la liste des clés récemment modifiées
    // en supprimant les clés pour les pointages qui ne sont plus "non_pointe"
    const keysToRemove = selectedKeys.filter(key => {
      const pointage = editablePointages[key];
      return pointage && pointage.statutJour !== 'non_pointe';
    });
    
    if (keysToRemove.length > 0) {
      setRecentlyModifiedKeys(prev => prev.filter(k => !keysToRemove.includes(k)));
    }
    
    setSelectedKeys([]);
    await dispatch(fetchPointages());
    Swal.fire({ icon: 'success', title: 'Sauvegardé', timer: 1200, showConfirmButton: false });
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Erreur', text: 'Erreur lors de la sauvegarde.' });
  }
};

// Ajoute une ligne temporaire pour ce user

const handleValiderPointage = async (pointageId, key) => {
  const pointage = editablePointages[key];
  if (!pointage) return;

  if (!pointage.statutJour) {
    Swal.fire("Erreur!", "Veuillez sélectionner un statut.", "error");
    return;
  }

  if (
    ["present", "retard"].includes(pointage.statutJour) &&
    (!pointage.heureEntree || !pointage.heureSortie)
  ) {
    Swal.fire("Erreur!", "Veuillez remplir l’heure d’entrée et de sortie.", "error");
    return;
  }

  try {
    let finalId = pointageId;

    const pointageData = {
      user_id: pointage.user_id,
      date: pointage.date,
      heureEntree: pointage.heureEntree,
      heureSortie: pointage.heureSortie,
      statutJour: pointage.statutJour,
      overtimeHours: pointage.overtimeHours || 0,
    };

    if (!pointageId) {
      // ➕ Création
      const created = await dispatch(createPointage(pointageData)).unwrap();
      finalId = created.id;
      setEditablePointages(prev => ({
        ...prev,
        [key]: { ...prev[key], id: finalId },
      }));
    } else {
      // ✅ Mise à jour AVANT validation
      await dispatch(updatePointage({ ...pointageData, id: pointageId })).unwrap();
    }

    // ✅ Validation
    await dispatch(validerPointage(finalId)).unwrap();
    setSelectedKeys([])
    // ✅ État local
    setEditablePointages(prev => ({
      ...prev,
      [key]: { ...prev[key], valider: 1 }
    }));

    await dispatch(fetchPointages());

    Swal.fire("Succès!", "Pointage mis à jour et validé.", "success");
  } catch (err) {
    console.error("Erreur lors de la validation :", err);
    Swal.fire("Erreur!", err.message || "Échec lors de la validation.", "error");
  }
};




  const handleInvaliderPointage = async (pointageId) => {
    if (!pointageId) {
      Swal.fire('Erreur!', 'ID de pointage manquant pour l\'invalidation.', 'error');
      return;
    }
    try {
      await dispatch(invaliderPointage(pointageId)).unwrap();
      dispatch(fetchPointages());
      Swal.fire('Invalidé!', 'Le pointage a été invalidé.', 'success');
    } catch (err) {
      Swal.fire('Erreur!', err.message || 'L\'invalidation du pointage a échoué.', 'error');
    }
  };

 

  if (loading === 'loading') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="alert alert-danger" role="alert">
              <div className="d-flex align-items-center">
                <Icon icon="mdi:alert-circle" className="me-2" />
                <div>
                  <h5 className="alert-heading">Erreur de chargement</h5>
                  <p className="mb-0">Une erreur est survenue lors du chargement des pointages.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <h1 className="fw-bold mb-0 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>
          Pointages
        </h1>
      </div>

      <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div className="d-flex flex-wrap gap-2 align-items-center" style={{ flex: "1 1 100%", justifyContent: "space-between" }}>
          <div className="row gy-2 align-items-center mb-2">
            {/* Date */}
            <div className="col-12 col-md-auto">
              <label className='form-label d-block'> Date</label>
              <DatePicker
                selected={selectedDate ? new Date(selectedDate) : today}
                onChange={date =>
                  isRH
                    ? setSelectedDate(date ? date.toISOString().split("T")[0] : "")
                    : null
                }
                dateFormat="dd/MM/yyyy"
                locale="fr"
                className="form-control w-auto"
                maxDate={!isRH ? today : null}
                minDate={!isRH ? today : null}
                placeholderText="jj/mm/aaaa"
                disabled={!isRH}
              />
              {/* Indication pour équipes de nuit */}
              {(() => {
                const currentTime = new Date();
                const currentHour = currentTime.getHours();
                const currentDateStr = currentTime.toISOString().split('T')[0];
                
                if ((currentHour < 8 && selectedDate === currentDateStr) || 
                    (isRH && selectedDate !== currentDateStr)) {
                  return (
                    <small className="text-info mt-1 d-block">
                      <Icon icon="mdi:information" className="me-1" />
                      Inclut les pointages de nuit de la veille
                    </small>
                  );
                }
                return null;
              })()}
            </div>

            {/* Recherche */}
            <div className="col-12 col-md">
              <label className='form-label'> Recherche</label>
              <div className="position-relative w-100">
                <Icon 
                  icon="mdi:magnify"
                  className="position-absolute start-0 top-50 translate-middle-y ms-2 text-secondary"
                  style={{ fontSize: "18px" }}
                />
                <input
                  type="text"
                  className="form-control ps-5 py-2"
                  placeholder="Rechercher par Nom, Prénom ou CIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Statut */}
            <div className="col-12 col-md-auto">
              <label className='form-label'> Statut</label>
              <select
                className="form-select"
                value={filters.onlyPresentOrRetard}
                onChange={e => setFilters(prev => ({ ...prev, onlyPresentOrRetard: e.target.value }))}
                style={{
                  borderRadius: "8px",
                  padding: "8px 12px",
                  backgroundColor: "#F1F3F5",
                  color: "#374151",
                  border: "1px solid #E2E8F0",
                  minWidth: 150
                }}
              >
                <option value="">Tous</option>
                <option value="present">Présents seulement</option>
                <option value="retard">Retards seulement</option>
                <option value="absent">Absents seulement</option>
                <option value="present_retard">Présents et Retards</option>
              </select>
            </div>
            {/* Non pointé seulement */}
            <div className="col-12 col-md-auto d-flex align-items-end">
              <div className="form-check mt-4">
                <input
                  id="onlyNonPointe"
                  className="form-check-input"
                  type="checkbox"
                  checked={filters.onlyNonPointe}
                  onChange={(e) => setFilters(prev => ({ ...prev, onlyNonPointe: e.target.checked }))}
                />
                <label className="form-check-label ms-1" htmlFor="onlyNonPointe">
                  Non pointé
                </label>
              </div>
            </div>
            
            {/* Filtre Type de Contrat et Rôle */}
            {isRH && (
              <>
                <div className="col-12 col-md-auto">
                  <label className='form-label'> Type de Contrat</label>
                  <select
                    className="form-select"
                    value={filters.typeContrat}
                    onChange={e => setFilters(prev => ({ ...prev, typeContrat: e.target.value }))}
                    style={{
                      borderRadius: "8px",
                      padding: "8px 12px",
                      backgroundColor: "#F1F3F5",
                      color: "#374151",
                      border: "1px solid #E2E8F0",
                      minWidth: 150
                    }}
                  >
                    <option value="">Tous</option>
                    <option value="temporaire">Temporaires</option>
                    <option value="permanent">Permanents</option>
                  </select>
                </div>
                <div className="col-12 col-md-auto">
                  <label className='form-label'>Rôle</label>
                  <select
                    className="form-select"
                    value={filters.role || ''}
                    onChange={e => setFilters(prev => ({ ...prev, role: e.target.value }))}
                    style={{
                      borderRadius: "8px",
                      padding: "8px 12px",
                      backgroundColor: "#F1F3F5",
                      color: "#374151",
                      border: "1px solid #E2E8F0",
                      minWidth: 150
                    }}
                  >
                    <option value="">Tous</option>
                    <option value="Chef_Dep">Chef Département</option>
                    <option value="Chef_Projet">Chef Projet</option>
                    <option value="Chef_Chant">Chef Chantier</option>
                    <option value="Employe">Employé</option>
                    <option value="Gest_RH">Gestionnaire RH</option>
                  </select>
                </div>
              </>
            )}

            {/* Département */}
            {isRH && (
              <div className="col-12 col-md-auto">
                <label className='form-label'> Département</label>
                <select
                  className="form-select"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  style={{
                    borderRadius: "8px",
                    padding: "8px 12px",
                    backgroundColor: "#F1F3F5",
                    color: "#374151",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <option value="">Tous</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.nom}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtre items par page + compteur employés */}
            <div className="col-12">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <label className='form-label mb-0'>Employées par page:</label>
                <select
                  className="form-select"
                  style={{ minWidth: 100, maxWidth: 120 }}
                  value={itemsPerPage === filteredEditableKeys.length ? 'all' : itemsPerPage}
                  onChange={e => {
                    const val = e.target.value === 'all' ? filteredEditableKeys.length : Number(e.target.value);
                    setItemsPerPage(val);
                    setCurrentPage(1);
                  }}
                  disabled={selectedKeys.length > 0}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="all">Tout</option>
                </select>
                <span className="badge bg-info text-white">
                  {selectedKeys.length > 0 
                    ? `${selectedKeys.length} sélectionné${selectedKeys.length > 1 ? 's' : ''} / ${filteredEditableKeys.length} employé${filteredEditableKeys.length > 1 ? 's' : ''}` 
                    : itemsPerPage === filteredEditableKeys.length 
                      ? `${filteredEditableKeys.length} employé${filteredEditableKeys.length > 1 ? 's' : ''} (Tout)` 
                      : `${Math.min(itemsPerPage, filteredEditableKeys.length)} employé${Math.min(itemsPerPage, filteredEditableKeys.length) > 1 ? 's' : ''} affichés`
                  }
                </span>
              </div>
            </div>

            {/* BOUTONS: actions */}
            <div className="col-12">
              <label className='form-label'> Actions</label>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <button 
                  className="btn d-flex align-items-center gap-2"
                  style={{
                    backgroundColor: "#BFDBFE",
                    color: "#1D4ED8",
                    borderRadius: "8px",
                    padding: "8px",
                    fontWeight: 500,
                    border: "none",
                  }} 
                  onClick={handleSaveAll}
                >
                  <Icon icon="mdi:content-save-all" className="fs-5" />
                  <span className="d-none d-md-inline">Sauvegarder</span>
                </button>

                {canValidateAll && (
                  <button 
                    className="btn d-flex align-items-center gap-2"
                    style={{
                      backgroundColor: "#D1FAE5",
                      color: "#059669",
                      borderRadius: "8px",
                      padding: "8px",
                      fontWeight: 500,
                      border: "none",
                    }}
                    onClick={handleValiderTout}
                    disabled={
                      selectedKeys.length === 0 ||
                      !selectedKeys.some(key => {
                        const p = editablePointages[key];
                        if (!p || p.valider === 1 || !p.statutJour) return false;
                        if (["present", "retard"].includes(p.statutJour)) {
                          return p.heureEntree && p.heureSortie;
                        }
                        return true;
                      })
                    }
                  >
                    <Icon icon="mdi:check-all" className="fs-5" />
                    <span className="d-none d-md-inline">Valider</span>
                  </button>
                )}

                {canInvalidateAllForRH && (
                  <button 
                    className="btn d-flex align-items-center gap-2"
                    style={{
                      backgroundColor: "#FEE2E2",
                      color: "#DC2626",
                      borderRadius: "8px",
                      padding: "8px",
                      fontWeight: 500,
                      border: "none",
                    }}
                    onClick={handleInvaliderTout}
                  >
                    <Icon icon="mdi:close-octagon-outline" className="fs-5" />
                    <span className="d-none d-md-inline">Invalider</span>
                  </button>
                )}

                {/* Bouton Supprimer sélectionnés - accessible uniquement au RH */}
                {isRH && selectedKeys.length > 0 && (() => {
                  const { deletable, validated, notPointed } = getDeletableCount();
                  return deletable > 0 ? (
                    <button 
                      className="btn d-flex align-items-center gap-2"
                      style={{
                        backgroundColor: "#FEF2F2",
                        color: "#B91C1C",
                        borderRadius: "8px",
                        padding: "8px",
                        fontWeight: 500,
                        border: "1px solid #FCA5A5",
                      }}
                      onClick={handleDeleteSelected}
                      title={
                        (() => {
                          let title = `Supprimer ${deletable} pointage(s)`;
                          const protections = [];
                          if (validated > 0) protections.push(`${validated} validé(s)`);
                          if (notPointed > 0) protections.push(`${notPointed} non pointés`);
                          if (protections.length > 0) {
                            title += ` (${protections.join(', ')} ne seront pas supprimés)`;
                          }
                          return title;
                        })()
                      }
                    >
                      <Icon icon="mdi:delete-multiple" className="fs-5" />
                      <span className="d-none d-md-inline">
                        Supprimer ({deletable})
                        {(validated > 0 || notPointed > 0) && (
                          <small className="text-muted"> - {validated + notPointed} protégé(s)</small>
                        )}
                      </span>
                    </button>
                  ) : null;
                })()}
                
                {isRH && selectedKeys.length > 0 && (
                  <button 
                    className="btn d-flex align-items-center gap-2"
                    style={{
                      backgroundColor: "#E0F2FE",
                      color: "#0284C7",
                      borderRadius: "8px",
                      padding: "8px",
                      fontWeight: 500,
                      border: "none",
                    }}
                    onClick={handleSetUnassignedDepartment}
                  >
                    <Icon icon="fluent:building-multiple-24-filled" className="fs-5" />
                    <span className="d-none d-md-inline">Affecter</span>
                  </button>
                )}
                
                <button 
                  className="btn d-flex align-items-center gap-2"
                  style={{
                    backgroundColor: "rgb(249 223 255)",
                    color: "rgb(181 38 220)",
                    borderRadius: "8px",
                    padding: "8px",
                    fontWeight: 500,
                    border: "none",
                  }}
                  onClick={handleAddMultiplePointages} 
                  disabled={selectedKeys.length === 0}
                >
                  <Icon icon="mdi:plus" className="fs-5" />
                  <span className="d-none d-md-inline">Nouveau pointage</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section pointage multiple */}
      {selectedKeys.length > 0 && (
        <div className="row align-items-center mb-2 mt-2 gy-2 gx-3">
          <div className="col-12 col-md-3 mb-2 mb-md-0">
            <h6 className="mb-0">Pointage Multiple</h6>
          </div>
          <div className="col-12 col-md-9">
            <div className="row gy-2 gx-2 align-items-center">
              {/* Statut */}
              <div className="col-12 col-sm-4">
                <label className="form-label mb-1 fw-medium">Statut</label>
                <select
                  className="form-select"
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditablePointages((prev) => {
                      const updated = { ...prev };
                      selectedKeys.forEach((key) => {
                        if (prev[key]?.valider === 1) return;
                        let pointage = { ...updated[key], statutJour: value };
                        
                        if (value === "absent" || value === "non_pointe") {
                          pointage.heureEntree = '';
                          pointage.heureSortie = '';
                        }
                        
                        pointage.overtimeHours =
                          (value === "absent" || value === "non_pointe")
                            ? 0
                            : calcOvertime(pointage.heureEntree, pointage.heureSortie, pointage.date || selectedDate);
                        updated[key] = pointage;
                      });
                      return updated;
                    });
                    
                    if (value === "absent" || value === "non_pointe") {
                      setMultiHeureEntree(null);
                      setMultiHeureSortie(null);
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">Appliquer statut à la sélection</option>
                  <option value="present">Présent</option>
                  <option value="absent">Absent</option>
                  <option value="retard">Retard</option>
                  <option value="non_pointe">Non pointé</option>
                </select>
              </div>

              {/* Heure d'entrée */}
              <div className="col-12 col-sm-4">
                <label className="form-label mb-1 fw-medium d-block">Heure d'Entrée</label>
                <DatePicker
                  selected={multiHeureEntree}
                  onChange={date => {
                    setMultiHeureEntree(date);
                    setEditablePointages((prev) => {
                      let updated = { ...prev };
                      // Si l'utilisateur efface la valeur, on met une chaîne vide
                      if (!date) {
                        selectedKeys.forEach((userId) => {
                          if (prev[userId]?.valider === 1) return;
                          let pointage = { ...updated[userId], heureEntree: '' };
                          pointage.overtimeHours =
                            (["absent", "non_pointe"].includes(pointage.statutJour))
                              ? 0
                              : calcOvertime(pointage.heureEntree, pointage.heureSortie, pointage.date || selectedDate);
                          updated[userId] = pointage;
                        });
                        return updated;
                      }
                      const hh = String(date.getHours()).padStart(2, '0');
                      const mm = String(date.getMinutes()).padStart(2, '0');
                      const value = `${hh}:${mm}:00`;
                      selectedKeys.forEach((userId) => {
                        if (prev[userId]?.valider === 1) return;
                        let pointage = { ...updated[userId], heureEntree: value };
                        // Si c'est un pointage non_pointe ou vide, on le passe à présent
                        if (pointage.statutJour === 'non_pointe' || !pointage.statutJour) {
                          pointage.statutJour = 'present';
                        }
                        pointage.overtimeHours =
                          (["absent", "non_pointe"].includes(pointage.statutJour))
                            ? 0
                            : calcOvertime(pointage.heureEntree, pointage.heureSortie, pointage.date || selectedDate);
                        updated[userId] = pointage;
                      });
                      return updated;
                    });
                  }}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={5}
                  timeCaption="Heure"
                  dateFormat="HH:mm"
                  timeFormat="HH:mm"
                  placeholderText="HH:mm"
                  className="form-control"
                  onKeyDown={e => e.preventDefault()}
                  minTime={!isRH && isToday ? getFiveMinuteWindow(now).start : new Date(0,0,0,0,0)}
                  maxTime={!isRH && isToday ? getFiveMinuteWindow(now).end   : new Date(0,0,0,23,59)}
                  isClearable
                />
              </div>

              {/* Heure de sortie */}
              <div className="col-12 col-sm-4">
                <label className="form-label mb-1 fw-medium d-block">Heure de Sortie</label>
                <DatePicker
                  selected={multiHeureSortie}
                  onChange={date => {
                    setMultiHeureSortie(date);
                    setEditablePointages((prev) => {
                      let updated = { ...prev };
                      if (!date) {
                        selectedKeys.forEach((userId) => {
                          if (prev[userId]?.valider === 1) return;
                          let pointage = { ...updated[userId], heureSortie: '' };
                          pointage.overtimeHours =
                            (["absent", "non_pointe"].includes(pointage.statutJour))
                              ? 0
                              : calcOvertime(pointage.heureEntree, pointage.heureSortie, pointage.date || selectedDate);
                          updated[userId] = pointage;
                        });
                        return updated;
                      }
                      const hh = String(date.getHours()).padStart(2, '0');
                      const mm = String(date.getMinutes()).padStart(2, '0');
                      const value = `${hh}:${mm}:00`;
                      selectedKeys.forEach((userId) => {
                        if (prev[userId]?.valider === 1) return;
                        let pointage = { ...updated[userId], heureSortie: value };
                        if (pointage.statutJour === 'non_pointe' || !pointage.statutJour) {
                          pointage.statutJour = 'present';
                        }
                        pointage.overtimeHours =
                          (["absent", "non_pointe"].includes(pointage.statutJour))
                            ? 0
                            : calcOvertime(pointage.heureEntree, pointage.heureSortie, pointage.date || selectedDate);
                        updated[userId] = pointage;
                      });
                      return updated;
                    });
                  }}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={5}
                  timeCaption="Heure"
                  dateFormat="HH:mm"
                  timeFormat="HH:mm"
                  placeholderText="HH:mm"
                  className="form-control"
                  onKeyDown={e => e.preventDefault()}
                  minTime={!isRH && isToday ? getFiveMinuteWindow(now).start : new Date(0,0,0,0,0)}
                  maxTime={!isRH && isToday ? getFiveMinuteWindow(now).end   : new Date(0,0,0,23,59)}
                  isClearable
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tableau des pointages */}
      <div className="card card-body shadow-sm border">
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB" }}>
                <th style={{ width: "32px", minWidth: "32px", maxWidth: "32px" }}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={isAllSelected}
                    onChange={e => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th style={{ minWidth: "150px" }}>Nom de l'employé</th>
                <th style={{ minWidth: "100px" }}>Statut</th>
                <th style={{ minWidth: "100px" }}>Heure d'entrée</th>
                <th style={{ minWidth: "100px" }}>Heure de sortie</th>
                <th style={{ minWidth: "100px" }}>Heures supp</th>
                <th style={{ width: "120px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEditableKeys.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    <div className="d-flex flex-column align-items-center">
                      <Icon icon="mdi:alert-circle" className="mb-2" style={{ fontSize: "36px", color: "#6B7280" }} />
                      <span className="text-muted">Aucun pointage trouvé pour cette date.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedKeys.map((key, idx) => {
                  const pointage = editablePointages[key];
                  const user = users.find(u => String(u.id) === String(pointage.user_id)) || {};
                  const isTemp = pointage.id === null;
                  const isSelected = selectedKeys.includes(key);
                  const canValidate = canValidateAll && !pointage.valider && pointage.statutJour;
                  const canInvalidate = canInvalidateAllForRH && pointage.valider === 1;

                  return (
                    <PointageRow
                      key={key}
                      user={user}
                      pointage={pointage}
                      isTemp={isTemp}
                      idxTemp={idx}
                      isSelected={isSelected}
                      onSelect={checked => handleSelect(key, checked)}
                      onFieldChange={handleFieldChange.bind(null, key)}
                      onSave={() => handleSavePointage(key)}
                      onRemoveTemp={() => handleRemoveTempPointage(key)}
                      onAddTemp={() => handleAddMultiplePointages()}
                      canValidate={canValidate}
                      onValidate={() => handleValiderPointage(pointage.id, key)}
                      canInvalidate={canInvalidate}
                      onInvalidate={() => handleInvaliderPointage(pointage.id)}
                      onDelete={
                        isTemp 
                          ? () => handleRemoveTempPointage(key)
                          : (pointage.id ? () => handleDeletePointage(pointage.id, key) : null)
                      }
                      now={now}
                      isToday={isToday}
                      extractHourMinute={extractHourMinute}
                      calcOvertime={calcOvertime}
                      Icon={Icon}
                      disabledStatut={false}
                      IsRH={isRH}
                      getFiveMinuteWindow={getFiveMinuteWindow}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-4">
        <div>
          <span className="text-muted">
            Affichage de {filteredEditableKeys.length > 0 ? indexOfFirstItem + 1 : 0} à {Math.min(indexOfLastItem, filteredEditableKeys.length)} sur {filteredEditableKeys.length} pointages
          </span>
        </div>
        {itemsPerPage !== filteredEditableKeys.length && (
          <nav>
            <ul className="pagination mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(1)}>
                  <Icon icon="mdi:chevron-left" />
                </button>
              </li>
              {[...Array(totalPages)].map((_, i) => (
                <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(i + 1)}>
                    {i + 1}
                  </button>
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(totalPages)}>
                  <Icon icon="mdi:chevron-right" />
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
};

export default PointagesListPage;