import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import PointageCardMobile from "./PointageCardMobile";
import PointageModalMobile from "./PointageModalMobile";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Icon } from "@iconify/react";
import Swal from 'sweetalert2';

import {
  fetchPointages,
  createPointage,
  updatePointage,
  validerPointage,
  invaliderPointage,
  deletePointages,
} from "../../Redux/Slices/pointageSlice";

// Fonction pour détecter et traiter les shifts de nuit
const detectNightShifts = (pointages) => {
  const processedPointages = [];
  const processed = new Set();

  pointages.forEach((pointage, index) => {
    if (processed.has(index)) return;

    const currentDate = new Date(pointage.date);
    const heureEntree = pointage.heureEntree;
    const heureSortie = pointage.heureSortie;

    // Détection shift de nuit complet: entrée >= 18:00 et sortie = 23:59:59
    if (heureEntree >= '18:00:00' && heureSortie === '23:59:59') {
      // Chercher le pointage du lendemain qui commence à 00:00:00
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      
      const nextShiftIndex = pointages.findIndex((p, i) => 
        i > index && 
        p.user_id === pointage.user_id &&
        p.date === nextDayStr && 
        p.heureEntree === '00:00:00' &&
        !processed.has(i)
      );

      if (nextShiftIndex !== -1) {
        const nextShift = pointages[nextShiftIndex];
        // Créer un pointage groupé pour le shift de nuit complet
        processedPointages.push({
          ...pointage,
          id: `${pointage.id}-${nextShift.id}`,
          heureSortie: nextShift.heureSortie,
          isNightShift: true,
          isCompleteNightShift: true,
          originalDate: pointage.date,
          endDate: nextShift.date,
          nightShiftIds: [pointage.id, nextShift.id]
        });
        processed.add(index);
        processed.add(nextShiftIndex);
      } else {
        // Shift de nuit incomplet (première partie seulement)
        processedPointages.push({
          ...pointage,
          isNightShift: true,
          isIncompleteNightShift: true,
          originalDate: pointage.date,
          needsCompletion: true
        });
        processed.add(index);
      }
    } 
    // Détection shift de nuit incomplet: entrée >= 18:00 avec heure de sortie manquante ou normale
    else if (heureEntree >= '18:00:00' && (!heureSortie || heureSortie === '' || heureSortie < '23:59:59')) {
      console.log('Détection shift incomplet:', {
        id: pointage.id,
        date: pointage.date,
        heureEntree,
        heureSortie,
        showOnNextDay: pointage.showOnNextDay
      });
      
      processedPointages.push({
        ...pointage,
        isNightShift: true,
        isIncompleteNightShift: true,
        originalDate: pointage.originalDate || pointage.date,
        needsCompletion: true,
        showOnNextDay: pointage.showOnNextDay || false,
        displayDate: pointage.displayDate || pointage.date
      });
      processed.add(index);
    }
    // Détection deuxième partie d'un shift de nuit: entrée = 00:00:00
    else if (heureEntree === '00:00:00') {
      // Vérifier s'il y a une première partie la veille
      const prevDay = new Date(currentDate);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayStr = prevDay.toISOString().split('T')[0];
      
      const prevShiftIndex = pointages.findIndex((p, i) => 
        i < index && 
        p.user_id === pointage.user_id &&
        p.date === prevDayStr && 
        p.heureEntree >= '18:00:00' &&
        !processed.has(i)
      );

      if (prevShiftIndex === -1) {
        // Deuxième partie orpheline d'un shift de nuit
        processedPointages.push({
          ...pointage,
          isNightShift: true,
          isIncompleteNightShift: true,
          isSecondPart: true,
          originalDate: prevDayStr,
          endDate: pointage.date
        });
      }
      processed.add(index);
    }
    else {
      processedPointages.push(pointage);
      processed.add(index);
    }
  });

  return processedPointages;
};

