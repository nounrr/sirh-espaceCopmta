import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../config/axios';

export const fetchUserDocs = createAsyncThunk(
  'userDocs/fetchUserDocs',
  async (userId = null) => {
    const response = await api.get(`/user-docs`);
    return response.data;
  }
);

export const uploadDocument = createAsyncThunk(
  'userDocs/uploadDocument',
  async ({ userId, typeDocId, file }) => {
    const formData = new FormData();
    formData.append('type_doc_id', typeDocId);
    formData.append('document', file);

    // Axios doit détecter que c'est FormData, pas JSON !
    const response = await api.post(`/user-docs/${userId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  }
);


export const uploadMultipleDocuments = createAsyncThunk(
  'userDocs/uploadMultipleDocuments',
  async ({ userId, documents }) => {
    const formData = new FormData();
    documents.forEach((doc, index) => {
      formData.append(`documents[${index}][type_doc_id]`, doc.typeDocId);
      formData.append(`documents[${index}][file]`, doc.file);
    });
    
    const response = await api.post(`/user-docs/${userId}/multiple`, formData);
    return response.data;
  }
);

export const deleteDocument = createAsyncThunk(
  'userDocs/deleteDocument',
  async ({ userId, typeDocId }) => {
    await api.delete(`/user-docs/${userId}/${typeDocId}`);
    return { userId, typeDocId };
  }
);

const userDocsSlice = createSlice({
  name: 'userDocs',
  initialState: {
    items: [],    // tableau !
    status: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserDocs.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUserDocs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload; // tableau d'utilisateurs
      })
      .addCase(fetchUserDocs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // ...autres reducers (uploadDocument, deleteDocument) à adapter pour tableau !
  }
});


export default userDocsSlice.reducer;