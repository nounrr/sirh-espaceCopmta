import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_ENDPOINTS } from '../../config/api';
import api from '../../config/axios';

export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { page = 1, perPage = 15, search = '' } = params || {};
      const res = await api.get(API_ENDPOINTS.CLIENTS.BASE, {
        params: {
          page,
          per_page: perPage,
          ...(search ? { search } : {}),
        }
      });
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  }
);

export const createClient = createAsyncThunk(
  'clients/createClient',
  async (clientData, { rejectWithValue }) => {
    try {
      // Force typeContrat = 'Client'
      const data = { ...clientData, typeContrat: 'Client' };
      // Handle file uploads via FormData if picture present
      if (data.picture instanceof File) {
        const form = new FormData();
        Object.entries(data).forEach(([k, v]) => {
          if (v !== undefined && v !== null) form.append(k, v);
        });
        const res = await api.post(API_ENDPOINTS.CLIENTS.BASE, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
      }
      const res = await api.post(API_ENDPOINTS.CLIENTS.BASE, data);
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  }
);

export const updateClient = createAsyncThunk(
  'clients/updateClient',
  async ({ id, ...values }, { rejectWithValue }) => {
    try {
      const form = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (v !== undefined && v !== null) form.append(k, v);
      });
      form.append('_method', 'PUT');
      const res = await api.post(API_ENDPOINTS.CLIENTS.UPDATE(id), form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  }
);

export const deleteClients = createAsyncThunk(
  'clients/deleteClients',
  async (ids, { rejectWithValue }) => {
    try {
      await api.delete(API_ENDPOINTS.CLIENTS.BASE, { data: { ids } });
      return ids;
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  }
);

export const fetchPortefeuilles = createAsyncThunk(
  'clients/fetchPortefeuilles',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔵 Redux: Fetching from', API_ENDPOINTS.CLIENTS.PORTEFEUILLES);
      const res = await api.get(API_ENDPOINTS.CLIENTS.PORTEFEUILLES);
      console.log('🔵 Redux: Received response:', res.data);
      return res.data;
    } catch (e) {
      console.error('🔴 Redux: Error fetching portefeuilles:', e.response?.status, e.response?.data);
      return rejectWithValue(e.response?.data || e.message);
    }
  }
);

const clientsSlice = createSlice({
  name: 'clients',
  initialState: { items: [], portefeuilles: [], meta: null, status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const payload = action.payload;
        state.items = Array.isArray(payload) ? payload : (payload.data || []);
        state.meta = Array.isArray(payload) ? null : (payload.meta || null);
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createClient.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        const idx = state.items.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteClients.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => !action.payload.includes(c.id));
      })
      .addCase(fetchPortefeuilles.fulfilled, (state, action) => {
        console.log('🟢 Redux: Storing portefeuilles in state:', action.payload);
        state.portefeuilles = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchPortefeuilles.rejected, (state, action) => {
        console.error('🔴 Redux: fetchPortefeuilles rejected:', action.payload);
        state.portefeuilles = [];
      });
  }
});

export default clientsSlice.reducer;
