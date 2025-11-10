import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchDepartments, deleteDepartments } from '../Redux/Slices/departementSlice';
import { Icon } from '@iconify/react/dist/iconify.js';
import Swal from 'sweetalert2';
import api from '../config/axios';
import { toErrorMessage } from '../utils/errorUtils';

const DepartmentsListPage = () => {
  const apiUrl = import.meta.env.VITE_API_URL;

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: departments, status: loading, error } = useSelector((state) => state.departments);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const roles = useSelector((state) => state.auth.roles || []);
  const isEmployee = roles.includes('Employe');

  const resetFilters = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleImportDepartments = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/import-departments', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
        Swal.fire('Succès', 'Départements importés avec succès', 'success');
        await dispatch(fetchDepartments());
      }
    } catch (error) {
      console.error('Erreur lors de l\'importation des départements:', error);
      Swal.fire('Erreur', error?.response?.data?.message || 'Une erreur est survenue lors de l\'importation.', 'error');
    }
  };
  
  const filteredDepartments = departments.filter((department) => {
    const searchLower = searchTerm.toLowerCase();
    return department.nom.toLowerCase().includes(searchLower) ||
           (department.description || '').toLowerCase().includes(searchLower);
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDepartments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = e.target.value === 'all' ? filteredDepartments.length : parseInt(e.target.value);
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
    navigate(`/departments/${id}/edit`);
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
        await dispatch(deleteDepartments([id])).unwrap();
        Swal.fire(
          'Supprimé!',
          'Le département a été supprimé avec succès.',
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
    if (selectedDepartments.length === 0) return;

    const result = await Swal.fire({
      title: 'Êtes-vous sûr?',
      text: `Vous allez supprimer ${selectedDepartments.length} département(s)!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      try {
        await dispatch(deleteDepartments(selectedDepartments)).unwrap();
        setSelectedDepartments([]);
        Swal.fire(
          'Supprimé!',
          'Les départements ont été supprimés avec succès.',
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

  const toggleDepartmentSelection = (id) => {
    setSelectedDepartments(prev => 
      prev.includes(id) 
        ? prev.filter(deptId => deptId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAllDepartments = () => {
    if (selectedDepartments.length === currentItems.length) {
      setSelectedDepartments([]);
    } else {
      setSelectedDepartments(currentItems.map(dept => dept.id));
    }
  };

  if (loading === 'loading') {
    return (
      <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <div className="d-flex align-items-center justify-content-center gap-2">
              <Icon icon="fluent:building-24-filled" style={{ fontSize: '1.5rem', color: '#6c757d' }} />
              <p className="text-muted mb-0">Chargement des départements...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
        <div className="alert alert-danger" role="alert">
          Erreur lors du chargement des départements: {toErrorMessage(error)}
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
                      <Icon icon="fluent:building-24-filled" style={{ fontSize: '2rem' }} />
                    </div>
                    <div>
                      <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>Gestion des Départements</h1>
                      <p className="mb-0 opacity-90">Organisez et gérez tous vos départements</p>
                    </div>
                  </div>
                  
                  {!isEmployee && (
                    <div className="d-flex gap-2">
                      <Link 
                        to="/departments/add" 
                        className="btn btn-light d-flex align-items-center gap-2"
                      >
                        <Icon icon="fluent:add-24-filled" />
                        Ajouter
                      </Link>
                      
                      {selectedDepartments.length > 0 && (
                        <button 
                          className="btn btn-outline-light d-flex align-items-center gap-2"
                          onClick={handleBulkDelete}
                        >
                          <Icon icon="fluent:delete-24-filled" />
                          Supprimer ({selectedDepartments.length})
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
                        onChange={handleImportDepartments}
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
                  <div className="col-md-6">
                    <div className="position-relative">
                      <Icon 
                        icon="fluent:search-24-filled" 
                        className="position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"
                        style={{ fontSize: "18px" }}
                      />
                      <input
                        type="text"
                        className="form-control ps-5"
                        placeholder="Rechercher par nom ou description..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {searchTerm && (
                    <div className="col-md-2">
                      <button
                        className="btn btn-outline-secondary d-flex align-items-center gap-2"
                        onClick={resetFilters}
                      >
                        <Icon icon="fluent:arrow-reset-24-filled" />
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                      <tr>
                        {!isEmployee && (
                          <th style={{ padding: '1rem' }}>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              onChange={toggleSelectAllDepartments}
                              checked={selectedDepartments.length === currentItems.length && currentItems.length > 0}
                            />
                          </th>
                        )}
                        <th style={{ padding: '1rem', fontWeight: '600' }}>Nom</th>
                        <th style={{ padding: '1rem', fontWeight: '600' }}>Description</th>
                        <th style={{ padding: '1rem', fontWeight: '600' }}>Date de création</th>
                        {!isEmployee && <th style={{ padding: '1rem', fontWeight: '600' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((department) => {
                        return (
                          <tr key={department.id}>
                            {!isEmployee && (
                              <td style={{ padding: '1rem' }}>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={selectedDepartments.includes(department.id)}
                                  onChange={() => toggleDepartmentSelection(department.id)}
                                />
                              </td>
                            )}
                            <td style={{ padding: '1rem' }}>
                              <div className="d-flex align-items-center gap-2">
                                <div 
                                  className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white"
                                  style={{ width: '32px', height: '32px', fontSize: '14px' }}
                                >
                                  {department.nom?.charAt(0) || 'D'}
                                </div>
                                <span className="fw-semibold">{department.nom}</span>
                              </div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <span className="text-muted">{department.description || 'Aucune description'}</span>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <span className="badge bg-light text-dark">
                                {new Date(department.created_at).toLocaleDateString('fr-FR')}
                              </span>
                            </td>
                            {!isEmployee && (
                              <td style={{ padding: '1rem' }}>
                                <div className="d-flex justify-content-center gap-2">
                                  <button
                                    className="btn p-0 border-0"
                                    onClick={() => handleEdit(department.id)}
                                    title="Modifier"
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      backgroundColor: '#e3f2fd',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <Icon 
                                      icon="lucide:edit" 
                                      style={{ 
                                        fontSize: '14px',
                                        color: '#2196f3'
                                      }} 
                                    />
                                  </button>
                                  <button
                                    className="btn p-0 border-0"
                                    onClick={() => handleDelete(department.id)}
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

                {currentItems.length === 0 && (
                  <div className="text-center py-5">
                    <Icon icon="fluent:building-desktop-24-filled" style={{ fontSize: '3rem', color: '#ccc' }} />
                    <p className="text-muted mt-3">Aucun département trouvé avec ces critères</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="row mt-4">
            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center">
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
                  <span className="text-muted">sur {filteredDepartments.length} départements</span>
                </div>

                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => paginate(currentPage - 1)}>
                        <Icon icon="fluent:chevron-left-24-filled" />
                      </button>
                    </li>
                    
                    {getPageNumbers().map((number) => (
                      <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => paginate(number)}>
                          {number}
                        </button>
                      </li>
                    ))}
                    
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => paginate(currentPage + 1)}>
                        <Icon icon="fluent:chevron-right-24-filled" />
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        )}
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
      `}</style>
    </div>
  );
};

export default DepartmentsListPage;
