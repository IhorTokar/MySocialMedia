// my-app/src/redux/topicsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const initialState = {
  items: [], // Для популярних постів (FullPostData[])
  status: 'idle',
  error: null,
};

// Thunk для завантаження популярних постів
export const fetchPopularPosts = createAsyncThunk(
  'topics/fetchPopularPosts', // Можна перейменувати на 'popularPosts/fetch' якщо topics більше не актуально
  async (limit = 5, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      console.log("[topicsSlice] Fetching popular posts with token:", !!token);
      const response = await axios.get(`${API_BASE_URL}/posts/popular`, {
        params: { limit },
        withCredentials: !!token, // Надсилаємо, оскільки ендпоінт захищений auth
      });
      console.log("[topicsSlice] Popular posts fetched:", response.data);
      return response.data; // Очікуємо масив FullPostData
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Не вдалося завантажити популярні пости';
      console.error("[topicsSlice] Error fetching popular posts:", message);
      return rejectWithValue(message);
    }
  }
);

const topicsSlice = createSlice({
  name: 'topics', // Або 'popularPosts'
  initialState,
  reducers: {
    clearPopularPosts: (state) => {
      state.items = [];
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPopularPosts.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPopularPosts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchPopularPosts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.items = [];
      });
  },
});

export const { clearPopularPosts } = topicsSlice.actions;
export default topicsSlice.reducer;