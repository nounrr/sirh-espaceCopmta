import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../config/axios';
import { API_ENDPOINTS } from '../../config/api';

const nowIso = () => new Date().toISOString();

export const fetchActiveEntry = createAsyncThunk(
	'timeTracking/fetchActiveEntry',
	async (taskId) => {
		const url = API_ENDPOINTS.TIME_TRACKING.ACTIVE(taskId);
		console.log('[TimeTracking] fetchActiveEntry - URL:', url);
		const { data } = await api.get(url);
		console.log('[TimeTracking] fetchActiveEntry - Response:', data);
		return { taskId, entry: data.entry || null };
	}
);

export const startTaskTimer = createAsyncThunk(
	'timeTracking/startTaskTimer',
	async (taskId) => {
		const url = API_ENDPOINTS.TIME_TRACKING.START(taskId);
		console.log('[TimeTracking] START - TaskID:', taskId, 'URL:', url);
		const { data } = await api.post(url);
		console.log('[TimeTracking] START - Response:', data);
		const entry = data.entry ? {
			...data.entry,
			status: 'running',
		} : null;
		return { taskId, entry };
	}
);

export const pauseTaskTimer = createAsyncThunk(
	'timeTracking/pauseTaskTimer',
	async (taskId) => {
		const url = API_ENDPOINTS.TIME_TRACKING.PAUSE(taskId);
		console.log('[TimeTracking] PAUSE - TaskID:', taskId, 'URL:', url);
		const { data } = await api.post(url);
		console.log('[TimeTracking] PAUSE - Response:', data);
		const entry = data.entry ? {
			...data.entry,
			status: 'paused',
			paused_at: data.entry?.ended_at || nowIso(),
		} : null;
		const addedMinutes = data.entry?.duration_minutes || 0;
		return { taskId, addedMinutes, entry };
	}
);

export const finishTask = createAsyncThunk(
	'timeTracking/finishTask',
	async (taskId, { getState }) => {
		const existing = getState().timeTracking?.activeByTask?.[taskId] || null;
		let addedMinutes = 0;
		if (existing && existing.status === 'running' && existing.started_at) {
			const start = new Date(existing.started_at);
			const now = new Date();
			const diffMs = now - start;
			addedMinutes = Math.floor(diffMs / 60000);
		}
		return { taskId, addedMinutes };
	}
);

export const fetchDailySummary = createAsyncThunk(
	'timeTracking/fetchDailySummary',
	async ({ taskId, date }) => {
		const { data } = await api.get(API_ENDPOINTS.TIME_TRACKING.DAILY_SUMMARY(taskId, date));
		return {
			taskId,
			date: data.date,
			summary: {
				total_minutes: data.total_minutes || 0,
				sessions: [],
			},
		};
	}
);

const initialState = {
	activeByTask: {},
	dailyByTask: {},
	lastUpdated: null,
	error: null,
};

const timeTrackingSlice = createSlice({
	name: 'timeTracking',
	initialState,
	reducers: {
		resetTimeTrackingState: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchActiveEntry.fulfilled, (state, action) => {
				const { taskId, entry } = action.payload;
				if (entry) {
					state.activeByTask[taskId] = entry;
				} else {
					delete state.activeByTask[taskId];
				}
			})
			.addCase(startTaskTimer.fulfilled, (state, action) => {
				const { taskId, entry } = action.payload;
				state.activeByTask[taskId] = entry;
				state.lastUpdated = nowIso();
			})
			.addCase(pauseTaskTimer.fulfilled, (state, action) => {
				const { taskId, entry, addedMinutes } = action.payload;
				if (entry) {
					state.activeByTask[taskId] = entry;
				}
				if (addedMinutes > 0) {
					if (!state.dailyByTask[taskId]) {
						state.dailyByTask[taskId] = { total_minutes: 0, sessions: [] };
					}
					state.dailyByTask[taskId].total_minutes = (state.dailyByTask[taskId].total_minutes || 0) + addedMinutes;
				}
				state.lastUpdated = nowIso();
			})
			.addCase(finishTask.fulfilled, (state, action) => {
				const { taskId, addedMinutes } = action.payload;
				delete state.activeByTask[taskId];
				if (addedMinutes > 0) {
					if (!state.dailyByTask[taskId]) {
						state.dailyByTask[taskId] = { total_minutes: 0, sessions: [] };
					}
					state.dailyByTask[taskId].total_minutes = (state.dailyByTask[taskId].total_minutes || 0) + addedMinutes;
				}
				state.lastUpdated = nowIso();
			})
			.addCase(fetchDailySummary.fulfilled, (state, action) => {
				const { taskId, summary } = action.payload;
				state.dailyByTask[taskId] = summary;
				state.lastUpdated = nowIso();
			})
			.addMatcher(
				(action) => action.type.startsWith('timeTracking/') && action.type.endsWith('/rejected'),
				(state, action) => {
					state.error = action.error?.message || 'Une erreur est survenue.';
				}
			);
	},
});

export const { resetTimeTrackingState } = timeTrackingSlice.actions;
export default timeTrackingSlice.reducer;
