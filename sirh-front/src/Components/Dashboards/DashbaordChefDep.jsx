import React from 'react'
import { Icon } from '@iconify/react';
import PointagePage from "../../Pages/PointagePage"
import AbsenceRequestsListPage from "../../Pages/AbsenceRequestsListPage"
import DepartmentsListPage from "../../Pages/DepartmentsListPage"
import PresenceDashboard from '../Statistique/PresenceDashboard'

function DashbaordChefDep() {
  return (
    <>
      {/* Section Statistiques de présence */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-lg rounded-4">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-3 rounded-circle bg-info bg-opacity-10">
                    <Icon icon="mdi:chart-donut" style={{ fontSize: '2rem', color: '#74b9ff' }} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-1">Statistiques d'Équipe</h5>
                    <p className="text-muted mb-0 small">Vue d'ensemble des performances de votre département</p>
                  </div>
                </div>
              </div>
              <PresenceDashboard isDashboard={true}/>
            </div>
          </div>
        </div>
      </div>

      {/* Section Pointage */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-lg rounded-4">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-3 rounded-circle bg-success bg-opacity-10">
                    <Icon icon="mdi:clock-check" style={{ fontSize: '2rem', color: '#00b894' }} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-1">Gestion des Pointages</h5>
                    <p className="text-muted mb-0 small">Suivi et validation des horaires de l'équipe</p>
                  </div>
                </div>
              </div>
              <PointagePage/>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default DashbaordChefDep
