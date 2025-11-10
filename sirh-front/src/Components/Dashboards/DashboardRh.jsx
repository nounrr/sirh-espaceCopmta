import React from 'react'
import { Icon } from '@iconify/react';
import UsersListPage from "../../Pages/UsersListPage"
import AbsenceRequestsListPage from "../../Pages/AbsenceRequestsListPage"
import DepartmentsListPage from "../../Pages/DepartmentsListPage"
import PresenceDashboard from '../Statistique/PresenceDashboard'

function DashboardRh() {
  return (
    <>
      {/* Section Statistiques de présence */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-lg rounded-4">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-3 rounded-circle bg-primary bg-opacity-10">
                    <Icon icon="mdi:chart-line" style={{ fontSize: '2rem', color: '#6c5ce7' }} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-1">Statistiques de Présence</h5>
                    <p className="text-muted mb-0 small">Analyse en temps réel des présences et performances de l'équipe</p>
                  </div>
                </div>
              </div>
              <PresenceDashboard />
            </div>
          </div>
        </div>
      </div>

      {/* Section Demandes d'absence */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-lg rounded-4">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-3 rounded-circle bg-warning bg-opacity-10">
                    <Icon icon="mdi:calendar-alert" style={{ fontSize: '2rem', color: '#fdcb6e' }} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-1">Demandes d'Absence</h5>
                    <p className="text-muted mb-0 small">Gestion et suivi des demandes en attente et validées</p>
                  </div>
                </div>
              </div>
              <AbsenceRequestsListPage statusFilter={['validé', 'en_attente']} className="mb-2" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default DashboardRh
