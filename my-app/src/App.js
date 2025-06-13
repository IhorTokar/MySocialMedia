// my-app/src/App.js
import React, { useEffect } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import Profile from "./components/Pages/Profile/Profile";
import MainPage from "./components/Pages/Main_page/Main_page";
import SettingsPage from "./components/Pages/Settings_page/Settings_page";
// import Recepts from "./components/Pages/Recepts/Recepts"; // Якщо не використовується, можна закоментувати
import DialogsContainer from "./components/Pages/Dialogs/DialogsContainer";
import UsersContainer from "./components/Pages/Users/UsersContainer";
import SearchResultsPage from "./components/Pages/SearchResult/SearchResultsPage";
import { useAppDispatch, useAppSelector } from "./hooks/reduxHooks";
import { fetchUserProfile, clearUserProfile } from "./redux/userSlice";
import { logoutUser } from "./redux/AuthSlice"; // Імпортуємо logoutUser
import SavedPostsPage from "./components/Pages/SavedPostsPage.jsx/SavedPostsPage";
import PostModal from "./components/Modals/PostModal/PostModal";
import EditPostModal from "./components/Modals/PostModal/EditPostModal.jsx";
import ImageModal from "./components/Modals/ImageModal/ImageModal.jsx";
import ForgotPassword from "./components/Auth/Forgotpassword.jsx";

const AppInitializer = () => {
  const dispatch = useAppDispatch();

  // Отримуємо токен зі стану, щоб вирішити, чи потрібно взагалі робити запит

  const token = useAppSelector((state) => state.auth.token);

  useEffect(() => {
    const initializeUserSession = async () => {
      if (token) {
        console.log(
          "AppInitializer: Токен знайдено, спроба завантажити профіль користувача."
        );

        const resultAction = await dispatch(fetchUserProfile());

        if (fetchUserProfile.rejected.match(resultAction)) {
          // Якщо завантаження профілю не вдалося

          console.warn(
            "AppInitializer: Не вдалося завантажити профіль користувача. Ймовірна помилка автентифікації.",
            resultAction.payload
          );

          const errorPayload = resultAction.payload; // Це може бути рядок помилки з rejectWithValue

          const isAuthError =
            (typeof errorPayload === "string" &&
              errorPayload.toLowerCase().includes("unauthorized")) ||
            (typeof errorPayload === "string" &&
              errorPayload.toLowerCase().includes("401")) ||
            (resultAction.error &&
              resultAction.error.message &&
              resultAction.error.message.includes("401"));

          if (isAuthError) {
            console.log(
              "AppInitializer: Помилка автентифікації при запиті /me. Виконується вихід..."
            );

            await dispatch(logoutUser()); // Викликаємо logoutUser для очищення токена та стану
          } else {
            // Інша помилка при завантаженні профілю (не пов'язана з 401)

            console.error(
              "AppInitializer: Не вдалося завантажити профіль:",
              errorPayload
            );
          }
        } else if (fetchUserProfile.fulfilled.match(resultAction)) {
          console.log(
            "AppInitializer: Профіль користувача успішно завантажено."
          );
        }
      } else {
        console.log(
          "AppInitializer: Токен не знайдено, профіль користувача буде очищено (якщо існував)."
        );

        dispatch(clearUserProfile());
      }
    };

    initializeUserSession();
  }, [dispatch, token]); // Залежність від token, щоб повторно перевірити сесію, якщо токен з'явиться (після логіну)

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<MainPage />} />
        <Route path="/dialogs" element={<DialogsContainer />} />
        <Route path="/profile/:userId?" element={<Profile />} />
        <Route path="/users" element={<UsersContainer />} />
        <Route path="/settings_page" element={<SettingsPage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/saved" element={<SavedPostsPage />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>
    </Routes>
  );
};

const App = () => (
  <Router basename="/">
    <AppInitializer />
    <PostModal />
    <EditPostModal />
    <ImageModal/ >
  </Router>
);

export default App;
