import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchUsersTemp, deleteUsers, fetchUsers } from '../Redux/Slices/userSlice';
import { affectUsersMass } from '../Redux/Slices/userSlice'; // Le thunk d'affectation en masse
import { fetchDepartments } from '../Redux/Slices/departementSlice';
import { fetchSocietes } from '../Redux/Slices/societeSlice'; // À adapter selon ton store
import { Icon } from '@iconify/react/dist/iconify.js';
import Swal from 'sweetalert2';
import api from '../config/axios';

const TemporaireEmployesPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { UserTemp: users, status: loading, error } = useSelector((state) => state.users);
  const { items: departments } = useSelector((state) => state.departments);
  const { items: societes } = useSelector((state) => state.societes);
  const { user: currentUser } = useSelector((state) => state.auth);
  const roles = useSelector((state) => state.auth.roles || []);
  const isEmployee = roles.includes('Employe');

  // Sélection utilisateurs
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Filtres
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Affectation (mass)
  const [affectSocieteId, setAffectSocieteId] = useState('');
  const [affectDeptId, setAffectDeptId] = useState('');

  useEffect(() => {
    dispatch(fetchUsersTemp());
    dispatch(fetchDepartments());
    dispatch(fetchSocietes());
  }, [dispatch]);


  // Réinitialisation filtres
  const resetFilters = () => {
    setRole('');
    setDepartment('');
    setStatus('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Filtrage
  const filteredUsers = users.filter((user) => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTermLower) ||
      user.prenom?.toLowerCase().includes(searchTermLower) ||
      user.cin?.toLowerCase().includes(searchTermLower) ||
      user.email?.toLowerCase().includes(searchTermLower);

    const matchesRole = !role || (user.role && user.role.toLowerCase() === role.toLowerCase());
    const matchesDepartment = !department || user.departement_id === parseInt(department);
    const matchesStatus = !status || (user.statut && user.statut.toLowerCase() === status.toLowerCase());

    return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = e.target.value === 'all' ? filteredUsers.length : parseInt(e.target.value);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pageNumbers.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pageNumbers.push(i);
        }
      }
    }
    return pageNumbers;
  };

  const toggleUserSelection = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((userId) => userId !== id) : [...prev, id]
    );
  };

  // --- Bloc Affectation en masse
  const handleAffectUsersMass = () => {
    if (!affectSocieteId || !affectDeptId) {
      Swal.fire('Erreur', 'Veuillez choisir un département et une société.', 'error');
      return;
    }

    dispatch(
      affectUsersMass({
        user_ids: selectedUsers,
        departement_id: affectDeptId,
        societe_id: affectSocieteId,
      })
    )
      .unwrap()
      .then(() => {
        Swal.fire('Succès', 'Affectation réalisée avec succès !', 'success');
        setSelectedUsers([]);
        setAffectSocieteId('');
        setAffectDeptId('');
        dispatch(fetchUsersTemp());
      })
      .catch((error) => {
        Swal.fire('Erreur', error?.message || 'Erreur lors de l’affectation.', 'error');
      });
  };

  // --- UI
  if (loading === 'loading') {
    return (
      <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="d-flex align-items-center justify-content-center gap-2">
              <Icon icon="fluent:people-team-24-filled" style={{ fontSize: '1.5rem', color: '#6c757d' }} />
              <p className="text-muted mb-0">Chargement des employés temporaires...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="alert alert-danger" role="alert">
              <div className="d-flex align-items-center">
                <Icon icon="fluent:warning-24-filled" className="me-2" />
                <div>
                  <h5 className="alert-heading">Erreur de chargement</h5>
                  <p className="mb-0">Une erreur est survenue lors du chargement des utilisateurs.</p>
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
        {/* En-tête */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="card-body p-4" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-3 rounded-circle bg-white bg-opacity-20">
                      <Icon icon="fluent:people-clock-24-filled" style={{ fontSize: '2rem' }} />
                    </div>
                    <div>
                      <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1 text-center" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>Employés Temporaires</h1>
                      <p className="mb-0 opacity-90 text-center">Gérez les employés temporaires en attente d'affectation</p>
                    </div>
                  </div>
                  
                  {!isEmployee && (
                    <div className="d-flex gap-2">
                      <Link 
                        to="/users/add" 
                        className="btn btn-light d-flex align-items-center gap-2"
                      >
                        <Icon icon="fluent:person-add-24-filled" />
                        Ajouter
                      </Link>
                      
                      {selectedUsers.length > 0 && (
                        <button 
                          className="btn btn-outline-light d-flex align-items-center gap-2"
                          onClick={() => setSelectedUsers([])}
                        >
                          <Icon icon="fluent:dismiss-24-filled" />
                          Désélectionner ({selectedUsers.length})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <div className="row g-3 align-items-center">
                  <div className="col-md-3">
                    <div className="position-relative">
                      <Icon icon="fluent:search-24-filled" className="position-absolute start-0 top-50 translate-middle-y ms-3 text-secondary" />
                      <input
                        type="text"
                        className="form-control ps-5"
                        placeholder="Rechercher un employé..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <select
                      className="form-select"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="">Tous les rôles</option>
                      <option value="Employe">Employé</option>
                      <option value="Chef_Dep">Chef département</option>
                      <option value="RH">RH</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <select
                      className="form-select"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      <option value="">Tous les départements</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <select
                      className="form-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="">Tous les statuts</option>
                      <option value="Actif">Actif</option>
                      <option value="Inactif">Inactif</option>
                      <option value="Congé">Congé</option>
                      <option value="Malade">Malade</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <button
                      className="btn btn-outline-danger w-100"
                      onClick={resetFilters}
                      title="Réinitialiser les filtres"
                    >
                      <Icon icon="fluent:arrow-reset-24-filled" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bloc d'affectation */}
        {!isEmployee && selectedUsers.length > 0 && (
          <div className="row mb-4">
            <div className="col-12">
              <div className="card border-0 shadow-sm rounded-4 border-start border-start-4 border-success">
                <div className="card-body p-4">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <Icon icon="fluent:people-settings-24-filled" className="text-success" style={{ fontSize: '1.5rem' }} />
                      <h6 className="mb-0 fw-bold">Affecter {selectedUsers.length} employé{selectedUsers.length > 1 ? 's' : ''} sélectionné{selectedUsers.length > 1 ? 's' : ''}</h6>
                    </div>
                    <button
                      className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                      onClick={() => setSelectedUsers([])}
                    >
                      <Icon icon="fluent:dismiss-24-filled" />
                      Annuler
                    </button>
                  </div>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Société</label>
                      <select className="form-select" value={affectSocieteId} onChange={e => setAffectSocieteId(e.target.value)}>
                        <option value="">Choisir une société</option>
                        {societes.map(s => (
                          <option key={s.id} value={s.id}>{s.nom}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Département</label>
                      <select className="form-select" value={affectDeptId} onChange={e => setAffectDeptId(e.target.value)}>
                        <option value="">Choisir un département</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.nom}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 d-flex align-items-end">
                      <button
                        className="btn btn-success w-100 d-flex align-items-center justify-content-center gap-2"
                        onClick={handleAffectUsersMass}
                      >
                        <Icon icon="fluent:person-arrow-right-24-filled" />
                        Affecter
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tableau des employés */}
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold mb-0">
                    Employés Temporaires ({filteredUsers.length} employé{filteredUsers.length > 1 ? 's' : ''})
                  </h5>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>
                          <div className="form-check">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              onChange={() => {
                                if (selectedUsers.length === filteredUsers.length) {
                                  setSelectedUsers([]);
                                } else {
                                  setSelectedUsers(filteredUsers.map(u => u.id));
                                }
                              }}
                              checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                            />
                          </div>
                        </th>
                        <th>Employé</th>
                        <th>CIN</th>
                        <th>Département</th>
                        <th>Société</th>
                        <th className="text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((user) => {
                        const departmentObj = departments.find(d => d.id === user.departement_id);
                        const societeObj = societes.find(s => s.id === user.societe_id);
                        
                        return (
                          <tr key={user.id}>
                            <td>
                              <div className="form-check">
                                <input 
                                  className="form-check-input" 
                                  type="checkbox" 
                                  checked={selectedUsers.includes(user.id)} 
                                  onChange={() => toggleUserSelection(user.id)} 
                                />
                              </div>
                            </td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div className="position-relative">
                                  <div 
                                    className="rounded-circle position-absolute"
                                    style={{ 
                                      width: '40px', 
                                      height: '40px', 
                                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                      opacity: '0.3'
                                    }}
                                  ></div>
                                  <div 
                                    className="rounded-circle d-flex align-items-center justify-content-center text-dark position-relative"
                                    style={{ 
                                      width: '40px', 
                                      height: '40px', 
                                      fontSize: '16px',
                                      fontWeight: '600'
                                    }}
                                  >
                                    {user.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div 
                                    className="position-absolute bottom-0 end-0 bg-warning rounded-circle"
                                    style={{ width: '12px', height: '12px' }}
                                    title="Temporaire"
                                  ></div>
                                </div>
                                <div>
                                  <div className="fw-semibold text-primary d-flex align-items-center gap-1">
                                    <Icon icon="fluent:person-24-filled" style={{ fontSize: '14px' }} />
                                    {user.name} {user.prenom}
                                  </div>
                                  <small className="text-muted d-flex align-items-center gap-1">
                                    <Icon icon="fluent:number-symbol-24-filled" style={{ fontSize: '10px' }} />
                                    ID: {user.id}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-info-subtle text-info d-flex align-items-center gap-1 w-auto">
                                <Icon icon="fluent:card-24-filled" style={{ fontSize: '12px' }} />
                                {user.cin || 'Non renseigné'}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-primary-subtle text-primary d-flex align-items-center gap-1 w-auto">
                                <Icon icon="fluent:building-24-filled" style={{ fontSize: '12px' }} />
                                {departmentObj ? departmentObj.nom : 'Non assigné'}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-success-subtle text-success d-flex align-items-center gap-1 w-auto">
                                <Icon icon="fluent:organization-24-filled" style={{ fontSize: '12px' }} />
                                {societeObj ? societeObj.nom : 'Non assigné'}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="badge bg-warning text-dark d-flex align-items-center justify-content-center gap-1">
                                <Icon icon="fluent:clock-24-filled" style={{ fontSize: '12px' }} />
                                Temporaire
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredUsers.length === 0 && (
                  <div className="text-center py-5">
                    <Icon icon="fluent:people-search-24-filled" style={{ fontSize: '4rem', color: '#e9ecef' }} />
                    <p className="text-muted mt-3 fw-medium">Aucun employé temporaire trouvé</p>
                    <p className="text-muted small">Essayez de modifier vos filtres de recherche</p>
                  </div>
                )}

                {/* Pagination */}
                <div className="d-flex justify-content-between align-items-center mt-4">
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted">Afficher</span>
                    <select 
                      className="form-select form-select-sm w-auto"
                      value={itemsPerPage}
                      onChange={handleItemsPerPageChange}
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="all">Tous</option>
                    </select>
                    <span className="text-muted">entrées</span>
                  </div>

                  <div className="d-flex gap-2 align-items-center">
                    {/* Previous Button */}
                    <button
                      className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <Icon icon="fluent:arrow-left-24-filled" />
                      <span className="d-none d-md-inline">Précédent</span>
                    </button>

                    {/* Numéros de page : affichés uniquement sur desktop */}
                    <div className="d-none d-sm-flex gap-1">
                      {getPageNumbers().map((number) => (
                        <button
                          key={number}
                          className={`btn btn-sm ${
                            currentPage === number ? "btn-primary" : "btn-outline-secondary"
                          }`}
                          onClick={() => paginate(number)}
                        >
                          {number}
                        </button>
                      ))}
                    </div>

                    {/* Mobile : select de pages */}
                    <div className="d-flex d-sm-none align-items-center gap-1">
                      <select
                        value={currentPage}
                        onChange={e => paginate(Number(e.target.value))}
                        className="form-select form-select-sm"
                        style={{ width: 70 }}
                      >
                        {getPageNumbers().map((number) => (
                          <option value={number} key={number}>{number}</option>
                        ))}
                      </select>
                      <span style={{ fontSize: 13 }}>/ {totalPages}</span>
                    </div>

                    {/* Next Button */}
                    <button
                      className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <span className="d-none d-md-inline">Suivant</span>
                      <Icon icon="fluent:arrow-right-24-filled" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CSS pour les animations */}
        <style jsx>{`
          .card {
            transition: all 0.3s ease;
          }
          .card:hover {
            transform: translateY(-2px);
          }
          .table tbody tr:hover {
            background-color: rgba(0, 123, 255, 0.05);
          }
          .badge.w-auto {
            width: fit-content !important;
          }
          .bg-success-subtle {
            background-color: rgba(25, 135, 84, 0.1) !important;
          }
          .bg-danger-subtle {
            background-color: rgba(220, 53, 69, 0.1) !important;
          }
          .bg-warning-subtle {
            background-color: rgba(255, 193, 7, 0.1) !important;
          }
          .bg-primary-subtle {
            background-color: rgba(13, 110, 253, 0.1) !important;
          }
          .bg-info-subtle {
            background-color: rgba(13, 202, 240, 0.1) !important;
          }
        `}</style>
      </div>
    </div>
  );
};

export default TemporaireEmployesPage;
