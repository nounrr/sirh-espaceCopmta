import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import BulkAddDepartmentForm from '../Components/forms/BulkAddDepartmentForm';

const BulkAddDepartmentPage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Redirect to departments list after a short delay
    setTimeout(() => {
      navigate('/departments');
    }, 2000);
  };

  return (
    <div className="container-fluid py-3 py-md-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <div className="container-fluid px-2 px-md-4">
        {/* Bouton de retour */}
        <button 
          className="btn d-flex align-items-center gap-2 mb-3"
          onClick={() => navigate(-1)}
          type="button"
          style={{ 
            background: 'none',
            border: 'none',
            color: '#6c757d',
            padding: '0.5rem 0'
          }}
        >
          <Icon icon="mdi:arrow-left" />
          Retour
        </button>

        {/* En-tête de la page */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="card-body p-3 p-md-4" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <div className="d-flex align-items-center gap-2 gap-md-3">
                  <div className="p-2 p-md-3 rounded-circle bg-white bg-opacity-20">
                    <Icon icon="mdi:office-building-plus" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }} />
                  </div>
                  <div className="flex-grow-1 min-width-0">
                    <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>Ajouter plusieurs départements</h1>
                    <p className="mb-0 opacity-90 text-truncate">Création en lot de nouveaux départements</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="row">
          <div className="col-12">
            <BulkAddDepartmentForm onSuccess={handleSuccess} />
          </div>
        </div>
      </div>

      {/* CSS pour les animations */}
      <style>{`
        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          transition: transform 0.2s ease;
        }
        .card {
          transition: all 0.3s ease;
        }
        .card:hover {
          transform: translateY(-2px);
        }
        
        /* Media queries pour mobile */
        @media (max-width: 576px) {
          .text-truncate {
            max-width: 200px;
          }
        }
      `}</style>
    </div>
  );
};

export default BulkAddDepartmentPage; 