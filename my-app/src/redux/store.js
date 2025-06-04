// my-app/src/redux/store.js
import { configureStore } from "@reduxjs/toolkit";
import postsReducer from "./postsSlice";
import dialogsReducer from "./dialogsSlice";
import usersReducer from "./usersSlice";
import sidebarReducer from "./sidebar_reducer";
import authReducer from "./AuthSlice";
import userReducer from "./userSlice";
import topicsReducer from "./topicsSlice";
import recommendationsReducer from "./recommendationsSlice";
import searchReducer from "./searchSlice";
import notificationsReducer from "./notificationSlice";
import commentsReducer from "./commentsSlice";
import uiReducer from "./uiSlice"; // <--- ДОДАЄМО ІМПОРТ

const store = configureStore({
  reducer: {
    posts: postsReducer,
    dialogs: dialogsReducer,
    users: usersReducer,
    sidebar: sidebarReducer,
    auth: authReducer,
    user: userReducer,
    topics: topicsReducer, // Цей slice тепер для популярних постів
    recommendations: recommendationsReducer,
    search: searchReducer,
    notifications: notificationsReducer,
    comments: commentsReducer,
    ui: uiReducer, // <--- ДОДАЄМО РЕДЬЮСЕР
  },
});

export default store;