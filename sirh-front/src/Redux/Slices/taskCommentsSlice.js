import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/axios';

const initialState = {
  commentsByTask: {}, // Structure: { taskId: [comments] }
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: ''
};

// Action asynchrone pour récupérer les commentaires d'une tâche
export const fetchCommentsByTask = createAsyncThunk(
  'taskComments/fetchCommentsByTask',
  async (taskId, thunkAPI) => {
    try {
      const response = await api.get(`/tasks/${taskId}/comments`);
      return { taskId, comments: response.data };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Erreur lors de la récupération des commentaires'
      );
    }
  }
);

// Pour rétrocompatibilité
export const fetchTaskComments = createAsyncThunk(
  'taskComments/fetchTaskComments',
  async (taskId, thunkAPI) => {
    try {
      const response = await api.get(`/tasks/${taskId}/comments`);
      return { taskId, comments: response.data };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Erreur lors de la récupération des commentaires'
      );
    }
  }
);

// Action asynchrone pour ajouter un commentaire
export const addTaskComment = createAsyncThunk(
  'taskComments/addTaskComment',
  async ({ taskId, comment }, thunkAPI) => {
    try {
      const response = await api.post(`/tasks/${taskId}/comments`, { comment });
      return { taskId, comment: response.data };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Erreur lors de l\'ajout du commentaire'
      );
    }
  }
);

// Action asynchrone pour modifier un commentaire
export const updateTaskComment = createAsyncThunk(
  'taskComments/updateTaskComment',
  async ({ commentId, comment, taskId }, thunkAPI) => {
    try {
      const response = await api.put(`/comments/${commentId}`, { comment });
      return { taskId, comment: response.data };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Erreur lors de la modification du commentaire'
      );
    }
  }
);

// Action asynchrone pour supprimer un commentaire
export const deleteTaskComment = createAsyncThunk(
  'taskComments/deleteTaskComment',
  async ({ commentId, taskId }, thunkAPI) => {
    try {
      await api.delete(`/comments/${commentId}`);
      return { taskId, commentId };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || 'Erreur lors de la suppression du commentaire'
      );
    }
  }
);

const taskCommentsSlice = createSlice({
  name: 'taskComments',
  initialState,
  reducers: {
    clearComments: (state) => {
      state.commentsByTask = {};
      state.isError = false;
      state.message = '';
    },
    clearError: (state) => {
      state.isError = false;
      state.message = '';
    },
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Comments by Task (new function)
      .addCase(fetchCommentsByTask.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(fetchCommentsByTask.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.commentsByTask[action.payload.taskId] = action.payload.comments;
      })
      .addCase(fetchCommentsByTask.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      
      // Fetch Comments (legacy function)
      .addCase(fetchTaskComments.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(fetchTaskComments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.commentsByTask[action.payload.taskId] = action.payload.comments;
      })
      .addCase(fetchTaskComments.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Add Comment
      .addCase(addTaskComment.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(addTaskComment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const { taskId, comment } = action.payload;
        if (!state.commentsByTask[taskId]) {
          state.commentsByTask[taskId] = [];
        }
        state.commentsByTask[taskId].unshift(comment); // Ajouter en début pour garder l'ordre chronologique
      })
      .addCase(addTaskComment.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Update Comment
      .addCase(updateTaskComment.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(updateTaskComment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const { taskId, comment } = action.payload;
        if (state.commentsByTask[taskId]) {
          const index = state.commentsByTask[taskId].findIndex(c => c.id === comment.id);
          if (index !== -1) {
            state.commentsByTask[taskId][index] = comment;
          }
        }
      })
      .addCase(updateTaskComment.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Delete Comment
      .addCase(deleteTaskComment.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = '';
      })
      .addCase(deleteTaskComment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const { taskId, commentId } = action.payload;
        if (state.commentsByTask[taskId]) {
          state.commentsByTask[taskId] = state.commentsByTask[taskId].filter(
            comment => comment.id !== commentId
          );
        }
      })
      .addCase(deleteTaskComment.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { clearComments, clearError, reset } = taskCommentsSlice.actions;
export default taskCommentsSlice.reducer;
