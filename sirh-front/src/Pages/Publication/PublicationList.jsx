import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchPublications,
  updatePublication,
  deletePublication,
  deletePublications,
} from '../../Redux/Slices/publicationSlice';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Swal from 'sweetalert2';

const PublicationList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // publications: { items, loading, error }
  const { items: publications, loading, error } = useSelector(state => state.publications);
  // user: { role, ... }
  const user = useSelector(state => state.auth.user); // <-- adaptez selon votre store
  const isRH = user && user.role && user.role.toLowerCase().includes('rh');

  const [selectedPublications, setSelectedPublications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    dispatch(fetchPublications());
  }, [dispatch]);

 
  const filteredPublications = publications.filter(pub => {
    const searchMatch = (pub.titre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (pub.texte || '').toLowerCase().includes(searchTerm.toLowerCase());
    const typeMatch = !typeFilter || pub.type === typeFilter;
    const statusMatch = !statusFilter || pub.statut === statusFilter;
    return searchMatch && typeMatch && statusMatch;
  }).sort((a, b) => {
    // Tri personnalisé selon le champ sélectionné
    if (sortField === 'created_at') {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
    
    // Tri par défaut par date de création (plus récent en premier)
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPublications.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPublications.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setStatusFilter('');
    setSortField('');
    setSortDirection('asc');
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <Icon icon="fluent:arrow-sort-24-regular" className="text-muted" style={{ fontSize: '16px' }} />;
    }
    return sortDirection === 'asc' 
      ? <Icon icon="fluent:arrow-up-24-filled" className="text-primary" style={{ fontSize: '16px' }} />
      : <Icon icon="fluent:arrow-down-24-filled" className="text-primary" style={{ fontSize: '16px' }} />;
  };

  const togglePublicationSelection = (id) => {
    setSelectedPublications(prev =>
      prev.includes(id)
        ? prev.filter(pubId => pubId !== id)
        : [...prev, id]
    );
  };

  // Suppression multiple
  const handleBulkDelete = async () => {
    if (selectedPublications.length === 0) {
      Swal.fire('Attention!', 'Sélectionnez au moins une publication.', 'warning');
      return;
    }
    const result = await Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: `Supprimer ${selectedPublications.length} publication(s) ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    });
    if (result.isConfirmed) {
      try {
        await dispatch(deletePublications(selectedPublications)).unwrap();
        setSelectedPublications([]);
        Swal.fire('Supprimé!', 'Les publications ont été supprimées.', 'success');
      } catch (error) {
        Swal.fire('Erreur!', 'Échec de la suppression.', 'error');
      }
    }
  };

  // Utilitaire pour retrouver le nom à partir de l'ID
  const getNameById = (list, id) => {
    const item = list.find(e => e.id === id);
    return item ? (item.nom || item.name || item.raison_sociale) : id;
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
              <Icon icon="fluent:news-24-filled" style={{ fontSize: '1.5rem', color: '#6c757d' }} />
              <p className="text-muted mb-0">Chargement des publications...</p>
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
                  <p className="mb-0">Une erreur est survenue lors du chargement des publications.</p>
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
        {/* En-tête avec design moderne - optimisé mobile */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="card-body p-3 p-sm-4" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div className="d-flex align-items-center gap-2 gap-sm-3">
                    <div className="p-2 p-sm-3 rounded-circle bg-white bg-opacity-20">
                      <Icon icon="fluent:news-24-filled" style={{ fontSize: '1.5rem' }} className="d-block d-sm-none" />
                      <Icon icon="fluent:news-24-filled" style={{ fontSize: '2rem' }} className="d-none d-sm-block" />
                    </div>
                    <div>
                      <h1 className="fw-bold mb-1" style={{ fontSize: '1.3rem' }}>
                        <span className="d-block d-sm-none">Publications</span>
                        <span className="d-none d-sm-block" style={{ fontSize: '1.8rem' }}>Actualités & Sondages</span>
                      </h1>
                      <p className="mb-0 opacity-90" style={{ fontSize: '0.8rem' }}>
                        <span className="d-block d-sm-none">Gestion des publications</span>
                        <span className="d-none d-sm-block">Gestion des publications et sondages</span>
                      </p>
                    </div>
                  </div>
                  
                  {isRH && (
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-light d-flex align-items-center gap-2 rounded-3 px-4 py-2"
                        style={{ 
                          fontWeight: '600',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                        onClick={() => navigate('/publications/nouveau')}
                      >
                        <Icon icon="fluent:add-24-filled" />
                        Nouvelle publication
                      </button>
                      
                      {selectedPublications.length > 0 && (
                        <button 
                          className="btn btn-outline-light d-flex align-items-center gap-2 rounded-3 px-4 py-2"
                          style={{ 
                            fontWeight: '600',
                            transition: 'all 0.3s ease',
                            borderWidth: '2px'
                          }}
                          onClick={handleBulkDelete}
                        >
                          <Icon icon="fluent:delete-24-filled" />
                          Supprimer ({selectedPublications.length})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        </div>

        {/* Filtres avec style moderne */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <div className="row g-3 align-items-center">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold text-secondary mb-2">
                      <Icon icon="fluent:search-24-filled" className="me-2" />
                      Rechercher
                    </label>
                    <div className="position-relative">
                      <Icon icon="fluent:search-24-filled" className="position-absolute start-0 top-50 translate-middle-y ms-3 text-secondary" />
                      <input
                        type="text"
                        className="form-control form-control-lg ps-5"
                        placeholder="Rechercher une publication..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ borderRadius: '12px' }}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold text-secondary mb-2">
                      <Icon icon="fluent:filter-24-filled" className="me-2" />
                      Type
                    </label>
                    <select
                      className="form-select form-select-lg"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      style={{ borderRadius: '12px' }}
                    >
                      <option value="">Tous types</option>
                      <option value="actualite">📰 Actualité</option>
                      <option value="sondage">📊 Sondage</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold text-secondary mb-2">
                      <Icon icon="fluent:status-24-filled" className="me-2" />
                      Statut
                    </label>
                    <select
                      className="form-select form-select-lg"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={{ borderRadius: '12px' }}
                    >
                      <option value="">Tous statuts</option>
                      <option value="publie">✅ Publié</option>
                      <option value="brouillon">📝 Brouillon</option>
                      <option value="ferme">🔒 Fermé</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold text-secondary mb-2">&nbsp;</label>
                    <button
                      className="btn btn-outline-danger btn-lg w-100 d-flex align-items-center justify-content-center gap-2"
                      onClick={resetFilters}
                      title="Réinitialiser les filtres"
                      style={{ borderRadius: '12px' }}
                    >
                      <Icon icon="fluent:arrow-reset-24-filled" />
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau des publications avec style moderne */}
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                    <Icon icon="fluent:table-24-filled" className="text-primary" />
                    Publications ({filteredPublications.length} publication{filteredPublications.length > 1 ? 's' : ''})
                  </h5>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead style={{ backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
                      <tr>
                  {isRH && (
                    <th>
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="checkbox" 
                          onChange={() => {
                            if (selectedPublications.length === currentItems.length) {
                              setSelectedPublications([]);
                            } else {
                              setSelectedPublications(currentItems.map(pub => pub.id));
                            }
                          }}
                          checked={selectedPublications.length === currentItems.length && currentItems.length > 0}
                        />
                      </div>
                    </th>
                  )}
                  <th>Type</th>
                  <th>Titre</th>
                  <th>Contenu</th>
                  {isRH && <th>Statut</th>}
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('created_at')}
                    title="Cliquer pour trier par date de création"
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Date de création</span>
                      {getSortIcon('created_at')}
                    </div>
                  </th>
                  {isRH && <th className="text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {currentItems.map(pub => (
                  <tr 
                    key={pub.id}
                    style={{ cursor: 'pointer' }}
                    onClick={e => {
                      if (
                        e.target.tagName === 'INPUT' ||
                        e.target.tagName === 'SELECT' ||
                        e.target.closest('button')
                      ) return;
                      navigate(`/publications/${pub.id}`);
                    }}
                  >
                    {isRH && (
                      <td>
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            checked={selectedPublications.includes(pub.id)} 
                            onChange={() => togglePublicationSelection(pub.id)}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      </td>
                    )}
                    <td>
                      <span className={`badge d-flex align-items-center gap-1 w-auto ${
                        pub.type === 'sondage' 
                          ? 'bg-warning-subtle text-warning' 
                          : 'bg-primary-subtle text-primary'
                      }`}>
                        <Icon icon={
                          pub.type === 'sondage' 
                            ? 'fluent:poll-24-filled' 
                            : 'fluent:news-24-filled'
                        } style={{ fontSize: '12px' }} />
                        {pub.type === 'sondage' ? 'Sondage' : 'Actualité'}
                      </span>
                    </td>
                    <td>
                      <div className="fw-semibold text-primary d-flex align-items-center gap-1">
                        <Icon icon="fluent:document-text-24-filled" style={{ fontSize: '14px' }} />
                        {pub.titre}
                      </div>
                    </td>
                    <td>
                      <div className="text-truncate" style={{ maxWidth: '300px' }}>
                        {pub.texte}
                      </div>
                    </td>
                    {isRH && (
                      <td onClick={e => e.stopPropagation()}>
                        <select
                          value={pub.statut}
                          className={`form-select form-select-sm rounded-3 ${
                            pub.statut === 'publie' ? 'bg-success-subtle text-success border-success' :
                            pub.statut === 'brouillon' ? 'bg-secondary-subtle text-secondary border-secondary' :
                            'bg-danger-subtle text-danger border-danger'
                          }`}
                          style={{ minWidth: '120px', fontWeight: '600' }}
                          onChange={e => dispatch(updatePublication({ id: pub.id, statut: e.target.value }))}
                        >
                          <option value="publie">Publié</option>
                          <option value="brouillon">Brouillon</option>
                          <option value="ferme">Fermé</option>
                        </select>
                      </td>
                    )}
                    <td>
                      <span className="badge bg-light text-dark d-flex align-items-center gap-1 w-auto">
                        <Icon icon="fluent:calendar-24-filled" style={{ fontSize: '12px' }} />
                        {new Date(pub.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    {isRH && (
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <button
                            className="btn btn-sm border-0 rounded-circle d-flex align-items-center justify-content-center"
                            onClick={e => { 
                              e.stopPropagation(); 
                              navigate(`/publications/${pub.id}`); 
                            }}
                            title="Voir le détail"
                            style={{
                              width: '40px',
                              height: '40px',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              color: 'white',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                            }}
                            onMouseEnter={e => {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                            }}
                            onMouseLeave={e => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            }}
                          >
                            <Icon 
                              icon="fluent:eye-24-filled" 
                              style={{ fontSize: '16px' }} 
                            />
                          </button>
                          <button
                            className="btn btn-sm border-0 rounded-circle d-flex align-items-center justify-content-center"
                            onClick={e => {
                              e.stopPropagation();
                              Swal.fire({
                                title: 'Supprimer cette publication ?',
                                text: 'Cette action est irréversible',
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonText: 'Oui, supprimer',
                                cancelButtonText: 'Annuler',
                                confirmButtonColor: '#ef4444',
                                cancelButtonColor: '#6b7280'
                              }).then(async (result) => {
                                if (result.isConfirmed) {
                                  await dispatch(deletePublication(pub.id));
                                  Swal.fire('Supprimé !', 'La publication a été supprimée.', 'success');
                                }
                              });
                            }}
                            title="Supprimer"
                            style={{
                              width: '40px',
                              height: '40px',
                              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              color: 'white',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                            }}
                            onMouseEnter={e => {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
                            }}
                            onMouseLeave={e => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                            }}
                          >
                            <Icon 
                              icon="fluent:delete-24-filled" 
                              style={{ fontSize: '16px' }} 
                            />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPublications.length === 0 && (
            <div className="text-center py-5">
              <Icon icon="fluent:news-24-filled" style={{ fontSize: '4rem', color: '#e9ecef' }} />
              <p className="text-muted mt-3 fw-medium">Aucune publication trouvée</p>
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
                onChange={e => setItemsPerPage(parseInt(e.target.value))}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
              <span className="text-muted">entrées</span>
            </div>

            <div className="d-flex gap-2 align-items-center">
              {/* Previous Button */}
              <button
                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2 rounded-3 px-3 py-2"
                style={{ fontWeight: '600', transition: 'all 0.3s ease' }}
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <Icon icon="fluent:arrow-left-24-filled" />
                <span className="d-none d-md-inline">Précédent</span>
              </button>

              {/* Numéros de page */}
              <div className="d-none d-sm-flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    className={`btn btn-sm rounded-3 px-3 py-2 ${
                      currentPage === i + 1 
                        ? "btn-primary" 
                        : "btn-outline-primary"
                    }`}
                    style={{ 
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                      minWidth: '40px'
                    }}
                    onClick={() => paginate(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              {/* Mobile : select de pages */}
              <div className="d-flex d-sm-none align-items-center gap-2">
                <select
                  value={currentPage}
                  onChange={e => paginate(Number(e.target.value))}
                  className="form-select form-select-sm rounded-3"
                  style={{ width: '80px', fontWeight: '600' }}
                >
                  {Array.from({ length: totalPages }, (_, i) => (
                    <option value={i + 1} key={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <span className="text-muted fw-medium">/ {totalPages}</span>
              </div>

              {/* Next Button */}
              <button
                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2 rounded-3 px-3 py-2"
                style={{ fontWeight: '600', transition: 'all 0.3s ease' }}
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
  );
};

export default PublicationList;
