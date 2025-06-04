// my-app/src/redux/notificationsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios'; // Переконайтесь, що axios імпортовано

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Thunk для завантаження сповіщень - ТЕПЕР РОБИТЬ РЕАЛЬНИЙ ЗАПИТ
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (_, { getState, rejectWithValue }) => {
    // Перевіряємо, чи є токен автентифікації, перш ніж робити запит
    const token = getState().auth.token;
    if (!token) {
      console.log("FetchNotifications: Користувач не авторизований, запит не буде виконано.");
      // Можна повернути порожній масив або spécifique помилку, якщо потрібно
      // щоб уникнути запиту, який точно завершиться 401
      return rejectWithValue('Користувач не авторизований для запиту сповіщень');
    }

    try {
      console.log("Redux: Запит на завантаження реальних сповіщень з бекенду...");
      const response = await axios.get(`${API_BASE_URL}/notifications`, {
        withCredentials: true, // Важливо для передачі cookie з токеном
      });
      // Очікуємо, що response.data - це масив об'єктів сповіщень,
      // як було визначено в notificationsController.ts
      // Наприклад: [{ id, type, text, link, time, read, userAvatarFilename, userId, count? }, ...]
      console.log("Redux: Сповіщення успішно отримано з бекенду:", response.data);
      return response.data; 
    } catch (error) {
      const message = error.response?.data?.error || // Зверніть увагу на .error, якщо ваш errorHandler надсилає { error: "..." }
                      error.response?.data?.message || 
                      error.message || 
                      'Не вдалося завантажити сповіщення';
      console.error("FetchNotifications Error:", error.response || error); // Логуємо повний об'єкт помилки для діагностики
      return rejectWithValue(message);
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    if (!token) {
      return rejectWithValue('Користувач не авторизований');
    }
    try {
      console.log(`Redux: Позначення сповіщення ${notificationId} як прочитаного (запит до API)...`);
      // Реальний запит до API для позначки як прочитане
      // Припускаємо, що ваш бекенд очікує POST або PUT запит
      // Якщо ваш бекенд не реалізує цей функціонал, цей thunk залишиться моковим
      // await axios.post(`${API_BASE_URL}/notifications/${notificationId}/read`, {}, { withCredentials: true });
      
      // Поки що залишимо імітацію, якщо бекенд для цього ще не готовий:
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log(`Redux: Сповіщення ${notificationId} позначено як прочитане (імітація).`);
      return notificationId;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Не вдалося позначити сповіщення як прочитане';
      return rejectWithValue(message);
    }
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    clearNotificationsState: (state) => {
      state.items = [];
      state.unreadCount = 0;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload || []; // Гарантуємо, що items завжди масив
        state.unreadCount = (action.payload || []).filter(n => !n.read).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.items = []; // Очищаємо items у разі помилки
        state.unreadCount = 0;
      })
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notificationId = action.payload;
        const notification = state.items.find(n => n.id === notificationId);
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });
      // Можна додати .addCase(markNotificationAsRead.rejected, ...) для обробки помилок
  },
});

export const { clearNotificationsState } = notificationsSlice.actions;
export default notificationsSlice.reducer;