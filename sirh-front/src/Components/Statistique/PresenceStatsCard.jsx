import React from 'react';
import { Icon } from '@iconify/react';
import { useSelector } from 'react-redux';

const STATUS_COLORS = {
  present: {
    iconColor: "#00b894",
    textColor: "text-success",
    bgColor: "bg-success",
    buttonColor: "btn-outline-success"
  },
  absent: {
    iconColor: "#e17055", 
    textColor: "text-danger",
    bgColor: "bg-danger",
    buttonColor: "btn-outline-danger"
  },
  retard: {
    iconColor: "#fdcb6e",
    textColor: "text-warning", 
    bgColor: "bg-warning",
    buttonColor: "btn-outline-warning"
  },
  default: {
    iconColor: "#6c5ce7",
    textColor: "text-secondary",
    bgColor: "bg-secondary", 
    buttonColor: "btn-outline-secondary"
  }
};

function getType(label) {
  if (label.toLowerCase().includes('présent')) return 'present';
  if (label.toLowerCase().includes('absent')) return 'absent';
  if (label.toLowerCase().includes('retard')) return 'retard';
  return 'default';
}

const PresenceStatsCard = ({ label, value, icon, percentage, showDetailsBtn, onDetailsClick, selectorClass }) => {
  const type = getType(label);
  const color = STATUS_COLORS[type] || STATUS_COLORS.default;
  const roles = useSelector((state) => state.auth.roles || []);
  const isRH = roles.includes('RH') || roles.includes('Gest_RH');

  return (
    <div className={`card border-0 shadow-sm rounded-4 h-100 ${selectorClass}`} style={{ transition: 'all 0.3s ease' }}>
      <div className="card-body p-3 text-center">
        {/* Icône */}
        <div 
          className={`${color.bgColor} bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3`}
          style={{ width: '60px', height: '60px' }}
        >
          <Icon icon={icon} style={{ fontSize: '2rem', color: color.iconColor }} />
        </div>

        {/* Valeur principale */}
        <h4 className={`fw-bold mb-1 ${color.textColor}`} style={{ fontSize: '2.5rem', lineHeight: '1' }}>
          {value}
          {percentage && (
            <small className="fs-6 ms-2 opacity-75">{percentage}%</small>
          )}
        </h4>

        {/* Label */}
        <small className="text-muted fw-semibold">{label}</small>

        {/* Bouton détails */}
        {isRH && showDetailsBtn && value > 0 && (
          <button
            className={`btn btn-sm ${color.buttonColor} mt-3 w-100`}
            onClick={onDetailsClick}
            style={{ borderRadius: '0.75rem', transition: 'all 0.3s ease' }}
          >
            <Icon icon="mdi:eye" className="me-1" />
            Voir détails
          </button>
        )}
      </div>
    </div>
  );
};

export const PresenceStatsContainer = ({ children }) => {
  return (
    <div className="row g-3">
      {React.Children.map(children, (child, index) => (
        <div key={index} className="col-md-4">
          {child}
        </div>
      ))}
      
      {/* CSS pour les effets hover */}
      <style jsx>{`
        .card {
          transition: all 0.3s ease;
        }
        .card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1) !important;
        }
        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default PresenceStatsCard;