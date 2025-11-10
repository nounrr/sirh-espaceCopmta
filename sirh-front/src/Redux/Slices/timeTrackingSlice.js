import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../config/axios';

export const startTaskTimer = createAsyncThunk('timeTracking/start', async (taskId, thunkAPI) => {
  try {
    const res = await api.post(`/tasks/${taskId}/start`);
    return { taskId, entry: res.data };
  } catch (e) { return thunkAPI.rejectWithValue(e.response?.data || { message: 'Erreur start' }); }
});

export const stopTaskTimer = createAsyncThunk('timeTracking/stop', async (taskId, thunkAPI) => {
  try {
    const res = await api.post(`/tasks/${taskId}/stop`);
    return { taskId, entry: res.data };
  } catch (e) { return thunkAPI.rejectWithValue(e.response?.data || { message: 'Erreur stop' }); }
});

export const updateTaskProgress = createAsyncThunk('timeTracking/progress', async ({ taskId, pourcentage, comment }, thunkAPI) => {
  try {
    const res = await api.post(`/tasks/${taskId}/progress`, { pourcentage, comment });
    return { taskId, log: res.data };
  } catch (e) { return thunkAPI.rejectWithValue(e.response?.data || { message: 'Erreur progression' }); }
});

export const fetchTimesheet = createAsyncThunk('timeTracking/timesheet', async ({ from, to, userId }, thunkAPI) => {
  try {
    const params = { from, to };
    if (userId) params.user_id = userId;
    const res = await api.get('/timesheet', { params });
    return res.data;
  } catch (e) { return thunkAPI.rejectWithValue(e.response?.data || { message: 'Erreur timesheet' }); }
});

export const fetchTimeAnalytics = createAsyncThunk('timeTracking/analytics', async ({ from, to }, thunkAPI) => {
  try {
    const res = await api.get('/analytics/time', { params: { from, to } });
    return res.data;
  } catch (e) { return thunkAPI.rejectWithValue(e.response?.data || { message: 'Erreur analytics' }); }
});

const slice = createSlice({
  name: 'timeTracking',
  initialState: {
    activeEntries: {}, // { taskId: entry }
    timesheet: null,
    analytics: null,
    loading: false,
    error: null,
    progressLogsByTask: {},
  },
  reducers: {
    clearTimeTrackingError(state){ state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startTaskTimer.pending, (s)=>{ s.loading = true; s.error=null; })
      .addCase(startTaskTimer.fulfilled, (s,a)=>{ s.loading=false; s.activeEntries[a.payload.taskId]=a.payload.entry; })
      .addCase(startTaskTimer.rejected, (s,a)=>{ s.loading=false; s.error=a.payload?.message; })
      .addCase(stopTaskTimer.pending, (s)=>{ s.loading = true; s.error=null; })
      .addCase(stopTaskTimer.fulfilled, (s,a)=>{ s.loading=false; delete s.activeEntries[a.payload.taskId]; })
      .addCase(stopTaskTimer.rejected, (s,a)=>{ s.loading=false; s.error=a.payload?.message; })
      .addCase(updateTaskProgress.fulfilled, (s,a)=>{ const { taskId, log } = a.payload; if(!s.progressLogsByTask[taskId]) s.progressLogsByTask[taskId]=[]; s.progressLogsByTask[taskId].unshift(log); })
      .addCase(fetchTimesheet.pending,(s)=>{ s.loading=true; s.error=null; })
      .addCase(fetchTimesheet.fulfilled,(s,a)=>{ s.loading=false; s.timesheet=a.payload; })
      .addCase(fetchTimesheet.rejected,(s,a)=>{ s.loading=false; s.error=a.payload?.message; })
      .addCase(fetchTimeAnalytics.pending,(s)=>{ s.loading=true; s.error=null; })
      .addCase(fetchTimeAnalytics.fulfilled,(s,a)=>{ s.loading=false; s.analytics=a.payload; })
      .addCase(fetchTimeAnalytics.rejected,(s,a)=>{ s.loading=false; s.error=a.payload?.message; })
  }
});

export const { clearTimeTrackingError } = slice.actions;
export default slice.reducer;