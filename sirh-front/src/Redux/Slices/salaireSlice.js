import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/axios';

// Actions asynchrones
export const fetchSalaires = createAsyncThunk(
  'salaires/fetchSalaires',
  async ({ page = 1, search = '', user_id = null } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      
      if (search) params.append('search', search);
      if (user_id) params.append('user_id', user_id);
  params.append('page', page);
  // On récupère tous les salaires d'un coup pour éviter les problèmes d'association utilisateurs/salaires
  params.append('per_page', 'all');

      const response = await api.get(`/salaires?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la récupération des salaires');
    }
  }
);

export const fetchSalaireById = createAsyncThunk(
  'salaires/fetchSalaireById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/salaires/${id}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la récupération du salaire');
    }
  }
);

export const createSalaire = createAsyncThunk(
  'salaires/createSalaire',
  async (salaireData, { rejectWithValue }) => {
    try {
      const response = await api.post(`/salaires`, salaireData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la création du salaire');
    }
  }
);

export const updateSalaire = createAsyncThunk(
  'salaires/updateSalaire',
  async ({ id, ...salaireData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/salaires/${id}`, salaireData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la mise à jour du salaire');
    }
  }
);

export const deleteSalaire = createAsyncThunk(
  'salaires/deleteSalaire',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/salaires/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la suppression du salaire');
    }
  }
);

export const fetchSalaireActuel = createAsyncThunk(
  'salaires/fetchSalaireActuel',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/${userId}/salaire-actuel`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Aucun salaire trouvé');
    }
  }
);

export const fetchHistoriqueSalaires = createAsyncThunk(
  'salaires/fetchHistoriqueSalaires',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/${userId}/salaires-historique`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la récupération de l\'historique');
    }
  }
);

export const fetchStatistiquesSalaires = createAsyncThunk(
  'salaires/fetchStatistiquesSalaires',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`/salaires-statistiques`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la récupération des statistiques');
    }
  }
);

// Slice
const salaireSlice = createSlice({
  name: 'salaires',
  initialState: {
    // Liste des salaires
    salaires: {
      data: [],
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: 0,
    },
    
    // Salaire actuel sélectionné
    selectedSalaire: null,
    
    // Historique d'un utilisateur
    historique: [],
    
    // Statistiques
    statistiques: {
      total_employes: 0,
      salaire_moyen: 0,
      salaire_min: 0,
      salaire_max: 0,
      masse_salariale_base: 0,
      masse_salariale_totale: 0,
      total_panier: 0,
      total_represent: 0,
      total_transport: 0,
      total_deplacement: 0,
    },
    
    // États de chargement
    loading: {
      list: false,
      create: false,
      update: false,
      delete: false,
      stats: false,
      historique: false,
    },
    
    // Erreurs
    error: null,
    
    // Filtres et recherche
    filters: {
      search: '',
      user_id: null,
      page: 1,
    },
  },
  reducers: {
    // Actions synchrones
    clearError: (state) => {
      state.error = null;
    },
    
    clearSelectedSalaire: (state) => {
      state.selectedSalaire = null;
    },
    
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    resetFilters: (state) => {
      state.filters = {
        search: '',
        user_id: null,
        page: 1,
      };
    },
    
    clearHistorique: (state) => {
      state.historique = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch salaires
      .addCase(fetchSalaires.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchSalaires.fulfilled, (state, action) => {
        state.loading.list = false;
        state.salaires = action.payload;
      })
      .addCase(fetchSalaires.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload;
      })
      
      // Fetch salaire by ID
      .addCase(fetchSalaireById.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchSalaireById.fulfilled, (state, action) => {
        state.loading.list = false;
        state.selectedSalaire = action.payload;
      })
      .addCase(fetchSalaireById.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload;
      })
      
      // Create salaire
      .addCase(createSalaire.pending, (state) => {
        state.loading.create = true;
        state.error = null;
      })
      .addCase(createSalaire.fulfilled, (state, action) => {
        state.loading.create = false;
        // Ajouter le nouveau salaire à la liste si on est sur la première page
        if (state.filters.page === 1) {
          state.salaires.data.unshift(action.payload);
          state.salaires.total += 1;
        }
      })
      .addCase(createSalaire.rejected, (state, action) => {
        state.loading.create = false;
        state.error = action.payload;
      })
      
      // Update salaire
      .addCase(updateSalaire.pending, (state) => {
        state.loading.update = true;
        state.error = null;
      })
      .addCase(updateSalaire.fulfilled, (state, action) => {
        state.loading.update = false;
        // Mettre à jour dans la liste
        const index = state.salaires.data.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.salaires.data[index] = action.payload;
        }
        // Mettre à jour le salaire sélectionné si c'est le même
        if (state.selectedSalaire?.id === action.payload.id) {
          state.selectedSalaire = action.payload;
        }
      })
      .addCase(updateSalaire.rejected, (state, action) => {
        state.loading.update = false;
        state.error = action.payload;
      })
      
      // Delete salaire
      .addCase(deleteSalaire.pending, (state) => {
        state.loading.delete = true;
        state.error = null;
      })
      .addCase(deleteSalaire.fulfilled, (state, action) => {
        state.loading.delete = false;
        // Supprimer de la liste
        state.salaires.data = state.salaires.data.filter(s => s.id !== action.payload);
        state.salaires.total -= 1;
        // Clear selected si c'était celui-ci
        if (state.selectedSalaire?.id === action.payload) {
          state.selectedSalaire = null;
        }
      })
      .addCase(deleteSalaire.rejected, (state, action) => {
        state.loading.delete = false;
        state.error = action.payload;
      })
      
      // Fetch salaire actuel
      .addCase(fetchSalaireActuel.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchSalaireActuel.fulfilled, (state, action) => {
        state.loading.list = false;
        state.selectedSalaire = action.payload;
      })
      .addCase(fetchSalaireActuel.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload;
      })
      
      // Fetch historique
      .addCase(fetchHistoriqueSalaires.pending, (state) => {
        state.loading.historique = true;
        state.error = null;
      })
      .addCase(fetchHistoriqueSalaires.fulfilled, (state, action) => {
        state.loading.historique = false;
        state.historique = action.payload;
      })
      .addCase(fetchHistoriqueSalaires.rejected, (state, action) => {
        state.loading.historique = false;
        state.error = action.payload;
      })
      
      // Fetch statistiques
      .addCase(fetchStatistiquesSalaires.pending, (state) => {
        state.loading.stats = true;
        state.error = null;
      })
      .addCase(fetchStatistiquesSalaires.fulfilled, (state, action) => {
        state.loading.stats = false;
        state.statistiques = action.payload;
      })
      .addCase(fetchStatistiquesSalaires.rejected, (state, action) => {
        state.loading.stats = false;
        state.error = action.payload;
      });
  },
});

// Export des actions
export const {
  clearError,
  clearSelectedSalaire,
  setFilters,
  resetFilters,
  clearHistorique,
} = salaireSlice.actions;

// Export du reducer
export default salaireSlice.reducer;