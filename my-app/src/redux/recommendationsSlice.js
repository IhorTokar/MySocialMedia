// my-app/src/redux/recommendationsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { followUser, unfollowUser } from './usersSlice'; // Імпортуємо для оновлення статусу підписки

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const initialPaginatedRecommendationsState = {
  items: [],
  currentPage: 0,
  totalPages: 0,
  totalItems: 0,
  limit: 3, // Типовий ліміт для сайдбару
  hasMore: true,
  status: 'idle',
  error: null,
  feedType: 'latestUsers',
};

const initialState = {
  latestUsers: { ...initialPaginatedRecommendationsState },
};

export const fetchLatestUsers = createAsyncThunk(
  'recommendations/fetchLatestUsers',
  async ({ page = 1, limit = initialState.latestUsers.limit } = {}, { getState, rejectWithValue }) => {
    const timestamp = new Date().toISOString();
    console.log(`[recommendationsSlice][${timestamp}] Fetching latest users. Page: ${page}, Limit: ${limit}`);
    try {
      const token = getState().auth.token;
      const response = await axios.get(`${API_BASE_URL}/users/latest`, {
        params: { page, limit },
        withCredentials: !!token,
      });
      // Очікуємо { users, currentPage, totalPages, totalItems }
      return response.data; 
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch latest users';
      return rejectWithValue({ error: errorMessage, page });
    }
  }
);

const recommendationsSlice = createSlice({
  name: 'recommendations',
  initialState,
  reducers: {
    resetLatestUsers: (state) => {
      state.latestUsers = { ...initialPaginatedRecommendationsState, limit: initialState.latestUsers.limit };
    },
    updateRecommendationFollowStatus: (state, action) => {
      const { userId, followed } = action.payload;
      const userIndex = state.latestUsers.items.findIndex(user => user.user_id === userId);
      if (userIndex !== -1) {
        state.latestUsers.items[userIndex].isFollowedByCurrentUser = followed;
        state.latestUsers.items[userIndex].followed = followed; 
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLatestUsers.pending, (state, action) => {
        const page = action.meta.arg?.page || 1;
        state.latestUsers.status = (page === 1 || state.latestUsers.currentPage === 0) ? 'loading' : 'loadingMore';
        if (page === 1 || state.latestUsers.currentPage === 0) state.latestUsers.error = null;
      })
      .addCase(fetchLatestUsers.fulfilled, (state, action) => {
        const { users, currentPage, totalPages, totalItems } = action.payload; // 'users' - ключ з відповіді бекенду
        
        const mappedUsers = (users || []).map(user => ({
            ...user, // Всі поля UserPublic
            isFollowedByCurrentUser: !!user.isFollowedByCurrentUser // Гарантуємо boolean
        }));

        if (currentPage === 1 || state.latestUsers.currentPage === 0) {
            state.latestUsers.items = mappedUsers;
        } else if (currentPage > state.latestUsers.currentPage) {
            const existingIds = new Set(state.latestUsers.items.map(u => u.user_id));
            const newUniqueUsers = mappedUsers.filter(uNew => !existingIds.has(uNew.user_id));
            state.latestUsers.items.push(...newUniqueUsers);
        }
        
        state.latestUsers.currentPage = currentPage;
        state.latestUsers.totalPages = totalPages;
        state.latestUsers.totalItems = totalItems;
        state.latestUsers.hasMore = currentPage < totalPages;
        state.latestUsers.status = 'succeeded';
        state.latestUsers.error = null;
      })
      .addCase(fetchLatestUsers.rejected, (state, action) => {
        state.latestUsers.status = 'failed';
        state.latestUsers.error = action.payload?.error || 'Unknown error';
      })
      // Слухаємо actions з usersSlice для оновлення статусу підписки
      .addCase(followUser.fulfilled, (state, action) => {
        const { userId } = action.payload;
        const userIndex = state.latestUsers.items.findIndex(u => u.user_id === userId);
        if (userIndex !== -1) {
          state.latestUsers.items[userIndex].isFollowedByCurrentUser = true;
          state.latestUsers.items[userIndex].followed = true; // Оновлюємо і поле 'followed'
        }
      })
      .addCase(unfollowUser.fulfilled, (state, action) => {
        const { userId } = action.payload;
        const userIndex = state.latestUsers.items.findIndex(u => u.user_id === userId);
        if (userIndex !== -1) {
          state.latestUsers.items[userIndex].isFollowedByCurrentUser = false;
          state.latestUsers.items[userIndex].followed = false; // Оновлюємо і поле 'followed'
        }
      });
  },
});

export const { resetLatestUsers, updateRecommendationFollowStatus } = recommendationsSlice.actions;
export default recommendationsSlice.reducer;