// Fonction de groupement
function groupPointages(pointages, users) {
  const activeUsers = users.filter(u => !["inactif", "inactive"].includes(u.statut?.toLowerCase()));
  
  // Détecter les shifts de nuit avant le groupement
  const processedPointages = detectNightShifts(pointages);
  
  const groups = {};
  processedPointages.forEach((p) => {
    const key = [
      p.statutJour || "",
      p.heureEntree || "",
      p.heureSortie || "",
      p.valider, // Ajout du statut de validation dans la clé
      p.isNightShift ? "night" : "day", // Différencier les shifts de nuit
      p.isIncompleteNightShift ? "incomplete" : "complete", // Différencier les shifts incomplets
      p.needsCompletion ? "needs-completion" : "",
      p.showOnNextDay ? "next-day" : "same-day" // Différencier l'affichage cross-day
    ].join("|");

    if (!groups[key]) {
      groups[key] = {
        statutJour: p.statutJour,
        heureEntree: p.heureEntree,
        heureSortie: p.heureSortie,
        valider: p.valider, // Ajoute valider ici pour affichage
        isNightShift: p.isNightShift,
        isIncompleteNightShift: p.isIncompleteNightShift,
        isCompleteNightShift: p.isCompleteNightShift,
        needsCompletion: p.needsCompletion,
        isSecondPart: p.isSecondPart,
        originalDate: p.originalDate,
        endDate: p.endDate,
        showOnNextDay: p.showOnNextDay,
        displayDate: p.displayDate,
        pointages: [],
        userIds: [],
      };
    }
    groups[key].pointages.push(p);
    groups[key].userIds.push(p.user_id);
  });

  const result = Object.values(groups).map((g) => ({
    ...g,
    users: g.userIds.map((uid) => activeUsers.find((u) => u.id === uid)).filter(Boolean),
    ids: g.pointages.map((p) => p.nightShiftIds || [p.id]).flat(),
  }));
  
  console.log('Groupes créés:', result.length);
  result.forEach((g, idx) => {
    if (g.isNightShift) {
      console.log(`Groupe ${idx}:`, {
        isNightShift: g.isNightShift,
        isIncompleteNightShift: g.isIncompleteNightShift,
        showOnNextDay: g.showOnNextDay,
        originalDate: g.originalDate,
        heureEntree: g.heureEntree,
        heureSortie: g.heureSortie,
        users: g.users.map(u => u.name)
      });
    }
  });
  
  return result;
}

