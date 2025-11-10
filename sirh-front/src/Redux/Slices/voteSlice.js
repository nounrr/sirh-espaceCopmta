// Récupérer les votes (tous pour RH, sinon ceux de l'utilisateur connecté)
export const fetchVotes = createAsyncThunk(
  'vote/fetchVotes',
  async (_, thunkAPI) => {
    try {
      const res = await api.get('/votes');
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue('Erreur lors du chargement des votes');
    }
  }
);
// src/redux/slices/voteSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/axios';
import { toErrorMessage } from '../../utils/errorUtils';

// Voter à une réponse
export const submitVote = createAsyncThunk(
  'vote/submit',
  async (data, thunkAPI) => {
    try {
      // data : { answer_id: ... }
      const res = await api.post('/votes', data);
      return res.data;
    } catch (err) {
  return thunkAPI.rejectWithValue(err.response?.data || toErrorMessage(err));
    }
  }
);

const voteSlice = createSlice({
  name: 'vote',
  initialState: {
    status: null, // null | "success" | "fail"
    error: null,
    votes: [], // Liste des votes récupérés du backend
  },
  reducers: {
    resetVoteStatus(state) {
      state.status = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitVote.pending, (state) => {
        state.status = null;
        state.error = null;
      })
      .addCase(submitVote.fulfilled, (state, action) => {
        state.status = 'success';
      })
      .addCase(submitVote.rejected, (state, action) => {
  state.status = 'fail';
  state.error = toErrorMessage(action.payload);
      })
      .addCase(fetchVotes.fulfilled, (state, action) => {
        state.votes = action.payload;
      });
  }
});

export const { resetVoteStatus } = voteSlice.actions;

export default voteSlice.reducer;
