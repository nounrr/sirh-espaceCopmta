import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/axios';

// Actions asynchrones
export const fetchAudits = createAsyncThunk(
  'audits/fetchAudits',
  async (params = {}) => {
    // Filtrer les paramètres vides pour éviter les erreurs SQL
    const filteredParams = Object.keys(params).reduce((acc, key) => {
      const value = params[key];
      // Inclure seulement les valeurs non vides et non nulles
      if (value !== '' && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});
    
    const response = await api.get('/audits', { params: filteredParams });
    return response.data;
  }
);

export const fetchAuditById = createAsyncThunk(
  'audits/fetchAuditById',
  async (id) => {
    const response = await api.get(`/audits/${id}`);
    return response.data;
  }
);

export const fetchEntityHistory = createAsyncThunk(
  'audits/fetchEntityHistory',
  async ({ entityType, entityId }) => {
    // Vérifier que les paramètres requis ne sont pas vides
    if (!entityType || !entityId) {
      throw new Error('entityType et entityId sont requis');
    }
    
    const response = await api.post('/audits/entity-history', {
      entity_type: entityType,
      entity_id: entityId
    });
    return response.data;
  }
);

export const fetchAuditStats = createAsyncThunk(
  'audits/fetchAuditStats',
  async (params = {}) => {
    // Filtrer les paramètres vides
    const filteredParams = Object.keys(params).reduce((acc, key) => {
      const value = params[key];
      if (value !== '' && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});
    
    const response = await api.get('/audits/dashboard/stats', { params: filteredParams });
    return response.data;
  }
);

const auditSlice = createSlice({
  name: 'audits',
  initialState: {
    items: [],
    currentAudit: null,
    entityHistory: [],
    stats: null,
    status: 'idle',
    error: null,
    pagination: {
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: 0
    }
  },
  reducers: {
    clearCurrentAudit: (state) => {
      state.currentAudit = null;
    },
    clearEntityHistory: (state) => {
      state.entityHistory = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchAudits
      .addCase(fetchAudits.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAudits.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.data || action.payload;
        if (action.payload.meta) {
          state.pagination = {
            current_page: action.payload.meta.current_page,
            last_page: action.payload.meta.last_page,
            per_page: action.payload.meta.per_page,
            total: action.payload.meta.total
          };
        }
      })
      .addCase(fetchAudits.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // fetchAuditById
      .addCase(fetchAuditById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAuditById.fulfilled, (state, action) => {
        state.currentAudit = action.payload;
        state.status = 'succeeded';
      })
      .addCase(fetchAuditById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // fetchEntityHistory
      .addCase(fetchEntityHistory.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchEntityHistory.fulfilled, (state, action) => {
        state.entityHistory = action.payload;
        state.status = 'succeeded';
      })
      .addCase(fetchEntityHistory.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // fetchAuditStats
      .addCase(fetchAuditStats.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAuditStats.fulfilled, (state, action) => {
        state.stats = action.payload;
        state.status = 'succeeded';
      })
      .addCase(fetchAuditStats.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  }
});

export const { clearCurrentAudit, clearEntityHistory } = auditSlice.actions;
export default auditSlice.reducer;
