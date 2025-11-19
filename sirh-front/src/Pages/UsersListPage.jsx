import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchUsers, deleteUsers } from '../Redux/Slices/userSlice';
import { fetchDepartments } from '../Redux/Slices/departementSlice';
import { Icon } from '@iconify/react/dist/iconify.js';
import Swal from 'sweetalert2';
import api from '../config/axios';
import UserPointagesPeriode from '../Components/Statistique/UserPointagesPeriode';

const UsersListPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: users, meta, status: loading, error } = useSelector((state) => state.users);
  const { items: departments } = useSelector((state) => state.departments);
  const { user: currentUser } = useSelector((state) => state.auth); // Ajout de l'utilisateur connecté
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // default 10 per user request
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const roles = useSelector((state) => state.auth.roles || []);
  const isRH = roles.includes('RH') || roles.includes('Gest_RH');

  const [userPointagesOpenId, setUserPointagesOpenId] = useState(null);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setUserPointagesOpenId(null);
    };
    if (userPointagesOpenId) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userPointagesOpenId]);

  useEffect(() => {
    dispatch(fetchUsers({ page: currentPage, perPage: itemsPerPage, search: searchTerm }));
    dispatch(fetchDepartments());
  }, [dispatch, currentPage, itemsPerPage, searchTerm]);
  
  // Ajouter la fonction de réinitialisation des filtres
  const resetFilters = () => {
    setRole('');
    setDepartment('');
    setStatus('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Ajout de la fonction de filtrage
  const filteredUsers = users.filter((user) => {
  const searchTermLower = searchTerm.toLowerCase();
  const matchesSearch = 
    (user.name || '').toLowerCase().includes(searchTermLower) ||
    (user.prenom || '').toLowerCase().includes(searchTermLower) ||
    (user.cin || '').toLowerCase().includes(searchTermLower) ||
    (user.email || '').toLowerCase().includes(searchTermLower);

  const matchesRole = !role || user.role.toLowerCase() === role.toLowerCase();
  const matchesDepartment = !department || user.departement_id === parseInt(department);
  const matchesStatus = !status || user.statut.toLowerCase() === status.toLowerCase();
  return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
});


  // Les éléments actuels correspondent aux utilisateurs de la page courante renvoyés par l'API,
  // filtrés côté client par rôle/département/statut/type si nécessaire.
  const currentItems = filteredUsers;
  const totalPages = meta?.last_page || 1;

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = e.target.value === 'all' ? (meta?.total || 50) : parseInt(e.target.value);
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

  const handleEdit = (id) => {
    // Empêcher la modification si c'est l'utilisateur connecté
    if (currentUser && currentUser.id === id) {
      Swal.fire({
        title: 'Action non autorisée',
        text: 'Vous ne pouvez pas modifier votre profil depuis cette page. Veuillez utiliser la page de profil.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }
    navigate(`/users/${id}/edit`);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Êtes-vous sûr?',
      text: "Cette action ne peut pas être annulée!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      try {
        await dispatch(deleteUsers([id])).unwrap();
        Swal.fire(
          'Supprimé!',
          'L\'utilisateur a été supprimé avec succès.',
          'success'
        );
      } catch (error) {
        Swal.fire(
          'Erreur!',
          'Une erreur est survenue lors de la suppression.',
          'error'
        );
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) {
      Swal.fire(
        'Attention!',
        'Veuillez sélectionner au moins un utilisateur à supprimer.',
        'warning'
      );
      return;
    }

    const result = await Swal.fire({
      title: 'Êtes-vous sûr?',
      text: `Vous êtes sur le point de supprimer ${selectedUsers.length} utilisateur(s). Cette action ne peut pas être annulée!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      try {
        await dispatch(deleteUsers(selectedUsers)).unwrap();
        setSelectedUsers([]);
        Swal.fire(
          'Supprimé!',
          'Les utilisateurs ont été supprimés avec succès.',
          'success'
        );
      } catch (error) {
        Swal.fire(
          'Erreur!',
          'Une erreur est survenue lors de la suppression.',
          'error'
        );
      }
    }
  };

  const toggleUserSelection = (id) => {
    setSelectedUsers(prev => 
      prev.includes(id) 
        ? prev.filter(userId => userId !== id)
        : [...prev, id]
    );
  };

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
              <p className="text-muted mb-0">Chargement des employés...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && users.length === 0) {
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
  

  const handleImport = async (e) => {
    const file = e.target.files[0]; 
  
    if (!file) {
      Swal.fire('Erreur', 'Veuillez sélectionner un fichier', 'error');
      return;
    }
  
    const formData = new FormData();
    formData.append('file', file);
  
    try {
      const response = await api.post('/import-employes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      // Cas normal : succès HTTP 200
      if (response.status === 200) {
        Swal.fire('Succès', 'Fichier importé avec succès', 'success');
        await dispatch(fetchUsers());
      }
    } catch (error) {
      const status = error?.response?.status;
  
      // ✅ Si le backend retourne 204 No Content ou 302 Redirect, on considère que l'import est OK
      if (status === 204 || status === 302 || !error.response) {
        Swal.fire('Import réussi', 'Employés importés (avec redirection ou sans réponse explicite).', 'success');
        await dispatch(fetchUsers());
      } else {
        console.error('Erreur lors de l’importation des employés:', error);
        Swal.fire('Erreur', error?.response?.data?.message || 'Une erreur est survenue lors de l’importation.', 'error');
      }
    }
  };
  
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
                      <Icon icon="fluent:people-team-24-filled" style={{ fontSize: '2rem' }} />
                    </div>
                    <div>
                      <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>Gestion des Employés</h1>
                      <p className="mb-0 opacity-90">Gérez et suivez tous vos employés</p>
                    </div>
                  </div>
                  
                  {isRH && (
  <div className="d-flex align-items-center flex-wrap gap-2">
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
        onClick={handleBulkDelete}
      >
        <Icon icon="fluent:delete-24-filled" />
        Supprimer ({selectedUsers.length})
      </button>
    )}
    
    <button
      className="btn btn-outline-light d-flex align-items-center gap-2"
      onClick={() => document.getElementById('fileInput').click()}
    >
      <Icon icon="fluent:arrow-upload-24-filled" />
      Importer
    </button>
    
    <input
      type="file"
      id="fileInput"
      className="d-none"
      accept=".xlsx, .xls, .csv"
      onChange={handleImport}
    />
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
                  <div className="col-md-4">
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

        {/* Tableau des employés */}
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold mb-0">
                    Liste des Employés ({currentItems.length} affiché{currentItems.length > 1 ? 's' : ''}{meta?.total ? ` / ${meta.total} au total` : ''})
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
                                if (selectedUsers.length === currentItems.length) {
                                  setSelectedUsers([]);
                                } else {
                                  const visibleIds = currentItems.map(user => user.id);
                                  setSelectedUsers(visibleIds);
                                }
                              }}
                              checked={selectedUsers.length === currentItems.length && currentItems.length > 0}
                            />
                          </div>
                        </th>
                        <th>Employé</th>
                        <th>Email</th>
                        <th>Rôle</th>
                        <th>Fonction</th>
                        <th>Département</th>
                        <th>Type</th>
                        <th className="text-center">Statut</th>
                        {isRH && <th className="text-center">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((user) => {
                        const department = departments.find(d => d.id === user.departement_id);
                        const isCurrentUser = currentUser && currentUser.id === user.id;
                        
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
                                    {user.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div 
                                    className="position-absolute bottom-0 end-0 bg-success rounded-circle"
                                    style={{ width: '12px', height: '12px' }}
                                    title={`Statut: ${user.statut}`}
                                  ></div>
                                </div>
                                <div>
                                  <div 
                                    className="fw-semibold text-primary d-flex align-items-center gap-1"
                                    onClick={() => setUserPointagesOpenId(user.id)}
                                    style={{ cursor: "pointer" }}
                                    title="Voir le détail des pointages"
                                  >
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
                            <td>{user.email}</td>
                            <td>
                              <span className={`badge d-flex align-items-center gap-1 ${
                                user.role === 'RH' ? 'bg-danger-subtle text-danger' :
                                user.role === 'Chef_Dep' ? 'bg-warning-subtle text-warning' :
                                'bg-primary-subtle text-primary'
                              }`}>
                                <Icon icon={
                                  user.role === 'RH' ? 'fluent:crown-24-filled' :
                                  user.role === 'Chef_Dep' ? 'fluent:person-star-24-filled' :
                                  'fluent:person-circle-24-filled'
                                } style={{ fontSize: '12px' }} />
                                {user.role}
                              </span>
                            </td>
                            <td>{user.fonction || 'N/A'}</td>
                            <td>
                              <span className="badge bg-light text-dark d-flex align-items-center gap-1">
                                <Icon icon="fluent:building-24-filled" style={{ fontSize: '12px' }} />
                                {department ? department.nom : 'Non assigné'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge d-flex align-items-center gap-1 ${
                                user.typeContrat === 'Permanent' ? 'bg-success-subtle text-success' : 'bg-info-subtle text-info'
                              }`}>
                                <Icon icon={
                                  user.typeContrat === 'Permanent' ? 'fluent:certificate-24-filled' : 'fluent:clock-24-filled'
                                } style={{ fontSize: '12px' }} />
                                {user.typeContrat || 'N/A'}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={`badge d-flex align-items-center justify-content-center gap-1 ${
                                user.statut === 'Actif' ? 'bg-success' :
                                user.statut === 'Inactif' ? 'bg-secondary' :
                                user.statut === 'Congé' ? 'bg-warning' :
                                'bg-danger'
                              }`}>
                                <Icon icon={
                                  user.statut === 'Actif' ? 'fluent:checkmark-circle-24-filled' :
                                  user.statut === 'Inactif' ? 'fluent:dismiss-circle-24-filled' :
                                  user.statut === 'Congé' ? 'fluent:calendar-24-filled' :
                                  'fluent:heart-pulse-24-filled'
                                } style={{ fontSize: '12px' }} />
                                {user.statut}
                              </span>
                            </td>
                            {isRH && (
                              <td className="text-center">
                                <div className="d-flex justify-content-center gap-2">
                                  <button
                                    className="btn p-0 border-0"
                                    onClick={() => handleEdit(user.id)}
                                    title={isCurrentUser ? "Utilisez la page de profil pour modifier vos informations" : "Modifier"}
                                    disabled={isCurrentUser}
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      backgroundColor: isCurrentUser ? '#e9ecef' : '#e3f2fd',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <Icon 
                                      icon="lucide:edit" 
                                      style={{ 
                                        fontSize: '14px',
                                        color: isCurrentUser ? '#6c757d' : '#2196f3'
                                      }} 
                                    />
                                  </button>
                                  <button
                                    className="btn p-0 border-0"
                                    onClick={() => handleDelete(user.id)}
                                    title="Supprimer"
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      backgroundColor: '#ffebee',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <Icon 
                                      icon="mingcute:delete-2-line" 
                                      style={{ 
                                        fontSize: '14px',
                                        color: '#f44336'
                                      }} 
                                    />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredUsers.length === 0 && (
                  <div className="text-center py-5">
                    <Icon icon="fluent:people-search-24-filled" style={{ fontSize: '4rem', color: '#e9ecef' }} />
                    <p className="text-muted mt-3 fw-medium">Aucun employé trouvé avec ces critères</p>
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
      
      {/* Modal d'affichage des pointages */}
<div
  className={`modal fade ${userPointagesOpenId ? 'show d-block' : ''}`}
  tabIndex="-1"
  style={{ background: userPointagesOpenId ? 'rgba(0,0,0,0.5)' : 'transparent' }}
  aria-modal={userPointagesOpenId ? 'true' : undefined}
  role="dialog"
>
  <div className="modal-dialog modal-xl">
    <div 
      className="modal-content border-0 shadow-lg"
      style={{ borderRadius: '16px', overflow: 'hidden' }}
    >
      <div 
        className="modal-header border-0 p-0"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div className="w-100 p-4">
          <div className="d-flex justify-content-between align-items-center text-white">
            <div className="d-flex align-items-center gap-3">
              <div 
                className="d-flex align-items-center justify-content-center rounded-circle"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                  width: '48px', 
                  height: '48px' 
                }}
              >
                <Icon icon="fluent:clock-24-filled" width={24} height={24} />
              </div>
              <div>
                <h4 className="mb-1 fw-bold">
                  {userPointagesOpenId && (() => {
                    const user = users.find(u => u.id === userPointagesOpenId);
                    return user ? `Pointages de ${user.name} ${user.prenom}` : 'Pointages Utilisateur';
                  })()}
                </h4>
                <p className="mb-0 opacity-75">Détail des présences et absences</p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-light btn-sm d-flex align-items-center justify-content-center rounded-circle border-0"
              onClick={() => setUserPointagesOpenId(null)}
              style={{ width: '40px', height: '40px' }}
            >
              <Icon icon="fluent:dismiss-24-filled" width={20} height={20} />
            </button>
          </div>
        </div>
      </div>
      <div className="modal-body p-0">
        {userPointagesOpenId && (
          <UserPointagesPeriode 
            userId={userPointagesOpenId} 
            onClose={() => setUserPointagesOpenId(null)}
          />
        )}
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

export default UsersListPage;