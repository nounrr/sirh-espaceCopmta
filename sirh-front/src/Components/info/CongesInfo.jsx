import React from 'react';
import { Icon } from '@iconify/react';

const CongesInfo = () => {
  return (
    <div className="container-fluid py-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card border-0 shadow-lg rounded-4">
            <div className="card-body p-5 text-center">
              <div className="mb-4">
                <Icon icon="mdi:table-account" style={{ fontSize: '4rem' }} className="text-primary" />
              </div>
              
              <h2 className="fw-bold text-primary mb-3">Soldes de Congés</h2>
              
              <p className="text-muted mb-4">
                Cette section affiche uniquement les soldes de congés de l'équipe.
                Le dashboard personnel de congés a été supprimé selon votre demande.
              </p>
              
              <div className="alert alert-success d-flex align-items-center justify-content-center">
                <Icon icon="mdi:check-circle" className="me-2" />
                <span>Navigation simplifiée : Menu → "Soldes de Congés"</span>
              </div>
              
              <div className="mt-4">
                <small className="text-muted">
                  Accessible uniquement aux RH, Chefs de Département et Chefs de Projet
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CongesInfo;
