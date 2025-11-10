import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/axios';
import { toErrorMessage } from '../../utils/errorUtils';
import { updateTask, deleteTask, createTask } from './todoTaskSlice';

// ✅ Récupérer toutes les to-do lists visibles
export const fetchTodoLists = createAsyncThunk(
  'todoLists/fetchAll',
  async (_, thunkAPI) => {
    try {
      const res = await api.get('/todo-lists');
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue('Erreur lors du chargement des To-Do Lists');
    }
  }
);

// ✅ Créer une nouvelle to-do list
export const createTodoList = createAsyncThunk(
  'todoLists/create',
  async (data, thunkAPI) => {
    try {
      const res = await api.post('/todo-lists', data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la création';
      return thunkAPI.rejectWithValue(msg);
    }
  }
);

// ✅ Supprimer une to-do list
export const deleteTodoList = createAsyncThunk(
  'todoLists/delete',
  async (id, thunkAPI) => {
    try {
      await api.delete(`/todo-lists/${id}`);
      return id;
    } catch (err) {
      return thunkAPI.rejectWithValue('Erreur lors de la suppression');
    }
  }
);

// ✅ Mettre à jour une to-do list
export const updateTodoList = createAsyncThunk(
  'todoLists/update',
  async ({ id, ...data }, thunkAPI) => {
    try {
      const res = await api.put(`/todo-lists/${id}`, data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la mise à jour';
      return thunkAPI.rejectWithValue(msg);
    }
  }
);

const todoListSlice = createSlice({
  name: 'todoLists',
  initialState: {
    items: [],
    loading: false,
    error: null,
    creationStatus: null,
    creationError: null,
  },
  reducers: {
    resetCreationStatus(state) {
      state.creationStatus = null;
      state.creationError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodoLists.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodoLists.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTodoLists.rejected, (state, action) => {
        state.loading = false;
        state.error = toErrorMessage(action.payload);
      })

      .addCase(createTodoList.pending, (state) => {
        state.creationStatus = null;
        state.creationError = null;
      })
      .addCase(createTodoList.fulfilled, (state, action) => {
        state.creationStatus = 'success';
        const newList = { ...action.payload, tasks: action.payload.tasks || [] };
        console.log('Nouvelle liste créée:', newList); // Debug
        state.items.unshift(newList);
      })
      .addCase(createTodoList.rejected, (state, action) => {
        state.creationStatus = 'fail';
        state.creationError = toErrorMessage(action.payload);
      })

      .addCase(deleteTodoList.fulfilled, (state, action) => {
        state.items = state.items.filter(list => list.id !== action.payload);
      })

      .addCase(updateTodoList.fulfilled, (state, action) => {
        const updatedList = action.payload;
        const index = state.items.findIndex(list => list.id === updatedList.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updatedList };
        }
      })

      // ✅ Écouter les créations de tâches pour mettre à jour les listes
      .addCase(createTask.fulfilled, (state, action) => {
        const { listId, task } = action.payload;
        // Trouver la liste et ajouter la nouvelle tâche
        const list = state.items.find(list => list.id === parseInt(listId));
        if (list) {
          if (!list.tasks) {
            list.tasks = [];
          }
          list.tasks.push(task);
        }
      })

      // ✅ Écouter les mises à jour de tâches pour mettre à jour les listes
      .addCase(updateTask.fulfilled, (state, action) => {
        const updatedTask = action.payload;
        // Trouver la liste qui contient cette tâche et la mettre à jour
        state.items.forEach(list => {
          if (list.tasks) {
            const taskIndex = list.tasks.findIndex(task => task.id === updatedTask.id);
            if (taskIndex !== -1) {
              list.tasks[taskIndex] = { ...list.tasks[taskIndex], ...updatedTask };
            }
          }
        });
      })

      // ✅ Écouter les suppressions de tâches pour mettre à jour les listes
      .addCase(deleteTask.fulfilled, (state, action) => {
        const deletedTaskId = action.payload;
        // Supprimer la tâche de toutes les listes
        state.items.forEach(list => {
          if (list.tasks) {
            list.tasks = list.tasks.filter(task => task.id !== deletedTaskId);
          }
        });
      });
  },
});

export const { resetCreationStatus } = todoListSlice.actions;
export default todoListSlice.reducer;
