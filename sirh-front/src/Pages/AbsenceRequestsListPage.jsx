import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAbsenceRequests, deleteAbsenceRequests, updateAbsenceRequestStatus } from '../Redux/Slices/absenceRequestSlice';
import { fetchUsers } from '../Redux/Slices/userSlice';
import { Icon } from '@iconify/react/dist/iconify.js';
import Swal from 'sweetalert2';
import api from '../config/axios';
import { toErrorMessage } from '../utils/errorUtils';

const AbsenceRequestsListPage = (props) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: absenceRequests, status: loading, error } = useSelector((state) => state.absenceRequests);
  const { items: users } = useSelector((state) => state.users);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const roles = useSelector((state) => state.auth.roles || []);
  const currentUser = useSelector((state) => state.auth.user);

  // Fonctions d'aide pour les permissions
  const canEditRequest = (request) => {
    // RH peut toujours modifier
    if (roles.includes('RH') || roles.includes('Gest_RH')) {
      return true;
    }
    
    // Utilisateur normal peut modifier ses propres demandes seulement si pas encore approuvées ou annulées
    if (currentUser && request.user_id === currentUser.id) {
      return !['approuvé', 'validé', 'annulé'].includes(request.statut?.toLowerCase());
    }
    
    return false;
  };

  const canDeleteRequest = (request) => {
    // RH peut supprimer toutes les demandes non approuvées et non annulées
    if (roles.includes('RH') || roles.includes('Gest_RH')) {
      // Ne pas permettre la suppression des demandes approuvées, validées ou annulées
      return !['approuvé', 'validé', 'annulé'].includes(request.statut?.toLowerCase());
    }
    
    // Utilisateur normal peut supprimer ses propres demandes seulement si pas encore approuvées ou annulées
    if (currentUser && request.user_id === currentUser.id) {
      return !['approuvé', 'validé', 'annulé'].includes(request.statut?.toLowerCase());
    }
    
    return false;
  };

  const canCancelRequest = (request) => {
    // Seul RH peut annuler les demandes approuvées
    return (roles.includes('RH') || roles.includes('Gest_RH')) && 
           ['approuvé', 'validé'].includes(request.statut?.toLowerCase());
  };

  const canValidateRequest = (request) => {
    // Seul RH peut valider les demandes en attente
    return (roles.includes('RH') || roles.includes('Gest_RH')) && 
           request.statut?.toLowerCase() === 'en_attente';
  };

  const handleValidate = async (id) => {
    const result = await Swal.fire({
      title: 'Valider la demande?',
      text: "Cette demande sera marquée comme validée.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, valider!',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      try {
        await dispatch(updateAbsenceRequestStatus({ id, status: 'validé' })).unwrap();
        Swal.fire(
          'Validé!',
          'La demande a été validée avec succès.',
          'success'
        );
        dispatch(fetchAbsenceRequests());
      } catch (error) {
        Swal.fire(
          'Erreur!',
          'Une erreur est survenue lors de la validation.',
          'error'
        );
      }
    }
  };

  const handleDownloadTemplate = async (request) => {
    try {
      let endpoint = '';
      let fileName = '';
      
      // Déterminer l'endpoint selon le type de demande
      if (request.type?.toLowerCase() === 'congé') {
        endpoint = `/conge/pdf/${request.id}`;
        fileName = `conge_${request.user_id}_${new Date().toISOString().split('T')[0]}.pdf`;
      } else if (request.type?.toLowerCase() === 'attestationtravail') {
        endpoint = `/attestation-travail/pdf/${request.id}`;
        fileName = `attestation_travail_${request.user_id}_${new Date().toISOString().split('T')[0]}.pdf`;
      } else {
        Swal.fire('Info', 'Type de demande non supporté pour le téléchargement.', 'info');
        return;
      }

      const response = await api.get(endpoint, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      const templateType = request.type?.toLowerCase() === 'congé' ? 'congé' : 'attestation de travail';
      Swal.fire('Succès', `Document ${templateType} téléchargé avec succès`, 'success');
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      Swal.fire('Erreur', 'Erreur lors du téléchargement du document', 'error');
    }
  };

  const handleDownloadAttestation = (url) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      Swal.fire('Info', 'Aucune attestation disponible pour cette demande.', 'info');
    }
  };

  const handleDownloadJustification = (justificationUrl) => {
    if (justificationUrl) {
      window.open(justificationUrl, '_blank');
    } else {
      Swal.fire('Info', 'Aucune justification disponible pour cette demande.', 'info');
    }
  };

  const resetFilters = () => {
    setType('');
    setStatus('');
    setSearchTerm('');
    setSortField('');
    setSortDirection('asc');
    setCurrentPage(1);
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

  const getStatusPriority = (statut) => {
    const statusLower = statut?.toLowerCase();
    switch (statusLower) {
      case 'en_attente': return 1;
      case 'validé': return 2;
      case 'annulé': 
      case 'rejeté': return 3;
      case 'approuvé': return 4;
      default: return 5;
    }
  };

  const filteredRequests = absenceRequests.filter((request) => {
    const user = users.find(u => u.id === request.user_id);
    const userName = user ? `${user.name} ${user.prenom}`.toLowerCase() : '';
    const searchLower = searchTerm.toLowerCase();
  
    const matchesSearch = userName.includes(searchLower) || 
                         request.type.toLowerCase().includes(searchLower) ||
                         request.motif?.toLowerCase().includes(searchLower);
  
    const matchesType = !type || request.type.toLowerCase() === type.toLowerCase();
    const matchesStatus = !status || request.statut.toLowerCase() === status.toLowerCase();
    const matchesStatusProp = !props.statusFilter || props.statusFilter.length === 0 || props.statusFilter.includes(request.statut.toLowerCase());
    const matchesUserStatus = !user || (user.statut?.toLowerCase() !== "inactif");
  
    return matchesSearch && matchesType && matchesStatus && matchesStatusProp && matchesUserStatus;
  }).sort((a, b) => {
    // Tri personnalisé selon le champ sélectionné
    if (sortField === 'created_at') {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
    
    if (sortField === 'dateDebut') {
      const dateA = new Date(a.dateDebut || 0);
      const dateB = new Date(b.dateDebut || 0);
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
    
    // Tri par priorité de statut par défaut : en_attente → validé → annulé/rejeté → approuvé
    const priorityA = getStatusPriority(a.statut);
    const priorityB = getStatusPriority(b.statut);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Si même priorité, trier par date de création (plus récent en premier)
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = e.target.value === 'all' ? filteredRequests.length : parseInt(e.target.value);
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
    navigate(`/absences/${id}/edit`);
  };

  const handleDelete = async (id) => {
    const request = absenceRequests.find(r => r.id === id);
    
    // Vérification côté frontend avant la confirmation
    if (['approuvé', 'validé', 'annulé'].includes(request?.statut?.toLowerCase())) {
      Swal.fire({
        title: 'Suppression impossible',
        text: 'Les demandes approuvées, validées ou annulées ne peuvent pas être supprimées.',
        icon: 'warning',
        confirmButtonText: 'Compris'
      });
      return;
    }

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
        await dispatch(deleteAbsenceRequests([id])).unwrap();
        Swal.fire(
          'Supprimé!',
          'La demande a été supprimée avec succès.',
          'success'
        );
      } catch (error) {
        const errorMessage = error.error || 'Une erreur est survenue lors de la suppression.';
        Swal.fire(
          'Erreur!',
          errorMessage,
          'error'
        );
      }
    }
  };

  const handleCancel = async (id) => {
    const result = await Swal.fire({
      title: 'Annuler la demande?',
      text: "Cette demande sera marquée comme annulée.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff9800',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, annuler!',
      cancelButtonText: 'Retour'
    });

    if (result.isConfirmed) {
      try {
        await dispatch(updateAbsenceRequestStatus({ id, status: 'annulé' })).unwrap();
        Swal.fire(
          'Annulé!',
          'La demande a été annulée avec succès.',
          'success'
        );
      } catch (error) {
        Swal.fire(
          'Erreur!',
          'Une erreur est survenue lors de l\'annulation.',
          'error'
        );
      }
    }
  };

  function handleImportRequests(event) {
    const file = event.target.files[0];
    if (!file) return;
  
    const formData = new FormData();
    formData.append('file', file);
  
    api.post('/import-demandes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then(() => {
      Swal.fire('Succès', 'Demandes importées avec succès', 'success');
      dispatch(fetchAbsenceRequests());
    })
    .catch((error) => {
      console.error('Erreur lors de l\'importation:', error);
      Swal.fire('Erreur', 'Une erreur est survenue lors de l\'importation.', 'error');
    });
  }

  const handleBulkDelete = async () => {
    if (selectedRequests.length === 0) return;

    // Vérifier s'il y a des demandes approuvées/annulées dans la sélection
    const selectedRequestObjects = absenceRequests.filter(r => selectedRequests.includes(r.id));
    const protectedRequests = selectedRequestObjects.filter(r => 
      ['approuvé', 'validé', 'annulé'].includes(r.statut?.toLowerCase())
    );

    if (protectedRequests.length > 0) {
      Swal.fire({
        title: 'Suppression partiellement impossible',
        html: `
          <p>Les demandes approuvées, validées ou annulées ne peuvent pas être supprimées :</p>
          <ul style="text-align: left;">
            ${protectedRequests.map(r => {
              const user = users.find(u => u.id === r.user_id);
              return `<li>${user ? `${user.name} ${user.prenom}` : 'Utilisateur inconnu'} - ${r.type} (${r.statut})</li>`;
            }).join('')}
          </ul>
          <p>Voulez-vous supprimer uniquement les autres demandes ?</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Oui, supprimer les autres',
        cancelButtonText: 'Annuler'
      }).then(async (result) => {
        if (result.isConfirmed) {
          // Filtrer pour ne supprimer que les demandes non protégées
          const deletableRequests = selectedRequests.filter(id => {
            const request = absenceRequests.find(r => r.id === id);
            return !['approuvé', 'validé', 'annulé'].includes(request?.statut?.toLowerCase());
          });
          
          if (deletableRequests.length > 0) {
            try {
              await dispatch(deleteAbsenceRequests(deletableRequests)).unwrap();
              setSelectedRequests([]);
              Swal.fire(
                'Supprimé!',
                `${deletableRequests.length} demande(s) supprimée(s) avec succès.`,
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
        }
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Êtes-vous sûr?',
      text: `Vous allez supprimer ${selectedRequests.length} demande(s)!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      try {
        await dispatch(deleteAbsenceRequests(selectedRequests)).unwrap();
        setSelectedRequests([]);
        Swal.fire(
          'Supprimé!',
          'Les demandes ont été supprimées avec succès.',
          'success'
        );
      } catch (error) {
        const errorMessage = error.error || 'Une erreur est survenue lors de la suppression.';
        Swal.fire(
          'Erreur!',
          errorMessage,
          'error'
        );
      }
    }
  };

  const toggleRequestSelection = (id) => {
    setSelectedRequests(prev => 
      prev.includes(id) 
        ? prev.filter(requestId => requestId !== id)
        : [...prev, id]
    );
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
              <Icon icon="fluent:calendar-person-24-filled" style={{ fontSize: '1.5rem', color: '#6c757d' }} />
              <p className="text-muted mb-0">Chargement des demandes...</p>
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
              <p className="mb-0">Erreur lors du chargement des demandes: {toErrorMessage(error)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (statut) => {
    switch (statut?.toLowerCase()) {
      case 'en demande':
        return <span className="badge bg-info-subtle text-info">En demande</span>;
      case 'validé':
      case 'approuvé':
        return <span className="badge bg-success-subtle text-success">{statut}</span>;
      case 'rejeté':
        return <span className="badge bg-danger-subtle text-danger">{statut}</span>;
      case 'annulé':
        return <span className="badge bg-secondary-subtle text-secondary">{statut}</span>;
      case 'en_attente':
        return <span className="badge bg-warning-subtle text-warning">En attente</span>;
      default:
        return <span className="badge bg-secondary-subtle text-secondary">{statut}</span>;
    }
  };

  const getTypeBadge = (type) => {
    switch (type?.toLowerCase()) {
      case 'congé':
        return <span className="badge bg-primary-subtle text-primary">Congé</span>;
      case 'maladie':
        return <span className="badge bg-danger-subtle text-danger">Maladie</span>;
      case 'attestationtravail':
        return <span className="badge bg-info-subtle text-info">Attestation</span>;
      case 'demande document':
        return <span className="badge bg-secondary-subtle text-secondary">Demande doc</span>;
      default:
        return <span className="badge bg-secondary-subtle text-secondary">{type}</span>;
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
                      <Icon icon="fluent:calendar-person-24-filled" style={{ fontSize: '2rem' }} />
                    </div>
                    <div>
                      <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>Les demandes</h1>
                      <p className="mb-0 opacity-90">Gérez toutes les demandes et de congés</p>
                    </div>
                  </div>
                  
                  <div className="d-flex gap-2">
                    <Link 
                      to="/absences/add" 
                      className="btn btn-light d-flex align-items-center gap-2"
                    >
                      <Icon icon="fluent:add-24-filled" />
                      Nouvelle demande
                    </Link>
                    
                    {selectedRequests.length > 0 && (
                      <button 
                        className="btn btn-outline-light d-flex align-items-center gap-2"
                        onClick={handleBulkDelete}
                      >
                        <Icon icon="fluent:delete-24-filled" />
                        Supprimer ({selectedRequests.length})
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
                  <div className="col-md-2">
                    <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                      <option value="">Tous les types</option>
                      <option value="Congé">Congé</option>
                      <option value="maladie">Maladie</option>
                      <option value="AttestationTravail">Attestation de Travail</option>
                      <option value="demande document">Demande de document</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                  
                  <div className="col-md-2">
                    <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                      <option value="">Tous les statuts</option>
                      <option value="en_attente">En attente</option>
                      <option value="En demande">En demande</option>
                      <option value="validé">Validé</option>
                      <option value="rejeté">Rejeté</option>
                      <option value="approuvé">Approuvé</option>
                      <option value="annulé">Annulé</option>
                    </select>
                  </div>
                  
                  <div className="col-md-4">
                    <div className="position-relative">
                      <Icon 
                        icon="fluent:search-24-filled" 
                        className="position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"
                        style={{ fontSize: "18px" }}
                      />
                      <input
                        type="text"
                        className="form-control ps-5"
                        placeholder="Rechercher par employé, type ou motif..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {(type || status || searchTerm || sortField) && (
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
                        <th style={{ padding: '1rem' }}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedRequests(currentItems.map(request => request.id));
                              } else {
                                setSelectedRequests([]);
                              }
                            }}
                            checked={selectedRequests.length === currentItems.length && currentItems.length > 0}
                          />
                        </th>
                        <th style={{ padding: '1rem', fontWeight: '600' }}>Employé</th>
                        <th style={{ padding: '1rem', fontWeight: '600' }}>Type</th>
                        <th 
                          style={{ padding: '1rem', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('created_at')}
                          title="Cliquer pour trier par date de demande"
                        >
                          <div className="d-flex align-items-center gap-2">
                            <span>Date de demande</span>
                            {getSortIcon('created_at')}
                          </div>
                        </th>
                        <th 
                          style={{ padding: '1rem', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('dateDebut')}
                          title="Cliquer pour trier par période de début"
                        >
                          <div className="d-flex align-items-center gap-2">
                            <span>Période</span>
                            {getSortIcon('dateDebut')}
                          </div>
                        </th>
                        <th style={{ padding: '1rem', fontWeight: '600' }}>Motif</th>
                        <th style={{ padding: '1rem', fontWeight: '600' }}>Statut</th>
                        <th style={{ padding: '1rem', fontWeight: '600' }}>Documents</th>
                        <th style={{ padding: '1rem', fontWeight: '600' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((request) => {
                        const user = users.find(u => u.id === request.user_id);
                        
                        // Debug: Log pour vérifier la structure des données
                        console.log('Request data:', {
                          id: request.id,
                          justification: request.justification,
                          attestation_url: request.attestation_url,
                          type: request.type,
                          statut: request.statut
                        });
                        
                        return (
                          <tr key={request.id}>
                            <td style={{ padding: '1rem' }}>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedRequests.includes(request.id)}
                                onChange={() => toggleRequestSelection(request.id)}
                              />
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <div className="d-flex align-items-center gap-2">
                                <div 
                                  className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white"
                                  style={{ width: '32px', height: '32px', fontSize: '14px' }}
                                >
                                  {user?.name?.charAt(0) || 'U'}
                                </div>
                                <span className="fw-semibold">
                                  {user ? `${user.name} ${user.prenom}` : 'Utilisateur inconnu'}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              {getTypeBadge(request.type)}
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <div className="text-center">
                                <small className="text-muted d-block">Demandé le:</small>
                                <span className="fw-medium">
                                  {request.created_at ? new Date(request.created_at).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  }) : 'N/A'}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <div>
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <small className="text-muted">Du:</small> 
                                  <span className="fw-medium">
                                    {request.dateDebut ? new Date(request.dateDebut).toLocaleDateString('fr-FR') : 'N/A'}
                                  </span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center">
                                  <small className="text-muted">Au:</small> 
                                  <span className="fw-medium">
                                    {request.dateFin ? new Date(request.dateFin).toLocaleDateString('fr-FR') : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <span className="text-muted small">{request.motif || 'Non spécifié'}</span>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              {getStatusBadge(request.statut)}
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <div className="d-flex gap-1">
                                {/* Bouton œil pour visualiser la justification uploadée */}
                                {request.justification && request.justification !== '' && request.justification !== null && (
                                  <>
                                    <button
                                      className="btn p-0 border-0"
                                      onClick={() => {
                                        const fileUrl = `${import.meta.env.VITE_API_URL}storage/${request.justification}`;
                                        // Open in new tab with noopener noreferrer for safety
                                        window.open(fileUrl, '_blank', 'noopener,noreferrer');
                                      }}
                                      title="Visualiser justification"
                                      style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: '#f3e5f5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '4px'
                                      }}
                                    >
                                        <Icon 
                                          icon="fluent:eye-24-filled" 
                                          style={{ 
                                            fontSize: '14px',
                                            color: '#9c27b0'
                                          }} 
                                        />
                                      </button>
                                  </>
                                )}
                                
                                {/* Bouton œil pour visualiser l'attestation uploadée */}
                                {request.attestation_url && request.attestation_url !== '' && request.attestation_url !== null && (
                                  <button
                                    className="btn p-0 border-0"
                                    onClick={() => {
                                      // Vérifier si un fichier existe
                                      if (!request.attestation_url || request.attestation_url.trim() === '') {
                                        Swal.fire('Info', 'Aucune attestation disponible.', 'info');
                                        return;
                                      }

                                      // Vérifier les permissions
                                      if (!roles.includes('RH') && !roles.includes('Gest_RH')) {
                                        Swal.fire('Accès refusé', 'Vous n\'avez pas la permission de voir ce fichier.', 'error');
                                        return;
                                      }

                                      // Ouvrir dans un nouvel onglet
                                      const fileUrl = `${import.meta.env.VITE_API_URL}storage/${request.attestation_url}`;
                                      window.open(fileUrl, '_blank', 'noopener,noreferrer');
                                    }}

                                    title="Visualiser attestation"
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      backgroundColor: '#f3e5f5',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <Icon 
                                      icon="fluent:eye-24-filled" 
                                      style={{ 
                                        fontSize: '14px',
                                        color: '#9c27b0'
                                      }} 
                                    />
                                  </button>
                                )}
                                
                                {/* Bouton téléchargement OBLIGATOIRE pour congé et attestation approuvés */}
                                {(request.statut?.toLowerCase() === 'validé' || request.statut?.toLowerCase() === 'approuvé') && 
                                 (request.type?.toLowerCase() === 'congé' || request.type?.toLowerCase() === 'attestationtravail') && (
                                  <button
                                    className="btn p-0 border-0"
                                    onClick={() => handleDownloadTemplate(request)}
                                    title={`Télécharger ${request.type?.toLowerCase() === 'congé' ? 'congé' : 'attestation'}`}
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      backgroundColor: request.type?.toLowerCase() === 'congé' ? '#e1f5fe' : '#e8f5e8',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <Icon 
                                      icon="fluent:arrow-download-24-filled" 
                                      style={{ 
                                        fontSize: '14px',
                                        color: request.type?.toLowerCase() === 'congé' ? '#0288d1' : '#2e7d32'
                                      }} 
                                    />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <div className="d-flex justify-content-center gap-2">
                                {canEditRequest(request) && (
                                  <button
                                    className="btn p-0 border-0"
                                    onClick={() => handleEdit(request.id)}
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
                                )}

                                {canValidateRequest(request) && (
                                  <button
                                    className="btn p-0 border-0"
                                    onClick={() => handleValidate(request.id)}
                                    title="Valider"
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      backgroundColor: '#e8f5e9',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <Icon 
                                      icon="fluent:checkmark-24-filled" 
                                      style={{ 
                                        fontSize: '14px',
                                        color: '#4caf50'
                                      }} 
                                    />
                                  </button>
                                )}
                                
                                {canDeleteRequest(request) && (
                                  <button
                                    className="btn p-0 border-0"
                                    onClick={() => handleDelete(request.id)}
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
                                )}

                                {canCancelRequest(request) && (
                                  <button
                                    className="btn p-0 border-0"
                                    onClick={() => handleCancel(request.id)}
                                    title="Annuler"
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      backgroundColor: '#fff3e0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <Icon 
                                      icon="material-symbols:cancel-outline" 
                                      style={{ 
                                        fontSize: '14px',
                                        color: '#ff9800'
                                      }} 
                                    />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {currentItems.length === 0 && (
                  <div className="text-center py-5">
                    <div className="d-flex flex-column align-items-center gap-2 text-muted">
                      <Icon icon="fluent:calendar-search-24-filled" width={48} height={48} className="opacity-50" />
                      <span className="fw-medium">Aucune demande trouvée</span>
                      <small>Essayez de modifier vos critères de recherche</small>
                    </div>
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
                  <span className="text-muted">sur {filteredRequests.length} demandes</span>
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
        .bg-secondary-subtle {
          background-color: rgba(108, 117, 125, 0.1) !important;
        }
      `}</style>
    </div>
  );
};

export default AbsenceRequestsListPage;
