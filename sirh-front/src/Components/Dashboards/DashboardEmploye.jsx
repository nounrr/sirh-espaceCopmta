import React from 'react'
import { Icon } from '@iconify/react';
import PointagePage from "../../Pages/PointagePage"
import AbsenceRequestsListPage from "../../Pages/AbsenceRequestsListPage"
import DepartmentsListPage from "../../Pages/DepartmentsListPage"
import PresenceDashboard from '../Statistique/PresenceDashboard'

function DashboardEmploye() {
  return (
    <>
      {/* Section Mes statistiques */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-lg rounded-4">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-3 rounded-circle bg-primary bg-opacity-10">
                    <Icon icon="mdi:account-clock" style={{ fontSize: '2rem', color: '#4facfe' }} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-1">Mes Statistiques</h5>
                    <p className="text-muted mb-0 small">Suivi de mes présences et performances</p>
                  </div>
                </div>
              </div>
              <PresenceDashboard isDashboard={true}/>
            </div>
          </div>
        </div>
      </div>

      {/* Section Mon pointage */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-lg rounded-4">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-3 rounded-circle bg-success bg-opacity-10">
                    <Icon icon="mdi:fingerprint" style={{ fontSize: '2rem', color: '#00b894' }} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-1">Mon Pointage</h5>
                    <p className="text-muted mb-0 small">Enregistrement de mes heures d'arrivée et de départ</p>
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

export default DashboardEmploye
