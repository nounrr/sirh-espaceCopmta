
import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import api from '../config/axios';
import './PointagesPageExport.css';
import Swal from 'sweetalert2';
import { fetchDepartments } from '../Redux/Slices/departementSlice';
import { fetchUsers } from '../Redux/Slices/userSlice';

const PointagesPageExport = () => {
  const dispatch = useDispatch();
  const [exportType, setExportType] = useState('tous'); // scope (all, day, period, month)
  const [dataset, setDataset] = useState('pointages'); // 'pointages' | 'salaires'
  const [dateDebut, setDateDebut] = useState(new Date());
  const [dateFin, setDateFin] = useState(new Date());
  const [mois, setMois] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDepartement, setSelectedDepartement] = useState('');
  const [selectedUser, setSelectedUser] = useState('');

  // Vérifier si l'utilisateur a le rôle RH
  const roles = useSelector((state) => state.auth.roles || []);
  const isRH = roles.includes('RH');
  
  // Récupérer les départements et utilisateurs depuis Redux
  const departements = useSelector((state) => state.departments.items || []);
  const allUsers = useSelector((state) => state.users.items || []);
  const societeId = useSelector((state) => state.auth.user?.societe_id);

  // Charger les départements et utilisateurs au montage
  useEffect(() => {
    if (societeId) {
      dispatch(fetchDepartments());
      dispatch(fetchUsers());
    }
  }, [dispatch, societeId]);

  // Filtrer les utilisateurs par département
  const filteredUsers = useMemo(() => {
    if (!selectedDepartement) {
      return allUsers;
    }
    return allUsers.filter(user => user.departement_id === parseInt(selectedDepartement));
  }, [allUsers, selectedDepartement]);

  // Si l'utilisateur n'est pas RH et que salaires est sélectionné, revenir à pointages
  useEffect(() => {
    if (!isRH && dataset === 'salaires') {
      setDataset('pointages');
    }
  }, [isRH, dataset]);

  // Réinitialiser l'utilisateur sélectionné quand le département change
  useEffect(() => {
    setSelectedUser('');
  }, [selectedDepartement]);

  const handleExport = async () => {
    let swalLoading;
    try {
      // Affiche un SweetAlert "en attente"
      swalLoading = Swal.fire({
        title: 'Export en cours...',
        text: 'Merci de patienter pendant la génération du fichier.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
        allowEscapeKey: false,
      });
  
      let params = {};
  
      if (exportType === 'tous') {
        params.exportAll = true;
      } else if (exportType === 'jour') {
        params.specificDate = format(dateDebut, 'yyyy-MM-dd');
      } else if (exportType === 'periode') {
        params.startDate = format(dateDebut, 'yyyy-MM-dd');
        params.endDate = format(dateFin, 'yyyy-MM-dd');
      } else if (exportType === 'mois') {
        params.month = mois;
      }

      // Ajouter les filtres département et utilisateur
      if (selectedDepartement) {
        params.departement_id = selectedDepartement;
      }
      if (selectedUser) {
        params.user_id = selectedUser;
      }
  
      const endpoint = dataset === 'salaires' ? '/export-salaires' : '/export-pointages';
      const response = await api.get(endpoint, {
        params,
        responseType: 'blob'
      });
  
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const scopeLabel = (() => {
        if (exportType === 'tous') return 'tous';
        if (exportType === 'jour') return format(dateDebut, 'yyyy-MM-dd');
        if (exportType === 'periode') return `${format(dateDebut, 'yyyy-MM-dd')}_au_${format(dateFin, 'yyyy-MM-dd')}`;
        if (exportType === 'mois') return mois;
        return format(new Date(), 'yyyy-MM-dd');
      })();
      const baseName = dataset === 'salaires' ? 'salaires' : 'pointages';
      link.setAttribute('download', `${baseName}_${scopeLabel}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
  
      // Ferme le loading et affiche le succès
      Swal.close();
      Swal.fire({
        icon: 'success',
        title: `Export ${dataset === 'salaires' ? 'salaires' : 'pointages'} réalisé avec succès`,
        showConfirmButton: false,
        timer: 1500
      });
    } catch (error) {
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Erreur lors de l\'export',
        text: `Une erreur est survenue lors de l'export des ${dataset === 'salaires' ? 'salaires' : 'pointages'}.`
      });
      console.error('Erreur lors de l\'export:', error);
    }
  };

  return (
    <div className="export-container">
      <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>Export des Données</h1>
      
      <div className="export-grid">
        <div className="export-item">
          <div className="form-control">
            <label htmlFor="dataset">Type de données</label>
            <select
              id="dataset"
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
              className="select-input"
            >
              <option value="pointages">Pointages</option>
              {isRH && <option value="salaires">Salaires</option>}
            </select>
          </div>
        </div>
        <div className="export-item">
          <div className="form-control">
            <label htmlFor="exportType">Type d'export</label>
            <select
              id="exportType"
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              className="select-input"
            >
              <option value="tous">Tous les pointages</option>
              <option value="jour">Jour spécifique</option>
              <option value="periode">Période</option>
              <option value="mois">Mois</option>
            </select>
          </div>
        </div>

        {exportType === 'jour' && (
          <div className="export-item">
            <div className="form-control">
              <label htmlFor="date">Date</label>
              <input
                type="date"
                id="date"
                value={format(dateDebut, 'yyyy-MM-dd')}
                onChange={(e) => setDateDebut(new Date(e.target.value))}
                className="date-input"
              />
            </div>
          </div>
        )}

        {exportType === 'periode' && (
          <>
            <div className="export-item">
              <div className="form-control">
                <label htmlFor="dateDebut">Date de début</label>
                <input
                  type="date"
                  id="dateDebut"
                  value={format(dateDebut, 'yyyy-MM-dd')}
                  onChange={(e) => setDateDebut(new Date(e.target.value))}
                  className="date-input"
                />
              </div>
            </div>
            <div className="export-item">
              <div className="form-control">
                <label htmlFor="dateFin">Date de fin</label>
                <input
                  type="date"
                  id="dateFin"
                  value={format(dateFin, 'yyyy-MM-dd')}
                  onChange={(e) => setDateFin(new Date(e.target.value))}
                  className="date-input"
                />
              </div>
            </div>
          </>
        )}

        {exportType === 'mois' && (
          <div className="export-item">
            <div className="form-control">
              <label htmlFor="mois">Mois</label>
              <input
                type="month"
                id="mois"
                value={mois}
                onChange={(e) => setMois(e.target.value)}
                className="date-input"
              />
            </div>
          </div>
        )}

        {/* Filtre par département */}
        <div className="export-item">
          <div className="form-control">
            <label htmlFor="departement">Département (optionnel)</label>
            <select
              id="departement"
              value={selectedDepartement}
              onChange={(e) => setSelectedDepartement(e.target.value)}
              className="select-input"
            >
              <option value="">Tous les départements</option>
              {departements.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtre par utilisateur */}
        <div className="export-item">
          <div className="form-control">
            <label htmlFor="user">Utilisateur (optionnel)</label>
            <select
              id="user"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="select-input"
              disabled={filteredUsers.length === 0}
            >
              <option value="">Tous les utilisateurs</option>
              {filteredUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.prenom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="export-item full-width">
          <button className="export-button" onClick={handleExport}>
            Exporter
          </button>
        </div>
      </div>
    </div>
  );
};

export default PointagesPageExport;