const PointagesMobile = () => {
  const dispatch = useDispatch();
  const { items: pointages } = useSelector((state) => state.pointages);
  const { items: users } = useSelector((state) => state.users);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("ajout");
  const [editingGroup, setEditingGroup] = useState(null);
  const employes = useSelector(state =>
    state.users.items.filter(u => !["Inactif", "Inactive"].includes(u.statut?.toLowerCase()))
  );
  const roles = useSelector((state) => state.auth.roles || []); // ou ton propre hook/prop
  const isRH = roles.includes("RH");

  
  // Assure que si pas RH, la date est toujours aujourd'hui (évite de changer manuellement)
  useEffect(() => {
    if (!isRH) {
      setSelectedDate(new Date().toISOString().split("T")[0]);
    }
  }, [isRH]);
  useEffect(() => {
    dispatch(fetchPointages());
  }, [dispatch, selectedDate]);
  const handleSavePointage = async (values, options = {}) => {
    try {
      if (modalMode === "ajout") {
        for (const user_id of values.employes) {
          // 1. Créer le pointage
          const res = await dispatch(
            createPointage({
              user_id,
              date: selectedDate,
              statutJour: values.statut,
              heureEntree: values.statut === "absent" ? null : values.heureEntree,
              heureSortie: values.statut === "absent" ? null : values.heureSortie,
              overtimeHours: values.overtimeHours,
            })
          ).unwrap();
  
          // 2. Si "Valider" a été cliqué, on valide juste après création
          if (options.valider && res?.id) {
            await dispatch(validerPointage(res.id));
          }
        }
      }else if (modalMode === "modifierTous") {
        // Modifier tous les pointages du groupe
        for (const id of editingGroup.ids) {
          await dispatch(
            updatePointage({
              id,
              statutJour: values.statut,
              heureEntree: values.statut === "absent" ? null : values.heureEntree,
              heureSortie: values.statut === "absent" ? null : values.heureSortie,
              overtimeHours: values.overtimeHours,
            })
          ).unwrap();
  
          // Si bouton "Valider"
          if (options.valider) {
            await dispatch(validerPointage(id));
          }
        }
      } else if (modalMode === "modifierPerso") {
        // Modifier seulement les employés sélectionnés dans le groupe
        const idsToUpdate = editingGroup.users
          .map((user, idx) => values.employes.includes(user.id) ? editingGroup.ids[idx] : null)
          .filter(Boolean);
  
        for (const id of idsToUpdate) {
          await dispatch(
            updatePointage({
              id,
              statutJour: values.statut,
              heureEntree: values.statut === "absent" ? null : values.heureEntree,
              heureSortie: values.statut === "absent" ? null : values.heureSortie,
              overtimeHours: values.overtimeHours,
            })
          ).unwrap();
  
          if (options.valider) {
            await dispatch(validerPointage(id));
          }
        }
      }
      setShowModal(false);
      dispatch(fetchPointages());
    } catch (e) {
      alert("Erreur lors de la sauvegarde.");
    }
  };

  //0. Retourne la liste des employés qui n'ont pas encore de pointage pour la date sélectionnée
const getEmployesNonPointes = () => {
  // Prendre tous les pointages du jour
  const pointagesDuJour = pointages.filter((p) => p.date === selectedDate);
  // Liste des user_id déjà pointés
  const dejaPointes = pointagesDuJour.map((p) => p.user_id);
  // Filtrer pour ne garder que les employés actifs qui ne sont pas déjà pointés
  return users.filter(u => 
    !["inactif", "inactive"].includes(u.statut?.toLowerCase()) && !dejaPointes.includes(u.id)
  );
};

  
  // 1. Filtre les pointages du jour + shifts de nuit incomplets de la veille
  const pointagesDuJour = pointages.filter((p) => p.date === selectedDate);
  
  // Ajouter les shifts de nuit incomplets de la veille qui doivent apparaître aujourd'hui
  const prevDay = new Date(selectedDate);
  prevDay.setDate(prevDay.getDate() - 1);
  const prevDayStr = prevDay.toISOString().split('T')[0];
  
  console.log('Date sélectionnée:', selectedDate);
  console.log('Jour précédent:', prevDayStr);
  console.log('Tous les pointages:', pointages.length);
  
  const incompleteNightShiftsFromPrevDay = pointages.filter((p) => {
    const isFromPrevDay = p.date === prevDayStr;
    const hasEveningEntry = p.heureEntree && p.heureEntree >= '18:00:00';
    const hasNoProperExit = !p.heureSortie || p.heureSortie === '' || p.heureSortie < '23:59:59';
    
    if (isFromPrevDay && hasEveningEntry) {
      console.log('Pointage candidat shift nuit:', {
        id: p.id,
        user_id: p.user_id,
        date: p.date,
        heureEntree: p.heureEntree,
        heureSortie: p.heureSortie,
        hasNoProperExit,
        shouldShow: isFromPrevDay && hasEveningEntry && hasNoProperExit
      });
    }
    
    return isFromPrevDay && hasEveningEntry && hasNoProperExit;
  }).map(p => ({
    ...p,
    showOnNextDay: true,
    originalDate: p.date,
    displayDate: selectedDate
  }));
  
  console.log('Shifts incomplets trouvés:', incompleteNightShiftsFromPrevDay.length);

  // Combiner les pointages du jour avec les shifts incomplets de la veille
  const allPointagesForDay = [...pointagesDuJour, ...incompleteNightShiftsFromPrevDay];
  
  console.log('Total pointages à afficher:', allPointagesForDay.length);

  // 2. Groupe les pointages
  const grouped = groupPointages(allPointagesForDay, users);

  // Sélection des groupes (par leur key d’index dans grouped)
  const toggleSelectGroup = (idx) => {
    setSelectedGroups((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  // Ouverture modale
  // const openModal = (mode, group = null) => {
  //   setModalMode(mode);
  //   setEditingGroup(group);
  //   setShowModal(true);
  // };
  const [employesAjout, setEmployesAjout] = useState([]);

  const openModal = (mode, group = null) => {
    setModalMode(mode);
    setEditingGroup(group);
  
    // Si mode "ajout", calcule la bonne liste d'employés restants
    if (mode === "ajout") {
      setEmployesAjout(getEmployesNonPointes());
    }
  
    setShowModal(true);
  };
  

  // Valider/invalider TOUS les pointages du groupe sélectionné
  const handleValider = async () => {
    for (const idx of selectedGroups) {
      for (const id of grouped[idx].ids) {
        await dispatch(validerPointage(id));
      }
    }
    setSelectedGroups([]);
    dispatch(fetchPointages());
  };
  const handleInvalider = async () => {
    for (const idx of selectedGroups) {
      for (const id of grouped[idx].ids) {
        await dispatch(invaliderPointage(id));
      }
    }
    setSelectedGroups([]);
    dispatch(fetchPointages());
  };

  // Supprimer un pointage depuis la card
  const handleDeleteFromCard = async (group, empId) => {
    const empIndex = group.users.findIndex(u => u.id === empId);
    if (empIndex === -1) return;

    const pointageId = group.ids[empIndex];
    if (!pointageId) return;

    const result = await Swal.fire({
      title: 'Confirmer la suppression',
      text: `Voulez-vous supprimer le pointage de ${group.users[empIndex].name} ${group.users[empIndex].prenom} ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    });

    if (!result.isConfirmed) return;

    try {
      await dispatch(deletePointages([pointageId]));
      // Pas de fetchPointages() pour éviter le refresh
    } catch (e) {
      console.error('Erreur suppression:', e);
      Swal.fire('Erreur', "La suppression a échoué.", 'error');
    }
  };

  return (
    <div style={{ padding: 12, maxWidth: 430, margin: "0 auto" }}>
      {/* Actions bar */}
      <div>
    {/* DatePicker full width */}
    <div className="mb-3 w-100">
      <label htmlFor="datepicker" className="d-block">Date du pointage</label>
      <DatePicker
        id="datepicker"
        className="form-control w-100 d-block"
        selected={isRH ? new Date(selectedDate) : new Date()}
        onChange={date => {
          if (isRH) setSelectedDate(date.toISOString().split("T")[0]);
        }}
        dateFormat="yyyy-MM-dd"
        placeholderText="Choisir une date"
        style={{ width: "100%" }}
        disabled={!isRH}
      />
    </div>

    {/* Boutons en ligne, gap automatique, padding arrondi Bootstrap */}
    <div className="d-flex gap-2 mb-2">
      <button
        className="btn btn-primary btn-sm rounded-pill d-flex align-items-center gap-2 flex-1"
        onClick={() => openModal("ajout")}
      >
        <Icon icon="mdi:plus" style={{ fontSize: 18 }} />
        Ajouter
      </button>

      <button
        className="btn btn-success btn-sm rounded-pill d-flex align-items-center gap-2 flex-1"
        onClick={handleValider}
        disabled={selectedGroups.length === 0}
      >
        <Icon icon="mdi:check-circle" style={{ fontSize: 18 }} />
        Valider
      </button>

      {isRH && (
        <button
          className="btn btn-danger btn-sm rounded-pill d-flex align-items-center gap-2 flex-1"
          onClick={handleInvalider}
          disabled={selectedGroups.length === 0}
        >
          <Icon icon="mdi:close-circle" style={{ fontSize: 18 }} />
          Invalider
        </button>
      )}
    </div>
  </div>

      {/* Affichage groupé en cartes */}
      <div className="flex flex-col gap-3">
        {grouped.map((group, idx) => (
          <PointageCardMobile
            key={idx}
            group={group}
            selected={selectedGroups.includes(idx)}
            onSelect={() => toggleSelectGroup(idx)}
            onVoir={() => openModal("voir", group)}
            onModifierTous={() => openModal("modifierTous", group)}
            onModifierPerso={() => openModal("modifierPerso", group)}
            onDelete={handleDeleteFromCard}
          />
        ))}
      </div>

      {/* Modale ajout/modif */}
      {showModal && (
  <PointageModalMobile
    mode={modalMode}
    onClose={() => setShowModal(false)}
    onSave={handleSavePointage}
    group={editingGroup}
    employes={modalMode === "ajout" ? employesAjout : employes}
  />
)}

    </div>
  );
};

export default PointagesMobile;
