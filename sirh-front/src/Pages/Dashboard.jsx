import React from 'react';
import { useSelector } from 'react-redux';
import { Icon } from '@iconify/react';

import DashboardRh from '../Components/Dashboards/DashboardRh';
import DashbaordChefDep from '../Components/Dashboards/DashbaordChefDep';
import DashboardEmploye from '../Components/Dashboards/DashboardEmploye';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const roles = useSelector((state) => state.auth.roles || []);
  const userInfo = useSelector((state) => state.auth.user || {});

  // Définir le titre et l'icône selon le rôle
  const getDashboardInfo = () => {
    if (roles.includes("RH") || roles.includes("Gest_RH")) {
      return {
        title: roles.includes("Gest_RH") ? "Tableau de Bord Gestionnaire RH" : "Tableau de Bord RH",
        subtitle: "Gestion des ressources humaines et supervision",
        icon: "mdi:account-supervisor",
        gradient: "linear-gradient(135deg, #667eea 0%, #264ba2 100%)"
      };
    }
    if (roles.includes("Chef_Dep") || roles.includes("Chef_Département") || roles.includes("chef_dep") || roles.includes("CHEF_DEP")) {
      return {
        title: "Tableau de Bord Chef de Département",
        subtitle: "Gestion d'équipe et suivi des performances",
        icon: "mdi:account-tie",
        gradient: "linear-gradient(135deg, rgb(255 106 16) 0%, rgb(242, 23, 108) 100%)"
      };
    }
    if (roles.includes("Gest_Projet")) {
      return {
        title: "Tableau de Bord Gestionnaire de Projet",
        subtitle: "Coordination et suivi des projets",
        icon: "mdi:account-group",
        gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
      };
    }
    if (roles.includes("Employe")) {
      return {
        title: "Mon Tableau de Bord",
        subtitle: "Suivi de mes activités et présences",
        icon: "mdi:account-circle",
        gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
      };
    }
    return {
      title: "Tableau de Bord",
      subtitle: "Bienvenue dans votre espace de travail",
      icon: "mdi:view-dashboard",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    };
  };

  const dashboardInfo = getDashboardInfo();

  return (
    <div className="container-fluid py-2 py-md-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <div className="container-fluid px-2 px-md-4">
        {/* En-tête stylisé */}
        <div className="row mb-3 mb-md-4">
          <div className="col-12">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="card-body p-3 p-md-4" style={{ 
                background: dashboardInfo.gradient,
                color: 'white'
              }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-2 p-md-3 rounded-circle bg-white bg-opacity-20">
                      <Icon icon={dashboardInfo.icon} style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }} />
                    </div>
                    <div>
                      <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>
                        {dashboardInfo.title}
                      </h1>
                      <p className="mb-0 opacity-90 fs-6 fs-md-5 d-none d-sm-block">
                        {dashboardInfo.subtitle}
                      </p>
                      {userInfo.nom && (
                        <small className="opacity-75 fs-7 fs-md-6">
                          Bonjour {userInfo.prenom} {userInfo.nom}
                        </small>
                      )}
                    </div>
                  </div>
                  
                  <div className="d-flex gap-2 d-none d-md-block">
                    <div className="text-end">
                      <small className="opacity-75 d-block">Dernière connexion</small>
                      <small className="opacity-90">
                        {new Date().toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu du dashboard selon le rôle */}
        {(() => {
          if (roles.includes("RH") || roles.includes("Gest_RH")) return <DashboardRh />;
          if (roles.includes("Chef_Dep") || roles.includes("Chef_Département") || roles.includes("chef_dep") || roles.includes("CHEF_DEP")) return <DashbaordChefDep />;
          if (roles.includes("Gest_Projet")) return <DashbaordChefDep />; // Utilise le dashboard Chef_Dep pour l'instant
          if (roles.includes("Employe")) return <DashboardEmploye />;
          return <DashboardEmploye />; // Dashboard par défaut
        })()}
      </div>
    </div>
  )
};

export default Dashboard;
