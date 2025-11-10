import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchDepartments } from '../Redux/Slices/departementSlice';
import UpdateDepartmentForm from '../Components/forms/UpdateDepartmentForm';
import { Icon } from '@iconify/react';
import Swal from 'sweetalert2';

const DepartmentUpdatePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { items: departments, status: loading, error } = useSelector((state) => state.departments);

  useEffect(() => {
    dispatch(fetchDepartments());
  }, [dispatch]);

  const department = departments.find(d => d.id === parseInt(id));

  const handleSuccess = () => {
    Swal.fire(
      'Succès!',
      'Le département a été mis à jour avec succès.',
      'success'
    ).then(() => {
      navigate('/departments');
    });
  };

  if (loading === 'loading') {
    return (
      <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="text-muted">Chargement du département...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
        <div className="container-fluid px-4">
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="card border-0 shadow-lg rounded-4">
                <div className="card-body p-4 text-center">
                  <div className="mb-4">
                    <Icon icon="mdi:alert-circle" style={{ fontSize: '4rem', color: '#dc3545' }} />
                  </div>
                  <h4 className="fw-bold mb-3 text-danger">Erreur de chargement</h4>
                  <p className="text-muted mb-4">Une erreur est survenue lors du chargement des données.</p>
                  <button 
                    className="btn btn-primary d-flex align-items-center gap-2 mx-auto px-4"
                    onClick={() => navigate('/departments')}
                    style={{ 
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none'
                    }}
                  >
                    <Icon icon="mdi:arrow-left" />
                    Retour à la liste
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
        <div className="container-fluid px-4">
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="card border-0 shadow-lg rounded-4">
                <div className="card-body p-4 text-center">
                  <div className="mb-4">
                    <Icon icon="mdi:alert-circle" style={{ fontSize: '4rem', color: '#f39c12' }} />
                  </div>
                  <h4 className="fw-bold mb-3 text-warning">Département non trouvé</h4>
                  <p className="text-muted mb-4">Le département que vous recherchez n'existe pas ou a été supprimé.</p>
                  <button 
                    className="btn btn-primary d-flex align-items-center gap-2 mx-auto px-4"
                    onClick={() => navigate('/departments')}
                    style={{ 
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none'
                    }}
                  >
                    <Icon icon="mdi:arrow-left" />
                    Retour à la liste
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <div className="container-fluid px-4">
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
              <div className="card-body p-4" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <div className="d-flex align-items-center gap-3">
                  <div className="p-3 rounded-circle bg-white bg-opacity-20">
                    <Icon icon="mdi:office-building-outline" style={{ fontSize: '2rem' }} />
                  </div>
                  <div>
                    <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>Modifier le département</h1>
                    <p className="mb-0 opacity-90">Mise à jour des informations du département</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="row">
          <div className="col-12">
            <UpdateDepartmentForm
              department={department}
              onSuccess={handleSuccess}
            />
          </div>
        </div>
      </div>

      {/* CSS pour les animations */}
      <style jsx>{`
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
      `}</style>
    </div>
  );
};

export default DepartmentUpdatePage; 