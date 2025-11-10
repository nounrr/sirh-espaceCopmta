import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useSelector } from "react-redux";

const menuData = [
  {
    icon: "fluent:home-24-filled",
    to: "/",
    label: "Dashboard",
    roles: ["RH", "Chef_Dep", "Chef_Chant", "Chef_Projet", "Employe", "Gest_RH", "Gest_Projet"], // tous
    direct: true
  },
  {
    icon: "fluent:people-24-filled",
    label: "Employés",
    options: [
      { icon: "fluent:people-list-24-filled", to: "/users", label: "Liste", roles: ["RH", "Chef_Dep", "Chef_Chant", "Gest_RH"] },
      { icon: "fluent:people-team-24-filled", to: "/users/temp", label: "Temporaire", roles: ["RH", "Gest_RH", "Chef_Dep", "Chef_Chant"] },
      { icon: "fluent:person-add-24-filled", to: "/users/add", label: "Ajouter", roles: ["RH", "Gest_RH", "Chef_Dep", "Chef_Chant"] }
    ]
  },
  {
    icon: "fluent:clock-24-filled",
    to: "/pointages",
    label: "Pointages",
    roles: ["RH", "Chef_Dep", "Chef_Chant", "Employe", "Gest_RH"],
    direct: true
  },
  {
    icon: "fluent:calendar-person-24-filled",
    label: "Demandes",
    options: [
      { icon: "fluent:clipboard-task-list-ltr-24-filled", to: "/absences", label: "Liste Demandes", roles: ["RH", "Chef_Dep", "Chef_Chant", "Employe", "Gest_RH"] },
      { icon: "fluent:calendar-24-filled", to: "/absences/calendar", label: "Calendrier Des Demandes", roles: ["RH", "Chef_Dep", "Chef_Chant", "Gest_RH"] },
      { icon: "fluent:calendar-add-24-filled", to: "/absences/add", label: "Ajouter Une Demande", roles: ["RH", "Chef_Dep", "Chef_Chant", "Employe", "Gest_RH"] },
      { icon: "fluent:table-24-filled", to: "/conges/soldes", label: "Soldes Congés", roles: ["RH", "Chef_Dep", "Chef_Chant", "Chef_Projet", "Employe", "Gest_RH"] }
    ]
  },
  {
    icon: "fluent:document-24-filled",
    label: "Documents",
    options: [
      { icon: "fluent:document-table-24-filled", to: "/type-docs", label: "Types des documents", roles: ["RH", "Gest_RH"] },
      { icon: "fluent:folder-24-filled", to: "/documents", label: "Liste Documents", roles: ["RH", "Gest_RH"] }
    ]
  },
  {
    icon: "fluent:task-list-square-24-filled",
    label: "Gestion Projets",
    roles: ["RH", "Chef_Dep", "Chef_Chant", "Chef_Projet", "Employe", "Gest_RH"],
    excludeRoles: ["Gest_Projet"],
    options: [
      {
        icon: "fluent:board-24-filled",
        to: "/todo/phone",
        label: "TODO Phone",
        roles: ["RH", "Chef_Dep", "Chef_Chant", "Chef_Projet", "Employe", "Gest_RH"],
        excludeRoles: ["Gest_Projet"]
      },
      {
        icon: "fluent:folder-open-24-filled",
        to: "/projets-rapport",
        label: "Rapport des projets",
        roles: ["RH", "Chef_Dep", "Chef_Chant", "Chef_Projet", "Employe", "Gest_RH"],
        excludeRoles: ["Gest_Projet"]
      }
    ]
  },
  {
    icon: "fluent:data-bar-vertical-24-filled",
    label: "Reporting",
    options: [
      { icon: "fluent:data-bar-vertical-24-filled", to: "/statistiques", label: "Statistiques", roles: ["RH", "Chef_Dep", "Chef_Chant", "Chef_Projet", "Employe", "Gest_RH"] },
      { icon: "fluent:clock-toolbox-24-filled", to: "/pointagedetails", label: "Pointage Details", roles: ["RH", "Chef_Dep", "Chef_Chant", "Chef_Projet", "Employe"] },
      { icon: "fluent:document-table-arrow-right-24-filled", to: "/export", label: "Excel Export", roles: ["RH", "Gest_RH"] }
    ]
  },
  {
    icon: "fluent:money-24-filled",
    label: "Paie",
    options: [
      { icon: "fluent:money-24-filled", to: "/salaires", label: "Salaires", roles: ["RH"] },
      { icon: "fluent:money-calculator-24-regular", to: "/charges-personnel", label: "Charge Personnel", roles: ["RH"] }
    ]
  },
  {
    icon: "fluent:news-24-filled",
    label: "Communications",
    options: [
      {
        icon: "fluent:news-24-filled",
        to: "/publications",
        label: "Publications",
        roles: ["RH", "Chef_Dep", "Chef_Chant", "Chef_Projet", "Employe", "Gest_RH", "Gest_Projet"]
      },
      {
        icon: "fluent:add-square-24-filled",
        to: "/publications/nouveau",
        label: "Nouvelle publication",
        roles: ["RH", "Gest_RH"]
      },
      {
        icon: "fluent:poll-24-filled",
        to: "/sondages",
        label: "Sondages",
        roles: ["Chef_Dep", "Chef_Chant", "Chef_Projet", "Employe", "Gest_Projet"]
      }
    ]
  }
];

