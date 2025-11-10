import React from "react";
import './CheckboxStatutGroup.css'; //    À créer ou compléter (voir plus bas)
import { Icon } from "@iconify/react";

const statutOptions = [
  { value: "present", label: "Présent", color: "#20a97c" },
  { value: "retard", label: "En retard", color: "#ffa400" },
  { value: "absent", label: "Absent", color: "#df3154" },
];

const CheckboxStatutGroup = ({ statut, setStatut, disabled }) => (
  <div className="badges-row">
    {statutOptions.map(opt => (
      <button
        key={opt.value}
        type="button"
        className={
          "badge-statut" +
          (statut === opt.value ? " selected" : "")
        }
        style={{
          borderColor: statut === opt.value ? "fff" : opt.color,
          color: statut === opt.value ? "#fff" : opt.color,
          background: statut === opt.value ? opt.color : "#f6f9fc"
        }}
        onClick={() => setStatut(opt.value)}
        disabled={disabled}
      >
        {opt.label}
        {statut === opt.value && (
            <Icon icon="mdi:check-circle" className="check-icon" style={{ marginLeft: 8 }} />

        )}
      </button>
    ))}
  </div>
);

export default CheckboxStatutGroup;
