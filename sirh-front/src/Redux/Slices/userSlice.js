import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_ENDPOINTS } from '../../config/api';
import api from '../../config/axios';

// Async thunks
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { page = 1, perPage = 15, search = '' } = params || {};
      const response = await api.get(API_ENDPOINTS.USERS.BASE, {
        params: {
          include: 'departement',
          page,
          per_page: perPage,
          ...(search ? { search } : {})
        }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);
export const fetchUsersTemp = createAsyncThunk(
  'users/fetchUsersTemp',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(API_ENDPOINTS.USERSTEMP.BASE, {
        
      });
      console.log(response.data);
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);
export const createUser = createAsyncThunk(
  'users/createUser',
  async (userData, { rejectWithValue }) => {
    try {
      // Format the data as expected by the backend
      const formattedData = {
        name: userData.name,
        cin: userData.cin,
        sex: userData.sex,
        rib: userData.rib,
        situationFamiliale: userData.situationFamiliale,
        nbEnfants: parseInt(userData.nbEnfants),
        adresse: userData.adresse,
        prenom: userData.prenom,
        tel: userData.tel,
        fonction: userData.fonction,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        typeContrat: userData.typeContrat,
        dateEmbauche: userData.dateEmbauche,
        date_naissance: userData.date_naissance,
        statut: userData.statut,
        departement_id: parseInt(userData.departement_id),
        societe_id: userData.societe_id ? parseInt(userData.societe_id) : null,
        date_sortie: userData.date_sortie || null,
        cnss: userData.cnss || null,
        solde_conge: userData.solde_conge !== '' ? userData.solde_conge : null,
        information_supplementaire: userData.information_supplementaire || null,
        information_supplementaire2: userData.information_supplementaire2 || null,
      };
      

      // Handle picture upload
      if (userData.picture) {
        if (typeof userData.picture === 'string') {
          formattedData.picture = userData.picture;
        } else {
          // If it's a File object, create FormData
          const formData = new FormData();
          Object.keys(formattedData).forEach(key => {
            formData.append(key, formattedData[key]);
          });
          formData.append('picture', userData.picture);
          
          const response = await api.post(API_ENDPOINTS.USERS.BASE, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          return response.data;
        }
      }

      const response = await api.post(API_ENDPOINTS.USERS.BASE, formattedData);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error.response?.data);
      return rejectWithValue(error.response?.data);
    }
  }
);
export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, ...values }, { rejectWithValue }) => {
    const formData = new FormData();

    // Ajoute les champs
    for (const key in values) {
      if (values[key] !== undefined && values[key] !== null) {
        formData.append(key, values[key]);
      }
    }

    // Important : dire à Laravel que c'est un PUT déguisé
    formData.append('_method', 'PUT');

    try {
      const response = await api.post(`/employes/update/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);
export const deleteUsers = createAsyncThunk(
  'users/deleteUsers',
  async (ids, { rejectWithValue }) => {
    try {
      await api.delete(API_ENDPOINTS.USERS.BASE, { data: { ids } });
      return ids;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);
export const affectUser = createAsyncThunk(
  'users/affectUser',
  async ({ userId }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/users/affecter/${userId}`);

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);
// Pour affectation en masse
export const affectUsersMass = createAsyncThunk(
  'users/affectUsersMass',
  async ({ user_ids, departement_id, societe_id }, { rejectWithValue }) => {
    try {
      const response = await api.post('/users/affecter-societe-departement', {
        user_ids,
        departement_id,
        societe_id
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);


const userSlice = createSlice({
  name: 'users',
  initialState: {
    items: [],
    meta: null,
    status: 'idle',
    error: null,
    UserTemp:[]
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch users
      .addCase(fetchUsers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const payload = action.payload;
        state.items = Array.isArray(payload) ? payload : (payload.data || []);
        state.meta = Array.isArray(payload) ? null : (payload.meta || null);
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchUsersTemp.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUsersTemp.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.UserTemp = action.payload;
      })
      .addCase(fetchUsersTemp.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Create user
      .addCase(createUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.push(action.payload);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Update user
      .addCase(updateUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(u => u.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Delete users
      .addCase(deleteUsers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter(u => !action.payload.includes(u.id));
      })
      .addCase(deleteUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(affectUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(affectUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(u => u.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(affectUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(affectUsersMass.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(affectUsersMass.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Si besoin, tu peux refetch les users ici
      })
      .addCase(affectUsersMass.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
  }
});

export default userSlice.reducer;