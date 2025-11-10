import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/axios';  
import { toErrorMessage } from '../../utils/errorUtils';


export const fetchDepartments = createAsyncThunk(
  'departments/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/departements");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || toErrorMessage(error));
    }
  }
);

export const createDepartment = createAsyncThunk(
  'departments/create',
  async (departmentData, { rejectWithValue }) => {
    try {
      const formattedData = {
        nom: departmentData.nom,
        description: departmentData.description || null
      };
      const response = await api.post("/departements", formattedData);
      return response.data;
    } catch (error) {
      console.error('Error creating department:', error.response?.data);
      return rejectWithValue(error.response?.data || toErrorMessage(error));
    }
  }
);

export const updateDepartment = createAsyncThunk(
  'departments/update',
  async (departmentData, { rejectWithValue }) => {
    try {
      // Format the data as expected by the backend
      const formattedData = [{
        id: departmentData.id,
        nom: departmentData.nom,
        description: departmentData.description || null
      }];

      const response = await api.put("/departements", formattedData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || toErrorMessage(error));
    }
  }
);

export const deleteDepartments = createAsyncThunk(
  'departments/delete',
  async (ids, { rejectWithValue }) => {
    try {
      await api.delete("/departements", { data: { ids } });
      return ids;
    } catch (error) {
      return rejectWithValue(error.response?.data || toErrorMessage(error));
    }
  }
);


const departmentSlice = createSlice({
  name: 'departments',
  initialState: {
    items: [],
    status: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch departments
      .addCase(fetchDepartments.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.status = 'failed';
        state.error = toErrorMessage(action.payload);
      })
      // Create department
      .addCase(createDepartment.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createDepartment.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.push(action.payload);
      })
      .addCase(createDepartment.rejected, (state, action) => {
        state.status = 'failed';
        state.error = toErrorMessage(action.payload);
      })
      // Update department
      .addCase(updateDepartment.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateDepartment.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateDepartment.rejected, (state, action) => {
        state.status = 'failed';
        state.error = toErrorMessage(action.payload);
      })
      // Delete departments
      .addCase(deleteDepartments.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteDepartments.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter(item => !action.payload.includes(item.id));
      })
      .addCase(deleteDepartments.rejected, (state, action) => {
        state.status = 'failed';
        state.error = toErrorMessage(action.payload);
      });
   
      
  }
});

export default departmentSlice.reducer; 