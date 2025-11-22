import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTypeDocs, deleteTypeDocs, createTypeDoc, updateTypeDoc } from '../Redux/Slices/typeDocSlice';
import { Icon } from '@iconify/react/dist/iconify.js';
import Swal from 'sweetalert2';
import TypeDocFormModal from '../Components/TypeDocFormModal';
import StyledTable from '../Components/Common/StyledTable';

const TypeDocsListPage = () => {
  const dispatch = useDispatch();
  const { items: typeDocs, meta, status: loading, error } = useSelector((state) => state.typeDocs);
  const [selectedTypeDocs, setSelectedTypeDocs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // default 10 per user request
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTypeDoc, setCurrentTypeDoc] = useState(null);
  // Declare contractFilter BEFORE using it in effects to avoid TDZ errors
  const [contractFilter, setContractFilter] = useState('');

  useEffect(() => {
    dispatch(fetchTypeDocs({ page: currentPage, perPage: itemsPerPage, search: searchTerm, type_contrat: contractFilter || undefined }));
  }, [dispatch, currentPage, itemsPerPage, searchTerm, contractFilter]);

  const resetFilters = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, contractFilter]);

  const currentItems = typeDocs;
  const totalPages = meta?.last_page || 1;

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleItemsPerPageChange = (e) => {
    const allCount = meta?.total || typeDocs.length || 0;
    const newItemsPerPage = e.target.value === 'all' ? allCount : parseInt(e.target.value);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) pageNumbers.push(i);
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - 4; i <= totalPages; i++) pageNumbers.push(i);
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) pageNumbers.push(i);
      }
    }
    return pageNumbers;
  };

  const handleOpenModal = (typeDoc = null) => {
    setCurrentTypeDoc(typeDoc);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentTypeDoc(null);
  };

  const handleSubmitModal = async (formData) => {
    try {
      if (currentTypeDoc) {
        await dispatch(updateTypeDoc({ ...formData, id: currentTypeDoc.id })).unwrap();
        Swal.fire('Succès!', 'Type de document mis à jour avec succès.', 'success');
      } else {
        await dispatch(createTypeDoc(formData)).unwrap();
        Swal.fire('Succès!', 'Type de document créé avec succès.', 'success');
      }
      dispatch(fetchTypeDocs());
      handleCloseModal();
    } catch (err) {
      Swal.fire('Erreur!', `Une erreur est survenue: ${err.message || 'Veuillez réessayer.'}`, 'error');
    }
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
        await dispatch(deleteTypeDocs([id])).unwrap();
        Swal.fire('Supprimé!', 'Le type de document a été supprimé avec succès.', 'success');
        dispatch(fetchTypeDocs());
      } catch (error) {
        Swal.fire('Erreur!', 'Une erreur est survenue lors de la suppression.', 'error');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTypeDocs.length === 0) {
      Swal.fire('Attention!', 'Veuillez sélectionner au moins un type de document à supprimer.', 'warning');
      return;
    }
    const result = await Swal.fire({
      title: 'Êtes-vous sûr?',
      text: `Vous êtes sur le point de supprimer ${selectedTypeDocs.length} type(s) de document. Cette action ne peut pas être annulée!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      try {
        await dispatch(deleteTypeDocs(selectedTypeDocs)).unwrap();
        setSelectedTypeDocs([]);
        Swal.fire('Supprimé!', 'Les types de document ont été supprimés avec succès.', 'success');
        dispatch(fetchTypeDocs());
      } catch (error) {
        Swal.fire('Erreur!', 'Une erreur est survenue lors de la suppression.', 'error');
      }
    }
  };

  const toggleTypeDocSelection = (id) => {
    setSelectedTypeDocs(prev => prev.includes(id) ? prev.filter(typeDocId => typeDocId !== id) : [...prev, id]);
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
              <Icon icon="fluent:document-24-filled" style={{ fontSize: '1.5rem', color: '#6c757d' }} />
              <p className="text-muted mb-0">Chargement des types de documents...</p>
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
          <div className="d-flex align-items-center">
            <Icon icon="fluent:warning-24-filled" className="me-2" />
            <div>
              <h5 className="alert-heading">Erreur de chargement</h5>
              <p className="mb-0">Erreur de chargement des types de document: {typeof error === 'string' ? error : JSON.stringify(error)}</p>
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
                      <Icon icon="fluent:document-24-filled" style={{ fontSize: '2rem' }} />
                    </div>
                    <div>
                      <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>Types de Documents</h1>
                      <p className="mb-0 opacity-90">Gérez les types de documents du système</p>
                    </div>
                  </div>
                  
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-light d-flex align-items-center gap-2"
                      onClick={() => handleOpenModal()}
                    >
                      <Icon icon="fluent:add-24-filled" />
                      Ajouter
                    </button>
                    
                    {selectedTypeDocs.length > 0 && (
                      <button 
                        className="btn btn-outline-light d-flex align-items-center gap-2"
                        onClick={handleBulkDelete}
                      >
                        <Icon icon="fluent:delete-24-filled" />
                        Supprimer ({selectedTypeDocs.length})
                      </button>
                    )}
                  </div>
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
                        placeholder="Rechercher un type de document..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="col-md-3">
                    <select className='form-select' value={contractFilter} onChange={e=>{ setContractFilter(e.target.value); setCurrentPage(1); }}>
                      <option value=''>Tous contrats</option>
                      <option value='Employe'>Employé</option>
                      <option value='Client'>Client</option>
                    </select>
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
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold mb-0">
                    Liste des Types de Documents ({currentItems.length} affiché{currentItems.length > 1 ? 's' : ''}{meta?.total ? ` / ${meta.total} au total` : ''})
                  </h5>
                </div>

                <StyledTable>
                    <thead className="table-light">
                      <tr>
                        <th>
                          <div className="form-check">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTypeDocs(currentItems.map(s => s.id));
                                } else {
                                  setSelectedTypeDocs([]);
                                }
                              }}
                              checked={selectedTypeDocs.length === currentItems.length && currentItems.length > 0}
                            />
                          </div>
                        </th>
                        <th>Type de Document</th>
                        <th>Contrat</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.length > 0 ? currentItems.map((typeDoc) => (
                        <tr key={typeDoc.id}>
                          <td>
                            <div className="form-check">
                              <input 
                                className="form-check-input" 
                                type="checkbox" 
                                checked={selectedTypeDocs.includes(typeDoc.id)} 
                                onChange={() => toggleTypeDocSelection(typeDoc.id)} 
                              />
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div 
                                className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white"
                                style={{ width: '32px', height: '32px', fontSize: '14px' }}
                              >
                                <Icon icon="fluent:document-24-filled" />
                              </div>
                              <div>
                                <div className="fw-semibold">{typeDoc.nom}</div>
                                <small className="text-muted">ID: {typeDoc.id}</small>
                              </div>
                            </div>
                          </td>
                          <td><span className='badge bg-info-subtle text-dark'>{typeDoc.type_contrat || '—'}</span></td>
                          <td className="text-center">
                            <div className="d-flex justify-content-center gap-2">
                              <button
                                className="btn p-0 border-0"
                                onClick={() => handleOpenModal(typeDoc)}
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
                                onClick={() => handleDelete(typeDoc.id)}
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
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="3" className="text-center py-5">
                            <div className="d-flex flex-column align-items-center gap-2 text-muted">
                              <Icon icon="fluent:document-search-24-filled" width={48} height={48} className="opacity-50" />
                              <span className="fw-medium">Aucun type de document trouvé</span>
                              <small>Essayez de modifier vos critères de recherche</small>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </StyledTable>

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
      </div>

      {isModalOpen && (
        <TypeDocFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleSubmitModal}
          initialData={currentTypeDoc}
        />
      )}
    </div>
  );
};

export default TypeDocsListPage;