import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/axios';

// Fetch holidays
export const fetchHolidays = createAsyncThunk(
  'holidays/fetchHolidays',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/jours-feries");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Add holiday
export const addHoliday = createAsyncThunk(
  'holidays/addHoliday',
  async (holidayData, { rejectWithValue }) => {
    try {
      // Format data according to backend expectations
      const formattedData = {
        date: holidayData.date,
        nom: holidayData.nom,
        description: holidayData.description || null,
        actif: holidayData.actif !== undefined ? holidayData.actif : true
      };
      
      const response = await api.post("/jours-feries", formattedData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Update holiday
export const updateHoliday = createAsyncThunk(
  'holidays/updateHoliday',
  async (holidayData, { rejectWithValue }) => {
    try {
      // Format data according to backend expectations
      const formattedData = {
        date: holidayData.date,
        nom: holidayData.nom,
        description: holidayData.description || null,
        actif: holidayData.actif !== undefined ? holidayData.actif : true
      };
      
      const response = await api.put(`/jours-feries/${holidayData.id}`, formattedData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Delete holiday
export const deleteHoliday = createAsyncThunk(
  'holidays/deleteHoliday',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/jours-feries/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Get holidays by year
export const fetchHolidaysByYear = createAsyncThunk(
  'holidays/fetchHolidaysByYear',
  async (year, { rejectWithValue }) => {
    try {
      const response = await api.get(`/jours-feries/year/${year}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Get holidays by date range
export const fetchHolidaysByDateRange = createAsyncThunk(
  'holidays/fetchHolidaysByDateRange',
  async ({ startDate, endDate }, { rejectWithValue }) => {
    try {
      const response = await api.post('/jours-feries/date-range', {
        start_date: startDate,
        end_date: endDate
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const holidaySlice = createSlice({
  name: 'holidays',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch holidays
      .addCase(fetchHolidays.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchHolidays.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchHolidays.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Add holiday
      .addCase(addHoliday.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(addHoliday.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.push(action.payload);
      })
      .addCase(addHoliday.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Update holiday
      .addCase(updateHoliday.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateHoliday.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateHoliday.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Delete holiday
      .addCase(deleteHoliday.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteHoliday.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter(item => item.id !== action.payload);
      })
      .addCase(deleteHoliday.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Fetch holidays by year
      .addCase(fetchHolidaysByYear.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchHolidaysByYear.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchHolidaysByYear.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Fetch holidays by date range
      .addCase(fetchHolidaysByDateRange.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchHolidaysByDateRange.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchHolidaysByDateRange.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearError } = holidaySlice.actions;
export default holidaySlice.reducer;
