import React from 'react';
import { useNavigate } from 'react-router-dom';
import PointageForm from '../Components/forms/PointageForm';

const AddPointagePage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Redirect to pointages list after a short delay
    setTimeout(() => {
      navigate('/pointages');
    }, 2000);
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="page-title-box d-flex align-items-center justify-content-between">
            <h4 className="mb-0">Ajouter un pointage</h4>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-12">
          <PointageForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
};

export default AddPointagePage; 