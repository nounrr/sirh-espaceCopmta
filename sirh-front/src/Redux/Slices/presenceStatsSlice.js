// src/redux/slices/presenceStatsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/axios';

export const fetchPresenceStats = createAsyncThunk(
  'presence/fetchStats',
  async (params, thunkAPI) => {
    try {
      let url = '/statistiques/presence?';
      const query = [];

      // Toujours envoyer la période
      if (params.periode) query.push(`periode=${params.periode}`);

      // Ajoute les dates selon la période
      if (params.periode === 'semaine') {
        if (params.dateDebut) query.push(`dateDebut=${params.dateDebut}`);
        if (params.dateFin) query.push(`dateFin=${params.dateFin}`);
      } else if (params.periode === 'mois') {
        if (params.mois) query.push(`mois=${params.mois}`);
      } else {
        if (params.date) query.push(`date=${params.date}`);
      }

      // Ajoute dynamiquement TOUS les autres paramètres restants (hors ceux déjà traités)
      Object.entries(params).forEach(([key, value]) => {
        if (
          !['periode', 'date', 'dateDebut', 'dateFin', 'mois'].includes(key) &&
          value !== undefined &&
          value !== ''
        ) {
          query.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
      });

      url += query.join('&');

      const res = await api.get(url);
      return res.data;
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      return thunkAPI.rejectWithValue('Erreur lors du chargement des statistiques.');
    }
  }
);


const presenceStatsSlice = createSlice({
  name: 'presence',
  initialState: {
    data: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPresenceStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPresenceStats.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchPresenceStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.data = null;
      });
  }
});

export default presenceStatsSlice.reducer;