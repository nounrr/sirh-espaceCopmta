import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_ENDPOINTS } from '../../config/api';
import api from '../../config/axios';
import { toErrorMessage } from '../../utils/errorUtils';

// Async thunks
export const fetchAbsenceRequests = createAsyncThunk(
  'absenceRequests/fetchAbsenceRequests',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(API_ENDPOINTS.ABSENCE_REQUESTS.BASE, {
        params: {
          include: 'user'
        }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || toErrorMessage(error));
    }
  }
);

export const createAbsenceRequest = createAsyncThunk(
  'absenceRequests/createAbsenceRequest',
  async (formData, { rejectWithValue }) => {
    try {
      // Log the FormData contents
      console.log('Create FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File(${value.name}, ${value.type}, ${value.size} bytes)`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }

      const response = await api.post(API_ENDPOINTS.ABSENCE_REQUESTS.BASE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating absence request:', error.response?.data);
      return rejectWithValue(error.response?.data || toErrorMessage(error));
    }
  }
);
export const updateAbsenceRequest = createAsyncThunk(
  'absenceRequest/updateAbsenceRequest',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      console.log('Updating absence request with data:', data);
      
      // If data is already a FormData (from the form), reuse it. Else, build one.
      let formData;
      if (typeof FormData !== 'undefined' && data instanceof FormData) {
        formData = data;
        // ensure _method is present
        if (!formData.has('_method')) formData.append('_method', 'PUT');
      } else {
        formData = new FormData();
        formData.append('_method', 'PUT');
        Object.keys(data || {}).forEach((key) => {
          const value = data[key];
          if (Array.isArray(value)) {
            value.forEach((v) => formData.append(`${key}[]`, v));
          } else {
            formData.append(key, value);
          }
        });
      }

      // Log the FormData contents
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }

      const response = await api.post(
        `/absences/update/${id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error updating absence request:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        return rejectWithValue(error.response.data || toErrorMessage(error));
      }
      return rejectWithValue(toErrorMessage(error));
    }
  }
);

export const deleteAbsenceRequests = createAsyncThunk(
  'absenceRequests/deleteAbsenceRequests',
  async (ids, { rejectWithValue }) => {
    try {
      await api.delete(API_ENDPOINTS.ABSENCE_REQUESTS.BASE, { data: { ids } });
      return ids;
    } catch (error) {
      return rejectWithValue(error.response?.data || toErrorMessage(error));
    }
  }
);

export const updateAbsenceRequestStatus = createAsyncThunk(
  'absenceRequests/updateStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await api.put(API_ENDPOINTS.ABSENCE_REQUESTS.STATUS(id), { status });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || toErrorMessage(error));
    }
  }
);

const absenceRequestSlice = createSlice({
  name: 'absenceRequests',
  initialState: {
    items: [],
    status: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch absence requests
      .addCase(fetchAbsenceRequests.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAbsenceRequests.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchAbsenceRequests.rejected, (state, action) => {
        state.status = 'failed';
        state.error = toErrorMessage(action.payload);
      })
      // Create absence request
      .addCase(createAbsenceRequest.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createAbsenceRequest.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.push(action.payload);
      })
      .addCase(createAbsenceRequest.rejected, (state, action) => {
        state.status = 'failed';
        state.error = toErrorMessage(action.payload);
      })
      // Update absence request
      .addCase(updateAbsenceRequest.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateAbsenceRequest.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateAbsenceRequest.rejected, (state, action) => {
        state.status = 'failed';
        state.error = toErrorMessage(action.payload);
      })
      // Delete absence requests
      .addCase(deleteAbsenceRequests.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteAbsenceRequests.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter(r => !action.payload.includes(r.id));
      })
      .addCase(deleteAbsenceRequests.rejected, (state, action) => {
        state.status = 'failed';
        state.error = toErrorMessage(action.payload);
      })
      // Update status
      .addCase(updateAbsenceRequestStatus.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateAbsenceRequestStatus.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateAbsenceRequestStatus.rejected, (state, action) => {
        state.status = 'failed';
        state.error = toErrorMessage(action.payload);
      });
  }
});

export default absenceRequestSlice.reducer; 