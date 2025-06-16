// my-app/src/redux/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/users/login`,
        { email, password },
        { withCredentials: true }
      );
      if (response.data && response.data.token) {
          localStorage.setItem('authToken', response.data.token);
      }
      return response.data; // Очікуємо { message, user, token }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      localStorage.removeItem('authToken');
      return rejectWithValue(errorMessage);
    }
  }
);

export const logoutUser = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue }) => {
        try {
            // Запит на бекенд для інвалідації сесії/токена на стороні сервера (якщо є)
            // та оновлення last_logout
            await axios.post(`${API_BASE_URL}/users/logout`, {}, {
                 withCredentials: true
            });
            localStorage.removeItem('authToken');
            return { success: true };
        } catch (error) {
            // Навіть якщо запит на бекенд не вдався, все одно очищаємо локальний токен
            localStorage.removeItem('authToken');
            const errorMessage = error.response?.data?.error || error.message || 'Logout failed but local token cleared';
            return rejectWithValue(errorMessage); // Можна повернути успіх, якщо головне - локальний вихід
        }
    }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/users/register`, userData);
      return response.data; // Очікуємо { message, userId, avatar }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
      return rejectWithValue(errorMessage);
    }
  }
);

// --- НОВИЙ THUNK ДЛЯ ЗМІНИ ПАРОЛЯ ---
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ oldPassword, newPassword }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token; // Перевірка, чи користувач авторизований
      if (!token) {
        return rejectWithValue('Користувач не авторизований для зміни пароля');
      }

      // Запит на бекенд для зміни пароля
      // Бекенд очікує PUT /api/users/update-password
      const response = await axios.put(
        `${API_BASE_URL}/users/update-password`,
        { oldPassword, newPassword },
        { withCredentials: true } // Важливо для передачі cookie з токеном
      );
      return response.data; // Очікуємо повідомлення про успіх, наприклад { message: "Password updated successfully." }
    } catch (error) {
      const message = error.response?.data?.error || // Якщо бекенд повертає { error: "..." }
                      error.response?.data?.message || // Якщо бекенд повертає { message: "..." }
                      error.message || 
                      'Не вдалося змінити пароль';
      return rejectWithValue(message);
    }
  }
);

export const adminResetUserPassword = createAsyncThunk(
  'auth/adminResetUserPassword',
  async ({ userId, newPassword }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token; // Отримуємо токен для авторизації запиту
      if (!token) {
        return rejectWithValue('Відсутній токен авторизації.');
      }

      // Передаємо токен у заголовку Authorization
      const response = await axios.put(
        `${API_BASE_URL}/admin/users/${userId}/password-reset`,
        { newPassword },
        {
          headers: {
            Authorization: `Bearer ${token}` // Передача токена
          },
          withCredentials: true // Для cookies, якщо вони також використовуються
        }
      );
      return response.data; // Очікуємо повідомлення про успіх
    } catch (error) {
      const message = error.response?.data?.error ||
                      error.response?.data?.message ||
                      error.message ||
                      'Не вдалося скинути пароль адміністратором.';
      return rejectWithValue(message);
    }
  }
);
// --- КІНЕЦЬ НОВОГО THUNK ---

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null, // Дані користувача з відповіді /login (або /me)
    token: localStorage.getItem('authToken') || null,
    status: 'idle', // Загальний статус для login/register/logout
    error: null,    // Загальна помилка для login/register/logout
    passwordChangeStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    passwordChangeError: null,
    adminPasswordResetStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    adminPasswordResetError: null,
  },
  reducers: {
    // Можна додати редюсер для скидання passwordChangeStatus/Error, якщо потрібно
    resetPasswordChangeStatus: (state) => {
        state.passwordChangeStatus = 'idle';
        state.passwordChangeError = null;
    },
    resetAdminPasswordResetStatus: (state) => {
        state.adminPasswordResetStatus = 'idle';
        state.adminPasswordResetError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // LOGIN
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.user = null; 
        state.token = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user; 
        state.token = action.payload.token; 
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.user = null;
        state.token = null; 
      })
      // REGISTER
      .addCase(registerUser.pending, (state) => { 
        state.status = 'loading'; 
        state.error = null; 
      })
      .addCase(registerUser.fulfilled, (state, action) => {
          state.status = 'idle'; // Або 'idle', оскільки реєстрація не означає автоматичний логін
          // Не змінюємо user/token тут, якщо реєстрація не логінить користувача
      })
      .addCase(registerUser.rejected, (state, action) => { 
        state.status = 'failed'; 
        state.error = action.payload; 
      })
      // LOGOUT
       .addCase(logoutUser.pending, (state) => { 
           state.status = 'loading'; 
       })
       .addCase(logoutUser.fulfilled, (state) => {
           state.status = 'idle';
           state.user = null;
           state.token = null;
           state.error = null;
           // Також скидаємо статуси зміни пароля при виході
           state.passwordChangeStatus = 'idle';
           state.passwordChangeError = null;
       })
       .addCase(logoutUser.rejected, (state, action) => {
           state.status = 'failed'; 
           state.error = action.payload; // Записуємо помилку, але все одно очищаємо дані сесії
           state.user = null;
           state.token = null;
           state.passwordChangeStatus = 'idle';
           state.passwordChangeError = null;
       })
       // CHANGE PASSWORD
       .addCase(changePassword.pending, (state) => {
        state.passwordChangeStatus = 'loading';
        state.passwordChangeError = null;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.passwordChangeStatus = 'succeeded';
        // Тут можна також оновити токен, якщо бекенд його повертає при зміні пароля
        // або якщо стара сесія інвалідується і потрібен новий логін.
        // Наразі просто повідомляємо про успіх.
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.passwordChangeStatus = 'failed';
        state.passwordChangeError = action.payload;
      })
      .addCase(adminResetUserPassword.pending, (state) => {
        state.adminPasswordResetStatus = 'loading';
        state.adminPasswordResetError = null;
      })
      .addCase(adminResetUserPassword.fulfilled, (state) => {
        state.adminPasswordResetStatus = 'succeeded';
        state.adminPasswordResetError = null;
      })
      .addCase(adminResetUserPassword.rejected, (state, action) => {
        state.adminPasswordResetStatus = 'failed';
        state.adminPasswordResetError = action.payload;
      });
  }
});

export const { resetPasswordChangeStatus, resetAuthStatus, resetAdminPasswordResetStatus } = authSlice.actions;
export default authSlice.reducer;