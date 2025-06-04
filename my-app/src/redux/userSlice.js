// my-app/src/redux/userSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const initialState = {
  profile: null,
  viewedProfile: null,
  loading: false,
  error: null,
  viewedProfileLoading: false,
  viewedProfileError: null,
  currentRequestId: undefined,
  updateStatus: 'idle',
  updateError: null,
  adminViewedUser: null,
  adminViewUserStatus: 'idle',
  adminViewUserError: null,
  adminUpdateRoleStatus: 'idle',
  adminUpdateRoleError: null,
  adminDeleteUserStatus: 'idle',
  adminDeleteUserError: null,
  adminEditUserStatus: 'idle',
  adminEditUserError: null,
  // Стани для завантаження аватара
  uploadAvatarStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  uploadAvatarError: null,
};

// --- Async Thunks ---

export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (_, { getState, rejectWithValue, requestId }) => {
    const { loading: currentLoadingState, currentRequestId: stateCurrentRequestId } = getState().user;
    const timestamp = new Date().toISOString();
    console.log(`[userSlice][${timestamp}] Спроба fetchUserProfile. RequestID: ${requestId}. StateLoading: ${currentLoadingState}. StateCurrentReqID: ${stateCurrentRequestId}`);

    if (currentLoadingState && stateCurrentRequestId && stateCurrentRequestId !== requestId) {
        console.warn(`[userSlice][${timestamp}] fetchUserProfile (ID: ${requestId}): Попередній запит ${stateCurrentRequestId} ще може бути активним, але ми продовжимо цей.`);
    }

    const token = getState().auth.token;
    console.log(`[userSlice][${timestamp}] Токен для fetchUserProfile (ID: ${requestId}): ${token ? `Присутній` : 'Відсутній'}`);

    if (!token && !localStorage.getItem('authToken')) {
      console.warn(`[userSlice][${timestamp}] fetchUserProfile (ID: ${requestId}): Токен відсутній. Відхилення запиту.`);
      return rejectWithValue('User not authenticated to fetch profile');
    }
    try {
      console.log(`[userSlice][${timestamp}] Надсилання запиту GET /api/users/me... (ID: ${requestId})`);
      const response = await axios.get(`${API_BASE_URL}/users/me`, {
        withCredentials: true,
        headers: {
          'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Expires': '0',
        },
      });
      console.log(`[userSlice][${timestamp}] fetchUserProfile (ID: ${requestId}) УСПІШНО. Дані:`, response.data);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to fetch own profile';
      const status = error.response?.status;
      console.error(`[userSlice][${timestamp}] fetchUserProfile (ID: ${requestId}) НЕ ВДАЛОСЯ. Статус: ${status}. Повідомлення:`, errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchUserProfileById = createAsyncThunk(
  'user/fetchProfileById',
  async (userId, { getState, rejectWithValue, requestId }) => {
    const timestamp = new Date().toISOString();
    console.log(`[userSlice][${timestamp}] Спроба fetchUserProfileById для userId: ${userId}. RequestID: ${requestId}`);
    if (!userId) {
      console.warn(`[userSlice][${timestamp}] fetchUserProfileById (ID: ${requestId}): userId не надано.`);
      return rejectWithValue("User ID is required to fetch profile");
    }
    try {
      const token = getState().auth.token;
      console.log(`[userSlice][${timestamp}] Надсилання GET /api/users/${userId}... (ID: ${requestId}). Token presence: ${!!token}`);
      const response = await axios.get(`${API_BASE_URL}/users/${userId}`, {
        withCredentials: !!token,
      });
      console.log(`[userSlice][${timestamp}] fetchUserProfileById для userId: ${userId} (ID: ${requestId}) УСПІШНО. Дані:`, response.data);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || `Failed to fetch profile for user ${userId}`;
      const status = error.response?.status;
      console.error(`[userSlice][${timestamp}] fetchUserProfileById для userId: ${userId} (ID: ${requestId}) НЕ ВДАЛОСЯ. Статус: ${status}. Повідомлення:`, errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateUserDetails = createAsyncThunk(
  'user/updateDetails',
  async (detailsToUpdate, { getState, rejectWithValue }) => {
    const timestamp = new Date().toISOString();
    console.log(`[userSlice][${timestamp}] Спроба updateUserDetails. Дані:`, detailsToUpdate);
    try {
      const token = getState().auth.token;
      if (!token) {
        return rejectWithValue('Користувач не авторизований');
      }
      const response = await axios.put(`${API_BASE_URL}/users/me/details`, detailsToUpdate, {
        withCredentials: true,
      });
      console.log(`[userSlice][${timestamp}] updateUserDetails УСПІШНО. Відповідь:`, response.data);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Не вдалося оновити деталі профілю';
      console.error(`[userSlice][${timestamp}] updateUserDetails НЕ ВДАЛОСЯ. Помилка:`, message);
      return rejectWithValue(message);
    }
  }
);

export const fetchUserForAdmin = createAsyncThunk(
  'user/fetchUserForAdmin',
  async (userId, { getState, rejectWithValue }) => {
    const timestamp = new Date().toISOString();
    console.log(`[userSlice][${timestamp}] Спроба fetchUserForAdmin для userId: ${userId}`);
    try {
      const token = getState().auth.token;
      if (!token) {
        return rejectWithValue('Користувач не авторизований');
      }
      const response = await axios.get(`${API_BASE_URL}/users/admin/details/${userId}`, {
        withCredentials: true,
      });
      console.log(`[userSlice][${timestamp}] fetchUserForAdmin УСПІШНО. Відповідь:`, response.data);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Не вдалося отримати дані користувача для адміна';
      console.error(`[userSlice][${timestamp}] fetchUserForAdmin НЕ ВДАЛОСЯ. Помилка:`, message);
      return rejectWithValue(message);
    }
  }
);

export const adminUpdateUserRole = createAsyncThunk(
  'user/adminUpdateUserRole',
  async ({ userId, newRole }, { getState, rejectWithValue }) => {
    const timestamp = new Date().toISOString();
    console.log(`[userSlice][${timestamp}] Спроба adminUpdateUserRole для userId: ${userId}, нова роль: ${newRole}`);
    try {
      const token = getState().auth.token;
      if (!token) {
        return rejectWithValue('Користувач не авторизований');
      }
      const response = await axios.put(`${API_BASE_URL}/users/change-role`,
        { userId, newRole },
        { withCredentials: true }
      );
      console.log(`[userSlice][${timestamp}] adminUpdateUserRole УСПІШНО. Відповідь:`, response.data);
      return { userId, newRole, responseData: response.data || {} };
    } catch (error) {
      let errorMessage = 'Не вдалося оновити роль користувача';
      if (error.response && error.response.data) {
        errorMessage = error.response.data.error || error.response.data.message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      console.error(`[userSlice][${timestamp}] adminUpdateUserRole НЕ ВДАЛОСЯ. Помилка:`, errorMessage);
      return rejectWithValue({ message: errorMessage, userId });
    }
  }
);

export const adminDeleteUser = createAsyncThunk(
  'user/adminDeleteUser',
  async (userIdToDelete, { getState, rejectWithValue }) => {
    const timestamp = new Date().toISOString();
    console.log(`[userSlice][${timestamp}] Спроба adminDeleteUser для userId: ${userIdToDelete}`);
    try {
      const token = getState().auth.token;
      if (!token) {
        return rejectWithValue('Користувач не авторизований');
      }
      await axios.delete(`${API_BASE_URL}/users/${userIdToDelete}`, {
        withCredentials: true,
      });
      console.log(`[userSlice][${timestamp}] adminDeleteUser УСПІШНО для userId: ${userIdToDelete}`);
      return { userIdToDelete };
    } catch (error) {
      let errorMessage = 'Не вдалося видалити користувача';
      if (error.response && error.response.data) {
        errorMessage = error.response.data.error || error.response.data.message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      console.error(`[userSlice][${timestamp}] adminDeleteUser НЕ ВДАЛОСЯ. Помилка:`, errorMessage);
      return rejectWithValue({ message: errorMessage, userIdToDelete });
    }
  }
);

export const adminEditUserDetails = createAsyncThunk(
  'user/adminEditUserDetails',
  async ({ userId, details }, { getState, rejectWithValue }) => {
    const timestamp = new Date().toISOString();
    console.log(`[userSlice][${timestamp}] Спроба adminEditUserDetails для userId: ${userId}, деталі:`, details);
    try {
      const token = getState().auth.token;
      if (!token) {
        return rejectWithValue('Користувач не авторизований');
      }
      const response = await axios.put(`${API_BASE_URL}/users/admin/update/${userId}`, details, {
        withCredentials: true,
      });
      console.log(`[userSlice][${timestamp}] adminEditUserDetails УСПІШНО. Відповідь:`, response.data);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Не вдалося оновити деталі користувача адміном';
      console.error(`[userSlice][${timestamp}] adminEditUserDetails НЕ ВДАЛОСЯ. Помилка:`, message);
      return rejectWithValue({ message, userId });
    }
  }
);

export const uploadUserAvatar = createAsyncThunk(
  'user/uploadAvatar',
  async ({ userId, avatarFile }, { getState, dispatch, rejectWithValue }) => {
    const timestamp = new Date().toISOString();
    console.log(`[userSlice][${timestamp}] Attempting to upload avatar for userId: ${userId}. File: ${avatarFile.name}`);
    try {
      const token = getState().auth.token;
      if (!token) {
        console.warn(`[userSlice][${timestamp}] User not authenticated to upload avatar.`);
        return rejectWithValue('User not authenticated');
      }

      const formData = new FormData();
      formData.append('userAvatar', avatarFile);

      const response = await axios.put(`${API_BASE_URL}/users/avatar/${userId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });
      
      console.log(`[userSlice][${timestamp}] Avatar uploaded successfully to backend. Response:`, response.data);
      
      // Після успішного завантаження аватара, перезавантажуємо профіль користувача
      console.log(`[userSlice][${timestamp}] Re-fetching user profile after avatar upload for userId: ${userId}.`);
      // Перевіряємо, чи це аватар поточного залогіненого користувача
      const loggedInUserId = getState().auth.user?.user_id || getState().user.profile?.user?.user_id;
      if (loggedInUserId === userId) {
        await dispatch(fetchUserProfile()).unwrap();
      } else {
        // Якщо це аватар іншого користувача (наприклад, адмін змінює),
        // можна оновити viewedProfile, якщо він відповідає цьому userId
        if (getState().user.viewedProfile?.user_id === userId) {
          await dispatch(fetchUserProfileById(userId)).unwrap();
        }
      }
      
      return response.data; // Повертаємо { message, avatarFilename }
    } catch (error) {
      let errorMessage;
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to upload avatar or refetch profile';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = 'An unknown error occurred during avatar upload or profile refetch';
      }
      console.error(`[userSlice][${timestamp}] Error during avatar upload or profile refetch for userId ${userId}:`, errorMessage, error);
      return rejectWithValue(errorMessage);
    }
  }
);


const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUserProfile: (state) => {
      const timestamp = new Date().toISOString();
      console.log(`[userSlice][${timestamp}] Reducer: clearUserProfile called.`);
      state.profile = null;
      state.loading = false;
      state.error = null;
      state.currentRequestId = undefined;
    },
    clearViewedProfile: (state) => {
      const timestamp = new Date().toISOString();
      console.log(`[userSlice][${timestamp}] Reducer: clearViewedProfile called.`);
      state.viewedProfile = null;
      state.viewedProfileLoading = false;
      state.viewedProfileError = null;
    },
    resetUpdateUserStatus: (state) => {
      state.updateStatus = 'idle';
      state.updateError = null;
    },
    clearAdminViewedUser: (state) => {
      state.adminViewedUser = null;
      state.adminViewUserStatus = 'idle';
      state.adminViewUserError = null;
    },
    resetAdminUpdateRoleStatus: (state) => {
      state.adminUpdateRoleStatus = 'idle';
      state.adminUpdateRoleError = null;
    },
    resetAdminDeleteUserStatus: (state) => {
      state.adminDeleteUserStatus = 'idle';
      state.adminDeleteUserError = null;
    },
    resetAdminEditUserStatus: (state) => {
      state.adminEditUserStatus = 'idle';
      state.adminEditUserError = null;
    },
    setViewedProfileFollowStatus: (state, action) => {
      if (state.viewedProfile && state.viewedProfile.user_id === action.payload.userId) {
        state.viewedProfile.isFollowedByCurrentUser = action.payload.followed;
      }
    },
    resetUploadAvatarStatus: (state) => {
      state.uploadAvatarStatus = 'idle';
      state.uploadAvatarError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state, action) => {
        const timestamp = new Date().toISOString();
        console.log(`[userSlice][${timestamp}] fetchUserProfile.pending. RequestID: ${action.meta.requestId}`);
        state.loading = true;
        state.error = null;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        const timestamp = new Date().toISOString();
        console.log(`[userSlice][${timestamp}] fetchUserProfile.fulfilled. RequestID: ${action.meta.requestId}. Payload:`, action.payload);
        if (state.currentRequestId === action.meta.requestId || state.loading) {
            state.loading = false;
            state.profile = action.payload;
            state.error = null;
            state.currentRequestId = undefined;
        } else {
            console.log(`[userSlice][${timestamp}] fetchUserProfile.fulfilled: Отримано результат для застарілого/скасованого запиту ${action.meta.requestId}. Ігнорується.`);
        }
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        const timestamp = new Date().toISOString();
        console.log(`[userSlice][${timestamp}] fetchUserProfile.rejected. RequestID: ${action.meta.requestId}. Payload:`, action.payload);
        if (state.currentRequestId === action.meta.requestId || state.loading) {
            state.loading = false;
            state.error = action.payload || null;
            state.profile = null;
            state.currentRequestId = undefined;
        } else {
             console.log(`[userSlice][${timestamp}] fetchUserProfile.rejected: Отримано помилку для застарілого/скасованого запиту ${action.meta.requestId}. Ігнорується.`);
        }
      })

      .addCase(fetchUserProfileById.pending, (state, action) => {
        const timestamp = new Date().toISOString();
        console.log(`[userSlice][${timestamp}] fetchUserProfileById.pending for user ${action.meta.arg}. RequestID: ${action.meta.requestId}`);
        state.viewedProfileLoading = true;
        state.viewedProfileError = null;
      })
      .addCase(fetchUserProfileById.fulfilled, (state, action) => {
        const timestamp = new Date().toISOString();
        console.log(`[userSlice][${timestamp}] fetchUserProfileById.fulfilled for user ${action.meta.arg}. RequestID: ${action.meta.requestId}. Payload:`, action.payload);
        state.viewedProfileLoading = false;
        state.viewedProfile = action.payload;
        state.viewedProfileError = null;
      })
      .addCase(fetchUserProfileById.rejected, (state, action) => {
        const timestamp = new Date().toISOString();
        console.log(`[userSlice][${timestamp}] fetchUserProfileById.rejected for user ${action.meta.arg}. RequestID: ${action.meta.requestId}. Payload:`, action.payload);
        state.viewedProfileLoading = false;
        state.viewedProfileError = action.payload || null;
        state.viewedProfile = null;
      })

      .addCase(updateUserDetails.pending, (state) => { state.updateStatus = 'loading'; state.updateError = null; })
      .addCase(updateUserDetails.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        if (action.payload) { state.profile = action.payload; }
      })
      .addCase(updateUserDetails.rejected, (state, action) => { state.updateStatus = 'failed'; state.updateError = action.payload || null; })

      .addCase(fetchUserForAdmin.pending, (state) => { state.adminViewUserStatus = 'loading'; state.adminViewUserError = null; state.adminViewedUser = null; })
      .addCase(fetchUserForAdmin.fulfilled, (state, action) => { state.adminViewUserStatus = 'succeeded'; state.adminViewedUser = action.payload; })
      .addCase(fetchUserForAdmin.rejected, (state, action) => { state.adminViewUserStatus = 'failed'; state.adminViewUserError = action.payload || null; state.adminViewedUser = null; })

      .addCase(adminUpdateUserRole.pending, (state) => { state.adminUpdateRoleStatus = 'loading'; state.adminUpdateRoleError = null; })
      .addCase(adminUpdateUserRole.fulfilled, (state, action) => {
        state.adminUpdateRoleStatus = 'succeeded';
        if (state.adminViewedUser && state.adminViewedUser.user_id === action.payload.userId) {
          state.adminViewedUser.role = action.payload.newRole;
        }
        if (state.profile?.user && state.profile.user.user_id === action.payload.userId) {
            state.profile.user.role = action.payload.newRole;
             if(state.profile.role !== undefined) state.profile.role = action.payload.newRole;
        }
      })
      .addCase(adminUpdateUserRole.rejected, (state, action) => {
        state.adminUpdateRoleStatus = 'failed';
        state.adminUpdateRoleError = (action.payload && typeof action.payload === 'object' && action.payload.message) ? action.payload.message : action.payload || null;
      })

      .addCase(adminDeleteUser.pending, (state) => { state.adminDeleteUserStatus = 'loading'; state.adminDeleteUserError = null; })
      .addCase(adminDeleteUser.fulfilled, (state, action) => {
        state.adminDeleteUserStatus = 'succeeded';
        if (state.adminViewedUser && state.adminViewedUser.user_id === action.payload.userIdToDelete) {
          state.adminViewedUser = null; state.adminViewUserStatus = 'idle';
        }
      })
      .addCase(adminDeleteUser.rejected, (state, action) => {
        state.adminDeleteUserStatus = 'failed';
        state.adminDeleteUserError = (action.payload && typeof action.payload === 'object' && action.payload.message) ? action.payload.message : action.payload || null;
      })

      .addCase(adminEditUserDetails.pending, (state) => { state.adminEditUserStatus = 'loading'; state.adminEditUserError = null; })
      .addCase(adminEditUserDetails.fulfilled, (state, action) => {
        state.adminEditUserStatus = 'succeeded';
        const updatedProfile = action.payload;
        if (state.adminViewedUser && updatedProfile && typeof updatedProfile === 'object' && updatedProfile.user && state.adminViewedUser.user_id === updatedProfile.user.user_id) {
          state.adminViewedUser = updatedProfile;
        }
        if (state.profile && updatedProfile && typeof updatedProfile === 'object' && updatedProfile.user && state.profile.user?.user_id === updatedProfile.user.user_id) {
            state.profile = updatedProfile;
        }
      })
       .addCase(adminEditUserDetails.rejected, (state, action) => {
        state.adminEditUserStatus = 'failed';
        state.adminEditUserError = (action.payload && typeof action.payload === 'object' && action.payload.message) ? action.payload.message : action.payload || null;
      })

      // Upload User Avatar
      .addCase(uploadUserAvatar.pending, (state) => {
        state.uploadAvatarStatus = 'loading';
        state.uploadAvatarError = null;
      })
      .addCase(uploadUserAvatar.fulfilled, (state, action) => {
        state.uploadAvatarStatus = 'succeeded';
        // Профіль буде оновлено через dispatch(fetchUserProfile()) всередині thunk
        console.log('[userSlice] uploadUserAvatar.fulfilled, сервер повернув:', action.payload?.message, 'Нове ім\'я файлу:', action.payload?.avatarFilename);
      })
      .addCase(uploadUserAvatar.rejected, (state, action) => {
        state.uploadAvatarStatus = 'failed';
        state.uploadAvatarError = action.payload;
      });
  },
});

export const {
    clearUserProfile, clearViewedProfile, resetUpdateUserStatus,
    clearAdminViewedUser, resetAdminUpdateRoleStatus, resetAdminDeleteUserStatus,
    resetAdminEditUserStatus, setViewedProfileFollowStatus,
    resetUploadAvatarStatus // Експортуємо новий редьюсер
} = userSlice.actions;
export default userSlice.reducer;