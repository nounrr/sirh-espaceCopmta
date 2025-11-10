import React from 'react';
import { Icon } from '@iconify/react';
import MobilePageHeader, { MobileCardHeader, MobileModalHeader } from './MobilePageHeader';
import { useIsMobile } from '../../utils/responsiveUtils.jsx';

const MobileTestPage = () => {
  const isMobile = useIsMobile();

  const sampleActions = [
    <button key="add" className="btn btn-primary">
      <Icon icon="fluent:add-24-regular" width={16} className="me-2" />
      Ajouter
    </button>,
    <button key="edit" className="btn btn-outline-secondary">
      <Icon icon="fluent:edit-24-regular" width={16} className="me-2" />
      Modifier
    </button>,
    <button key="delete" className="btn btn-outline-danger">
      <Icon icon="fluent:delete-24-regular" width={16} className="me-2" />
      Supprimer
    </button>
  ];

  return (
    <div className="container-fluid py-4">
      {/* Test Page Header */}
      <MobilePageHeader
        title="Page de Test Mobile"
        subtitle="Démonstration du système responsif"
        breadcrumb={[
          { text: 'Accueil', icon: 'fluent:home-24-regular' },
          { text: 'Tests', icon: 'fluent:beaker-24-regular' },
          { text: 'Mobile' }
        ]}
        actions={sampleActions}
        centerOnMobile={false}
      />

      {/* Test Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6">
          <div className="card">
            <MobileCardHeader
              title="Utilisateurs"
              subtitle="Gestion des comptes utilisateurs"
              icon="fluent:people-24-regular"
              actions={[
                <button key="settings" className="btn btn-sm btn-outline-primary">
                  <Icon icon="fluent:settings-24-regular" width={14} className="me-1" />
                  Paramètres
                </button>
              ]}
            />
            <div className="card-body">
              <p className="text-muted">
                Contenu de la carte pour la gestion des utilisateurs.
                {isMobile ? ' Version mobile.' : ' Version desktop.'}
              </p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card">
            <MobileCardHeader
              title="Statistiques"
              subtitle="Données et rapports"
              icon="fluent:chart-multiple-24-regular"
              actions={[
                <button key="export" className="btn btn-sm btn-success">
                  <Icon icon="fluent:document-arrow-down-24-regular" width={14} className="me-1" />
                  Exporter
                </button>,
                <button key="refresh" className="btn btn-sm btn-outline-secondary">
                  <Icon icon="fluent:arrow-clockwise-24-regular" width={14} />
                </button>
              ]}
            />
            <div className="card-body">
              <p className="text-muted">
                Contenu de la carte pour les statistiques et rapports.
                {isMobile ? ' Optimisé pour mobile.' : ' Version complète.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Table responsif */}
      <div className="card">
        <MobileCardHeader
          title="Tableau Responsif"
          subtitle="Exemple d'adaptation mobile"
          icon="fluent:table-24-regular"
          actions={[
            <button key="filter" className="btn btn-sm btn-outline-primary">
              <Icon icon="fluent:filter-24-regular" width={14} className="me-1" />
              Filtrer
            </button>
          ]}
        />
        <div className="card-body">
          <div className={isMobile ? 'd-none' : 'table-responsive'}>
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Département</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Jean Dupont</td>
                  <td>jean.dupont@example.com</td>
                  <td>IT</td>
                  <td><span className="badge bg-success">Actif</span></td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary">
                      <Icon icon="fluent:edit-24-regular" width={14} />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* Version mobile en cartes */}
          {isMobile && (
            <div className="d-flex flex-column gap-3">
              <div className="card border-start border-primary border-3">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="card-title mb-0">Jean Dupont</h6>
                    <span className="badge bg-success">Actif</span>
                  </div>
                  <p className="card-text small text-muted mb-2">jean.dupont@example.com</p>
                  <p className="card-text small mb-3">
                    <Icon icon="fluent:building-24-regular" width={14} className="me-1" />
                    IT
                  </p>
                  <button className="btn btn-sm btn-outline-primary w-100">
                    <Icon icon="fluent:edit-24-regular" width={14} className="me-2" />
                    Modifier
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Informations device */}
      <div className="alert alert-info mt-4">
        <Icon icon="fluent:info-24-regular" width={20} className="me-2" />
        <strong>Mode actuel:</strong> {isMobile ? 'Mobile' : 'Desktop'} 
        <br />
        <strong>Largeur écran:</strong> {window.innerWidth}px
      </div>
    </div>
  );
};

export default MobileTestPage;
