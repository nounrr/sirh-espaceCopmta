import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

// Temporary in-memory store for time tracking since backend endpoints are not yet finalized.
// These thunks keep the UI responsive by updating local state and resolving immediately.

const nowIso = () => new Date().toISOString();

export const fetchActiveEntry = createAsyncThunk(
	'timeTracking/fetchActiveEntry',
	async (taskId, { getState }) => {
		const existing = getState().timeTracking?.activeByTask?.[taskId] || null;
		return { taskId, entry: existing };
	}
);

export const startTaskTimer = createAsyncThunk(
	'timeTracking/startTaskTimer',
	async (taskId) => ({
		taskId,
		entry: {
			id: `local-${Date.now()}`,
			task_id: taskId,
			started_at: nowIso(),
			status: 'running',
		},
	})
);

export const pauseTaskTimer = createAsyncThunk(
	'timeTracking/pauseTaskTimer',
	async (taskId, { getState }) => {
		const existing = getState().timeTracking?.activeByTask?.[taskId] || null;
		return {
			taskId,
			entry: existing
				? {
						...existing,
						status: 'paused',
						paused_at: nowIso(),
					}
				: null,
		};
	}
);

export const finishTask = createAsyncThunk(
	'timeTracking/finishTask',
	async (taskId) => ({ taskId })
);

export const fetchDailySummary = createAsyncThunk(
	'timeTracking/fetchDailySummary',
	async ({ taskId, date }) => ({
		taskId,
		date,
		summary: {
			total_minutes: 0,
			sessions: [],
		},
	})
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
				const { taskId, entry } = action.payload;
				if (entry) {
					state.activeByTask[taskId] = entry;
				}
				state.lastUpdated = nowIso();
			})
			.addCase(finishTask.fulfilled, (state, action) => {
				const { taskId } = action.payload;
				delete state.activeByTask[taskId];
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
