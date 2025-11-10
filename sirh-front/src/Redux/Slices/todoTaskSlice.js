
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/axios';
import { fetchTodoLists } from './todoListSlice';


// Ajouter une tâche à une to-do list
export const createTask = createAsyncThunk(
  'tasks/create',
  async ({ listId, data }, thunkAPI) => {
    try {
      // Vérifie que la todo_list existe
      const state = thunkAPI.getState();
      const todoList = state.todoLists.items.find(list => list.id === parseInt(listId));
      
      if (!todoList) {
        return thunkAPI.rejectWithValue('La liste de tâches n\'existe pas dans le store Redux. Rechargez la page.');
      }

      let payload = data;
      let config = {};

      if (data instanceof FormData) {
        data.set('todo_list_id', parseInt(listId, 10));
        payload = data;
        config = { headers: { 'Content-Type': 'multipart/form-data' } };
      } else {
        payload = {
          ...data,
          todo_list_id: parseInt(listId, 10),
        };
      }

      const res = await api.post(`/todo-lists/${listId}/tasks`, payload, config);
      
      // Si la réponse a task directement (nouveau format)
      if (res.data && res.data.task) {
        return { listId, task: res.data.task };
      }
      
      // Si la réponse est directement la task (ancien format)
      return { listId, task: res.data };
    } catch (err) {
      // Log détaillé de l'erreur
      console.error('Erreur création tâche:', err);
      
      if (err.response && err.response.status === 404) {
        // Recharger les listes si la liste n'existe plus côté serveur
        thunkAPI.dispatch(fetchTodoLists());
        return thunkAPI.rejectWithValue('La liste de tâches n\'existe plus sur le serveur. Les données ont été rechargées.');
      }
      
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Erreur lors de la création de la tâche';
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Mettre à jour une tâche
export const updateTask = createAsyncThunk(
  'tasks/update',
  async ({ id, data }, thunkAPI) => {
    try {
      if (data instanceof FormData) {
        data.set('_method', 'PUT');
        const res = await api.post(`/todo-tasks/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        return res.data;
      }

      const res = await api.put(`/todo-tasks/${id}`, data);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue('Erreur lors de la mise à jour');
    }
  }
);

export const uploadTaskProofs = createAsyncThunk(
  'tasks/uploadProofs',
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await api.post(`/tasks/${id}/proofs`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      thunkAPI.dispatch(fetchTodoLists());
      return { id, proofs: response.data?.proofs || [] };
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Erreur lors de l\'envoi des preuves';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Supprimer une tâche
export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async ({ id }, thunkAPI) => {
    try {
      await api.delete(`/todo-tasks/${id}`);
      return id;
    } catch (err) {
      return thunkAPI.rejectWithValue('Erreur lors de la suppression');
    }
  }
);

export const requestTaskCancellation = createAsyncThunk(
  'tasks/requestCancellation',
  async ({ taskId, reason }, thunkAPI) => {
    try {
      const response = await api.post(`/todo-tasks/${taskId}/cancellation-requests`, {
        reason: reason || null,
      });

      thunkAPI.dispatch(fetchTodoLists());

      return response.data;
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Erreur lors de la demande d\'annulation';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const cancelTaskCancellationRequest = createAsyncThunk(
  'tasks/cancelCancellationRequest',
  async ({ requestId }, thunkAPI) => {
    try {
      await api.delete(`/todo-task-cancellation-requests/${requestId}`);

      thunkAPI.dispatch(fetchTodoLists());

      return { requestId };
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Erreur lors du retrait de la demande';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const approveCancellationRequest = createAsyncThunk(
  'tasks/approveCancellationRequest',
  async ({ taskId, requestId, resolutionNote }, thunkAPI) => {
    try {
      const response = await api.patch(`/todo-task-cancellation-requests/${requestId}`, {
        status: 'approved',
        resolution_note: resolutionNote || null,
      });

      if (taskId) {
        try {
          await thunkAPI.dispatch(updateTask({ id: taskId, data: { status: 'Annulé' } })).unwrap();
        } catch (updateError) {
          console.warn('Erreur lors de la mise à jour du statut de la tâche après approbation:', updateError);
        }
      }

      thunkAPI.dispatch(fetchTodoLists());

      return response.data;
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || "Erreur lors de l'approbation de la demande";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const rejectCancellationRequest = createAsyncThunk(
  'tasks/rejectCancellationRequest',
  async ({ taskId, requestId, resolutionNote }, thunkAPI) => {
    try {
      const response = await api.patch(`/todo-task-cancellation-requests/${requestId}`, {
        status: 'rejected',
        resolution_note: resolutionNote || null,
      });

      thunkAPI.dispatch(fetchTodoLists());

      return response.data;
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || "Erreur lors du refus de la demande";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Envoyer des rappels en masse
export const sendBulkReminders = createAsyncThunk(
  'tasks/sendBulkReminders',
  async ({ taskIds }, thunkAPI) => {
    try {
      const response = await api.post('/todo-tasks/bulk-reminders', {
        task_ids: taskIds,
      });

      return response.data;
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Erreur lors de l\'envoi des rappels';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const todoTaskSlice = createSlice({
  name: 'todoTasks',
  initialState: {
    items: [],
    actionStatus: null,
    error: null,
  },
  reducers: {
    resetTaskStatus(state) {
      state.actionStatus = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createTask.fulfilled, (state, action) => {
        // Ajoute la tâche au state si elle a été créée avec succès
        if (action.payload && action.payload.task) {
          state.items.push(action.payload.task);
        }
        state.actionStatus = 'success';
        state.error = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        // Met à jour la tâche dans le state
        const idx = state.items.findIndex(t => t.id === action.payload.id);
        if (idx !== -1) {
          state.items[idx] = { ...state.items[idx], ...action.payload };
        }
        state.actionStatus = 'updated';
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.items = state.items.filter(t => t.id !== action.payload);
        state.actionStatus = 'deleted';
      })
      .addCase(createTask.rejected, (state, action) => {
        state.actionStatus = 'fail';
        state.error = action.payload;
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.actionStatus = 'fail';
        state.error = action.payload;
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.actionStatus = 'fail';
        state.error = action.payload;
      })
      .addCase(uploadTaskProofs.fulfilled, (state) => {
        state.actionStatus = 'proofs_uploaded';
        state.error = null;
      })
      .addCase(uploadTaskProofs.rejected, (state, action) => {
        state.actionStatus = 'fail';
        state.error = action.payload;
      })
      .addCase(requestTaskCancellation.fulfilled, (state) => {
        state.actionStatus = 'cancellation_requested';
        state.error = null;
      })
      .addCase(requestTaskCancellation.rejected, (state, action) => {
        state.actionStatus = 'fail';
        state.error = action.payload;
      })
        .addCase(cancelTaskCancellationRequest.fulfilled, (state) => {
          state.actionStatus = 'cancellation_cancelled';
          state.error = null;
        })
        .addCase(cancelTaskCancellationRequest.rejected, (state, action) => {
          state.actionStatus = 'fail';
          state.error = action.payload;
        })
      .addCase(approveCancellationRequest.fulfilled, (state) => {
        state.actionStatus = 'cancellation_approved';
        state.error = null;
      })
      .addCase(approveCancellationRequest.rejected, (state, action) => {
        state.actionStatus = 'fail';
        state.error = action.payload;
      })
      .addCase(rejectCancellationRequest.fulfilled, (state) => {
        state.actionStatus = 'cancellation_rejected';
        state.error = null;
      })
      .addCase(rejectCancellationRequest.rejected, (state, action) => {
        state.actionStatus = 'fail';
        state.error = action.payload;
      })
      .addCase(sendBulkReminders.fulfilled, (state) => {
        state.actionStatus = 'bulk_reminders_sent';
        state.error = null;
      })
      .addCase(sendBulkReminders.rejected, (state, action) => {
        state.actionStatus = 'fail';
        state.error = action.payload;
      });
  },
});

export const { resetTaskStatus } = todoTaskSlice.actions;
export default todoTaskSlice.reducer;
