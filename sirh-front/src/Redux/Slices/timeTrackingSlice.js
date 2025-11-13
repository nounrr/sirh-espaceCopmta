import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/axios';

export const fetchActiveEntry = createAsyncThunk(
	'timeTracking/fetchActiveEntry',
	async (taskId, thunkAPI) => {
		try {
			const res = await api.get(`/tasks/${taskId}/active-entry`);
			return { taskId, entry: res.data || null };
		} catch (err) {
			// 403 = not allowed; treat as no entry visible
			if (err.response && (err.response.status === 403 || err.response.status === 404)) {
				return { taskId, entry: null };
			}
			return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur chargement progression active');
		}
	}
);

export const startTaskTimer = createAsyncThunk(
	'timeTracking/startTaskTimer',
	async (taskId, thunkAPI) => {
		try {
			const res = await api.post(`/tasks/${taskId}/start`);
			return { taskId, entry: res.data };
		} catch (err) {
			const msg = err.response?.data?.message || 'Erreur lors du démarrage de la progression';
			return thunkAPI.rejectWithValue(msg);
		}
	}
);

export const stopTaskTimer = createAsyncThunk(
	'timeTracking/stopTaskTimer',
	async (taskId, thunkAPI) => {
		try {
			const res = await api.post(`/tasks/${taskId}/stop`);
			return { taskId, entry: null, last: res.data };
		} catch (err) {
			const msg = err.response?.data?.message || 'Erreur lors de la fin de progression';
			return thunkAPI.rejectWithValue(msg);
		}
	}
);

export const pauseTaskTimer = createAsyncThunk(
	'timeTracking/pauseTaskTimer',
	async (taskId, thunkAPI) => {
		try {
			const res = await api.post(`/tasks/${taskId}/pause`);
			return { taskId, entry: null, last: res.data };
		} catch (err) {
			const msg = err.response?.data?.message || 'Erreur lors de la mise en pause';
			return thunkAPI.rejectWithValue(msg);
		}
	}
);

export const finishTask = createAsyncThunk(
	'timeTracking/finishTask',
	async (taskId, thunkAPI) => {
		try {
			const res = await api.post(`/tasks/${taskId}/finish`);
			return { taskId, result: res.data };
		} catch (err) {
			const msg = err.response?.data?.message || 'Erreur lors de la finalisation';
			return thunkAPI.rejectWithValue(msg);
		}
	}
);

export const fetchMyActiveEntry = createAsyncThunk(
	'timeTracking/fetchMyActiveEntry',
	async (_, thunkAPI) => {
		try {
			const res = await api.get('/my/active-entry');
			return res.data || null;
		} catch (err) {
			if (err.response && (err.response.status === 403 || err.response.status === 404)) {
				return null;
			}
			return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur récupération progression courante');
		}
	}
);

export const fetchMyActiveEntries = createAsyncThunk(
	'timeTracking/fetchMyActiveEntries',
	async (_, thunkAPI) => {
		try {
			const res = await api.get('/my/active-entries');
			return res.data || [];
		} catch (err) {
			if (err.response && (err.response.status === 403 || err.response.status === 404)) {
				return [];
			}
			return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur récupération progressions en cours');
		}
	}
);

// Daily summary for a task (today by default if no date is provided)
export const fetchDailySummary = createAsyncThunk(
	'timeTracking/fetchDailySummary',
	async ({ taskId, date }, thunkAPI) => {
		try {
			const d = date || new Date().toISOString().slice(0, 10);
			const res = await api.get(`/tasks/${taskId}/time-summary`, { params: { date: d } });
			return { taskId, date: d, summary: res.data || { total_minutes: 0, my_minutes: 0 } };
		} catch (err) {
			if (err.response && (err.response.status === 403 || err.response.status === 404)) {
				return { taskId, date, summary: { total_minutes: 0, my_minutes: 0 } };
			}
			return thunkAPI.rejectWithValue(err.response?.data?.message || 'Erreur récupération résumé quotidien');
		}
	}
);

const timeTrackingSlice = createSlice({
	name: 'timeTracking',
	initialState: {
		activeByTask: {},
		dailyByTask: {}, // { [taskId]: { date: 'YYYY-MM-DD', my_minutes, total_minutes } }
		myActive: null,
		myActives: [],
		loading: false,
		error: null,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(fetchActiveEntry.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchActiveEntry.fulfilled, (state, action) => {
				state.loading = false;
				state.activeByTask[action.payload.taskId] = action.payload.entry;
			})
			.addCase(fetchActiveEntry.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload;
			})
			.addCase(startTaskTimer.fulfilled, (state, action) => {
				state.activeByTask[action.payload.taskId] = action.payload.entry;
				state.error = null;
			})
			.addCase(startTaskTimer.rejected, (state, action) => {
				state.error = action.payload;
			})
			.addCase(stopTaskTimer.fulfilled, (state, action) => {
				state.activeByTask[action.payload.taskId] = null;
				state.error = null;
			})
			.addCase(stopTaskTimer.rejected, (state, action) => {
				state.error = action.payload;
			})
			.addCase(pauseTaskTimer.fulfilled, (state, action) => {
				state.activeByTask[action.payload.taskId] = null;
				state.error = null;
			})
			.addCase(pauseTaskTimer.rejected, (state, action) => {
				state.error = action.payload;
			})
			.addCase(finishTask.fulfilled, (state, action) => {
				state.activeByTask[action.payload.taskId] = null;
				state.error = null;
			})
			.addCase(finishTask.rejected, (state, action) => {
				state.error = action.payload;
			})
			.addCase(fetchMyActiveEntry.fulfilled, (state, action) => {
				state.myActive = action.payload;
			})
			.addCase(fetchMyActiveEntry.rejected, (state, action) => {
				state.error = action.payload;
			});
			
			builder
				.addCase(fetchMyActiveEntries.fulfilled, (state, action) => {
					state.myActives = action.payload;
				})
				.addCase(fetchMyActiveEntries.rejected, (state, action) => {
					state.error = action.payload;
				});

		// Daily summaries
		builder
			.addCase(fetchDailySummary.fulfilled, (state, action) => {
				state.dailyByTask[action.payload.taskId] = {
					date: action.payload.date,
					my_minutes: action.payload.summary?.my_minutes ?? 0,
					total_minutes: action.payload.summary?.total_minutes ?? 0,
				};
			})
			.addCase(fetchDailySummary.rejected, (state, action) => {
				state.error = action.payload;
			});
	}
});

export default timeTrackingSlice.reducer;

