import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPointages } from '../Redux/Slices/pointageSlice';
import PointageForm from '../Components/forms/PointageForm';
import { Icon } from '@iconify/react/dist/iconify.js';

const EditPointagePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { items: pointages, status: loading } = useSelector((state) => state.pointages);

  useEffect(() => {
    dispatch(fetchPointages());
  }, [dispatch]);

  const pointage = pointages.find(p => p.id === parseInt(id));

  if (loading === 'loading') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!pointage) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="alert alert-danger" role="alert">
              <div className="d-flex align-items-center">
                <Icon icon="mdi:alert-circle" className="me-2" />
                <div>
                  <h5 className="alert-heading">Pointage non trouvé</h5>
                  <p className="mb-0">Le pointage que vous recherchez n'existe pas.</p>
                </div>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={() => navigate('/pointages')}>
              Retour à la liste
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="page-title-box">
            <div className="row align-items-center">
              <div className="col-md-8">
                <h4 className="page-title mb-0">Modifier le pointage</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <PointageForm 
                initialValues={pointage}
                isEdit={true}
                onSuccess={() => navigate('/pointages')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPointagePage; 