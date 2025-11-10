import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers } from '../Redux/Slices/userSlice';
import UserForm from '../Components/forms/UserForm';
const UserFormPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const isEdit = !!id;
  const { items: users } = useSelector(state => state.users);
  const { user: currentUser } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isEdit && currentUser && parseInt(id) === currentUser.id) {
      Swal.fire({
        title: 'Accès refusé',
        text: 'Vous ne pouvez pas modifier votre profil depuis cette page. Veuillez utiliser la page de profil.',
        icon: 'error',
        confirmButtonText: 'OK'
      }).then(() => {
        navigate('/view-profile');
      });
    }
  }, [id, currentUser, isEdit, navigate]);
  React.useEffect(() => {
    if (isEdit) {
      dispatch(fetchUsers());
    }
  }, [dispatch, isEdit]);

  const handleSuccess = () => {
    // Redirect to users list after a short delay
    setTimeout(() => {
      navigate('/users');
    }, 2000);
  };

  const user = isEdit ? users.find(u => u.id === parseInt(id)) : null;

  return (
    <div className="container-fluid">
     
      <div className="row">
        <div className="col-12">
          <UserForm
            initialValues={user || {}}
            isEdit={isEdit}
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  );
};

export default UserFormPage; 