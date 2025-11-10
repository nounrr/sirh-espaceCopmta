// Thunk pour enregistrer le playerId OneSignal côté backend

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/axios';
import { useSelector, useDispatch } from 'react-redux';
const initialState = {
  user: null,
  token: null,
  roles: [],
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: ''
};



export const savePlayerId = createAsyncThunk(
  "auth/savePlayerId",
  async (playerId, thunkAPI) => {
    try {
      // Récupérer le token depuis le state Redux (géré par Redux, pas useSelector ici)
      const state = thunkAPI.getState().auth;
      const token = state.token;

      console.log("Envoi Player ID au backend :", { playerId });
      console.log("token :", { token });
      console.log("state :", { auth: state });

      const response = await api.post(
        `/users/onesignal-player-id`,
        {
          onesignal_player_id: playerId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Pour debug :
      console.log('Réponse API savePlayerId:', response.data);
      return playerId;
    } catch (error) {
      console.error("Erreur savePlayerId:", error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
          "Erreur lors de l'enregistrement du Player ID"
      );
    }
  }
);

export const register = createAsyncThunk('auth/register', async (userData, thunkAPI) => {
  try {
    const response = await api.post('/register', userData);  
    localStorage.setItem('user', JSON.stringify(response.data));  
    return response.data;  
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Erreur d’inscription');
  }
});

// Action pour la connexion
export const login = createAsyncThunk('auth/login', async (credentials, thunkAPI) => {
  try {
    const response = await api.post('/login', credentials);  
    localStorage.setItem('user', JSON.stringify(response.data));  
    return response.data;  
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Erreur de connexion');
  }
});

// Action pour la déconnexion
export const logout = createAsyncThunk('auth/logout', async (_, thunkAPI) => {
  try {
    const state = thunkAPI.getState().auth;
    await api.post('/logout', {}, {
      headers: { Authorization: `Bearer ${state.token}` }  
    });
    localStorage.removeItem('user');
    return null;  
  } catch (error) {
    return thunkAPI.rejectWithValue('Erreur lors de la déconnexion');
  }
});

// Action pour récupérer l'utilisateur
export const fetchMe = createAsyncThunk('auth/me', async (_, thunkAPI) => {
  try {
    // Récupérer le token depuis le localStorage
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      throw new Error('Aucun utilisateur connecté');
    }
    
    const userData = JSON.parse(storedUser);
    const { access_token } = userData;
    if (!access_token) {
      throw new Error('Token non trouvé');
    }

    const response = await api.get('/me', {
      headers: { Authorization: `Bearer ${access_token}` }  
    });

    // Retourner toutes les informations nécessaires
    return {
      user: response.data,
      access_token: access_token,
      roles: userData.roles || []
    };
  } catch (error) {
    // En cas d'erreur, nettoyer le localStorage
    localStorage.removeItem('user');
    return thunkAPI.rejectWithValue(error.message || 'Impossible de récupérer les infos utilisateur');
  }
});

// Slice Redux pour l'authentification
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    resetState: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        
        // Correction pour préserver le rôle Chef_Chant
        if (action.payload.roles && Array.isArray(action.payload.roles)) {
          // Préserver les rôles exacts sans modification
          state.roles = action.payload.roles.map(role => {
            return role; // Conserver le rôle tel quel
          });
          console.log('Rôles après register :', state.roles);
        } else {
          state.roles = action.payload.roles || [];
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(login.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        
        // Correction pour préserver le rôle Chef_Chant
        if (action.payload.roles && Array.isArray(action.payload.roles)) {
          // Préserver les rôles exacts sans modification
          state.roles = action.payload.roles.map(role => {
            return role; // Conserver le rôle tel quel
          });
          console.log('Rôles après login :', state.roles);
        } else {
          state.roles = action.payload.roles || [];
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.isSuccess = false;
        state.user = null;
        state.token = null;
        state.roles = [];
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(fetchMe.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        
        // Correction pour préserver le rôle Chef_Chant
        if (action.payload.roles && Array.isArray(action.payload.roles)) {
          // Préserver les rôles exacts sans modification
          state.roles = action.payload.roles.map(role => {
            return role; // Conserver le rôle tel quel
          });
          console.log('Rôles après fetchMe :', state.roles);
        } else {
          state.roles = action.payload.roles || [];
        }
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.user = null;
        state.token = null;
        state.roles = [];
      })
      // Gérer la sauvegarde du playerId dans le state Redux
      .addCase(savePlayerId.fulfilled, (state, action) => {
        if (state.user) {
          state.user.onesignal_player_id = action.payload;
        }
      })
      .addCase(savePlayerId.rejected, (state, action) => {
        state.isError = true;
        state.message = action.payload;
      });
  }
});

export const { resetState } = authSlice.actions;

export default authSlice.reducer;