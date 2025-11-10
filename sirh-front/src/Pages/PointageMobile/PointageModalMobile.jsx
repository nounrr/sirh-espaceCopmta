import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import CheckboxStatutGroup from "./CheckboxStatutGroup";
import './CheckboxStatutGroup.css';
import { Icon } from "@iconify/react";
import { useSelector, useDispatch } from "react-redux";
import Swal from 'sweetalert2';
import { deletePointages } from "../../Redux/Slices/pointageSlice";

// Helpers pour transformer string 'HH:mm' <-> objet Date
const stringToDate = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  const date = new Date();
  date.setHours(h || 0);
  date.setMinutes(m || 0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
};
const dateToString = (date) => {
  if (!date) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

// Calcul des heures supp
function calcOvertime(heureEntree, heureSortie, date = new Date()) {
  if (!heureEntree || !heureSortie) return 0;
  
  // Vérifier si c'est un weekend (samedi = 6, dimanche = 0)
  const workDate = new Date(date);
  const dayOfWeek = workDate.getDay();
  
  // Si c'est samedi (6) ou dimanche (0), pas d'heures supplémentaires
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 0;
  }
  
  const [hEnt, mEnt] = heureEntree.split(":").map(Number);
  const [hSort, mSort] = heureSortie.split(":").map(Number);
  let minutesEntree = hEnt * 60 + mEnt;
  let minutesSortie = hSort * 60 + mSort;
  if (minutesSortie <= minutesEntree) minutesSortie += 24 * 60;
  const diff = minutesSortie - minutesEntree;
  if (diff <= 0) return 0;
  return diff > 540 ? Math.round((diff - 540) / 60 * 100) / 100 : 0;
}

