// my-app/src/redux/usersSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Початковий стан для одного пагінованого списку користувачів
const initialPaginatedUsersFeedState = {
  items: [],
  currentPage: 0,
  totalPages: 0,
  totalItems: 0,
  limit: 15, // Дефолтний ліміт для списків користувачів
  hasMore: true,
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' | 'loadingMore'
  error: null,
  feedType: null, // Для ідентифікації (наприклад, 'allUsers', 'myFollowing', 'myFollowers')
};

const initialState = {
  allUsers: { ...initialPaginatedUsersFeedState, feedType: 'allUsers', limit: 20 },
  myFollowing: { ...initialPaginatedUsersFeedState, feedType: 'myFollowing', limit: 15 },
  myFollowers: { ...initialPaginatedUsersFeedState, feedType: 'myFollowers', limit: 15 },
  
  followStatus: "idle", // Для окремих дій follow/unfollow
  followError: null,
  
  // Старі поля, які, можливо, більше не потрібні, якщо вся логіка списків перенесена
  // users: [], 
  // status: "idle",
  // error: null,
  // myFollowingList: [], // Замінено на myFollowing.items
  // myFollowingStatus: "idle", // Замінено на myFollowing.status
  // myFollowingError: null, // Замінено на myFollowing.error
  // myFollowersList: [], // Замінено на myFollowers.items
  // myFollowersStatus: "idle", // Замінено на myFollowers.status
  // myFollowersError: null, // Замінено на myFollowers.error
};

// --- Thunks для завантаження списків користувачів з пагінацією ---

export const fetchAllUsers = createAsyncThunk(
  "users/fetchAllUsers",
  async ({ page = 1, limit = initialState.allUsers.limit } = {}, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      if (!token) return rejectWithValue({ error: "User not authenticated" });
      const response = await axios.get(`${API_BASE_URL}/users`, {
        params: { page, limit },
        withCredentials: true,
      });
      // Очікуємо { users, currentPage, totalPages, totalItems }
      return response.data; 
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to load users";
      return rejectWithValue({ error: errorMessage, page });
    }
  }
);

export const fetchMyFollowing = createAsyncThunk(
  "users/fetchMyFollowing",
  async ({ page = 1, limit = initialState.myFollowing.limit } = {}, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      if (!token) return rejectWithValue({ error: "Not authenticated" });
      const response = await axios.get(`${API_BASE_URL}/users/me/following`, {
        params: { page, limit },
        withCredentials: true,
      });
      // Відповідь має містити { users, currentPage, totalPages, totalItems }
      // Усі користувачі в цьому списку вже відстежуються поточним користувачем
      const usersWithFollowedStatus = (response.data.users || []).map(user => ({ ...user, isFollowedByCurrentUser: true }));
      return { ...response.data, users: usersWithFollowedStatus };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to load my following list";
      return rejectWithValue({ error: errorMessage, page });
    }
  }
);

export const fetchMyFollowers = createAsyncThunk(
  "users/fetchMyFollowers",
  async ({ page = 1, limit = initialState.myFollowers.limit } = {}, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      if (!token) return rejectWithValue({ error: "Not authenticated" });
      const response = await axios.get(`${API_BASE_URL}/users/me/followers`, {
        params: { page, limit },
        withCredentials: true,
      });
      // Відповідь має містити { users, currentPage, totalPages, totalItems }
      // Бекенд має повертати isFollowedByCurrentUser для кожного підписника
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to load my followers list";
      return rejectWithValue({ error: errorMessage, page });
    }
  }
);

// Thunks для follow/unfollow (залишаються, як були у вашому коді)
export const followUser = createAsyncThunk(
  "users/followUser",
  async (userIdToFollow, { getState, dispatch, rejectWithValue }) => {
    if (!userIdToFollow) return rejectWithValue("User ID to follow is required");
    try {
      const token = getState().auth.token;
      if (!token) return rejectWithValue("Not authenticated for follow action");
      await axios.post(`${API_BASE_URL}/users/${userIdToFollow}/follow`, {}, { withCredentials: true });
      // Оновлюємо статус підписки у всіх релевантних місцях
      dispatch(usersSlice.actions.updateUserFollowStatusInLists({ userId: userIdToFollow, isFollowed: true }));
      // Якщо це впливає на viewedProfile в userSlice, оновлюємо і його
      const viewedProfileId = getState().user.viewedProfile?.user_id;
      if (viewedProfileId === userIdToFollow) {
        dispatch({ type: 'user/setViewedProfileFollowStatus', payload: { userId: userIdToFollow, followed: true } });
      }
      return { userId: userIdToFollow };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to follow user";
      return rejectWithValue({ error: errorMessage, userId: userIdToFollow });
    }
  }
);

