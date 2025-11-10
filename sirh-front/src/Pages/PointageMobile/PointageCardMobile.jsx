import React from "react";
import { Icon } from "@iconify/react";

const statutLabel = {
  present: "Présent",
  retard: "En retard",
  absent: "Absent",
};

const colorStatut = {
  present: "#16a34a",
  retard: "#f59e42",
  absent: "#ef4444",
};

const badgeBgStatut = {
  present: "rgba(22,163,74,0.12)",
  retard: "rgba(245,158,66,0.13)",
  absent: "rgba(239,68,68,0.13)",
};

const PointageCardMobile = ({
  group,
  selected,
  onSelect,
  onVoir,
  onModifierTous,
  onModifierPerso,
  onDelete,
}) => {
  const isGroupValidee = group.pointages.every((p) => Number(p.valider) === 1);

  // Border modern : violet si sélectionné, vert si validé, gris sinon
  let borderColor = "#e5e7eb";
  if (selected) borderColor = "#6366f1";
  else if (isGroupValidee) borderColor = "#16a34a";

  return (
    <div
      className="shadow p-3 rounded-4 mb-3 position-relative"
      style={{
        background: "#fcfcff",
        border: `2.2px solid ${borderColor}`,
        boxShadow: selected ? "0 0 12px 2px #6366f14a" : "0 1px 5px #bcbef31a",
        transition: "border 0.15s, box-shadow 0.15s",
        minHeight: 110,
      }}
    >
      {/* Badge validation en haut à droite */}
      <div
        className={`badge-validation ${isGroupValidee ? "valide" : "invalide"}`}
      >
        <Icon
          icon={isGroupValidee ? "mdi:check-circle" : "mdi:close-circle"}
          style={{ fontSize: 18 }}
        />
        {isGroupValidee ? "Validé" : "Non validé"}
      </div>

      {/* Checkbox custom en haut à gauche, avant tout le reste */}
      <div className="d-flex align-items-center mb-2">
        <label style={{ marginBottom: 0, position: "relative" }}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="pointage-checkbox"
            style={{ verticalAlign: "middle" }}
          />
          <span className="check-icon">
            {selected && (
              <Icon icon="mdi:check" style={{ fontSize: 18, color: "#fff", position: "absolute", left: 4, top: 4 }} />
            )}
          </span>
        </label>
        {/* (Le reste de la ligne va ici, si besoin) */}
      </div>

      {/* Badge shift de nuit si applicable */}
      {group.isNightShift && (
        <div className="mb-2">
          {group.isCompleteNightShift ? (
            <span 
              className="px-2 py-1 rounded-pill d-inline-flex align-items-center gap-1"
              style={{
                backgroundColor: "#3B82F6", 
                color: "#FFFFFF", 
                fontSize: "12px",
                fontWeight: "500"
              }}
            >
              <Icon icon="mdi:weather-night" style={{ fontSize: 14 }} />
              Équipe de nuit ({group.originalDate} → {group.endDate})
            </span>
          ) : group.isIncompleteNightShift && group.needsCompletion ? (
            <span 
              className="px-2 py-1 rounded-pill d-inline-flex align-items-center gap-1"
              style={{
                backgroundColor: "#F59E0B", 
                color: "#FFFFFF", 
                fontSize: "12px",
                fontWeight: "500"
              }}
            >
              <Icon icon="mdi:weather-night" style={{ fontSize: 14 }} />
              <Icon icon="mdi:alert-circle" style={{ fontSize: 14 }} />
              {group.showOnNextDay ? 
                `Shift nuit à compléter (depuis ${group.originalDate})` : 
                `Shift nuit incomplet (${group.originalDate})`
              }
            </span>
          ) : group.isSecondPart ? (
            <span 
              className="px-2 py-1 rounded-pill d-inline-flex align-items-center gap-1"
              style={{
                backgroundColor: "#8B5CF6", 
                color: "#FFFFFF", 
                fontSize: "12px",
                fontWeight: "500"
              }}
            >
              <Icon icon="mdi:weather-night" style={{ fontSize: 14 }} />
              Fin shift nuit ({group.originalDate} → {group.endDate})
            </span>
          ) : (
            <span 
              className="px-2 py-1 rounded-pill d-inline-flex align-items-center gap-1"
              style={{
                backgroundColor: "#3B82F6", 
                color: "#FFFFFF", 
                fontSize: "12px",
                fontWeight: "500"
              }}
            >
              <Icon icon="mdi:weather-night" style={{ fontSize: 14 }} />
              Équipe de nuit
            </span>
          )}
        </div>
      )}

      {/* Ligne heures + statut */}
      <div className="d-flex align-items-center gap-2 mb-2 flex-wrap justify-content-between">
        <span className="fw-bold">
          <Icon icon="mdi:clock-outline" style={{ fontSize: 17, color: "#6366f1", marginRight: 2 }} />
          {group.heureEntree || "--:--"}
        </span>
        <span className="fw-bold">
          <Icon icon="mdi:clock-end" style={{ fontSize: 17, color: "#6366f1", marginRight: 2 }} />
          {group.heureSortie || "--:--"}
        </span>
        {/* Badge statut */}
        <span
          className="px-3 py-1 rounded-pill"
          style={{
            background: badgeBgStatut[group.statutJour] || "#e0e7ff",
            color: colorStatut[group.statutJour] || "#475569",
            fontWeight: 600,
            fontSize: 15,
            minWidth: 86,
            textAlign: "center",
          }}
        >
          {statutLabel[group.statutJour] || "-"}
        </span>
      </div>

      {/* Liste employés */}
      <div className="fw-semibold mb-2" style={{ fontSize: 15.2, color: "#373754" }}>
        {group.users.filter(u => !["inactif", "inactive"].includes(u.statut?.toLowerCase())).map((u, index) => (
          <span key={u.id} style={{ display: 'inline-block', marginRight: 8, marginBottom: 4 }}>
            {u.name || ""} {u.prenom || ""}
            {onDelete && (
              <Icon
                icon="mdi:delete"
                style={{
                  fontSize: 16,
                  color: '#dc2626',
                  cursor: 'pointer',
                  marginLeft: 4,
                  verticalAlign: 'middle'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(group, u.id);
                }}
                title="Supprimer ce pointage"
              />
            )}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="d-flex gap-1 flex-wrap mt-2">
        <button className="btn btn-secondary btn-sm rounded-pill  " onClick={onVoir}>
          Voir
        </button>
        {!isGroupValidee && (
          <>
            <button className="btn btn-primary btn-sm rounded-pill " onClick={onModifierTous}>
              Modifier
            </button>
            <button className="btn btn-warning btn-sm rounded-pill text-light " onClick={onModifierPerso}>
              Modifier personnalisé
            </button>
          </>
        )}
      </div>
    </div>
  );
};


export default PointageCardMobile;
