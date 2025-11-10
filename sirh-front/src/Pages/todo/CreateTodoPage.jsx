
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createTodoList } from '../../Redux/Slices/todoListSlice';
import { useNavigate } from 'react-router-dom';
import { fetchUsers } from "../../Redux/Slices/userSlice";
import { fetchDepartments } from "../../Redux/Slices/departementSlice";

const CreateTodoPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.auth);
  const { items: usersList, status: usersStatus, error: usersError } = useSelector((state) => state.users);
  const { items: departments } = useSelector((state) => state.departments);
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [department, setDepartment] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);


  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchDepartments());
  }, [dispatch]);

  useEffect(() => {
    filterEmployees();
  }, [usersList, user, searchTerm, department]);

  const filterEmployees = () => {
    if (!user) return setFilteredEmployees([]);
    let employees = usersList.filter(e => e.societe_id === user.societe_id);
    if (user.role === 'chef_Dep' || user.role === 'Chef_Dep') {
      employees = employees.filter(e => e.departement_id === user.departement_id);
    } else if (user.role === 'chef_Projet' || user.role === 'Chef_Projet') {
      employees = employees.filter(e => e.project_id && user.project_id && e.project_id === user.project_id);
    }
    if (department) {
      employees = employees.filter(e => e.departement_id === parseInt(department));
    }
    if (searchTerm) {
      const st = searchTerm.toLowerCase();
      employees = employees.filter(e =>
        (e.name || '').toLowerCase().includes(st) ||
        (e.prenom || '').toLowerCase().includes(st) ||
        (e.email || '').toLowerCase().includes(st) ||
        (e.cin || '').toLowerCase().includes(st)
      );
    }
    setFilteredEmployees(employees);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(createTodoList({ title, assigned_to: assignedTo }))
      .unwrap()
      .then(() => navigate('/todo'))
      .catch((err) => alert(err));
  };


  return (
    <div className="container py-4">
      <div className="card shadow-sm mx-auto" style={{ maxWidth: 500 }}>
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">Créer une nouvelle To-Do List</h5>
        </div>
        <div className="card-body">
          {usersStatus === 'loading' && (
            <div className="d-flex justify-content-center align-items-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement des employés...</span>
              </div>
            </div>
          )}
          {usersError && (
            <div className="alert alert-danger">Erreur chargement employés : {usersError}</div>
          )}
          {usersStatus === 'succeeded' && (
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold">Titre de la liste</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="Titre de la liste"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="row g-2 mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Recherche employé</label>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Nom, prénom, email, cin"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Département</label>
                  <select
                    className="form-select"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                  >
                    <option value="">Tous les départements</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.nom}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Utilisateur assigné</label>
                <select
                  className="form-select"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  required
                >
                  <option value="">Sélectionner un employé</option>
                  {filteredEmployees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} {e.prenom} ({e.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="d-flex justify-content-end">
                <button
                  type="submit"
                  className="btn btn-primary px-4"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateTodoPage;
