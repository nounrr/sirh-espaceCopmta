import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/axios';
import { toErrorMessage } from '../../utils/errorUtils';

// Fetch list (optional filters: societeId, year)
export const fetchChargePersonnels = createAsyncThunk(
  'chargePersonnels/fetchAll',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = {};
      if (filters.societeId) params.societe_id = filters.societeId;
      if (filters.year) params.year = filters.year;
      const { data } = await api.get('/charge-personnels', { params });
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || toErrorMessage(error));
    }
  }
);

// Create (server does upsert by societe_id + mois)
export const createChargePersonnel = createAsyncThunk(
  'chargePersonnels/create',
  async (payload, { rejectWithValue }) => {
    try {
      const formatted = {
        societe_id: payload.societe_id,
        mois: payload.mois, // accepts 'YYYY-MM' or date string
        salaire_permanent: payload.salaire_permanent ?? 0,
        charge_salaire_permanent: payload.charge_salaire_permanent ?? 0,
        salaire_temporaire: payload.salaire_temporaire ?? 0,
        charge_salaire_temp: payload.charge_salaire_temp ?? 0,
        autres_charge: payload.autres_charge ?? 0,
      };
      const { data } = await api.post('/charge-personnels', formatted);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || toErrorMessage(error));
    }
  }
);

// Update by id
export const updateChargePersonnel = createAsyncThunk(
  'chargePersonnels/update',
  async (payload, { rejectWithValue }) => {
    try {
      const { id, ...rest } = payload;
      const formatted = { ...rest };
      // Allow partial updates; backend normalizes mois
      const { data } = await api.put(`/charge-personnels/${id}`, formatted);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || toErrorMessage(error));
    }
  }
);

// Delete multiple by ids (loop client-side)
export const deleteChargePersonnels = createAsyncThunk(
  'chargePersonnels/deleteMany',
  async (ids, { rejectWithValue }) => {
    try {
      await Promise.all((ids || []).map(id => api.delete(`/charge-personnels/${id}`)));
      return ids;
    } catch (error) {
      return rejectWithValue(error.response?.data || toErrorMessage(error));
    }
  }
);

const chargePersonnelSlice = createSlice({
  name: 'chargePersonnels',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchChargePersonnels.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchChargePersonnels.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload || [];
      })
      .addCase(fetchChargePersonnels.rejected, (state, action) => {
        state.status = 'failed';
        state.error = toErrorMessage(action.payload);
      })
      // Create
      .addCase(createChargePersonnel.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createChargePersonnel.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const rec = action.payload;
        const idx = state.items.findIndex(i => i.id === rec.id);
        if (idx >= 0) state.items[idx] = rec; else state.items.push(rec);
      })
      .addCase(createChargePersonnel.rejected, (state, action) => {
        state.status = 'failed';
        state.error = toErrorMessage(action.payload);
      })
      // Update
      .addCase(updateChargePersonnel.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateChargePersonnel.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const rec = action.payload;
        const idx = state.items.findIndex(i => i.id === rec.id);
        if (idx >= 0) state.items[idx] = rec;
      })
      .addCase(updateChargePersonnel.rejected, (state, action) => {
        state.status = 'failed';
        state.error = toErrorMessage(action.payload);
      })
      // Delete many
      .addCase(deleteChargePersonnels.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteChargePersonnels.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const ids = action.payload || [];
        state.items = state.items.filter(item => !ids.includes(item.id));
      })
      .addCase(deleteChargePersonnels.rejected, (state, action) => {
        state.status = 'failed';
        state.error = toErrorMessage(action.payload);
      });
  }
});

export default chargePersonnelSlice.reducer;
