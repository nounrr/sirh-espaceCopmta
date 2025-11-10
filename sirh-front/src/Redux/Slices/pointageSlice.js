// src/redux/slices/pointageSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/axios';

// --- Thunks asynchrones (CRUD) ---
export const fetchPointages = createAsyncThunk(
  'pointages/fetchPointages',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/pointages');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const createPointage = createAsyncThunk(
  'pointages/createPointage',
  async (pointageData, { rejectWithValue }) => {
    try {
      const response = await api.post('/pointages', pointageData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const updatePointage = createAsyncThunk(
  'pointages/updatePointage',
  async (updates, { rejectWithValue }) => {
    try {
      const response = await api.put('/pointages', updates);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deletePointages = createAsyncThunk(
  'pointages/deletePointages',
  async (ids, { rejectWithValue }) => {
    try {
      await api.delete('/pointages', { data: { ids } });
      return ids;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const validerPointage = createAsyncThunk(
  'pointages/validerPointage',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.put(`/pointages/${id}/valider`);
      return response.data.pointage;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const invaliderPointage = createAsyncThunk(
  'pointages/invaliderPointage',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.put(`/pointages/${id}/invalider`);
      return response.data.pointage;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// --- Utils pour filtrer selon période ---
const isInSelectedPeriod = (pointage, periode, dates) => {
  if (periode === 'jour' && dates.date) {
    return pointage.date === dates.date;
  }
  if (periode === 'semaine' && dates.dateDebut && dates.dateFin) {
    return pointage.date >= dates.dateDebut && pointage.date <= dates.dateFin;
  }
  if (periode === 'mois' && dates.mois) {
    return pointage.date.startsWith(dates.mois); // YYYY-MM
  }
  return true;
};

// --- Slice Redux ---
const pointageSlice = createSlice({
  name: 'pointages',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
    selectedUserId: null,
    selectedPeriode: 'jour', // 'jour', 'semaine', 'mois'
    selectedDates: {
      date: null,      // 'YYYY-MM-DD'
      dateDebut: null, // 'YYYY-MM-DD'
      dateFin: null,   // 'YYYY-MM-DD'
      mois: null       // 'YYYY-MM'
    }
  },
  reducers: {
    setSelectedUserId: (state, action) => {
      state.selectedUserId = action.payload;
    },
    clearSelectedUserId: (state) => {
      state.selectedUserId = null;
    },
    setSelectedPeriode: (state, action) => {
      state.selectedPeriode = action.payload;
    },
    setSelectedDates: (state, action) => {
      state.selectedDates = { ...state.selectedDates, ...action.payload };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPointages.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPointages.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchPointages.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Create
      .addCase(createPointage.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createPointage.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.push(action.payload);
      })
      .addCase(createPointage.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Update
      .addCase(updatePointage.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updatePointage.fulfilled, (state, action) => {
        const updated = Array.isArray(action.payload) ? action.payload : [action.payload];
        updated.forEach(update => {
          const index = state.items.findIndex(pointage => pointage.id === update.id);
          if (index !== -1) {
            state.items[index] = { ...state.items[index], ...update };
          }
        });
        state.status = 'succeeded';
      })
      .addCase(updatePointage.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Delete
      .addCase(deletePointages.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deletePointages.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter(p => !action.payload.includes(p.id));
      })
      .addCase(deletePointages.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Valider
      .addCase(validerPointage.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(validerPointage.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(validerPointage.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Invalider
      .addCase(invaliderPointage.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(invaliderPointage.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(invaliderPointage.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

// --- Selecteur pour pointages filtrés (user & période) ---
export const getPointagesOfSelectedUserAndPeriod = (state) => {
  const { selectedUserId, items, selectedPeriode, selectedDates } = state.pointages;
  if (!selectedUserId) return [];
  return items.filter(
    p =>
      p.user_id === selectedUserId &&
      isInSelectedPeriod(p, selectedPeriode, selectedDates)
  );
};

// --- Exports actions & reducer ---
export const {
  setSelectedUserId,
  clearSelectedUserId,
  setSelectedPeriode,
  setSelectedDates
} = pointageSlice.actions;

export default pointageSlice.reducer;
