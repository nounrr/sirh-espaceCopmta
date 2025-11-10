import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/axios';

export const fetchProjects = createAsyncThunk(
  'projects/fetchAll',
  async (_, thunkAPI) => {
    try {
      const res = await api.get('/projects');
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue('Erreur lors du chargement des projets');
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/create',
  async (data, thunkAPI) => {
    try {
      const res = await api.post('/projects', data);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue('Erreur lors de la création du projet');
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/update',
  async ({ id, ...data }, thunkAPI) => {
    try {
      const res = await api.put(`/projects/${id}`, data);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue('Erreur lors de la modification du projet');
    }
  }
);

export const deleteProject = createAsyncThunk(
  'projects/delete',
  async (id, thunkAPI) => {
    try {
      await api.delete(`/projects/${id}`);
      return id;
    } catch (err) {
      return thunkAPI.rejectWithValue('Erreur lors de la suppression du projet');
    }
  }
);

const projectSlice = createSlice({
  name: 'projects',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        const idx = state.items.findIndex(p => p.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.items = state.items.filter(p => p.id !== action.payload);
      });
  },
});

export default projectSlice.reducer;
