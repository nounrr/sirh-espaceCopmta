import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import * as XLSX from 'xlsx';
import { uploadDocument, deleteDocument, fetchUserDocs } from "../Redux/Slices/userDocsSlice"; // Assure-toi d'avoir ces actions
import { fetchUsers } from "../Redux/Slices/userSlice";
import { fetchClients } from "../Redux/Slices/clientsSlice";
import { fetchTypeDocs } from "../Redux/Slices/typeDocSlice";

// Helper pour obtenir la liste complète des types/documents pour un user
function getAllUserDocsForUser(userDocsPivotArray, typeDocs, user_id) {
  const mapByType = {};
  userDocsPivotArray.forEach(doc => {
    mapByType[doc.type_doc_id] = doc;
  });
  return typeDocs.map(typeDoc => {
    if (mapByType[typeDoc.id]) {
      return { ...mapByType[typeDoc.id], type_doc_nom: typeDoc.nom };
    } else {
      return {
                                          id: `empty-${typeDoc.id}`,
        user_id: user_id,
        type_doc_id: typeDoc.id,
        type_doc_nom: typeDoc.nom,
        is_provided: 0,
        file_path: null,
      };
    }
  });
}

const UserDocsPage = () => {
  const dispatch = useDispatch();
  const userDocs = useSelector((state) => state.userDocs.items); // [[pivot,pivot,...],...]
  const users = useSelector((state) => state.users.items);       // [{id, name, ...}]
  // Normaliser la structure des clients (certaines réponses API peuvent être { data: [...] })
  const rawClients = useSelector((state) => state.clients?.items || []);
  const clients = Array.isArray(rawClients)
    ? rawClients
    : (rawClients?.data?.data || rawClients?.data || rawClients?.items || []); // tableau final robuste
  const typeDocs = useSelector((state) => state.typeDocs.items); // [{id, nom, ...}]
  const departments = useSelector((state) => state.departments?.items || []);
  const roles = useSelector((state) => state.auth.roles || []);
  const usersStatus = useSelector((state) => state.users.status);
  const clientsStatus = useSelector((state) => state.clients.status);
  const typeDocsStatus = useSelector((state) => state.typeDocs.status);
  const userDocsStatus = useSelector((state) => state.userDocs.status);

  // Auto-fetch data if not already loaded. Fetch large pages so local pagination works across merged users + clients.
  useEffect(() => {
    const BULK_SIZE = 500; // adjust as needed
    if (usersStatus === 'idle' || users.length === 0) dispatch(fetchUsers({ perPage: BULK_SIZE }));
    if (clientsStatus === 'idle' || rawClients.length === 0) dispatch(fetchClients({ perPage: BULK_SIZE }));
    if (typeDocsStatus === 'idle' || typeDocs.length === 0) dispatch(fetchTypeDocs({ perPage: BULK_SIZE }));
    if (userDocsStatus === 'idle' || userDocs.length === 0) dispatch(fetchUserDocs());
  }, [dispatch, usersStatus, clientsStatus, typeDocsStatus, userDocsStatus, users.length, rawClients.length, typeDocs.length, userDocs.length]);

  // Accordéon ouvert
  const [openUser, setOpenUser] = useState(null);
  // Fichier sélectionné à uploader (clé: `${user_id}-${type_doc_id}`)
  const [selectedFiles, setSelectedFiles] = useState({});
  // Pour loader bouton upload
  const [uploading, setUploading] = useState({});
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [onlyCompleted, setOnlyCompleted] = useState(''); // 'complet', 'incomplet', ''
  const [contractType, setContractType] = useState(''); // '', 'temporaire', 'permanent', 'client'
  // Pagination (client-side over merged filtered list)
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(() => {
    const stored = localStorage.getItem('userDocsPerPage');
    return stored ? parseInt(stored, 10) : 10; // default 10
  });

  // Persist perPage changes
  useEffect(() => {
    localStorage.setItem('userDocsPerPage', String(perPage));
    setCurrentPage(1); // reset page when size changes
  }, [perPage]);

  // Types de documents applicables selon le typeContrat
  const resolveUserContract = (user) => {
    if (!user) return '';
    const raw = (user.typeContrat || user.type_contrat || '').trim().toLowerCase();
    if (raw.startsWith('client')) return 'client';
    if (raw.startsWith('perm')) return 'permanent';
    if (raw.startsWith('temp')) return 'temporaire';
    return raw; // fallback
  };

  const getApplicableTypeDocs = (user) => {
    const contract = resolveUserContract(user);
    const key = contract === 'client' ? 'Client' : 'Employe';
    return (typeDocs || []).filter(td => (td.type_contrat || 'Employe') === key);
  };

  // Filtrage users
  const getFilteredUsers = () => {
    // Fusion employés + clients avec déduplication par id
    const baseUsers = Array.isArray(users) ? users : [];
    const baseClients = Array.isArray(clients) ? clients : [];
    const map = new Map();
    [...baseUsers, ...baseClients].forEach(u => {
      if (u && u.id != null) {
        // Priorité aux enregistrements contenant typeContrat (ex: Client)
        if (!map.has(u.id)) map.set(u.id, u);
        else {
          const existing = map.get(u.id);
            if (!existing.typeContrat && u.typeContrat) map.set(u.id, u);
        }
      }
    });
    const allPeople = Array.from(map.values());
    return allPeople.filter(user => {
      // Debug: inspect contract resolution (supprimer après résolution)
      // console.log('USER ENTRY', {id: user.id, name: user.name, contratRaw: user.typeContrat || user.type_contrat, resolved: resolveUserContract(user)});
      // Filtre search
      const term = searchTerm.toLowerCase();
      const matchSearch =
        (user.name || '').toLowerCase().includes(term) ||
        (user.prenom || '').toLowerCase().includes(term) ||
        (user.cin || '').toLowerCase().includes(term);

      // Filtre département
      const matchDept = !selectedDepartment || user.departement_id === Number(selectedDepartment);

      // Filtre type de contrat
  const matchContract = !contractType || resolveUserContract(user) === contractType;

      // Filtre statut (exclure inactifs)
  const matchStatut = (user.statut || '').toLowerCase() !== "inactif" || resolveUserContract(user) === 'client';

      // Filtre complet/incomplet
      let matchComplete = true;
      if (onlyCompleted) {
        const applicableTypes = getApplicableTypeDocs(user);
        const userDocList = (userDocs.find(arr => arr[0]?.user_id === user.id)) || [];
        const allDocs = getAllUserDocsForUser(userDocList, applicableTypes, user.id);
        const nbFournis = allDocs.filter(d => d.is_provided).length;
        if (onlyCompleted === "complet") matchComplete = nbFournis === applicableTypes.length;
        if (onlyCompleted === "incomplet") matchComplete = nbFournis !== applicableTypes.length;
      }
      return matchSearch && matchDept && matchContract && matchStatut && matchComplete;
    });
  };

  // Slice for current page
  const filteredUsers = getFilteredUsers();
  const totalFiltered = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / perPage));
  const pageUsers = filteredUsers.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleChangePerPage = (e) => {
    const value = e.target.value === 'all' ? totalFiltered : parseInt(e.target.value, 10);
    setPerPage(value);
  };

  const goToPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setCurrentPage(p);
  };

  const getPageNumbers = () => {
    const nums = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) nums.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) nums.push(i);
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - 4; i <= totalPages; i++) nums.push(i);
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) nums.push(i);
      }
    }
    return nums;
  };

  // When filters change, reset to first page
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDepartment, onlyCompleted, contractType]);

  // Clamp page when total pages shrink (e.g., after filtering)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [totalPages]);

  // Actions
  // UI: Ajout du select type de contrat dans la barre de filtres
  // (à placer dans le rendu, probablement à côté des autres filtres)
  const handleFileChange = (user_id, type_doc_id, file) => {
    setSelectedFiles((prev) => ({
      ...prev,
      [`${user_id}-${type_doc_id}`]: file
    }));
  };

  const handleUpload = async (user_id, type_doc_id) => {
    const key = `${user_id}-${type_doc_id}`;
    const file = selectedFiles[key];
    if (!file) return;
    setUploading(prev => ({ ...prev, [key]: true }));
    try {
      await dispatch(uploadDocument({ userId: user_id, typeDocId: type_doc_id, file })).unwrap();
      Swal.fire('Succès', 'Document envoyé !', 'success');
      setSelectedFiles(prev => {
        const ns = { ...prev };
        delete ns[key];
        return ns;
      });
      dispatch(fetchUserDocs()); // Pour recharger l'état global
    } catch (e) {
      Swal.fire('Erreur', "Impossible d'envoyer le fichier", 'error');
    }
    setUploading(prev => ({ ...prev, [key]: false }));
  };

  const handleDelete = async (user_id, type_doc_id) => {
    if (!window.confirm("Supprimer ce document ?")) return;
    await dispatch(deleteDocument({ userId: user_id, typeDocId: type_doc_id })).unwrap();
    dispatch(fetchUserDocs());
  };

  // Fonction d'export des documents d'un utilisateur en Excel
  const exportUserDocs = (user) => {
    const applicableTypes = getApplicableTypeDocs(user);
    const userDocList = (userDocs.find(arr => arr[0]?.user_id === user.id)) || [];
    const allDocsForUser = getAllUserDocsForUser(userDocList, applicableTypes, user.id);
    
    // Créer les données pour Excel
    const excelData = [];
    
    // En-tête avec informations utilisateur
    excelData.push(['RAPPORT DES DOCUMENTS']);
    excelData.push([`Employé: ${user.name} ${user.prenom}`]);
    excelData.push([`CIN: ${user.cin || 'Non défini'}`]);
    excelData.push([`Email: ${user.email || 'Non défini'}`]);
    excelData.push([`Fonction: ${user.fonction || 'Non définie'}`]);
    excelData.push([`Type de contrat: ${user.typeContrat || 'Non défini'}`]);
    excelData.push([`Département: ${departments.find(d => d.id === user.departement_id)?.nom || 'Non défini'}`]);
    
  const nbFournis = allDocsForUser.filter(d => d.is_provided).length;
  excelData.push([`Statut global: ${nbFournis}/${applicableTypes.length} documents fournis`]);
    excelData.push(['']); // Ligne vide
    
    // En-têtes des colonnes
    excelData.push(['N°', 'Type de Document', 'Statut', 'Fichier']);
    
    // Données des documents
    allDocsForUser.forEach((doc, index) => {
      excelData.push([
        index + 1,
        doc.type_doc_nom,
        doc.is_provided ? 'FOURNI' : 'NON FOURNI',
        doc.is_provided && doc.file_path ? doc.file_path : 'Aucun fichier'
      ]);
    });
    
    excelData.push(['']); // Ligne vide
    excelData.push([`Rapport généré le: ${new Date().toLocaleString('fr-FR')}`]);
    
    // Créer le workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Style avancé pour les en-têtes et données
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = 0; R <= range.e.r; ++R) {
      for (let C = 0; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ c: C, r: R });
        if (!ws[cell_address]) continue;
        
        // Style pour la première ligne (titre principal)
        if (R === 0) {
          ws[cell_address].s = {
            font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } },
            alignment: { horizontal: 'center', vertical: 'center' },
            fill: { fgColor: { rgb: "2E86AB" } },
            border: {
              top: { style: 'thick', color: { rgb: "000000" } },
              bottom: { style: 'thick', color: { rgb: "000000" } },
              left: { style: 'thick', color: { rgb: "000000" } },
              right: { style: 'thick', color: { rgb: "000000" } }
            }
          };
        }
        // Style pour les informations utilisateur (lignes 2-8)
        else if (R >= 1 && R <= 7) {
          ws[cell_address].s = {
            font: { bold: true, sz: 11, color: { rgb: "2E86AB" } },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }
        // Style pour les en-têtes de colonnes (ligne 10)
        else if (R === 9) {
          ws[cell_address].s = {
            font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4CAF50" } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'medium', color: { rgb: "000000" } },
              bottom: { style: 'medium', color: { rgb: "000000" } },
              left: { style: 'thin', color: { rgb: "000000" } },
              right: { style: 'thin', color: { rgb: "000000" } }
            }
          };
        }
        // Style pour les données des documents
        else if (R >= 10 && R < excelData.length - 2) {
          // Alternance de couleurs
          const isEvenRow = (R - 10) % 2 === 0;
          let bgColor = isEvenRow ? "F8F9FA" : "FFFFFF";
          let fontColor = "000000";
          
          // Couleur spéciale pour la colonne statut (colonne C = index 2)
          if (C === 2) {
            if (ws[cell_address].v === 'FOURNI') {
              bgColor = "D4EDDA";
              fontColor = "155724";
            } else if (ws[cell_address].v === 'NON FOURNI') {
              bgColor = "F8D7DA";
              fontColor = "721C24";
            }
          }
          
          ws[cell_address].s = {
            font: { sz: 10, color: { rgb: fontColor } },
            fill: { fgColor: { rgb: bgColor } },
            alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: "E0E0E0" } },
              bottom: { style: 'thin', color: { rgb: "E0E0E0" } },
              left: { style: 'thin', color: { rgb: "E0E0E0" } },
              right: { style: 'thin', color: { rgb: "E0E0E0" } }
            }
          };
        }
        // Style pour la ligne de date de génération
        else if (R === excelData.length - 1) {
          ws[cell_address].s = {
            font: { italic: true, sz: 10, color: { rgb: "666666" } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }
    }
    
    // Largeur des colonnes optimisées
    ws['!cols'] = [
      { wch: 8 },   // N°
      { wch: 35 },  // Type de Document
      { wch: 18 },  // Statut
      { wch: 50 }   // Fichier
    ];
    
    // Hauteur des lignes
    ws['!rows'] = [];
    for (let i = 0; i < excelData.length; i++) {
      if (i === 0) {
        ws['!rows'][i] = { hpt: 30 }; // Titre plus haut
      } else if (i === 9) {
        ws['!rows'][i] = { hpt: 25 }; // En-têtes plus hauts
      } else {
        ws['!rows'][i] = { hpt: 20 }; // Lignes normales
      }
    }
    
    // Activer les filtres automatiques sur les données des documents
    if (excelData.length > 10) {
      const filterRange = `A10:D${excelData.length - 2}`;
      ws['!autofilter'] = { ref: filterRange };
    }
    
    // Figer les panneaux (figer jusqu'aux en-têtes)
    ws['!freeze'] = { xSplit: 0, ySplit: 10, topLeftCell: 'A11', activePane: 'bottomLeft' };
    
    XLSX.utils.book_append_sheet(wb, ws, "Documents");
    
    // Télécharger le fichier
    XLSX.writeFile(wb, `rapport_documents_${user.name}_${user.prenom}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    Swal.fire('Succès', 'Rapport Excel exporté avec succès !', 'success');
  };

  // Fonction d'export de tous les utilisateurs en un seul fichier Excel
  const exportAllUsersDocs = () => {
    const filteredUsers = getFilteredUsers();
    
    if (filteredUsers.length === 0) {
      Swal.fire('Attention', 'Aucun utilisateur à exporter !', 'warning');
      return;
    }
    
    const wb = XLSX.utils.book_new();
    
    // Une seule feuille avec tous les utilisateurs et leurs documents
    const allData = [];
    
    // En-tête principal
    allData.push(['RAPPORT COMPLET DES DOCUMENTS - TOUS LES UTILISATEURS']);
    allData.push([`Date d'export: ${new Date().toLocaleString('fr-FR')}`]);
    allData.push([`Nombre d'utilisateurs: ${filteredUsers.length}`]);
    allData.push(['']); // Ligne vide
    
    // En-têtes des colonnes
    allData.push(['Nom', 'Prénom', 'CIN', 'Email', 'Fonction', 'Contrat', 'Département', 'Type de Document', 'Statut Document', 'Fichier']);
    
    // Données pour chaque utilisateur et ses documents
    filteredUsers.forEach(user => {
      const applicableTypes = getApplicableTypeDocs(user);
      const userDocList = (userDocs.find(arr => arr[0]?.user_id === user.id)) || [];
      const allDocsForUser = getAllUserDocsForUser(userDocList, applicableTypes, user.id);
      
      // Si l'utilisateur a des documents
      if (allDocsForUser.length > 0) {
        allDocsForUser.forEach((doc, index) => {
          allData.push([
            index === 0 ? (user.name || '') : '', // Nom seulement sur la première ligne de l'utilisateur
            index === 0 ? (user.prenom || '') : '', // Prénom seulement sur la première ligne
            index === 0 ? (user.cin || '') : '', // CIN seulement sur la première ligne
            index === 0 ? (user.email || '') : '', // Email seulement sur la première ligne
            index === 0 ? (user.fonction || '') : '', // Fonction seulement sur la première ligne
            index === 0 ? (user.typeContrat || '') : '', // Contrat seulement sur la première ligne
            index === 0 ? (departments.find(d => d.id === user.departement_id)?.nom || '') : '', // Département seulement sur la première ligne
            doc.type_doc_nom, // Type de document sur chaque ligne
            doc.is_provided ? 'FOURNI' : 'NON FOURNI', // Statut sur chaque ligne
            doc.is_provided && doc.file_path ? doc.file_path : 'Aucun fichier' // Fichier sur chaque ligne
          ]);
        });
      } else {
        // Si l'utilisateur n'a aucun document
        allData.push([
          user.name || '',
          user.prenom || '',
          user.cin || '',
          user.email || '',
          user.fonction || '',
          user.typeContrat || '',
          departments.find(d => d.id === user.departement_id)?.nom || '',
          'Aucun document configuré',
          'N/A',
          'N/A'
        ]);
      }
      
      // Ligne vide entre les utilisateurs pour une meilleure lisibilité
      allData.push(['', '', '', '', '', '', '', '', '', '']);
    });
    
    // Créer la feuille
    const ws = XLSX.utils.aoa_to_sheet(allData);
    
    // Style pour les en-têtes et données
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = 0; R <= range.e.r; ++R) {
      for (let C = 0; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ c: C, r: R });
        if (!ws[cell_address]) continue;
        
        // Style pour la première ligne (titre principal)
        if (R === 0) {
          ws[cell_address].s = {
            font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } },
            alignment: { horizontal: 'center', vertical: 'center' },
            fill: { fgColor: { rgb: "2E86AB" } }, // Bleu professionnel
            border: {
              top: { style: 'thick', color: { rgb: "000000" } },
              bottom: { style: 'thick', color: { rgb: "000000" } },
              left: { style: 'thick', color: { rgb: "000000" } },
              right: { style: 'thick', color: { rgb: "000000" } }
            }
          };
        }
        // Style pour les informations d'en-tête (lignes 2-3)
        else if (R >= 1 && R <= 2) {
          ws[cell_address].s = {
            font: { bold: true, sz: 12, color: { rgb: "2E86AB" } },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }
        // Style pour les en-têtes de colonnes (ligne 5)
        else if (R === 4) {
          ws[cell_address].s = {
            font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4CAF50" } }, // Vert moderne
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'medium', color: { rgb: "000000" } },
              bottom: { style: 'medium', color: { rgb: "000000" } },
              left: { style: 'thin', color: { rgb: "000000" } },
              right: { style: 'thin', color: { rgb: "000000" } }
            }
          };
        }
        // Style pour les données (lignes suivantes)
        else if (R > 4 && allData[R] && allData[R].some(cell => cell !== '')) {
          // Alternance de couleurs pour les lignes
          const isEvenRow = Math.floor((R - 5) / 2) % 2 === 0;
          const bgColor = isEvenRow ? "F8F9FA" : "FFFFFF";
          
          // Couleur spéciale pour la colonne statut
          let cellBgColor = bgColor;
          let fontColor = "000000";
          
          if (C === 8) { // Colonne "Statut Document"
            if (ws[cell_address].v === 'FOURNI') {
              cellBgColor = "D4EDDA"; // Vert clair
              fontColor = "155724"; // Vert foncé
            } else if (ws[cell_address].v === 'NON FOURNI') {
              cellBgColor = "F8D7DA"; // Rouge clair
              fontColor = "721C24"; // Rouge foncé
            }
          }
          
          ws[cell_address].s = {
            font: { sz: 10, color: { rgb: fontColor } },
            fill: { fgColor: { rgb: cellBgColor } },
            alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: "E0E0E0" } },
              bottom: { style: 'thin', color: { rgb: "E0E0E0" } },
              left: { style: 'thin', color: { rgb: "E0E0E0" } },
              right: { style: 'thin', color: { rgb: "E0E0E0" } }
            }
          };
        }
      }
    }
    
    // Largeur des colonnes optimisées
    ws['!cols'] = [
      { wch: 18 }, // Nom
      { wch: 18 }, // Prénom
      { wch: 15 }, // CIN
      { wch: 30 }, // Email
      { wch: 25 }, // Fonction
      { wch: 15 }, // Contrat
      { wch: 25 }, // Département
      { wch: 35 }, // Type de Document
      { wch: 18 }, // Statut Document
      { wch: 45 }  // Fichier
    ];
    
    // Hauteur des lignes
    ws['!rows'] = [];
    for (let i = 0; i <= range.e.r; i++) {
      if (i === 0) {
        ws['!rows'][i] = { hpt: 30 }; // Ligne titre plus haute
      } else if (i === 4) {
        ws['!rows'][i] = { hpt: 25 }; // Ligne en-têtes plus haute
      } else {
        ws['!rows'][i] = { hpt: 20 }; // Lignes données
      }
    }
    
    // Activer les filtres automatiques sur les en-têtes (ligne 5)
    const filterRange = `A5:${XLSX.utils.encode_col(9)}${range.e.r + 1}`;
    ws['!autofilter'] = { ref: filterRange };
    
    // Figer les panneaux (figer les 5 premières lignes)
    ws['!freeze'] = { xSplit: 0, ySplit: 5, topLeftCell: 'A6', activePane: 'bottomLeft' };
    
    XLSX.utils.book_append_sheet(wb, ws, "Tous les Documents");
    
    // Télécharger le fichier
    XLSX.writeFile(wb, `rapport_complet_documents_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    Swal.fire('Succès', `Rapport Excel complet de ${filteredUsers.length} utilisateurs exporté avec succès !`, 'success');
  };

  // La card du document
  const DocCard = ({ doc, user_id }) => {
    const key = `${user_id}-${doc.type_doc_id}`;
    const fileSelected = !!selectedFiles[key];
    const isUploading = !!uploading[key];

    return (
      <div
        className="card border-0 shadow-sm h-100"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: doc.is_provided 
            ? '2px solid #28a745' 
            : '2px solid #ff6b6b', // Rouge doux et moderne
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        }}
      >
        <div className="card-body p-3 text-center">
          {/* Icône et statut */}
          <div className="mb-3">
            <div 
              className="rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center"
              style={{ 
                width: '50px', 
                height: '50px',
                background: doc.is_provided 
                  ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                  : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)'
              }}
            >
              <Icon 
                icon={doc.is_provided ? "mdi:check-circle" : "mdi:exclamation"} 
                style={{ fontSize: '1.5rem', color: 'white' }} 
              />
            </div>
            <h6 className=" text-dark mb-1" style={{ fontSize: '0.5rem' }}>
              {doc.type_doc_nom || `Type doc id: ${doc.type_doc_id}`}
            </h6>
            <span 
              className="badge"
              style={{ 
                fontSize: '0.75rem',
                background: doc.is_provided 
                  ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                  : 'linear-gradient(135deg, #ff9500 0%, #ff7b00 100%)',
                color: 'white',
                border: 'none'
              }}
            >
              {doc.is_provided ? '✓ Fourni' : '⚠ Manquant'}
            </span>
          </div>

          {/* Actions créatives */}
          <div className="d-flex flex-column gap-2">
            {doc.is_provided ? (
              // Actions pour document fourni - Tous sur la même ligne
              <>
                <div className="d-flex gap-1 justify-content-center mb-2">
                  <a
                    onClick={(e) => {
  e.preventDefault();        // ne pas suivre le lien
  e.stopPropagation?.();     // ne pas déclencher l'accordéon si clic dans la card

  // 1) Fichier présent ?
  if (!doc?.is_provided || !doc?.file_path || String(doc.file_path).trim() === '') {
    Swal.fire('Info', 'Aucun document disponible pour ce type.', 'info');
    return;
  }

  // 2) Permissions (seulement RH / Gest_RH)
  if (!roles.includes('RH') && !roles.includes('Gest_RH')) {
    Swal.fire('Accès refusé', 'Vous n’avez pas la permission de voir ce document.', 'error');
    return;
  }

  // 3) Ouvrir le document (public storage)
  const url = `${import.meta.env.VITE_API_URL}storage/${doc.file_path}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}}

                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm flex-1 position-relative overflow-hidden"
                    style={{ 
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      padding: '6px 8px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      color: 'white',
                      fontWeight: '600',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Icon icon="mdi:eye-outline" className="me-1" style={{ fontSize: '0.9rem' }} />
                    Voir
                  </a>
                  
                  <label
                    className="btn btn-sm flex-1 position-relative overflow-hidden"
                    style={{ 
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      padding: '6px 8px',
                      fontWeight: '600',
                      background: fileSelected 
                        ? 'linear-gradient(135deg, #ffd93d 0%, #ff9800 100%)' 
                        : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                      color: 'white',
                      border: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = fileSelected 
                        ? '0 4px 8px rgba(255, 217, 61, 0.3)'
                        : '0 4px 8px rgba(40, 167, 69, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Icon 
                      icon={fileSelected ? "mdi:file-check-outline" : "mdi:file-replace-outline"} 
                      className="me-1" 
                      style={{ fontSize: '0.9rem' }}
                    />
                    {fileSelected ? 'Prêt' : 'Remplacer'}
                    <input
                      type="file"
                      className="d-none"
                      onChange={e => handleFileChange(user_id, doc.type_doc_id, e.target.files[0])}
                      disabled={isUploading}
                    />
                  </label>
                  
                  <button
                    className="btn btn-sm position-relative overflow-hidden"
                    onClick={() => handleDelete(user_id, doc.type_doc_id)}
                    disabled={isUploading}
                    style={{ 
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      padding: '6px 8px',
                      background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
                      border: 'none',
                      color: 'white',
                      fontWeight: '600',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 107, 107, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Icon icon="mdi:trash-can-outline" style={{ fontSize: '0.9rem' }} />
                  </button>
                </div>
              </>
            ) : (
              // Actions pour document manquant - Simplifié avec bouton à côté de l'icône
              <div className="text-center mb-2">
                <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                  <div 
                    className="d-inline-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: '40px',
                      height: '40px',
                      background: 'linear-gradient(135deg, #ff6b6b20 0%, #ee5a5220 100%)',
                      border: '2px dashed #ff6b6b'
                    }}
                  >
                    <Icon 
                      icon="mdi:cloud-upload-outline" 
                      style={{ fontSize: '1.5rem', color: '#ff6b6b' }}
                    />
                  </div>
                  <label
                    className="btn btn-sm position-relative overflow-hidden"
                    style={{ 
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      padding: '6px 12px',
                      fontWeight: '600',
                      background: fileSelected 
                        ? 'linear-gradient(135deg, #ffd93d 0%, #ff9800 100%)' 
                        : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
                      color: 'white',
                      border: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = fileSelected 
                        ? '0 4px 8px rgba(255, 217, 61, 0.3)'
                        : '0 4px 8px rgba(255, 107, 107, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Icon 
                      icon={fileSelected ? "mdi:file-check-outline" : "mdi:plus-circle-outline"} 
                      className="me-1" 
                      style={{ fontSize: '0.9rem' }}
                    />
                    {fileSelected ? 'Fichier sélectionné' : 'Choisir un fichier'}
                    <input
                      type="file"
                      className="d-none"
                      onChange={e => handleFileChange(user_id, doc.type_doc_id, e.target.files[0])}
                      disabled={isUploading}
                    />
                  </label>
                </div>
               
              </div>
            )}

            {/* Bouton upload/envoyer pour tous */}
            <div className="d-flex gap-2">
              {/* Bouton envoyer créatif */}
              {fileSelected && (
                <button
                  className="btn btn-sm position-relative overflow-hidden flex-1"
                  onClick={() => handleUpload(user_id, doc.type_doc_id)}
                  disabled={isUploading}
                  style={{ 
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    padding: '10px 15px',
                    fontWeight: '600',
                    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                    border: 'none',
                    color: 'white',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isUploading) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 8px 15px rgba(40, 167, 69, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div className="d-flex align-items-center justify-content-center gap-1">
                    {isUploading ? (
                      <>
                        <Icon icon="mdi:loading" className="fa-spin" style={{ fontSize: '1rem' }} />
                        <span>Envoi...</span>
                      </>
                    ) : (
                      <>
                        <Icon icon="mdi:rocket-launch" style={{ fontSize: '1rem' }} />
                        <span>Envoyer</span>
                      </>
                    )}
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <div className="container">
        {/* En-tête moderne */}
        <div className="card border-0 shadow-lg rounded-4 mb-4 overflow-hidden">
          <div className="card-body p-4" style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <div className="p-3 rounded-circle bg-white shadow-sm">
                  <Icon icon="mdi:file-document-multiple-outline" style={{ fontSize: '2rem', color: '#667eea' }} />
                </div>
                <div>
                  <h1 className="fw-bold mb-1 fs-4 fs-md-2 fs-lg-1" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>Documents des Utilisateurs</h1>
                  <p className="mb-0 opacity-90">Gérez et suivez les documents de tous les employés</p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-3">
                <button
                  className="btn btn-success d-flex align-items-center gap-2"
                  onClick={exportAllUsersDocs}
                  style={{
                    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 20px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 8px 15px rgba(40, 167, 69, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Icon icon="mdi:microsoft-excel" style={{ fontSize: '1.2rem' }} />
                  Exporter Tous
                </button>
                <span className="badge d-flex align-items-center gap-1 px-3 py-2" style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '25px',
                  fontWeight: '600'
                }}>
                  <Icon icon="mdi:account-group" />
                  {totalFiltered} utilisateur{totalFiltered > 1 ? 's' : ''}
                  {contractType === 'client' && ` (Clients)`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres modernes */}
        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-4">
            <div className="row g-3 align-items-end">
              <div className="col-md-4">
                <label className="form-label fw-semibold d-flex align-items-center gap-2 mb-2">
                  <Icon icon="mdi:magnify" className="text-primary" />
                  Recherche
                </label>
                <input
                  className="form-control"
                  placeholder="Rechercher nom, prénom ou CIN..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ borderRadius: '12px', border: '2px solid #e9ecef' }}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold d-flex align-items-center gap-2 mb-2">
                  <Icon icon="mdi:office-building" className="text-primary" />
                  Département
                </label>
                <select
                  className="form-select"
                  value={selectedDepartment}
                  onChange={e => setSelectedDepartment(e.target.value)}
                  style={{ borderRadius: '12px', border: '2px solid #e9ecef' }}
                >
                  <option value="">Tous les départements</option>
                  {departments.map(dep => (
                    <option key={dep.id} value={dep.id}>{dep.nom}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold d-flex align-items-center gap-2 mb-2">
                  <Icon icon="mdi:account-badge" className="text-primary" />
                  Type de contrat
                </label>
                <select
                  className="form-select"
                  value={contractType}
                  onChange={e => setContractType(e.target.value)}
                  style={{ borderRadius: '12px', border: '2px solid #e9ecef' }}
                >
                  <option value="">Tous</option>
                  <option value="permanent">Permanent</option>
                  <option value="temporaire">Temporaire</option>
                  <option value="client">Client</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold d-flex align-items-center gap-2 mb-2">
                  <Icon icon="mdi:filter" className="text-primary" />
                  Statut
                </label>
                <select
                  className="form-select"
                  value={onlyCompleted}
                  onChange={e => setOnlyCompleted(e.target.value)}
                  style={{ borderRadius: '12px', border: '2px solid #e9ecef' }}
                >
                  <option value="">Tous les statuts</option>
                  <option value="complet">Utilisateurs complets</option>
                  <option value="incomplet">Utilisateurs incomplets</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des utilisateurs avec accordéon moderne (paginated) */}
        <div className="space-y-4">
          {pageUsers.map((user) => {
            // Cherche la liste des docs de ce user dans userDocs (tableau de tableaux)
            const applicableTypes = getApplicableTypeDocs(user);
            const userDocList = (userDocs.find(arr => arr[0]?.user_id === user.id)) || [];
            const allDocsForUser = getAllUserDocsForUser(userDocList, applicableTypes, user.id);
            const nbFournis = allDocsForUser.filter(d => d.is_provided).length;

            return (
              <div className="card border-0 shadow-sm rounded-4 mb-3 overflow-hidden" key={user.id} style={{
                transition: 'all 0.3s ease',
                transform: openUser === user.id ? 'scale(1.02)' : 'scale(1)'
              }}>
                {/* En-tête utilisateur */}
                <div
                  className="card-header border-0 p-0"
                  style={{
                    background: openUser === user.id 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => setOpenUser(openUser === user.id ? null : user.id)}
                >
                  <div className="p-4 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      <div className={`p-2 rounded-circle ${openUser === user.id ? 'bg-white bg-opacity-20' : 'bg-primary bg-opacity-10'}`}>
                        <Icon 
                          icon="mdi:account" 
                          style={{ 
                            fontSize: '1.5rem',
                            color: openUser === user.id ? 'white' : '#667eea'
                          }} 
                        />
                      </div>
                      <div>
                        <h5 className={`fw-bold mb-1 ${openUser === user.id ? 'text-white' : 'text-dark'}`}>
                          {user.name} {user.prenom}
                        </h5>
                        <span className={`small ${openUser === user.id ? 'text-white opacity-80' : 'text-muted'}`}>
                          CIN: {user.cin || "Non défini"}
                        </span>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                      <span 
                        className="badge px-3 py-2 rounded-pill fw-semibold"
                        style={{ 
                          fontSize: '0.9rem',
                          background: nbFournis === applicableTypes.length 
                            ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                            : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
                          color: 'white',
                          border: 'none'
                        }}
                      >
                        {nbFournis === applicableTypes.length 
                          ? '✓ Complet' 
                          : `⚠ ${nbFournis}/${applicableTypes.length} documents`
                        }
                      </span>
                      <button
                        className="btn btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportUserDocs(user);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                          border: 'none',
                          color: 'white',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontWeight: '600',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(23, 162, 184, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        title="Exporter le rapport des documents Excel"
                      >
                        <Icon icon="mdi:microsoft-excel" className="me-1" />
                        Excel
                      </button>
                      <Icon 
                        icon={openUser === user.id ? "mdi:chevron-up" : "mdi:chevron-down"} 
                        style={{ 
                          fontSize: '1.5rem',
                          color: openUser === user.id ? 'white' : '#6c757d',
                          transition: 'transform 0.3s ease'
                        }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Contenu accordéon */}
                <div className={`collapse ${openUser === user.id ? "show" : ""}`} style={{ transition: 'all 0.3s ease' }}>
                  <div className="card-body p-4" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)' }}>
                    <div className="row g-3">
                      {allDocsForUser.map((doc) => (
                        <div className="col-12 col-md-6 col-lg-4" key={doc.type_doc_id}>
                          <DocCard doc={doc} user_id={user.id} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination controls */}
        <div className="d-flex justify-content-between align-items-center mt-4 flex-wrap gap-3">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted">Afficher</span>
            <select
              className="form-select form-select-sm w-auto"
              value={perPage >= totalFiltered ? 'all' : perPage}
              onChange={handleChangePerPage}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="all">Tous</option>
            </select>
            <span className="text-muted">entrées</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <Icon icon="mdi:chevron-left" />
              <span className="d-none d-md-inline">Précédent</span>
            </button>
            <div className="d-none d-sm-flex gap-1">
              {getPageNumbers().map(n => (
                <button
                  key={n}
                  className={`btn btn-sm ${n === currentPage ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => goToPage(n)}
                >{n}</button>
              ))}
            </div>
            <div className="d-flex d-sm-none align-items-center gap-1">
              <select
                value={currentPage}
                onChange={e => goToPage(Number(e.target.value))}
                className="form-select form-select-sm"
                style={{ width: 70 }}
              >
                {getPageNumbers().map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span style={{ fontSize: 12 }}>/ {totalPages}</span>
            </div>
            <button
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <span className="d-none d-md-inline">Suivant</span>
              <Icon icon="mdi:chevron-right" />
            </button>
          </div>
          <div className="text-muted small">
            Page {currentPage} / {totalPages} — {pageUsers.length} affiché{pageUsers.length !== 1 ? 's' : ''} sur {totalFiltered}
          </div>
        </div>

        {/* CSS pour les animations */}
        <style>{`
          .card:hover {
            box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
          }
          .btn:hover {
            transform: translateY(-1px);
            transition: transform 0.2s ease;
          }
          .form-control:focus, .form-select:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
          }
          .space-y-4 > * + * {
            margin-top: 1rem;
          }
        `}</style>
      </div>
    </div>
  );
};

export default UserDocsPage;
