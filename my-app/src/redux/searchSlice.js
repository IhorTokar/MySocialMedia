// my-app/src/redux/searchSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { followUser, unfollowUser } from './usersSlice'; // <--- ДОДАНО ІМПОРТИ

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const initialPaginatedSearchState = {
  items: [], currentPage: 0, totalPages: 0, totalItems: 0,
  limit: 10, hasMore: true, status: 'idle', error: null,
};

const initialState = {
  currentQuery: '',
  userResults: { ...initialPaginatedSearchState, feedType: 'searchUsers' },
  postResults: { ...initialPaginatedSearchState, feedType: 'searchPosts' }, // Пошук постів обробляється в postsSlice
};

export const searchUsersPaginated = createAsyncThunk(
  'search/searchUsersPaginated',
  async ({ query, page = 1, limit = initialState.userResults.limit }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.get(`${API_BASE_URL}/users/search`, {
        params: { q: query, page, limit },
        withCredentials: !!token,
      });
      return { ...response.data, query }; 
    } catch (error) {
      return rejectWithValue({ error: error.response?.data?.error || error.message, query, page });
    }
  }
);

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setCurrentQuery: (state, action) => {
      const newQuery = action.payload;
      if (state.currentQuery !== newQuery) {
        state.currentQuery = newQuery;
        state.userResults = { ...initialPaginatedSearchState, feedType: 'searchUsers', limit: state.userResults.limit };
        // Скидання postResults, якщо воно керується цим slice
        // state.postResults = { ...initialPaginatedSearchState, feedType: 'searchPosts', limit: state.postResults.limit }; 
      }
    },
    clearSearchResults: (state) => {
      state.currentQuery = '';
      state.userResults = { ...initialPaginatedSearchState, feedType: 'searchUsers', limit: state.userResults.limit };
      // state.postResults = { ...initialPaginatedSearchState, feedType: 'searchPosts', limit: state.postResults.limit };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchUsersPaginated.pending, (state, action) => {
        if (action.meta.arg.query === state.currentQuery) {
            const page = action.meta.arg?.page || 1;
            state.userResults.status = (page === 1 || state.userResults.currentPage === 0) ? 'loading' : 'loadingMore';
            if (page === 1 || state.userResults.currentPage === 0) state.userResults.error = null;
        }
      })
      .addCase(searchUsersPaginated.fulfilled, (state, action) => {
        if (action.payload.query === state.currentQuery) {
            const { users, currentPage, totalPages, totalItems } = action.payload;
            const mappedUsers = (users || []).map(user => ({ ...user, isFollowedByCurrentUser: !!user.isFollowedByCurrentUser }));

            if (currentPage === 1 || state.userResults.currentPage === 0) {
                state.userResults.items = mappedUsers;
            } else if (currentPage > state.userResults.currentPage) {
                const existingIds = new Set(state.userResults.items.map(u => u.user_id));
                const newUniqueUsers = mappedUsers.filter(uNew => !existingIds.has(uNew.user_id));
                state.userResults.items.push(...newUniqueUsers);
            }
            state.userResults.currentPage = currentPage;
            state.userResults.totalPages = totalPages;
            state.userResults.totalItems = totalItems;
            state.userResults.hasMore = currentPage < totalPages;
            state.userResults.status = 'succeeded';
            state.userResults.error = null;
        }
      })
      .addCase(searchUsersPaginated.rejected, (state, action) => {
        if (action.meta.arg.query === state.currentQuery) {
            state.userResults.status = 'failed';
            state.userResults.error = action.payload?.error || 'Error searching users';
        }
      })
      .addCase(followUser.fulfilled, (state, action) => { // <--- Тепер `followUser` визначено
        const { userId } = action.payload;
        const userIndex = state.userResults.items.findIndex(u => u.user_id === userId);
        if (userIndex !== -1) {
          state.userResults.items[userIndex].isFollowedByCurrentUser = true;
        }
      })
      .addCase(unfollowUser.fulfilled, (state, action) => { // <--- Тепер `unfollowUser` визначено
        const { userId } = action.payload;
        const userIndex = state.userResults.items.findIndex(u => u.user_id === userId);
        if (userIndex !== -1) {
          state.userResults.items[userIndex].isFollowedByCurrentUser = false;
        }
      });
  },
});

export const { setCurrentQuery, clearSearchResults } = searchSlice.actions;
export default searchSlice.reducer;