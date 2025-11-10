import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Icon } from '@iconify/react/dist/iconify.js';
import { 
  fetchSalaires, 
  createSalaire, 
  updateSalaire, 
  deleteSalaire, 
  setFilters,
  clearError,
  fetchStatistiquesSalaires
} from '../Redux/Slices/salaireSlice';
import { fetchUsers } from '../Redux/Slices/userSlice';
import { fetchDepartments } from '../Redux/Slices/departementSlice';
import Swal from 'sweetalert2';
import './SalairePage.css';

const SalairePage = () => {
  const dispatch = useDispatch();
  const { 
    salaires, 
    loading, 
    error, 
    filters,
    statistiques 
  } = useSelector(state => state.salaires);
  const { items: users } = useSelector(state => state.users);
  const { items: departments } = useSelector(state => state.departments);
  const { user, roles } = useSelector(state => state.auth);

  const [editData, setEditData] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [showMultipleEdit, setShowMultipleEdit] = useState(false);
  const [multipleEditData, setMultipleEditData] = useState({
    salaire_base: '',
    panier: '',
    represent: '',
    transport: '',
    deplacement: '',
    salaire_net: ''
  });
  const [newSalaire, setNewSalaire] = useState({
    user_id: '',
    salaire_base: 0,
    panier: 0,
    represent: 0,
    transport: 0,
    deplacement: 0,
    salaire_net: 0
  });
  const [batchSaving, setBatchSaving] = useState(false);

  // Helper: always return a non-negative integer, fallback 0 when input is empty/invalid
  const parseNonNegativeInt = (raw) => {
    if (raw === '' || raw === null || raw === undefined) return 0;
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 0) return 0;
    return n;
  };

  // Format affichage (séparateur milliers, pas de décimales)
  const formatIntDisplay = (val) => {
    const n = parseNonNegativeInt(val);
    return n === 0 ? '0' : n.toLocaleString('fr-FR');
  };

  // Champ contrôlé custom pour gérer: effacer 0 au focus, empêcher décimales, ajouter séparateurs milliers au blur
  const SalaryInput = ({ value, onValueChange, className='', style={}, width, placeholder='0', disabled }) => {
    const [focused, setFocused] = useState(false);
    const [text, setText] = useState(() => (value === 0 ? '0' : formatIntDisplay(value)));

    // Sync externe -> interne quand value change et pas en train d'éditer
    useEffect(() => {
      if (!focused) {
        setText(value === 0 ? '0' : formatIntDisplay(value));
      }
    }, [value, focused]);

    const handleFocus = (e) => {
      setFocused(true);
      // Effacer si 0
      setText(prev => (parseNonNegativeInt(prev) === 0 ? '' : prev.replace(/\u00A0/g,' ')));
      // Sélectionner tout
      setTimeout(() => {
        try { e.target.select(); } catch(_) {}
      }, 0);
    };

    const rawToNumber = (raw) => {
      if (!raw) return 0;
      const digits = raw.toString().replace(/[^0-9]/g, '');
      if (digits === '') return 0;
      return parseInt(digits, 10) || 0;
    };

    const handleChange = (e) => {
      const raw = e.target.value;
      // Retirer tout sauf chiffres
      const cleaned = raw.replace(/[^0-9]/g, '');
      setText(cleaned);
    };

    const commit = () => {
      const num = rawToNumber(text);
      onValueChange(num);
      setText(num === 0 ? '0' : formatIntDisplay(num));
    };

    const handleBlur = () => {
      setFocused(false);
      commit();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
        e.currentTarget.blur();
      }
    };

    return (
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        className={className}
        style={{ ...style, width: width || style.width }}
        value={text}
        placeholder={placeholder}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    );
  };
  // Checkboxes de groupes deviennent des filtres d'affichage uniquement
  const [groupFilters, setGroupFilters] = useState({
    baseWith: false, baseWithout: false,
    netWith: false, netWithout: false,
    panierWith: false, panierWithout: false,
    representWith: false, representWithout: false,
    transportWith: false, transportWithout: false,
    deplacementWith: false, deplacementWithout: false
  });

  useEffect(() => {
    if (user) {
      dispatch(fetchUsers());
      dispatch(fetchDepartments());
      dispatch(fetchSalaires(filters || {}));
      dispatch(fetchStatistiquesSalaires());
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (error && error !== 'Unauthenticated.') {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: error,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSearch = (e) => {
    const search = e.target.value;
    const newFilters = { ...(filters || {}), search, page: 1 };
    dispatch(setFilters(newFilters));
  };

  const handlePageChange = (page) => {
    const newFilters = { ...(filters || {}), page };
    dispatch(setFilters(newFilters));
    dispatch(fetchSalaires(newFilters));
  };

  const handleDepartmentFilter = (e) => {
    const department = e.target.value;
    const newFilters = { ...(filters || {}), department, page: 1 };
    dispatch(setFilters(newFilters));
  };

  const handleTypeContractFilter = (e) => {
    const typeContrat = e.target.value;
    const newFilters = { ...(filters || {}), typeContrat, page: 1 };
    dispatch(setFilters(newFilters));
  };

  const handleFonctionFilter = (e) => {
    const fonction = e.target.value;
    const newFilters = { ...(filters || {}), fonction, page: 1 };
    dispatch(setFilters(newFilters));
  };

  const resetFilters = () => {
    const newFilters = { search: '', department: '', typeContrat: '', fonction: '', page: 1 };
    dispatch(setFilters(newFilters));
  };

  // Gestion de la sélection multiple
  const handleEmployeeSelect = (userSalaire) => {
    const editId = userSalaire.hasSalaire ? userSalaire.salaireId : `new-${userSalaire.user_id}`;
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(editId)) newSet.delete(editId); else newSet.add(editId);
      setShowMultipleEdit(newSet.size >= 2);
      return newSet;
    });
  };
                      

  const deleteMultipleSelected = async () => {
    const selectedWithSalary = Array.from(selectedEmployees).filter(editId => {
      const userSalaire = combinedUserSalaires.find(us => (us.hasSalaire ? us.salaireId : `new-${us.user_id}`) === editId);
      return userSalaire?.hasSalaire;
    });
    if (selectedWithSalary.length === 0) {
      Swal.fire({ icon:'warning', title:'Attention', text:'Aucun salaire à supprimer parmi la sélection' });
      return;
    }
    const result = await Swal.fire({
      title:'Confirmer la suppression',
      text:`Voulez-vous vraiment supprimer ${selectedWithSalary.length} salaire(s) ?`,
      icon:'warning',
      showCancelButton:true,
      confirmButtonColor:'#d33',
      cancelButtonColor:'#3085d6',
      confirmButtonText:'Oui, supprimer',
      cancelButtonText:'Annuler'
    });
    if (!result.isConfirmed) return;
    try {
      await Promise.all(selectedWithSalary.map(id => dispatch(deleteSalaire(id)).unwrap()));
      Swal.fire({ icon:'success', title:'Supprimé', text:`${selectedWithSalary.length} salaire(s) supprimé(s)` , toast:true, position:'top-end', timer:2000, showConfirmButton:false });
      setSelectedEmployees(new Set());
      setShowMultipleEdit(false);
      dispatch(fetchSalaires(filters || {}));
      dispatch(fetchStatistiquesSalaires());
    } catch (e) {
      Swal.fire({ icon:'error', title:'Erreur', text:'Erreur lors de la suppression multiple' });
    }
  };

  const handleMultipleEditChange = (field, value) => {
    setMultipleEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyMultipleEdit = async () => {
    if (selectedEmployees.size === 0) return;

    const result = await Swal.fire({
      title: 'Appliquer les modifications ?',
      text: `Les modifications seront appliquées à ${selectedEmployees.size} employé(s).`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, appliquer',
      cancelButtonText: 'Annuler'
    });

    if (!result.isConfirmed) return;

    try {
      setBatchSaving(true);
      
      // Appliquer les modifications à tous les employés sélectionnés
      for (const editId of selectedEmployees) {
        const userSalaire = combinedUserSalaires.find(us => 
          (us.hasSalaire ? us.salaireId : `new-${us.user_id}`) === editId
        );
        
        if (userSalaire) {
          // Préparer les nouvelles données en ne modifiant que les champs non vides
          const newData = {
            user_id: userSalaire.user_id,
            salaire_base: multipleEditData.salaire_base !== '' ? parseInt(multipleEditData.salaire_base) || 0 : (userSalaire.salaire_base || 0),
            panier: multipleEditData.panier !== '' ? parseInt(multipleEditData.panier) || 0 : (userSalaire.panier || 0),
            represent: multipleEditData.represent !== '' ? parseInt(multipleEditData.represent) || 0 : (userSalaire.represent || 0),
            transport: multipleEditData.transport !== '' ? parseInt(multipleEditData.transport) || 0 : (userSalaire.transport || 0),
            deplacement: multipleEditData.deplacement !== '' ? parseInt(multipleEditData.deplacement) || 0 : (userSalaire.deplacement || 0),
            salaire_net: multipleEditData.salaire_net !== '' ? parseInt(multipleEditData.salaire_net) || 0 : (userSalaire.salaire_net || 0),
            isNew: !userSalaire.hasSalaire
          };

          // Ajouter aux données d'édition pour traitement par saveAllEdits
          setEditData(prev => ({
            ...prev,
            [editId]: newData
          }));
        }
      }

      // Réinitialiser le formulaire de modification multiple
      setMultipleEditData({
        salaire_base: '',
        panier: '',
        represent: '',
        transport: '',
        deplacement: '',
        salaire_net: ''
      });
      setShowMultipleEdit(false);
      setSelectedEmployees(new Set());

      Swal.fire({
        icon: 'success',
        title: 'Modifications appliquées',
        text: 'Les modifications ont été appliquées. Utilisez "Enregistrer tout" pour sauvegarder.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false
      });

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Erreur lors de l\'application des modifications'
      });
    } finally {
      setBatchSaving(false);
    }
  };



  const handleEditChange = (editId, field, value) => {
    let numericValue = parseInt(value, 10);
    if (value === '' || isNaN(numericValue) || numericValue < 0) {
      numericValue = 0;
      if (value !== '' && parseInt(value,10) < 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Valeur négative',
          text: 'La valeur ne peut pas être inférieure à 0',
          toast: true,
          position: 'top-end',
          timer: 1500,
          showConfirmButton: false
        });
      }
    }
    setEditData(prev => {
      const userSalaire = combinedUserSalaires.find(us => (us.hasSalaire ? us.salaireId : `new-${us.user_id}`) === editId);
      const existing = prev[editId] || {
        user_id: userSalaire.user_id,
        salaire_base: userSalaire.salaire_base || 0,
        panier: userSalaire.panier || 0,
        represent: userSalaire.represent || 0,
        transport: userSalaire.transport || 0,
        deplacement: userSalaire.deplacement || 0,
        salaire_net: userSalaire.salaire_net || 0,
        isNew: !userSalaire.hasSalaire
      };
      return {
        ...prev,
        [editId]: {
          ...existing,
            [field]: numericValue
        }
      };
    });
  };

  const saveEdit = async (editId) => {
    try {
      const editInfo = editData[editId];
      
      if (editInfo.isNew) {
        // Créer un nouveau salaire
        const { isNew, ...salaireData } = editInfo;
        await dispatch(createSalaire(salaireData)).unwrap();
        
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Salaire créé avec succès',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000
        });
      } else {
        // Mettre à jour un salaire existant
        const { user_id, isNew, ...salaireData } = editInfo;
        await dispatch(updateSalaire({ 
          id: editId, 
          ...salaireData 
        })).unwrap();
        
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Salaire mis à jour avec succès',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000
        });
      }
      
      // Nettoyer les données d'édition
      setEditData(prev => {
        const newData = { ...prev };
        delete newData[editId];
        return newData;
      });
      
      // Rafraîchir les données
      dispatch(fetchSalaires(filters || {}));
      dispatch(fetchStatistiquesSalaires());
      
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: editData[editId].isNew ? 'Erreur lors de la création' : 'Erreur lors de la mise à jour'
      });
    }
  };

  // Sauvegarder toutes les modifications en une seule action
  const saveAllEdits = async () => {
    const edits = Object.entries(editData);
    if (edits.length === 0 || batchSaving) return;

    const confirm = await Swal.fire({
      title: 'Enregistrer toutes les modifications ?',
      text: `Vous allez enregistrer ${edits.length} modification(s).`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, enregistrer',
      cancelButtonText: 'Annuler'
    });
    if (!confirm.isConfirmed) return;

    setBatchSaving(true);
    const results = [];
    try {
      for (const [editId, editInfo] of edits) {
        if (editInfo.isNew) {
          const { isNew, ...salaireData } = editInfo;
            // Normalisation valeurs
          Object.keys(salaireData).forEach(k => {
            if (typeof salaireData[k] === 'number' && isNaN(salaireData[k])) salaireData[k] = 0;
          });
          try {
            await dispatch(createSalaire(salaireData)).unwrap();
            results.push({ id: editId, status: 'created' });
          } catch (e) {
            results.push({ id: editId, status: 'error', error: e });
          }
        } else {
          const { user_id, isNew, ...salaireData } = editInfo;
          Object.keys(salaireData).forEach(k => {
            if (typeof salaireData[k] === 'number' && isNaN(salaireData[k])) salaireData[k] = 0;
          });
          try {
            await dispatch(updateSalaire({ id: editId, ...salaireData })).unwrap();
            results.push({ id: editId, status: 'updated' });
          } catch (e) {
            results.push({ id: editId, status: 'error', error: e });
          }
        }
      }

      const errors = results.filter(r => r.status === 'error').length;
      const created = results.filter(r => r.status === 'created').length;
      const updated = results.filter(r => r.status === 'updated').length;

      Swal.fire({
        icon: errors ? 'warning' : 'success',
        title: errors ? 'Partiel' : 'Succès',
        html: `Créés: <b>${created}</b><br>Mise à jour: <b>${updated}</b>${errors ? `<br>Erreurs: <b>${errors}</b>` : ''}`,
        timer: 3500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });

      // Reset edits après succès
      setEditData({});
      dispatch(fetchSalaires(filters || {}));
      dispatch(fetchStatistiquesSalaires());
    } finally {
      setBatchSaving(false);
    }
  };

  const handleDelete = async (salaireId, userName) => {
    const result = await Swal.fire({
      title: 'Confirmer la suppression',
      text: `Voulez-vous vraiment supprimer le salaire de ${userName} ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      try {
        await dispatch(deleteSalaire(salaireId)).unwrap();
        
        Swal.fire({
          icon: 'success',
          title: 'Supprimé',
          text: 'Salaire supprimé avec succès',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000
        });
        
        dispatch(fetchSalaires(filters || {}));
        dispatch(fetchStatistiquesSalaires());
        
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Erreur lors de la suppression'
        });
      }
    }
  };

  const handleAddSalaire = async () => {
    if (!newSalaire.user_id) {
      Swal.fire({
        icon: 'warning',
        title: 'Attention',
        text: 'Veuillez sélectionner un employé'
      });
      return;
    }

    try {
      await dispatch(createSalaire(newSalaire)).unwrap();
      
      setShowAddForm(false);
      setNewSalaire({
        user_id: '',
        salaire_base: 0,
        panier: 0,
        represent: 0,
        transport: 0,
        deplacement: 0,
        salaire_net: 0
      });
      
      Swal.fire({
        icon: 'success',
        title: 'Succès',
        text: 'Salaire créé avec succès',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      });
      
      dispatch(fetchSalaires(filters || {}));
      dispatch(fetchStatistiquesSalaires());
      
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Erreur lors de la création'
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const calculateTotal = (salaire) => {
    return (salaire.salaire_base || 0) + 
           (salaire.panier || 0) + 
           (salaire.represent || 0) + 
           (salaire.transport || 0) + 
           (salaire.deplacement || 0);
  };

  // Rôles à exclure de l'affichage des salaires
  const excludedRoles = ['rh', 'gest_projet', 'gest-rh'];

  // Filtrer les utilisateurs qui n'ont pas encore de salaire (pour le formulaire d'ajout)
  const availableUsers = (users || [])
    .filter(user => (user.statut || '').toLowerCase() === 'actif')
    .filter(user => !excludedRoles.includes((user.role || '').toLowerCase()))
    .filter(user => !(salaires?.data || []).some(salaire => salaire.user_id === user.id));

  // Créer une liste combinée de tous les utilisateurs avec leurs données de salaire
  // Exclure les utilisateurs inactifs (statut différent de 'actif')
  const combinedUserSalaires = (users || [])
    .filter(u => (u.statut || '').toLowerCase() === 'actif')
    .filter(u => !excludedRoles.includes((u.role || '').toLowerCase()))
    .map(user => {
      const userSalaire = (salaires?.data || []).find(salaire => salaire.user_id === user.id);
      return {
        id: userSalaire?.id || `user-${user.id}`,
        user_id: user.id,
        user: user,
        salaire_base: userSalaire?.salaire_base || null,
        panier: userSalaire?.panier || null,
        represent: userSalaire?.represent || null,
        transport: userSalaire?.transport || null,
        deplacement: userSalaire?.deplacement || null,
        salaire_net: userSalaire?.salaire_net || null,
        hasSalaire: !!userSalaire,
        salaireId: userSalaire?.id || null
      };
    })
    .filter(userSalaire => {
      // Filtre par recherche textuelle
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        const fullName = `${userSalaire.user?.name || ''} ${userSalaire.user?.prenom || ''}`.toLowerCase();
        const userDepartment = departments.find(d => d.id === userSalaire.user?.departement_id);
        const departement = (userDepartment ? userDepartment.nom : '').toLowerCase();
        const fonction = (userSalaire.user?.fonction || '').toLowerCase();
        
        const matchesSearch = fullName.includes(searchTerm) || 
                             departement.includes(searchTerm) || 
                             fonction.includes(searchTerm);
        if (!matchesSearch) return false;
      }

      // Filtre par département
      if (filters?.department) {
        const matchesDepartment = userSalaire.user?.departement_id === parseInt(filters.department);
        if (!matchesDepartment) return false;
      }

      // Filtre par type de contrat
      if (filters?.typeContrat) {
        const matchesTypeContrat = userSalaire.user?.typeContrat === filters.typeContrat;
        if (!matchesTypeContrat) return false;
      }

      return true;
    });

  // Appliquer filtre par fonction après mapping (car on veut garder toute la logique précédente)
  const finalUserSalaires = combinedUserSalaires.filter(us => {
    if (filters?.fonction) {
      return (us.user?.fonction || '').toLowerCase() === filters.fonction.toLowerCase();
    }
    return true;
  });

  // Appliquer les filtres de groupe (avec / sans valeur >0)
  const isAnyGroupFilterActive = Object.values(groupFilters).some(Boolean);
  const displayedUserSalaires = isAnyGroupFilterActive ? finalUserSalaires.filter(us => {
    const val = v => (v || 0);
    const match = (withKey, withoutKey, value) => {
      const w = groupFilters[withKey];
      const wo = groupFilters[withoutKey];
      if (!w && !wo) return true; // aucun filtre activé sur cette catégorie
      const vNum = val(value);
      if (w && vNum > 0) return true;
      if (wo && vNum === 0) return true;
      return false;
    };
    return (
      match('baseWith','baseWithout', us.salaire_base) &&
      match('netWith','netWithout', us.salaire_net) &&
      match('panierWith','panierWithout', us.panier) &&
      match('representWith','representWithout', us.represent) &&
      match('transportWith','transportWithout', us.transport) &&
      match('deplacementWith','deplacementWithout', us.deplacement)
    );
  }) : finalUserSalaires;

  // Liste unique des fonctions pour le select
  const fonctionOptions = Array.from(new Set(
    (users || [])
      .filter(u => (u.statut || '').toLowerCase() === 'actif')
      .filter(u => !excludedRoles.includes((u.role || '').toLowerCase()))
      .map(u => u.fonction)
      .filter(f => f && f.trim() !== '')
  )).sort();

  // Vérification d'accès simplifié - seulement vérifier si l'utilisateur est connecté
  if (user === null) {
    // Still loading auth state
    return (
      <div className="salaire-page">
        <div className="loading-cell">
          <i className="fas fa-spinner fa-spin"></i> Chargement...
        </div>
      </div>
    );
  }

  // Debug: afficher des informations utilisateur
  console.log('SalairePage render - user:', user, 'roles:', roles);

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
                      <Icon icon="fluent:money-24-filled" style={{ fontSize: '2rem' }} />
                    </div>
                    <div>
                      <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>Gestion des Salaires</h1>
                      <p className="mb-0 opacity-90">Gérez et suivez tous les salaires</p>
                    </div>
                  </div>
                  
                  <div className="d-flex align-items-center flex-wrap gap-2">
                    <button 
                      className="btn btn-light d-flex align-items-center gap-2"
                      onClick={() => setShowAddForm(true)}
                    >
                      <Icon icon="fluent:add-24-filled" />
                      Ajouter
                    </button>
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
                <div className="row g-3 align-items-end">
                  <div className="col-12 col-md-2">
                    <label className="form-label text-muted small fw-semibold mb-2">
                      <Icon icon="fluent:search-24-filled" className="me-1" />
                      Recherche
                    </label>
                    <div className="position-relative">
                      <Icon icon="fluent:search-24-filled" className="position-absolute start-0 top-50 translate-middle-y ms-3 text-secondary" />
                      <input type="text" className="form-control ps-5" placeholder="Rechercher un employé..." value={filters?.search || ''} onChange={handleSearch} />
                    </div>
                  </div>
                  <div className="col-12 col-md-2">
                    <label className="form-label text-muted small fw-semibold mb-2"><Icon icon="fluent:building-24-filled" className="me-1" />Département</label>
                    <select className="form-select" value={filters?.department || ''} onChange={handleDepartmentFilter}>
                      <option value="">Tous les départements</option>
                      {departments.map(dept => (<option key={dept.id} value={dept.id}>{dept.nom}</option>))}
                    </select>
                  </div>
                  <div className="col-12 col-md-2">
                    <label className="form-label text-muted small fw-semibold mb-2"><Icon icon="fluent:certificate-24-filled" className="me-1" />Type de contrat</label>
                    <select className="form-select" value={filters?.typeContrat || ''} onChange={handleTypeContractFilter}>
                      <option value="">Tous les types</option>
                      <option value="Permanent">Permanent</option>
                      <option value="Temporaire">Temporaire</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-2">
                    <label className="form-label text-muted small fw-semibold mb-2"><Icon icon="fluent:person-info-24-filled" className="me-1" />Fonction</label>
                    <select className="form-select" value={filters?.fonction || ''} onChange={handleFonctionFilter}>
                      <option value="">Toutes</option>
                      {fonctionOptions.map(fn => (<option key={fn} value={fn}>{fn}</option>))}
                    </select>
                  </div>
                  <div className="col-12 col-md-2">
                    <label className="form-label text-muted small fw-semibold mb-2"><Icon icon="fluent:arrow-reset-24-filled" className="me-1" />Reset</label>
                    <button className="btn btn-outline-danger w-100" onClick={resetFilters} title="Réinitialiser les filtres"><Icon icon="fluent:arrow-reset-24-filled" /></button>
                  </div>
                </div>
                {/* Ligne résultats */}
                <div className="row mt-3">
                  <div className="col-12">
                    <div className="results-line bg-light border rounded p-2 d-flex flex-wrap align-items-center gap-3">
                      <div className="fw-semibold small me-2 mb-1">Total: {displayedUserSalaires.length} employé(s){isAnyGroupFilterActive && displayedUserSalaires.length !== finalUserSalaires.length ? ` / ${finalUserSalaires.length}` : ''}</div>
                      {(() => {
                        const groups = {
                          base: { with: finalUserSalaires.filter(u => u.hasSalaire && (u.salaire_base || 0) > 0), without: finalUserSalaires.filter(u => !u.hasSalaire || (u.salaire_base || 0) === 0) },
                          net: { with: finalUserSalaires.filter(u => u.hasSalaire && (u.salaire_net || 0) > 0), without: finalUserSalaires.filter(u => !u.hasSalaire || (u.salaire_net || 0) === 0) },
                          panier: { with: finalUserSalaires.filter(u => (u.panier || 0) > 0), without: finalUserSalaires.filter(u => (u.panier || 0) === 0) },
                          represent: { with: finalUserSalaires.filter(u => (u.represent || 0) > 0), without: finalUserSalaires.filter(u => (u.represent || 0) === 0) },
                          transport: { with: finalUserSalaires.filter(u => (u.transport || 0) > 0), without: finalUserSalaires.filter(u => (u.transport || 0) === 0) },
                          deplacement: { with: finalUserSalaires.filter(u => (u.deplacement || 0) > 0), without: finalUserSalaires.filter(u => (u.deplacement || 0) === 0) }
                        };
                        return (
                          <div className="d-flex flex-wrap gap-3 mb-1">
                            <label className="group-base d-flex align-items-center gap-1 mb-0" style={{cursor:'pointer'}} title="Filtrer Base > 0">
                              <input type="checkbox" className="form-check-input" checked={groupFilters.baseWith} onChange={(e)=>setGroupFilters(p=>({...p, baseWith:e.target.checked}))} />
                              <span className="small fw-semibold text-success">Base &gt; 0 ({groups.base.with.length})</span>
                            </label>
                            <label className="group-base d-flex align-items-center gap-1 mb-0" style={{cursor:'pointer', opacity:.85}} title="Filtrer Base = 0">
                              <input type="checkbox" className="form-check-input" checked={groupFilters.baseWithout} onChange={(e)=>setGroupFilters(p=>({...p, baseWithout:e.target.checked}))} />
                              <span className="small fw-semibold text-danger">Base = 0 ({groups.base.without.length})</span>
                            </label>
                            <label className="group-net d-flex align-items-center gap-1 mb-0" style={{cursor:'pointer'}} title="Filtrer Net > 0">
                              <input type="checkbox" className="form-check-input" checked={groupFilters.netWith} onChange={(e)=>setGroupFilters(p=>({...p, netWith:e.target.checked}))} />
                              <span className="small fw-semibold text-primary">Net &gt; 0 ({groups.net.with.length})</span>
                            </label>
                            <label className="group-net d-flex align-items-center gap-1 mb-0" style={{cursor:'pointer', opacity:.85}} title="Filtrer Net = 0">
                              <input type="checkbox" className="form-check-input" checked={groupFilters.netWithout} onChange={(e)=>setGroupFilters(p=>({...p, netWithout:e.target.checked}))} />
                              <span className="small fw-semibold text-warning">Net = 0 ({groups.net.without.length})</span>
                            </label>
                            <label className="group-panier d-flex align-items-center gap-1 mb-0" style={{cursor:'pointer'}} title="Filtrer Panier > 0">
                              <input type="checkbox" className="form-check-input" checked={groupFilters.panierWith} onChange={(e)=>setGroupFilters(p=>({...p, panierWith:e.target.checked}))} />
                              <span className="small fw-semibold text-success">Panier &gt; 0 ({groups.panier.with.length})</span>
                            </label>
                            <label className="group-panier d-flex align-items-center gap-1 mb-0" style={{cursor:'pointer', opacity:.85}} title="Filtrer Panier = 0">
                              <input type="checkbox" className="form-check-input" checked={groupFilters.panierWithout} onChange={(e)=>setGroupFilters(p=>({...p, panierWithout:e.target.checked}))} />
                              <span className="small fw-semibold text-secondary">Panier = 0 ({groups.panier.without.length})</span>
                            </label>
                            <label className="group-represent d-flex align-items-center gap-1 mb-0" style={{cursor:'pointer'}} title="Filtrer Représentation > 0">
                              <input type="checkbox" className="form-check-input" checked={groupFilters.representWith} onChange={(e)=>setGroupFilters(p=>({...p, representWith:e.target.checked}))} />
                              <span className="small fw-semibold text-success">Repr &gt; 0 ({groups.represent.with.length})</span>
                            </label>
                            <label className="group-represent d-flex align-items-center gap-1 mb-0" style={{cursor:'pointer', opacity:.85}} title="Filtrer Représentation = 0">
                              <input type="checkbox" className="form-check-input" checked={groupFilters.representWithout} onChange={(e)=>setGroupFilters(p=>({...p, representWithout:e.target.checked}))} />
                              <span className="small fw-semibold text-secondary">Repr = 0 ({groups.represent.without.length})</span>
                            </label>
                            <label className="group-transport d-flex align-items-center gap-1 mb-0" style={{cursor:'pointer'}} title="Filtrer Transport > 0">
                              <input type="checkbox" className="form-check-input" checked={groupFilters.transportWith} onChange={(e)=>setGroupFilters(p=>({...p, transportWith:e.target.checked}))} />
                              <span className="small fw-semibold text-success">Transport &gt; 0 ({groups.transport.with.length})</span>
                            </label>
                            <label className="group-transport d-flex align-items-center gap-1 mb-0" style={{cursor:'pointer', opacity:.85}} title="Filtrer Transport = 0">
                              <input type="checkbox" className="form-check-input" checked={groupFilters.transportWithout} onChange={(e)=>setGroupFilters(p=>({...p, transportWithout:e.target.checked}))} />
                              <span className="small fw-semibold text-secondary">Transport = 0 ({groups.transport.without.length})</span>
                            </label>
                            <label className="group-deplacement d-flex align-items-center gap-1 mb-0" style={{cursor:'pointer'}} title="Filtrer Déplacement > 0">
                              <input type="checkbox" className="form-check-input" checked={groupFilters.deplacementWith} onChange={(e)=>setGroupFilters(p=>({...p, deplacementWith:e.target.checked}))} />
                              <span className="small fw-semibold text-success">Dépl &gt; 0 ({groups.deplacement.with.length})</span>
                            </label>
                            <label className="group-deplacement d-flex align-items-center gap-1 mb-0" style={{cursor:'pointer', opacity:.85}} title="Filtrer Déplacement = 0">
                              <input type="checkbox" className="form-check-input" checked={groupFilters.deplacementWithout} onChange={(e)=>setGroupFilters(p=>({...p, deplacementWithout:e.target.checked}))} />
                              <span className="small fw-semibold text-secondary">Dépl = 0 ({groups.deplacement.without.length})</span>
                            </label>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Multiple Edit Panel */}
        {showMultipleEdit && (
          <div className="row mb-4">
            <div className="col-12">
              <div className="card border-light shadow-sm">
                <div className="card-header bg-light d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 text-dark">
                    <Icon icon="fluent:edit-24-regular" className="me-2" />
                    Modification Multiple ({selectedEmployees.size} employé{selectedEmployees.size > 1 ? 's' : ''} sélectionné{selectedEmployees.size > 1 ? 's' : ''})
                  </h6>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowMultipleEdit(false);
                      setSelectedEmployees(new Set());
                    }}
                  ></button>
                </div>
                <div className="card-body p-3">
                  <div className="row g-3">
                    <div className="col-md-2">
                      <label className="form-label">Salaire Base</label>
                      <input
                        type="number"
                        className="form-control"
                        value={multipleEditData.salaire_base}
                        onChange={(e) => {
                          let v = parseInt(e.target.value); if (isNaN(v) || v < 0) { v = 0; Swal.fire({icon:'warning',title:'Valeur négative',text:'Min 0',toast:true,position:'top-end',timer:1500,showConfirmButton:false}); }
                          handleMultipleEditChange('salaire_base', v);
                        }}
                        placeholder="0"
                        min="0"
                        step="1"
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Salaire Net</label>
                      <input
                        type="number"
                        className="form-control"
                        value={multipleEditData.salaire_net}
                        onChange={(e) => { let v = parseInt(e.target.value); if(isNaN(v)||v<0){v=0; Swal.fire({icon:'warning',title:'Valeur négative',text:'Min 0',toast:true,position:'top-end',timer:1500,showConfirmButton:false}); } handleMultipleEditChange('salaire_net', v); }}
                        placeholder="0"
                        min="0"
                        step="1"
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Panier</label>
                      <input
                        type="number"
                        className="form-control"
                        value={multipleEditData.panier}
                        onChange={(e) => { let v=parseInt(e.target.value); if(isNaN(v)||v<0){v=0; Swal.fire({icon:'warning',title:'Valeur négative',text:'Min 0',toast:true,position:'top-end',timer:1500,showConfirmButton:false}); } handleMultipleEditChange('panier', v); }}
                        placeholder="0"
                        min="0"
                        step="1"
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Représentation</label>
                      <input
                        type="number"
                        className="form-control"
                        value={multipleEditData.represent}
                        onChange={(e) => { let v=parseInt(e.target.value); if(isNaN(v)||v<0){v=0; Swal.fire({icon:'warning',title:'Valeur négative',text:'Min 0',toast:true,position:'top-end',timer:1500,showConfirmButton:false}); } handleMultipleEditChange('represent', v); }}
                        placeholder="0"
                        min="0"
                        step="1"
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Transport</label>
                      <input
                        type="number"
                        className="form-control"
                        value={multipleEditData.transport}
                        onChange={(e) => { let v=parseInt(e.target.value); if(isNaN(v)||v<0){v=0; Swal.fire({icon:'warning',title:'Valeur négative',text:'Min 0',toast:true,position:'top-end',timer:1500,showConfirmButton:false}); } handleMultipleEditChange('transport', v); }}
                        placeholder="0"
                        min="0"
                        step="1"
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Déplacement</label>
                      <input
                        type="number"
                        className="form-control"
                        value={multipleEditData.deplacement}
                        onChange={(e) => { let v=parseInt(e.target.value); if(isNaN(v)||v<0){v=0; Swal.fire({icon:'warning',title:'Valeur négative',text:'Min 0',toast:true,position:'top-end',timer:1500,showConfirmButton:false}); } handleMultipleEditChange('deplacement', v); }}
                        placeholder="0"
                        min="0"
                        step="1"
                      />
                    </div>
                  </div>
                  <div className="d-flex justify-content-between mt-3">
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={deleteMultipleSelected}
                    >
                      <Icon icon="fluent:delete-24-regular" className="me-1" />
                      Supprimer
                    </button>
                    <div>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm me-2"
                        onClick={() => {
                          setShowMultipleEdit(false);
                          setSelectedEmployees(new Set());
                        }}
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm"
                        onClick={applyMultipleEdit}
                      >
                        <Icon icon="fluent:save-24-regular" className="me-1" />
                        Appliquer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table des salaires */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-lg rounded-4">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="fw-bold mb-0">
              Liste des Salaires ({displayedUserSalaires.length} employé{displayedUserSalaires.length > 1 ? 's' : ''}{isAnyGroupFilterActive && displayedUserSalaires.length !== finalUserSalaires.length ? ` / ${finalUserSalaires.length}` : ''})
            </h5>
            <div className="d-flex gap-2 align-items-center">
              {Object.keys(editData).length > 0 && (
                <button
                  className="btn btn-success btn-sm d-flex align-items-center gap-2"
                  onClick={saveAllEdits}
                  disabled={batchSaving || loading.update || loading.create}
                  title="Enregistrer toutes les modifications"
                >
                  {batchSaving ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Sauvegarde...</span>
                    </>
                  ) : (
                    <>
                      <Icon icon="fluent:save-multiple-24-filled" />
                      <span>Enregistrer tout ({Object.keys(editData).length})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="table-responsive" style={{ overflowX: 'visible' }}>
            <table className="table table-hover align-middle table-sm" style={{ minWidth: '100%', tableLayout: 'fixed' }}>
              <thead className="table-light">
                <tr>
                  <th style={{ width: '50px' }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selectedEmployees.size === combinedUserSalaires.length && combinedUserSalaires.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const allIds = new Set(combinedUserSalaires.map(us => 
                            us.hasSalaire ? us.salaireId : `new-${us.user_id}`
                          ));
                          setSelectedEmployees(allIds);
                          setShowMultipleEdit(allIds.size >= 2);
                        } else {
                          setSelectedEmployees(new Set());
                          setShowMultipleEdit(false);
                        }
                      }}
                    />
                  </th>
                  <th style={{ width: '180px' }}>Employé</th>
                  <th style={{ width: '150px' }}>Fonction</th>
                  <th style={{ width: '100px' }}>Salaire Base</th>
                  <th style={{ width: '100px' }}>Salaire Net</th>
                  <th style={{ width: '80px' }}>Panier</th>
                  <th style={{ width: '80px' }}>Représent.</th>
                  <th style={{ width: '80px' }}>Transport</th>
                  <th style={{ width: '90px' }}>Déplacement</th>
                  <th className="text-center" style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
            <tbody>
              {loading.list ? (
                <tr>
                  <td colSpan="9" className="loading-cell">
                    <i className="fas fa-spinner fa-spin"></i> Chargement...
                  </td>
                </tr>
              ) : displayedUserSalaires.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-cell">
                    Aucun employé trouvé
                  </td>
                </tr>
              ) : (
                displayedUserSalaires.map(userSalaire => {
                  const editId = userSalaire.hasSalaire ? userSalaire.salaireId : `new-${userSalaire.user_id}`;
                  const department = departments.find(d => d.id === userSalaire.user?.departement_id);
                  return (
                  <tr key={userSalaire.id} className={`
                    editing
                    ${!userSalaire.hasSalaire ? 'no-salary' : ''}
                  `.trim()}>
                    <td>
                      <input
                        type="checkbox"
                        className="form-check-input me-2"
                        checked={selectedEmployees.has(userSalaire.hasSalaire ? userSalaire.salaireId : `new-${userSalaire.user_id}`)}
                        onChange={() => handleEmployeeSelect(userSalaire)}
                      />
                    </td>
                    <td style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                      <div>
                        <div className="fw-semibold text-primary" style={{ fontSize: '0.9rem', lineHeight: '1.2' }}>
                          {userSalaire.user?.name} {userSalaire.user?.prenom}
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                          ID: {userSalaire.user?.id}
                        </small>
                      </div>
                    </td>
                    <td style={{ wordWrap: 'break-word', whiteSpace: 'normal', fontSize: '0.85rem', lineHeight: '1.3' }}>
                      {userSalaire.user?.fonction || 'N/A'}
                    </td>
                    
                    {/* Colonnes toujours éditables */}
                    <td>
                      <SalaryInput
                        value={editData[editId]?.salaire_base ?? userSalaire.salaire_base ?? 0}
                        onValueChange={(v)=>handleEditChange(editId,'salaire_base', v)}
                        className="edit-input text-center"
                        style={{ width: '95px', fontSize: '0.8rem' }}
                      />
                    </td>
                    <td>
                      <SalaryInput
                        value={editData[editId]?.salaire_net ?? userSalaire.salaire_net ?? 0}
                        onValueChange={(v)=>handleEditChange(editId,'salaire_net', v)}
                        className="edit-input text-center fw-semibold"
                        style={{ color: '#28a745', width: '95px', fontSize: '0.8rem' }}
                      />
                    </td>
                    <td>
                      <SalaryInput
                        value={editData[editId]?.panier ?? userSalaire.panier ?? 0}
                        onValueChange={(v)=>handleEditChange(editId,'panier', v)}
                        className="edit-input text-center"
                        style={{ width: '75px', fontSize: '0.8rem' }}
                      />
                    </td>
                    <td>
                      <SalaryInput
                        value={editData[editId]?.represent ?? userSalaire.represent ?? 0}
                        onValueChange={(v)=>handleEditChange(editId,'represent', v)}
                        className="edit-input text-center"
                        style={{ width: '75px', fontSize: '0.8rem' }}
                      />
                    </td>
                    <td>
                      <SalaryInput
                        value={editData[editId]?.transport ?? userSalaire.transport ?? 0}
                        onValueChange={(v)=>handleEditChange(editId,'transport', v)}
                        className="edit-input text-center"
                        style={{ width: '75px', fontSize: '0.8rem' }}
                      />
                    </td>
                    <td>
                      <SalaryInput
                        value={editData[editId]?.deplacement ?? userSalaire.deplacement ?? 0}
                        onValueChange={(v)=>handleEditChange(editId,'deplacement', v)}
                        className="edit-input text-center"
                        style={{ width: '85px', fontSize: '0.8rem' }}
                      />
                    </td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <button
                          className="btn p-0 border-0"
                          onClick={() => saveEdit(editId)}
                          disabled={loading.update || loading.create}
                          title="Enregistrer"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#e8f5e8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Icon icon="fluent:save-24-filled" style={{ fontSize: '14px', color: '#28a745' }} />
                        </button>
                        {userSalaire.hasSalaire && (
                          <button
                            className="btn p-0 border-0"
                            onClick={() => handleDelete(userSalaire.salaireId, `${userSalaire.user?.name} ${userSalaire.user?.prenom}`)}
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
                            <Icon icon="mingcute:delete-2-line" style={{ fontSize: '14px', color: '#f44336' }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {finalUserSalaires.length === 0 && (
          <div className="text-center py-5">
            <Icon icon="fluent:people-search-24-filled" style={{ fontSize: '4rem', color: '#e9ecef' }} />
            <p className="text-muted mt-3 fw-medium">Aucun employé trouvé avec ces critères</p>
            <p className="text-muted small">Essayez de modifier vos filtres de recherche</p>
          </div>
        )}

        {/* Pagination */}
        {salaires?.last_page > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-4">
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted">Afficher</span>
              <select 
                className="form-select form-select-sm w-auto"
                value="10"
                readOnly
              >
                <option value="10">10</option>
              </select>
              <span className="text-muted">entrées</span>
            </div>

            <div className="d-flex gap-2 align-items-center">
              <button
                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                onClick={() => handlePageChange((salaires?.current_page || 1) - 1)}
                disabled={(salaires?.current_page || 1) === 1}
              >
                <Icon icon="fluent:arrow-left-24-filled" />
                <span className="d-none d-md-inline">Précédent</span>
              </button>

              <div className="d-none d-sm-flex gap-1">
                <button className="btn btn-sm btn-primary">
                  {salaires?.current_page || 1}
                </button>
              </div>

              <button
                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                onClick={() => handlePageChange((salaires?.current_page || 1) + 1)}
                disabled={(salaires?.current_page || 1) === (salaires?.last_page || 1)}
              >
                <span className="d-none d-md-inline">Suivant</span>
                <Icon icon="fluent:arrow-right-24-filled" />
              </button>
            </div>
          </div>
        )}
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
        .table td {
          padding: 6px !important;
          vertical-align: middle !important;
        }
        .table th {
          padding: 8px !important;
          vertical-align: middle !important;
          font-size: 0.85rem !important;
        }
        .edit-input {
          border: 1px solid #dee2e6 !important;
          box-shadow: none !important;
          outline: none !important;
        }
        .edit-input:focus {
          border-color: #86b7fe !important;
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25) !important;
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
      
      {/* Formulaire d'ajout en dehors du container principal */}
      {showAddForm && (
        <div className="add-form-section">
          <div className="form-card">
            <div className="form-header">
              <h3>Nouveau Salaire</h3>
              <button 
                className="close-btn"
                onClick={() => setShowAddForm(false)}
              >
                <Icon icon="fluent:dismiss-24-filled" />
              </button>
            </div>
            <div className="form-content">
              <div className="form-row">
                <div className="form-group">
                  <label>Employé</label>
                  <select
                    value={newSalaire.user_id}
                    onChange={(e) => setNewSalaire(prev => ({
                      ...prev,
                      user_id: e.target.value
                    }))}
                  >
                    <option value="">Sélectionner un employé</option>
                    {(availableUsers || []).map(user => {
                      const userDepartment = departments.find(d => d.id === user.departement_id);
                      return (
                        <option key={user.id} value={user.id}>
                          {user.name} {user.prenom} - {userDepartment ? userDepartment.nom : 'Non assigné'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Salaire de base</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={newSalaire.salaire_base}
                    onChange={(e) => setNewSalaire(prev => ({
                      ...prev,
                      salaire_base: (()=>{let v=parseInt(e.target.value); if(isNaN(v)||v<0){v=0; Swal.fire({icon:'warning',title:'Valeur négative',text:'Min 0',toast:true,position:'top-end',timer:1200,showConfirmButton:false});} return v; })()
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label>Panier</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={newSalaire.panier}
                    onChange={(e) => setNewSalaire(prev => ({
                      ...prev,
                      panier: (()=>{let v=parseInt(e.target.value); if(isNaN(v)||v<0){v=0; Swal.fire({icon:'warning',title:'Valeur négative',text:'Min 0',toast:true,position:'top-end',timer:1200,showConfirmButton:false});} return v; })()
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label>Représentation</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={newSalaire.represent}
                    onChange={(e) => setNewSalaire(prev => ({
                      ...prev,
                      represent: (()=>{let v=parseInt(e.target.value); if(isNaN(v)||v<0){v=0; Swal.fire({icon:'warning',title:'Valeur négative',text:'Min 0',toast:true,position:'top-end',timer:1200,showConfirmButton:false});} return v; })()
                    }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Transport</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={newSalaire.transport}
                    onChange={(e) => setNewSalaire(prev => ({
                      ...prev,
                      transport: (()=>{let v=parseInt(e.target.value); if(isNaN(v)||v<0){v=0; Swal.fire({icon:'warning',title:'Valeur négative',text:'Min 0',toast:true,position:'top-end',timer:1200,showConfirmButton:false});} return v; })()
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label>Déplacement</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={newSalaire.deplacement}
                    onChange={(e) => setNewSalaire(prev => ({
                      ...prev,
                      deplacement: (()=>{let v=parseInt(e.target.value); if(isNaN(v)||v<0){v=0; Swal.fire({icon:'warning',title:'Valeur négative',text:'Min 0',toast:true,position:'top-end',timer:1200,showConfirmButton:false});} return v; })()
                    }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Salaire Net</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={newSalaire.salaire_net}
                    onChange={(e) => setNewSalaire(prev => ({
                      ...prev,
                      salaire_net: (()=>{let v=parseInt(e.target.value); if(isNaN(v)||v<0){v=0; Swal.fire({icon:'warning',title:'Valeur négative',text:'Min 0',toast:true,position:'top-end',timer:1200,showConfirmButton:false});} return v; })()
                    }))}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  Annuler
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleAddSalaire}
                  disabled={loading.create}
                >
                  {loading.create ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default SalairePage;