export const unfollowUser = createAsyncThunk(
  "users/unfollowUser",
  async (userIdToUnfollow, { getState, dispatch, rejectWithValue }) => {
    if (!userIdToUnfollow) return rejectWithValue("User ID to unfollow is required");
    try {
      const token = getState().auth.token;
      if (!token) return rejectWithValue("Not authenticated for unfollow action");
      await axios.delete(`${API_BASE_URL}/users/${userIdToUnfollow}/follow`, { withCredentials: true });
      // Оновлюємо статус підписки
      dispatch(usersSlice.actions.updateUserFollowStatusInLists({ userId: userIdToUnfollow, isFollowed: false }));
      const viewedProfileId = getState().user.viewedProfile?.user_id;
      if (viewedProfileId === userIdToUnfollow) {
        dispatch({ type: 'user/setViewedProfileFollowStatus', payload: { userId: userIdToUnfollow, followed: false } });
      }
      return { userId: userIdToUnfollow };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to unfollow user";
      return rejectWithValue({ error: errorMessage, userId: userIdToUnfollow });
    }
  }
);


const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearFollowStatus: (state) => {
      state.followStatus = "idle";
      state.followError = null;
    },
    resetUsersFeed: (state, action) => {
        const feedType = action.payload?.feedType;
        if (feedType && state[feedType]) {
            const originalLimit = state[feedType].limit;
            state[feedType] = { ...initialPaginatedUsersFeedState, limit: originalLimit, feedType: feedType };
        } else {
            console.warn(`[usersSlice] resetUsersFeed: Unknown feedType "${feedType}"`);
        }
    },
    clearAllUsersData: (state) => { // Скидає всі пагіновані списки та статуси follow
      state.allUsers = { ...initialPaginatedUsersFeedState, feedType: 'allUsers', limit: initialState.allUsers.limit };
      state.myFollowing = { ...initialPaginatedUsersFeedState, feedType: 'myFollowing', limit: initialState.myFollowing.limit };
      state.myFollowers = { ...initialPaginatedUsersFeedState, feedType: 'myFollowers', limit: initialState.myFollowers.limit };
      state.followStatus = "idle";
      state.followError = null;
    },
    updateUserFollowStatusInLists: (state, action) => {
        const { userId, isFollowed } = action.payload;
        const listsToUpdate = [state.allUsers, state.myFollowers, state.myFollowing];
        // Також потрібно оновити recommendationsSlice.items та searchSlice.userResults, якщо цей користувач там є.
        // Це можна зробити, якщо ці slices слухають цей самий action, або через додатковий механізм.
        
        listsToUpdate.forEach(listState => {
            if (listState && listState.items) {
                const userIndex = listState.items.findIndex(u => u.user_id === userId);
                if (userIndex !== -1) {
                    listState.items[userIndex].isFollowedByCurrentUser = isFollowed;
                }
            }
        });
        // Оновлення myFollowing: якщо isFollowed true, і користувача немає - додати (потребує даних користувача)
        // Якщо isFollowed false - видалити.
        if (state.myFollowing.items) {
            if (!isFollowed) {
                const initialLength = state.myFollowing.items.length;
                state.myFollowing.items = state.myFollowing.items.filter(user => user.user_id !== userId);
                 if (state.myFollowing.items.length < initialLength) {
                    state.myFollowing.totalItems = Math.max(0, (state.myFollowing.totalItems || 0) - 1);
                }
            } else {
                // Додавання до myFollowing при follow складніше без повних даних користувача.
                // Краще ініціювати перезавантаження myFollowing списку.
                state.myFollowing.status = 'idle'; 
            }
             state.myFollowing.totalPages = Math.ceil(state.myFollowing.totalItems / state.myFollowing.limit);
             if(state.myFollowing.currentPage > state.myFollowing.totalPages && state.myFollowing.totalPages > 0) state.myFollowing.currentPage = state.myFollowing.totalPages;
             if(state.myFollowing.totalItems === 0) state.myFollowing.currentPage = 0;
        }
    }
  },
  extraReducers: (builder) => {
    const genericPaginatedUsersFetchHandler = (feedStateKey) => ({
      pending: (state, action) => {
        const page = action.meta.arg?.page || 1;
        const targetFeed = state[feedStateKey];
        if (targetFeed) {
            targetFeed.status = (page === 1 || targetFeed.currentPage === 0) ? 'loading' : 'loadingMore';
            if (page === 1 || targetFeed.currentPage === 0) targetFeed.error = null;
        }
      },
      fulfilled: (state, action) => {
        // Бекенд повертає { users, currentPage, totalPages, totalItems }
        const { users, currentPage, totalPages, totalItems } = action.payload; 
        const targetFeed = state[feedStateKey];
        if (targetFeed) {
            const mappedUsers = (users || []).map((user) => ({
                ...user, // Всі поля з UserPublic
                isFollowedByCurrentUser: !!user.isFollowedByCurrentUser,
            }));

            if (currentPage === 1 || targetFeed.currentPage === 0) {
                targetFeed.items = mappedUsers;
            } else if (currentPage > targetFeed.currentPage) {
                const existingIds = new Set(targetFeed.items.map(u => u.user_id));
                const newUniqueUsers = mappedUsers.filter(uNew => !existingIds.has(uNew.user_id));
                targetFeed.items.push(...newUniqueUsers);
            } else {
                console.warn(`[usersSlice] Fulfilled for ${targetFeed.feedType} page ${currentPage}, but targetFeed.currentPage is ${targetFeed.currentPage}. Items not updated.`);
            }
            targetFeed.currentPage = currentPage;
            targetFeed.totalPages = totalPages;
            targetFeed.totalItems = totalItems;
            targetFeed.hasMore = currentPage < totalPages;
            targetFeed.status = 'succeeded';
            targetFeed.error = null;
        }
      },
      rejected: (state, action) => {
        const targetFeed = state[feedStateKey];
        if (targetFeed) {
            targetFeed.status = 'failed';
            targetFeed.error = action.payload?.error || 'Unknown error';
        }
      },
    });

    builder
      .addCase(fetchAllUsers.pending, genericPaginatedUsersFetchHandler('allUsers').pending)
      .addCase(fetchAllUsers.fulfilled, genericPaginatedUsersFetchHandler('allUsers').fulfilled)
      .addCase(fetchAllUsers.rejected, genericPaginatedUsersFetchHandler('allUsers').rejected)

      .addCase(fetchMyFollowing.pending, genericPaginatedUsersFetchHandler('myFollowing').pending)
      .addCase(fetchMyFollowing.fulfilled, genericPaginatedUsersFetchHandler('myFollowing').fulfilled)
      .addCase(fetchMyFollowing.rejected, genericPaginatedUsersFetchHandler('myFollowing').rejected)

      .addCase(fetchMyFollowers.pending, genericPaginatedUsersFetchHandler('myFollowers').pending)
      .addCase(fetchMyFollowers.fulfilled, genericPaginatedUsersFetchHandler('myFollowers').fulfilled)
      .addCase(fetchMyFollowers.rejected, genericPaginatedUsersFetchHandler('myFollowers').rejected)
      
      .addCase(followUser.pending, (state) => { state.followStatus = "loading"; state.followError = null; })
      .addCase(followUser.fulfilled, (state, action) => {
        state.followStatus = "succeeded";
        // Оновлення isFollowedByCurrentUser вже відбувається через dispatch(usersSlice.actions.updateUserFollowStatusInLists) всередині thunk
      })
      .addCase(followUser.rejected, (state, action) => {
        state.followStatus = "failed";
        state.followError = { userId: action.meta.arg, message: action.payload?.error || action.payload?.message || "Error" };
      })

      .addCase(unfollowUser.pending, (state) => { state.followStatus = "loading"; state.followError = null; })
      .addCase(unfollowUser.fulfilled, (state, action) => {
        state.followStatus = "succeeded";
        // Оновлення isFollowedByCurrentUser та myFollowing.items вже відбувається через dispatch(usersSlice.actions.updateUserFollowStatusInLists) всередині thunk
      })
      .addCase(unfollowUser.rejected, (state, action) => {
        state.followStatus = "failed";
        state.followError = { userId: action.meta.arg, message: action.payload?.error || action.payload?.message || "Error" };
      });
  },
});

export const {
  clearFollowStatus,
  clearAllUsersData,
  resetUsersFeed,
  updateUserFollowStatusInLists
} = usersSlice.actions;

export default usersSlice.reducer;