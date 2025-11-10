
// src/redux/slices/publicationSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/axios';

// Fetch all publications visibles pour l'utilisateur
export const fetchPublications = createAsyncThunk(
  'publications/fetchAll',
  async (params = {}, thunkAPI) => {
    try {
      // Ajoute dynamiquement les filtres à l'URL (ex: type, statut)
      let url = '/publications';
      const query = [];
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          query.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
      });
      if (query.length > 0) url += '?' + query.join('&');

      const res = await api.get(url);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue('Erreur lors du chargement des publications');
    }
  }
);

// Créer une publication (news ou sondage)
export const createPublication = createAsyncThunk(
  'publications/create',
  async (data, thunkAPI) => {
    try {
      const res = await api.post('/publications', data);
      return res.data;
    } catch (err) {
      // On retourne l'erreur du backend si dispo
      const errorMsg = err.response?.data?.message || 'Erreur lors de la création';
      return thunkAPI.rejectWithValue(errorMsg);
    }
  }
);
// src/redux/slices/publicationSlice.js
export const updatePublication = createAsyncThunk(
  'publications/update',
  async (data, thunkAPI) => {
    try {
      const res = await api.put(`/publications/${data.id}/statut`, data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Erreur lors de la modification';
      return thunkAPI.rejectWithValue(errorMsg);
    }
  }
);
export const deletePublication = createAsyncThunk(
  'publications/delete',
  async (id, thunkAPI) => {
    try {
      await api.delete(`/publications/${id}`);
      return id;
    } catch (err) {
      return thunkAPI.rejectWithValue('Erreur lors de la suppression');
    }
  }
);

// Suppression multiple
export const deletePublications = createAsyncThunk(
  'publications/deleteMany',
  async (ids, thunkAPI) => {
    try {
      await api.post('/publications/bulk-delete', { ids });
      return ids;
    } catch (err) {
      return thunkAPI.rejectWithValue('Erreur lors de la suppression multiple');
    }
  }
);

const publicationSlice = createSlice({
  name: 'publications',
  initialState: {
    items: [],
    loading: false,
    error: null,
    creationStatus: null, // success/fail
    creationError: null,
    updateStatus: null,
    updateError: null,
  },
  reducers: {
    resetCreationStatus(state) {
      state.creationStatus = null;
      state.creationError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Update publication
      .addCase(updatePublication.pending, (state) => {
        state.updateStatus = null;
        state.updateError = null;
      })
      .addCase(updatePublication.fulfilled, (state, action) => {
        state.updateStatus = 'success';
        // Remplacer la publication modifiée dans items
        const idx = state.items.findIndex(p => p.id === action.payload.id);
        if (idx !== -1) {
          state.items[idx] = action.payload;
        }
      })
      .addCase(updatePublication.rejected, (state, action) => {
        state.updateStatus = 'fail';
        state.updateError = action.payload;
      })
      .addCase(fetchPublications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchPublications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createPublication.pending, (state) => {
        state.creationStatus = null;
        state.creationError = null;
      })
      .addCase(createPublication.fulfilled, (state, action) => {
        state.creationStatus = 'success';
        state.items.unshift(action.payload); // Optionnel, pour voir direct le nouveau
      })
      .addCase(createPublication.rejected, (state, action) => {
        state.creationStatus = 'fail';
        state.creationError = action.payload;
      })
      .addCase(deletePublication.fulfilled, (state, action) => {
        state.items = state.items.filter(p => p.id !== action.payload);
      })
      .addCase(deletePublications.fulfilled, (state, action) => {
        state.items = state.items.filter(p => !action.payload.includes(p.id));
      });;
  }
});

export const { resetCreationStatus } = publicationSlice.actions;

export default publicationSlice.reducer;