const PointageModalMobile = ({
  mode = "ajout",      // 'ajout', 'modifierTous', 'modifierPerso', 'voir'
  onClose,
  onSave,
  group = null,        // Pour les modes modif/voir
  employes = [],       // Toujours la liste complète pour le mode 'ajout'
}) => {
  // Etats locaux
  const [statut, setStatut] = useState("");
  const [heureEntree, setHeureEntree] = useState("");
  const [heureSortie, setHeureSortie] = useState("");
  const [employesSelectionnes, setEmployesSelectionnes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [datePointage, setDatePointage] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roles = useSelector((state) => state.auth.roles || []);
  const isRH = roles.includes('RH');
  const dispatch = useDispatch();

  // Comparaison de dates (même jour ?)
  const isSameDay = (dateA, dateB) =>
    dateA.getDate() === dateB.getDate() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getFullYear() === dateB.getFullYear();

  // Doit-on limiter l'heure de sortie ? (non-RH et aujourd'hui seulement)
  const shouldLimitTime =
    !isRH && isSameDay(datePointage, new Date());

  // Définition des limites d'intervalle 5 minutes avant/après maintenant
  const now = new Date();
  
  // Pour l'heure d'entrée et sortie: 5 minutes avant maintenant
  const minHeure = new Date(now.getTime() - 5 * 60000);
  minHeure.setSeconds(0, 0);
  
  // Pour l'heure d'entrée et sortie: 5 minutes après maintenant
  const maxHeure = new Date(now.getTime() + 5 * 60000);
  maxHeure.setSeconds(0, 0);

  // Pré-remplissage si group (pour modifier/voir)
  useEffect(() => {
    if (group) {
      setStatut(group.statutJour || "");
      setHeureEntree(group.heureEntree || "");
      setHeureSortie(group.heureSortie || "");
      setEmployesSelectionnes(group.users?.map((u) => u.id) || []);
      
      // Pour les shifts de nuit, utiliser la date originale
      if (group.isNightShift && group.originalDate) {
        setDatePointage(new Date(group.originalDate));
      } else {
        setDatePointage(group.date ? new Date(group.date) : new Date());
      }
    } else {
      setStatut("");
      setHeureEntree("");
      setHeureSortie("");
      setEmployesSelectionnes([]);
      // Si pas RH, la date est toujours aujourd'hui
      if (!isRH) {
        setDatePointage(new Date());
      } else {
        setDatePointage(new Date());
      }
    }
  }, [group, mode, isRH]);

  // Gestion du clic sur checkbox employé
  const toggleEmploye = (id) => {
    setEmployesSelectionnes((prev) =>
      prev.includes(id)
        ? prev.filter((eid) => eid !== id)
        : [...prev, id]
    );
  };

  // Sélectionner/désélectionner tous les employés affichés
  const handleSelectAll = (list, allSelected) => {
    if (allSelected) {
      setEmployesSelectionnes([]);
    } else {
  setEmployesSelectionnes(list.map(emp => emp.id));
    }
  };

  // Pour activer le bouton Sauvegarder
  const canSave =
    !!statut &&
    ((mode === "ajout" && employesSelectionnes.length > 0) || mode !== "ajout");

  // Pour activer le bouton Valider
  const canValider =
    !!statut &&
    (statut === "absent" || (heureEntree && heureSortie)) &&
    ((mode === "ajout" && employesSelectionnes.length > 0) || mode !== "ajout");

  // Validation du pointage
  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
  
    // Affiche le loader SweetAlert
    Swal.fire({
      title: 'Veuillez patienter...',
      text: 'Enregistrement en cours',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  
    try {
      await onSave({
        statut,
        heureEntree: statut === "absent" ? null : heureEntree,
        heureSortie: statut === "absent" ? null : heureSortie,
        date: datePointage,
        employes: employesSelectionnes,
        overtimeHours: statut === "absent"
          ? 0
          : calcOvertime(heureEntree, heureSortie, datePointage),
        isNightShift: group?.isNightShift,
        nightShiftIds: group?.nightShiftIds
      });
      Swal.close(); // Ferme le loader
    } catch (e) {
      Swal.fire('Erreur', "Une erreur s'est produite", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Supprimer un pointage individuel
  const handleDeleteSinglePointage = async (empId) => {
    if (!group?.users || !group?.ids) return;

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

    setIsSubmitting(true);
    try {
      await dispatch(deletePointages([pointageId]));
      // reset hours to default (empty) in the modal
      setHeureEntree("");
      setHeureSortie("");
      Swal.fire('Supprimé', 'Le pointage a été supprimé.', 'success');
      // Ne pas fermer la modale, juste rafraîchir
    } catch (e) {
      console.error('Erreur suppression:', e);
      Swal.fire('Erreur', "La suppression a échoué.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  

  // Nouvelle version avec select/deselect all
  const renderEmployes = () => {
    const list =
      mode === "ajout"
        ? employes
        : (group?.users || []).filter(u => !["inactif", "inactive"].includes(u.statut?.toLowerCase()));

  if (!list.length) return null;

    const titre =
      mode === "ajout" ? "Employés concernés :" :
      mode === "modifierTous" ? "Employés concernés :" :
      mode === "modifierPerso" ? "Sélectionner les employés à modifier :" :
      "Employés concernés :";

    const selectable = mode !== "voir";

    // build displayed list (filter + sort)
    const q = searchTerm.trim().toLowerCase();
    const filtered = list.filter(emp => {
      if (!q) return true;
      const full = `${(emp.name || "").toString()} ${(emp.prenom || "").toString()}`.toLowerCase();
      return full.includes(q);
    });
    const displayed = filtered.slice().sort((a, b) => {
      const na = (a.name || "").toString();
      const nb = (b.name || "").toString();
      const cmp = na.localeCompare(nb, undefined, { sensitivity: 'base' });
      if (cmp !== 0) return cmp;
      const pa = (a.prenom || "").toString();
      const pb = (b.prenom || "").toString();
      return pa.localeCompare(pb, undefined, { sensitivity: 'base' });
    });

    const nbSelectedFiltered = displayed.filter(emp => employesSelectionnes.includes(emp.id)).length;
    const allDisplayedSelected = displayed.length > 0 && displayed.every(emp => employesSelectionnes.includes(emp.id));

    return (
      <div className="mb-3">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label className="mb-2 fw-bold">{titre}</label>
          <span style={{
            background: "#e5e7eb",
            color: "#111",
            fontWeight: 600,
            borderRadius: 16,
            padding: "1px 12px",
            fontSize: 14,
            marginLeft: 5,
          }}>
            {nbSelectedFiltered}/{displayed.length}
          </span>
        </div>

        {/* Recherche */}
        <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="search"
            className="form-control"
            placeholder="Rechercher un employé..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1 }}
            disabled={!selectable}
          />
          {selectable && (
            <div>
              <label style={{ cursor: "pointer", fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={allDisplayedSelected}
                  onChange={() => handleSelectAll(displayed, allDisplayedSelected)}
                  style={{ marginRight: 8 }}
                />
                {allDisplayedSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </label>
            </div>
          )}
        </div>
        <div className="badges-employes-row">
          {displayed.length === 0 ? (
            <div style={{ color: '#6b7280' }}>Aucun employé trouvé</div>
          ) : (
            displayed.map(emp => {
              const selected = employesSelectionnes.includes(emp.id);
              return (
                <label
                  key={emp.id}
                  className={`badge-employe${selected ? " selected" : ""}`}
                  style={{
                    pointerEvents: selectable ? "auto" : "none"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => selectable && toggleEmploye(emp.id)}
                    disabled={!selectable}
                    style={{ display: "none" }}
                  />
                  <span>
                    {emp.name} {emp.prenom}
                    {selected && (
                      <Icon icon="mdi:check-circle" className="check-icon-emp" />
                    )}
                    {(mode === 'modifierTous' || mode === 'modifierPerso' || mode === 'voir') && (
                      <Icon
                        icon="mdi:delete"
                        style={{
                          fontSize: 16,
                          color: '#fffff',
                          cursor: 'pointer',
                          marginLeft: 8,
                          verticalAlign: 'middle'
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteSinglePointage(emp.id);
                        }}
                        title="Supprimer ce pointage"
                      />
                    )}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="position-modal">
      <div className="modal-flotte mx-auto my-3">
        <div
          className="bg-white rounded-4 p-4 shadow-lg border"
          style={{
            minWidth: 320,
            maxWidth: 420,
            width: "90%",
            boxShadow: "0 8px 32px rgba(80,60,150,0.14)",
            border: "1.5px solid #eaeaff",
            transform: "translateY(0)",
            transition: "box-shadow 0.3s, transform 0.3s",
            height: "max-content"
          }}
        >
          <h4 className="mb-3">
            {mode === "ajout"
              ? "Ajouter un pointage"
              : mode === "modifierTous"
              ? "Modifier tous"
              : mode === "modifierPerso"
              ? "Modifier personnalisé"
              : "Voir le pointage"}
          </h4>

          {/* Badge shift de nuit si applicable */}
          {group?.isNightShift && (
            <div className="mb-3">
              {group.isCompleteNightShift ? (
                <span 
                  className="px-3 py-2 rounded-pill d-inline-flex align-items-center gap-2"
                  style={{
                    backgroundColor: "#3B82F6", 
                    color: "#FFFFFF", 
                    fontSize: "13px",
                    fontWeight: "500"
                  }}
                >
                  <Icon icon="mdi:weather-night" style={{ fontSize: 16 }} />
                  Équipe de nuit ({group.originalDate} → {group.endDate})
                </span>
              ) : group.isIncompleteNightShift && group.needsCompletion ? (
                <div className="d-flex flex-column gap-2">
                  <span 
                    className="px-3 py-2 rounded-pill d-inline-flex align-items-center gap-2"
                    style={{
                      backgroundColor: "#F59E0B", 
                      color: "#FFFFFF", 
                      fontSize: "13px",
                      fontWeight: "500"
                    }}
                  >
                    <Icon icon="mdi:weather-night" style={{ fontSize: 16 }} />
                    <Icon icon="mdi:alert-circle" style={{ fontSize: 16 }} />
                    {group.showOnNextDay ? 
                      `Shift nuit à compléter (depuis ${group.originalDate})` : 
                      `Shift nuit incomplet (${group.originalDate})`
                    }
                  </span>
                  <small className="text-muted">
                    {group.showOnNextDay ? 
                      "💡 Complétez ce shift de nuit commencé hier" :
                      "💡 Complétez l'heure de sortie pour finaliser le shift de nuit"
                    }
                  </small>
                </div>
              ) : group.isSecondPart ? (
                <span 
                  className="px-3 py-2 rounded-pill d-inline-flex align-items-center gap-2"
                  style={{
                    backgroundColor: "#8B5CF6", 
                    color: "#FFFFFF", 
                    fontSize: "13px",
                    fontWeight: "500"
                  }}
                >
                  <Icon icon="mdi:weather-night" style={{ fontSize: 16 }} />
                  Fin shift nuit ({group.originalDate} → {group.endDate})
                </span>
              ) : (
                <span 
                  className="px-3 py-2 rounded-pill d-inline-flex align-items-center gap-2"
                  style={{
                    backgroundColor: "#3B82F6", 
                    color: "#FFFFFF", 
                    fontSize: "13px",
                    fontWeight: "500"
                  }}
                >
                  <Icon icon="mdi:weather-night" style={{ fontSize: 16 }} />
                  Équipe de nuit
                </span>
              )}
            </div>
          )}
          <CheckboxStatutGroup statut={statut} setStatut={setStatut} disabled={mode === "voir"} />

          {/* Date du pointage */}
          <div className="time-field-group mb-3">
            <label htmlFor="datePointage">Date du pointage</label>
            <DatePicker
              id="datePointage"
              selected={datePointage}
              onChange={date => {
                // Si pas RH, on ne permet pas de changer la date
                if (!isRH) return;
                setDatePointage(date);
              }}
              dateFormat="yyyy-MM-dd"
              className="form-control"
              disabled={mode === "voir" || !isRH}
            />
          </div>

          {/* Inputs heure entrée/sortie */}
          {statut !== "absent" && (
            <div className="pair-time-fields mb-3">
              <div className="time-field-group">
                <label htmlFor="heureEntree">Heure d'entrée</label>
                <div style={{ position: 'relative' }}>
                  <DatePicker
                    id="heureEntree"
                    selected={stringToDate(heureEntree)}
                    onChange={(date) => setHeureEntree(dateToString(date))}
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={5}
                    timeCaption="Entrée"
                    dateFormat="HH:mm"
                    timeFormat="HH:mm"
                    className="form-control"
                    placeholderText="Heure d'entrée"
                    disabled={mode === "voir"}
                    minTime={shouldLimitTime ? minHeure : undefined}
                    maxTime={shouldLimitTime ? maxHeure : undefined}
                  />
                  {heureEntree && !(mode === "voir") && (
                    <Icon
                      icon="mdi:close"
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        cursor: 'pointer',
                        color: '#666',
                        fontSize: 18
                      }}
                      onClick={() => setHeureEntree("")}
                      title="Effacer l'heure d'entrée"
                    />
                  )}
                </div>
              </div>
              <div className="time-field-group">
                <label htmlFor="heureSortie">Heure de sortie</label>
                <div style={{ position: 'relative' }}>
                  <DatePicker
                    id="heureSortie"
                    selected={stringToDate(heureSortie)}
                    onChange={(date) => setHeureSortie(dateToString(date))}
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={5}
                    timeCaption="Sortie"
                    dateFormat="HH:mm"
                    timeFormat="HH:mm"
                    className="form-control"
                    placeholderText="Heure de sortie"
                    disabled={mode === "voir"}
                    minTime={shouldLimitTime ? minHeure : undefined}
                    maxTime={shouldLimitTime ? maxHeure : undefined}
                  />
                  {heureSortie && !(mode === "voir") && (
                    <Icon
                      icon="mdi:close"
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        cursor: 'pointer',
                        color: '#666',
                        fontSize: 18
                      }}
                      onClick={() => setHeureSortie("")}
                      title="Effacer l'heure de sortie"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Heures supplémentaires (affichage seulement) */}
          {statut !== "absent" && heureEntree && heureSortie && (
            <div className="time-field-group mb-3">
              <label htmlFor="heuresSupplementaires">Heures supplémentaires</label>
              <input
                id="heuresSupplementaires"
                type="number"
                className="form-control"
                value={calcOvertime(heureEntree, heureSortie, datePointage)}
                disabled
                style={{
                  backgroundColor: "#f8f9fa",
                  color: "#6c757d"
                }}
                placeholder="0"
              />
            </div>
          )}

          {/* Liste employés */}
          {renderEmployes()}

          {/* Boutons */}
          <div className="d-flex gap-2 mt-4">
            <button className="btn btn-danger rounded-pill flex-grow-1 w-100" onClick={onClose}>
              Annuler
            </button>
            {mode !== "voir" && (
              <>
                <button
                  className="btn btn-primary rounded-pill flex-grow-1 w-100"
                  onClick={handleSave}
                  disabled={!canSave || isSubmitting}
                >
                  {isSubmitting ? "Enregistrement..." : "Sauvegarder"}
                </button>
                {["ajout", "modifierTous", "modifierPerso"].includes(mode) && canValider && (
                 <button
                 className="btn btn-success rounded-pill flex-grow-1 w-100"
                 onClick={async () => {
                   if (isSubmitting) return;
                   setIsSubmitting(true);
               
                   Swal.fire({
                     title: 'Veuillez patienter...',
                     text: 'Validation en cours',
                     allowOutsideClick: false,
                     didOpen: () => {
                       Swal.showLoading();
                     }
                   });
               
                   try {
                     await onSave(
                       {
                         statut,
                         heureEntree: statut === "absent" ? null : heureEntree,
                         heureSortie: statut === "absent" ? null : heureSortie,
                         date: datePointage,
                         employes: employesSelectionnes,
                         overtimeHours:
                           statut === "absent"
                             ? 0
                             : calcOvertime(heureEntree, heureSortie, datePointage),
                         isNightShift: group?.isNightShift,
                         nightShiftIds: group?.nightShiftIds
                       },
                       { valider: true }
                     );
                     Swal.close();
                   } catch (e) {
                     console.error('Erreur validation:', e);
                     Swal.fire('Erreur', "Une erreur s'est produite", 'error');
                   } finally {
                     setIsSubmitting(false);
                   }
                 }}
                 disabled={!canValider || isSubmitting}
               >
                 {isSubmitting ? "Validation..." : "Valider"}
               </button>
               
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointageModalMobile;
