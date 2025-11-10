import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/axios';

// Async thunks
export const fetchSocietes = createAsyncThunk(
  'societes/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/societes");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const createSociete = createAsyncThunk(
  'societes/create',
  async (societeData, { rejectWithValue }) => {
    try {
      const formattedData = {
        nom: societeData.nom,
      };
      const response = await api.post("/societes", formattedData);
      return response.data;
    } catch (error) {
      console.error('Error creating societe:', error.response?.data);
      return rejectWithValue(error.response?.data || 'An error occurred');
    }
  }
);

export const updateSociete = createAsyncThunk(
  'societes/update',
  async (societeData, { rejectWithValue }) => {
    try {
      const formattedData = [{
        id: societeData.id,
        nom: societeData.nom,
      }];
      const response = await api.put("/societes", formattedData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const deleteSocietes = createAsyncThunk(
  'societes/delete',
  async (ids, { rejectWithValue }) => {
    try {
      await api.delete("/societes", { data: { ids } });
      return ids;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const societeSlice = createSlice({
  name: 'societes',
  initialState: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch societes
      .addCase(fetchSocietes.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSocietes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchSocietes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Create societe
      .addCase(createSociete.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createSociete.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.push(action.payload);
      })
      .addCase(createSociete.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Update societe
      .addCase(updateSociete.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateSociete.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateSociete.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Delete societes
      .addCase(deleteSocietes.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteSocietes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter(item => !action.payload.includes(item.id));
      })
      .addCase(deleteSocietes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export default societeSlice.reducer;