const BottomMenu = () => {
  const [openIdx, setOpenIdx] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const roles = useSelector((state) => state.auth.roles || []);
  const isGestProjetOnly = roles.length === 1 && roles.includes("Gest_Projet");

  const gestProjetMenuData = [
    {
      icon: "fluent:task-list-square-24-filled",
      to: "/todo/phone",
      label: "Gestion Projet",
      direct: true
    },
    {
      icon: "fluent:folder-open-24-filled",
      to: "/projets-rapport",
      label: "Rapport des projets",
      direct: true
    }
  ];

  useEffect(() => {
    setOpenIdx(null);
  }, [location.pathname]);

  // 1. Filtrer le menuData selon les rôles de l'utilisateur
  const filteredMenuData = (isGestProjetOnly ? gestProjetMenuData : menuData)
    .map(item => {
      if (item.excludeRoles && item.excludeRoles.some(role => roles.includes(role))) {
        return null;
      }
      if (!item.options) {
        if (!item.roles || item.roles.some(role => roles.includes(role))) return item;
        return null;
      }
      const filteredOptions = item.options.filter(opt =>
        (!opt.excludeRoles || !opt.excludeRoles.some(role => roles.includes(role))) &&
        (!opt.roles || opt.roles.some(role => roles.includes(role)))
      );
      if (filteredOptions.length > 0) {
        return { ...item, options: filteredOptions };
      }
      return null;
    })
    .filter(Boolean);

  const handleIconClick = (idx, item) => {
            if (item.direct && item.to) {
      navigate(item.to);
      setOpenIdx(null);
    } else {
      setOpenIdx(openIdx === idx ? null : idx);
    }
  };

  const handleOptionClick = (to) => {
    navigate(to);
    setOpenIdx(null);
  };

  const isActive = (path) => location.pathname === path;

  // hauteur du menu bas
  const FOOTER_HEIGHT = 60;

  return (
    <>
     <nav
  className="navbar rounded-top-5 fixed-bottom bg-white border-top shadow-sm d-md-none"
  style={{
    zIndex: 1050,
    height: 60,
    transition: "all 0.3s ease",
    overflowX: "auto",           // ← scroll horizontal
    overflowY: "hidden",
    WebkitOverflowScrolling: "touch",
    padding: "8px 6px"
  }}
>
  <div
    className="d-flex"
    style={{
      gap: 6,
      whiteSpace: "nowrap",      // ← tout sur UNE ligne
    }}
  >
        {filteredMenuData.map((item, idx) => (
          <div key={idx} className="d-inline-block">
            <button
              type="button"
              className={`btn btn-circle btn-light p-2 me-1 border-0 shadow-none ${isActive(item.to) || openIdx === idx ? "bg-primary-subtle" : ""}`}
              style={{
                transition: "all 0.2s",
                outline: "none",
                transform: isActive(item.to) || openIdx === idx ? "scale(1.1)" : "scale(1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              onClick={() => handleIconClick(idx, item)}
            >
              <Icon
                icon={item.icon}
                className={`fs-3 ${isActive(item.to) || openIdx === idx ? "text-primary" : "text-secondary"}`}
              />
            </button>
          </div>
        ))}
        </div>
      </nav>

      {openIdx !== null && filteredMenuData[openIdx]?.options && (
        <>
          {/* Overlay, mais on laisse passer les clics sur le popover */}
          <div
            className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-25"
            style={{ zIndex: 1040, backdropFilter: "blur(3px)" }}
            onClick={() => setOpenIdx(null)}
          />

          {/* Popover menu (juste au-dessus du menu bas) */}
          <div
            className="position-fixed start-50 translate-middle-x d-md-none"
            style={{
              bottom: FOOTER_HEIGHT + 14, // 14px de marge au-dessus du menu
              zIndex: 1051,
              minWidth: 220,
              maxWidth: 340,
              animation: "fadeSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
            onClick={e => e.stopPropagation()} // Empêche la fermeture si on clique dans le popover
          >
            <div className="bg-white rounded-3 border shadow p-2">
              {filteredMenuData[openIdx].options.map((opt, oIdx) => (
                <button
                  key={oIdx}
                  onClick={() => handleOptionClick(opt.to)}
                  className={`btn d-flex align-items-center w-100 mb-1 gap-2 py-2 px-3 text-start ${isActive(opt.to) ? "bg-primary-subtle text-primary" : "text-secondary"} rounded-2`}
                  style={{
                    fontWeight: 500,
                    transition: "all 0.2s"
                  }}
                >
                  <Icon
                    icon={opt.icon}
                    className={`fs-5 me-2 ${isActive(opt.to) ? "text-primary" : ""}`}
                  />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default BottomMenu;
