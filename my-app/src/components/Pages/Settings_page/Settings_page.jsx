// my-app/src/components/Pages/Settings_page/Settings_page.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux"; // Використовуємо стандартний useSelector тут
import { useAppDispatch } from "../../../hooks/reduxHooks";
import styles from "./Settings_page.module.css";
import {
  updateUserDetails,
  resetUpdateUserStatus,
  fetchUserForAdmin,
  clearAdminViewedUser,
  adminUpdateUserRole,
  resetAdminUpdateRoleStatus,
  adminDeleteUser,
  resetAdminDeleteUserStatus,
  adminEditUserDetails,
  resetAdminEditUserStatus,
  uploadUserAvatar,
  resetUploadAvatarStatus,
  fetchUserProfile,
  deleteMyAccount,
  resetDeleteAccountStatus
} from "../../../redux/userSlice";

import { useNavigate } from "react-router-dom";
import {
  changePassword,
  resetPasswordChangeStatus,
} from "../../../redux/AuthSlice";
// --- ВИПРАВЛЕНО ІМПОРТ ---
import {
  searchUsersPaginated as searchUsers,
  clearSearchResults,
  setCurrentQuery,
} from "../../../redux/searchSlice";
// --------------------------
import { avatarImgUrl } from "../../../utils/ImagesLoadUtil";
import { useTheme } from "../../../context/ThemeContext";
import AvatarCropModal from "../../Modals/AvatarCropModal/AvatarCropModal";
import AdminPasswordReset from "./AdminPasswordReset";
import DeleteConfirmModal from "../../Modals/ComfirmModal/DeleteConfirmModal";

// Дефолтний стан для пагінації, якщо дані ще не в Redux (для adminSearchResults)
const defaultAdminSearchPaginatedState = {
  items: [],
  currentPage: 0,
  totalPages: 0,
  totalItems: 0,
  hasMore: true,
  status: "idle",
  error: null,
  limit: 10, // Ліміт за замовчуванням
};

const SettingsPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const {
    profile,
    loading: profileLoading,
    error: profileError,
    updateStatus,
    updateError,
    uploadAvatarStatus,
    uploadAvatarError,
    adminViewedUser,
    adminViewUserStatus,
    adminViewUserError,
    adminUpdateRoleStatus,
    adminUpdateRoleError,
    adminDeleteUserStatus,
    adminDeleteUserError,
    adminEditUserStatus,
    adminEditUserError,
  } = useSelector((state) => state.user);

  const authUser = useSelector((state) => state.auth.user);
  const { passwordChangeStatus, passwordChangeError } = useSelector(
    (state) => state.auth
  );

  // Отримуємо дані для adminSearchResults з searchSlice.userResults
  const {
    items: adminSearchResults, // Це userResultsData.items
    status: adminSearchStatus, // Це userResultsData.status
    error: adminSearchError, // Це userResultsData.error
    currentQuery: adminCurrentSearchQuery,
    // Додаємо інші поля пагінації, якщо вони потрібні для кнопки "Показати більше" в адмін-панелі
    // currentPage: adminSearchCurrentPage,
    // hasMore: adminSearchHasMore,
    // limit: adminSearchLimit,
  } = useSelector(
    (state) => state.search.userResults || defaultAdminSearchPaginatedState
  );

   const { deleteAccountStatus, deleteAccountError } = useSelector((state) => state.user);

  const [formData, setFormData] = useState({
    display_name: "",
    about_me: "",
    phone: "",
    gender: "",
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [adminDirectIdSearch, setAdminDirectIdSearch] = useState("");
  const [adminGeneralSearchQuery, setAdminGeneralSearchQuery] = useState("");
  const [selectedRoleForAdminEdit, setSelectedRoleForAdminEdit] = useState("");
  const [adminEditFormData, setAdminEditFormData] = useState({
    username: "",
    display_name: "",
    about_me: "",
    gender: "",
    email: "",
    phone: "",
  });

  const [avatarFileToUpload, setAvatarFileToUpload] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const avatarInputRef = useRef(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);

  const currentUserForCheck = profile || {
    user: authUser,
    role: authUser?.role,
  };

  useEffect(() => {
    const userToPopulateForm = profile?.user || authUser;
    if (userToPopulateForm) {
      setFormData({
        display_name:
          userToPopulateForm.display_name ||
          userToPopulateForm.displayName ||
          "",
        about_me: userToPopulateForm.about_me || "",
        phone: profile?.phone || authUser?.phone || "",
        gender: userToPopulateForm.gender || "",
      });
      const currentAvatarFilename = userToPopulateForm.user_avatar_url;
      setAvatarPreview(
        currentAvatarFilename
          ? avatarImgUrl(currentAvatarFilename)
          : "/default_avatar.png"
      );
    } else {
      setAvatarPreview("/default_avatar.png");
    }
  }, [profile, authUser]);

  useEffect(() => {
    if (adminViewedUser) {
      setAdminEditFormData({
        username: adminViewedUser.userName || adminViewedUser.username || "",
        display_name:
          adminViewedUser.displayName || adminViewedUser.display_name || "",
        about_me: adminViewedUser.about_me || "",
        gender: adminViewedUser.gender || "",
        email: adminViewedUser.email || "",
        phone: adminViewedUser.phone || "",
      });
      setSelectedRoleForAdminEdit(adminViewedUser.role || "user");
    } else {
      setAdminEditFormData({
        username: "",
        display_name: "",
        about_me: "",
        gender: "",
        email: "",
        phone: "",
      });
      setSelectedRoleForAdminEdit("");
    }
  }, [adminViewedUser]);

  useEffect(() => {
    dispatch(resetPasswordChangeStatus());
    dispatch(resetUpdateUserStatus());
    dispatch(resetUploadAvatarStatus());
    dispatch(resetAdminUpdateRoleStatus());
    dispatch(resetAdminDeleteUserStatus());
    dispatch(resetAdminEditUserStatus());
    return () => {
      dispatch(resetPasswordChangeStatus());
      dispatch(resetUpdateUserStatus());
      dispatch(resetUploadAvatarStatus());
      // Очищаємо результати пошуку адміном при виході зі сторінки налаштувань
      dispatch(clearSearchResults());
      dispatch(clearAdminViewedUser());
    };
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (updateStatus !== "idle" || updateError) {
      dispatch(resetUpdateUserStatus());
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    if (passwordChangeStatus !== "idle" || passwordChangeError) {
      dispatch(resetPasswordChangeStatus());
    }
  };

  const handleSubmitDetails = (e) => {
    e.preventDefault();
    if (updateStatus === "loading") return;
    dispatch(resetUpdateUserStatus());
    const dataToUpdate = {
      display_name: formData.display_name,
      about_me: formData.about_me,
      phone: formData.phone,
      gender: formData.gender,
    };
    dispatch(updateUserDetails(dataToUpdate));
  };

  const handleSubmitPasswordChange = async (e) => {
    e.preventDefault();
    if (passwordChangeStatus === "loading") return;
    dispatch(resetPasswordChangeStatus());
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      alert("Нові паролі не співпадають.");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      alert("Новий пароль має містити щонайменше 8 символів.");
      return;
    }
    const resultAction = await dispatch(
      changePassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      })
    );
    if (changePassword.fulfilled.match(resultAction)) {
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      alert("Пароль успішно змінено!");
    } else if (changePassword.rejected.match(resultAction)) {
      const errorMsg =
        typeof resultAction.payload === "string"
          ? resultAction.payload
          : resultAction.payload?.message || "Спробуйте ще раз.";
      alert(`Помилка зміни пароля: ${errorMsg}`);
    }
  };

  const handleThemeChange = (selectedTheme) => {
    setTheme(selectedTheme);
    localStorage.setItem("theme", selectedTheme);
  };

  const handleAvatarFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("Файл занадто великий. Максимальний розмір 5MB.");
        if (avatarInputRef.current) avatarInputRef.current.value = "";
        return;
      }
      setImageToCrop(URL.createObjectURL(file));
      setIsCropModalOpen(true);
      if (uploadAvatarStatus !== "idle" || uploadAvatarError)
        dispatch(resetUploadAvatarStatus());
    }
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const handleCropComplete = (croppedFile, croppedPreviewUrl) => {
    setAvatarFileToUpload(croppedFile);
    setAvatarPreview(croppedPreviewUrl);
    setIsCropModalOpen(false);
    setImageToCrop(null);
  };

  const handleCropCancel = () => {
    setIsCropModalOpen(false);
    setImageToCrop(null);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFileToUpload) {
      alert("Будь ласка, виберіть та кадруйте файл для завантаження.");
      return;
    }
    const currentUserId = profile?.user?.user_id || authUser?.user_id;
    if (!currentUserId) {
      alert(
        "Не вдалося визначити ID користувача. Будь ласка, оновіть сторінку або увійдіть знову."
      );
      return;
    }
    if (uploadAvatarStatus === "loading") return;

    const resultAction = await dispatch(
      uploadUserAvatar({
        userId: currentUserId,
        avatarFile: avatarFileToUpload,
      })
    );

    if (uploadUserAvatar.fulfilled.match(resultAction)) {
      setAvatarFileToUpload(null); // Очищаємо файл після успішного завантаження
    }
  };

  const handleAdminFetchUserByDirectId = (e) => {
    e.preventDefault();
    if (adminViewUserStatus === "loading") return;
    dispatch(clearSearchResults());
    if (adminDirectIdSearch.trim()) {
      dispatch(fetchUserForAdmin(adminDirectIdSearch.trim()));
    } else {
      dispatch(clearAdminViewedUser());
    }
  };

  const handleAdminGeneralUserSearch = (e) => {
    e.preventDefault();
    if (adminSearchStatus === "loading") return;
    dispatch(clearAdminViewedUser());
    if (adminGeneralSearchQuery.trim()) {
      dispatch(setCurrentQuery(adminGeneralSearchQuery.trim()));
      // Передаємо параметри пагінації для searchUsers (раніше searchUsersPaginated)
      dispatch(
        searchUsers({
          query: adminGeneralSearchQuery.trim(),
          page: 1,
          limit: 10,
        })
      );
    } else {
      dispatch(clearSearchResults());
    }
  };

  const handleSelectAdminSearchedUser = (user) => {
    dispatch(clearSearchResults());
    setAdminGeneralSearchQuery("");
    setAdminDirectIdSearch(String(user.user_id));
    dispatch(fetchUserForAdmin(user.user_id));
  };

  const handleAdminEditFormChange = (e) => {
    const { name, value } = e.target;
    setAdminEditFormData((prev) => ({ ...prev, [name]: value }));
    if (adminEditUserStatus !== "idle" || adminEditUserError) {
      dispatch(resetAdminEditUserStatus());
    }
  };

  const handleAdminSubmitUserDetails = async (e) => {
    e.preventDefault();
    if (!adminViewedUser || adminEditUserStatus === "loading") return;
    dispatch(resetAdminEditUserStatus());
    const detailsToUpdate = {};
    if (
      adminEditFormData.username !==
      (adminViewedUser.userName || adminViewedUser.username)
    )
      detailsToUpdate.username = adminEditFormData.username;
    if (
      adminEditFormData.display_name !==
      (adminViewedUser.displayName || adminViewedUser.display_name)
    )
      detailsToUpdate.display_name = adminEditFormData.display_name;
    if (adminEditFormData.about_me !== adminViewedUser.about_me)
      detailsToUpdate.about_me = adminEditFormData.about_me;
    if (adminEditFormData.gender !== adminViewedUser.gender)
      detailsToUpdate.gender = adminEditFormData.gender;
    if (adminEditFormData.email !== adminViewedUser.email)
      detailsToUpdate.email = adminEditFormData.email;
    if (adminEditFormData.phone !== adminViewedUser.phone)
      detailsToUpdate.phone = adminEditFormData.phone;

    if (Object.keys(detailsToUpdate).length === 0) {
      alert("Немає змін для збереження.");
      return;
    }

    const resultAction = await dispatch(
      adminEditUserDetails({
        userId: adminViewedUser.user_id,
        details: detailsToUpdate,
      })
    );
    if (adminEditUserDetails.fulfilled.match(resultAction)) {
      alert("Дані користувача успішно оновлено адміном.");
    }
  };

  const handleAdminChangeRole = async () => {
    if (adminUpdateRoleStatus === "loading") return;
    if (
      adminViewedUser &&
      selectedRoleForAdminEdit &&
      adminViewedUser.role !== selectedRoleForAdminEdit
    ) {
      dispatch(resetAdminUpdateRoleStatus());
      const resultAction = await dispatch(
        adminUpdateUserRole({
          userId: adminViewedUser.user_id,
          newRole: selectedRoleForAdminEdit,
        })
      );
      if (adminUpdateUserRole.fulfilled.match(resultAction)) {
        alert("Роль користувача успішно оновлено.");
      }
    } else if (
      adminViewedUser &&
      adminViewedUser.role === selectedRoleForAdminEdit
    ) {
      alert("Роль вже встановлена на вибране значення.");
    }
  };
  


  const handleAdminDeleteUser = async (userIdToDelete, userName) => {
    if (
      adminDeleteUserStatus === "loading" &&
      adminViewedUser?.user_id === userIdToDelete
    )
      return;
    if (
      window.confirm(
        `Ви впевнені, що хочете видалити користувача ${userName} (ID: ${userIdToDelete})? Цю дію неможливо буде скасувати.`
      )
    ) {
      dispatch(resetAdminDeleteUserStatus());
      const resultAction = await dispatch(adminDeleteUser(userIdToDelete));
      if (adminDeleteUser.fulfilled.match(resultAction)) {
        alert(
          `Користувача ${userName} (ID: ${userIdToDelete}) успішно видалено.`
        );
        if (adminDirectIdSearch === String(userIdToDelete)) {
          setAdminDirectIdSearch("");
          dispatch(clearAdminViewedUser());
        }
        if (
          adminGeneralSearchQuery &&
          adminSearchResults.some((u) => u.user_id === userIdToDelete)
        ) {
          // Перезавантажуємо результати пошуку після видалення
          dispatch(
            searchUsers({ query: adminGeneralSearchQuery, page: 1, limit: 10 })
          );
        }
      }
    }
  };

   const handleDeleteAccountClick = useCallback(() => {
    setIsDeleteModalOpen(true); // Відкриває модальне вікно підтвердження
    dispatch(resetDeleteAccountStatus()); // Скидає будь-які попередні статуси/помилки
  }, [dispatch]);

  // Обробник закриття модального вікна видалення
  const handleCloseDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false); // Закриває модальне вікно
    dispatch(resetDeleteAccountStatus()); // Скидає статус, якщо користувач просто закрив модалку
  }, [dispatch]);

  // Обробник підтвердження видалення (отримує пароль з модального вікна)
  const handleConfirmDelete = useCallback(async (password) => {
    // Диспатчимо thunk для видалення акаунту
    const resultAction = await dispatch(deleteMyAccount(password));
    // Логіка перенаправлення та сповіщень обробляється в useEffect нижче
  }, [dispatch]);

  // Ефект для обробки успішного/невдалого видалення акаунту
  useEffect(() => {
    if (deleteAccountStatus === "succeeded") {
      alert("Ваш акаунт успішно видалено.");
      setIsDeleteModalOpen(false); // Закрити модальне вікно
      navigate("/login"); // Перенаправити на сторінку входу
      dispatch(resetDeleteAccountStatus()); // Скинути стан після завершення
    } else if (deleteAccountStatus === "failed") {
      // Модальне вікно вже відображає помилку. Тут можна додати додаткову логіку.
      console.error("Помилка видалення акаунту:", deleteAccountError);
    }
  }, [deleteAccountStatus, navigate, dispatch, deleteAccountError]);

  

  const userForUI = profile?.user || authUser;
  const pageLoading = profileLoading && !profile && !authUser;

  if (pageLoading) {
    return (
      <div className={styles.settingsContainer}>
        <p className={styles.loadingMessage}>Завантаження налаштувань...</p>
      </div>
    );
  }
  if (profileError && !userForUI) {
    return (
      <div className={styles.settingsContainer}>
        <p className={styles.errorStatus}>
          Помилка завантаження даних профілю:{" "}
          {typeof profileError === "string" ? profileError : "Невідома помилка"}
        </p>
      </div>
    );
  }
  if (!userForUI) {
    return (
      <div className={styles.settingsContainer}>
        <p>Будь ласка, увійдіть, щоб переглянути налаштування.</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.settingsContainer}>
        <h1>Налаштування Акаунту</h1>

        <section className={styles.settingsSection}>
          <h2>Змінити аватар</h2>
          <div className={styles.avatarChangeSection}>
            <img
              src={avatarPreview || "/default_avatar.png"}
              alt="Поточний аватар"
              className={styles.currentAvatarPreview}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/default_avatar.png";
              }}
            />
            <input
              type="file"
              accept="image/png, image/jpeg, image/gif, image/webp"
              ref={avatarInputRef}
              onChange={handleAvatarFileSelect}
              className={styles.avatarFileInput}
              id="avatarUploadInputSettings"
            />
            <label
              htmlFor="avatarUploadInputSettings"
              className={styles.avatarUploadButton}
            >
              Обрати файл
            </label>
            {avatarFileToUpload && (
              <>
                <span className={styles.fileName}>
                  {avatarFileToUpload.name} (кадровано)
                </span>
                <button
                  onClick={handleAvatarUpload}
                  className={styles.submitButton}
                  disabled={uploadAvatarStatus === "loading"}
                  style={{ marginTop: "10px", alignSelf: "center" }}
                >
                  {uploadAvatarStatus === "loading"
                    ? "Завантаження..."
                    : "Завантажити новий аватар"}
                </button>
              </>
            )}
          </div>
          {uploadAvatarStatus === "succeeded" && (
            <p className={styles.successStatus}>Аватар успішно оновлено!</p>
          )}
          {uploadAvatarStatus === "failed" && uploadAvatarError && (
            <p className={styles.errorStatus}>
              Помилка завантаження:{" "}
              {typeof uploadAvatarError === "string"
                ? uploadAvatarError
                : uploadAvatarError?.message || "Невідома помилка"}
            </p>
          )}
        </section>

        <section className={styles.settingsSection}>
          <h2>Особиста інформація</h2>
          <form onSubmit={handleSubmitDetails} className={styles.settingsForm}>
            <div className={styles.formGroup}>
              <label htmlFor="settings_display_name">
                Ім'я для відображення:
              </label>
              <input
                type="text"
                id="settings_display_name"
                name="display_name"
                value={formData.display_name}
                onChange={handleChange}
                className={styles.formInput}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="settings_about_me">Про себе:</label>
              <textarea
                id="settings_about_me"
                name="about_me"
                value={formData.about_me}
                onChange={handleChange}
                rows="4"
                className={styles.formTextarea}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="settings_phone">Телефон:</label>
              <input
                type="tel"
                id="settings_phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={styles.formInput}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="settings_gender">Стать:</label>
              <select
                id="settings_gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={styles.formSelect}
              >
                <option value="">Не вказано</option>
                <option value="male">Чоловіча</option>
                <option value="female">Жіноча</option>
                <option value="other">Інша</option>
              </select>
            </div>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={updateStatus === "loading"}
            >
              {updateStatus === "loading" ? "Збереження..." : "Зберегти зміни"}
            </button>
            {updateStatus === "succeeded" && (
              <p className={styles.successStatus}>Дані успішно оновлено!</p>
            )}
            {updateStatus === "failed" && updateError && (
              <p className={styles.errorStatus}>
                Не вдалося оновити дані:{" "}
                {typeof updateError === "string"
                  ? updateError
                  : updateError?.message || "Невідома помилка"}
              </p>
            )}
          </form>
        </section>

        <section className={styles.settingsSection}>
          <h2>Зміна паролю</h2>
          <form
            onSubmit={handleSubmitPasswordChange}
            className={styles.settingsForm}
          >
            <div className={styles.formGroup}>
              <label htmlFor="settings_oldPassword">Старий пароль:</label>
              <input
                type="password"
                id="settings_oldPassword"
                name="oldPassword"
                value={passwordData.oldPassword}
                onChange={handlePasswordChange}
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="settings_newPassword">
                Новий пароль (мін. 8 символів):
              </label>
              <input
                type="password"
                id="settings_newPassword"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className={styles.formInput}
                required
                minLength={8}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="settings_confirmNewPassword">
                Підтвердіть новий пароль:
              </label>
              <input
                type="password"
                id="settings_confirmNewPassword"
                name="confirmNewPassword"
                value={passwordData.confirmNewPassword}
                onChange={handlePasswordChange}
                className={styles.formInput}
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={passwordChangeStatus === "loading"}
            >
              {passwordChangeStatus === "loading"
                ? "Зміна..."
                : "Змінити пароль"}
            </button>
            {passwordChangeStatus === "succeeded" && (
              <p className={styles.successStatus}>Пароль успішно змінено!</p>
            )}
            {passwordChangeStatus === "failed" && passwordChangeError && (
              <p className={styles.errorStatus}>
                {typeof passwordChangeError === "string"
                  ? passwordChangeError
                  : passwordChangeError?.message || "Помилка зміни пароля."}
              </p>
            )}
          </form>
        </section>

        <section className={styles.settingsSection}>
          <h2>Вибір Теми</h2>
          <div className={styles.themeOptionsContainer}>
            <button
              onClick={() => handleThemeChange("light")}
              className={`${styles.themeButton} ${theme === "light" ? styles.activeTheme : ""}`}
            >
              Світла
            </button>
            <button
              onClick={() => handleThemeChange("dark")}
              className={`${styles.themeButton} ${theme === "dark" ? styles.activeTheme : ""}`}
            >
              Темна
            </button>
            <button
              onClick={() => handleThemeChange("purple")}
              className={`${styles.themeButton} ${theme === "purple" ? styles.activeTheme : ""}`}
            >
              Фіолетова
            </button>
          </div>
        </section>

        <section className={styles.settingsSection}>
        <h2>Видалити акаунт</h2>
        <p>Ця дія є незворотною. Усі ваші дані будуть видалені.</p>
        <button className = {styles.deleteButton}
          onClick={handleDeleteAccountClick}
          disabled={deleteAccountStatus === "loading"}
        >
          {deleteAccountStatus === "loading" ? "Видалення..." : "Видалити мій акаунт"}
        </button>
        {deleteAccountStatus === "succeeded" && (
            <p className={styles.successStatus}>Акаунт успішно видалено!</p>
        )}
        {deleteAccountStatus === "failed" && deleteAccountError && (
            <p className={styles.errorStatus}>
                {typeof deleteAccountError === "string"
                  ? deleteAccountError
                  : deleteAccountError?.message || "Не вдалося видалити акаунт."}
            </p>
        )}
      </section>

      {/* Модальне вікно підтвердження видалення */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        loading={deleteAccountStatus === "loading"}
        error={deleteAccountError}
      />

        {currentUserForCheck?.role === "admin" && (
          <section className={`${styles.settingsSection} ${styles.adminPanel}`}>
            <h2>Адмін Панель</h2>
            <div className={styles.adminSubSection}>
              <h3>Знайти та редагувати користувача за ID</h3>
              <form
                onSubmit={handleAdminFetchUserByDirectId}
                className={styles.adminSearchForm}
              >
                <input
                  type="text"
                  placeholder="Введіть User ID"
                  value={adminDirectIdSearch}
                  onChange={(e) => {
                    setAdminDirectIdSearch(e.target.value);
                    if (adminViewUserStatus !== "idle" || adminViewedUser)
                      dispatch(clearAdminViewedUser());
                  }}
                  className={styles.formInput}
                />
                <button
                  type="submit"
                  className={styles.submitButtonSmall}
                  disabled={adminViewUserStatus === "loading"}
                >
                  {adminViewUserStatus === "loading"
                    ? "Пошук ID..."
                    : "Знайти за ID"}
                </button>
              </form>
              {adminViewUserStatus === "loading" && (
                <p className={styles.loadingMessage}>
                  Завантаження даних користувача...
                </p>
              )}
              {adminViewUserStatus === "failed" &&
                !adminViewedUser &&
                adminViewUserError && (
                  <p className={styles.errorStatus}>
                    Помилка:{" "}
                    {typeof adminViewUserError === "string"
                      ? adminViewUserError
                      : adminViewUserError?.message || "Невідома помилка"}
                  </p>
                )}
              {adminViewUserStatus === "succeeded" &&
                !adminViewedUser &&
                adminDirectIdSearch && (
                  <p>Користувача з ID '{adminDirectIdSearch}' не знайдено.</p>
                )}
              {adminViewedUser && (
                <div className={styles.adminUserInfo}>
                  <h4>
                    Редагування:{" "}
                    {adminViewedUser.displayName || adminViewedUser.userName}{" "}
                    (ID: {adminViewedUser.user_id})
                  </h4>
                  <form
                    onSubmit={handleAdminSubmitUserDetails}
                    className={styles.settingsForm}
                    style={{ gap: "10px", marginTop: "10px" }}
                  >
                    <input
                      type="text"
                      name="username"
                      placeholder="Нікнейм (username)"
                      value={adminEditFormData.username}
                      onChange={handleAdminEditFormChange}
                      className={styles.formInput}
                    />
                    <input
                      type="text"
                      name="display_name"
                      placeholder="Ім'я для відображення"
                      value={adminEditFormData.display_name}
                      onChange={handleAdminEditFormChange}
                      className={styles.formInput}
                    />
                    <textarea
                      name="about_me"
                      placeholder="Про себе"
                      value={adminEditFormData.about_me}
                      onChange={handleAdminEditFormChange}
                      className={styles.formTextarea}
                      rows={3}
                    ></textarea>
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={adminEditFormData.email}
                      onChange={handleAdminEditFormChange}
                      className={styles.formInput}
                    />
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Телефон"
                      value={adminEditFormData.phone}
                      onChange={handleAdminEditFormChange}
                      className={styles.formInput}
                    />
                    <select
                      name="gender"
                      value={adminEditFormData.gender}
                      onChange={handleAdminEditFormChange}
                      className={styles.formSelect}
                    >
                      <option value="">Стать не вказано</option>
                      <option value="male">Чоловіча</option>
                      <option value="female">Жіноча</option>
                      <option value="other">Інша</option>
                    </select>
                    <button
                      type="submit"
                      className={styles.submitButtonSmall}
                      disabled={adminEditUserStatus === "loading"}
                    >
                      {adminEditUserStatus === "loading"
                        ? "Оновлення..."
                        : "Оновити деталі"}
                    </button>
                    {adminEditUserStatus === "succeeded" && (
                      <p className={styles.successStatus}>
                        Деталі користувача оновлено.
                      </p>
                    )}
                    {adminEditUserError && (
                      <p className={styles.errorStatus}>
                        Помилка оновлення деталей:{" "}
                        {typeof adminEditUserError === "string"
                          ? adminEditUserError
                          : adminEditUserError?.message || "Невідома помилка"}
                      </p>
                    )}
                  </form>

                  <div className={styles.adminRoleEditor}>
                    <label htmlFor="adminEditRoleSelect">Роль:</label>
                    <select
                      id="adminEditRoleSelect"
                      value={selectedRoleForAdminEdit}
                      onChange={(e) =>
                        setSelectedRoleForAdminEdit(e.target.value)
                      }
                      className={styles.formSelect}
                      disabled={adminUpdateRoleStatus === "loading"}
                    >
                      <option value="user">user</option>
                      <option value="moderator">moderator</option>
                      <option value="admin">admin</option>
                    </select>
                    <button
                      onClick={handleAdminChangeRole}
                      className={styles.submitButtonSmall}
                      disabled={
                        adminUpdateRoleStatus === "loading" ||
                        !selectedRoleForAdminEdit ||
                        (adminViewedUser &&
                          adminViewedUser.role === selectedRoleForAdminEdit)
                      }
                    >
                      {adminUpdateRoleStatus === "loading"
                        ? "Зміна..."
                        : "Зберегти роль"}
                    </button>
                  </div>
                  <AdminPasswordReset adminUserToResetId={adminViewedUser?.user_id} />
                  {adminUpdateRoleStatus === "succeeded" && (
                    <p className={styles.successStatus}>Роль оновлено!</p>
                  )}
                  {adminUpdateRoleError && (
                    <p className={styles.errorStatus}>
                      {typeof adminUpdateRoleError === "string"
                        ? adminUpdateRoleError
                        : adminUpdateRoleError?.message ||
                          "Помилка оновлення ролі"}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      adminViewedUser &&
                      handleAdminDeleteUser(
                        adminViewedUser.user_id,
                        adminViewedUser.displayName || adminViewedUser.userName
                      )
                    }
                    className={`${styles.submitButtonSmall} ${styles.deleteButton}`}
                    disabled={
                      !adminViewedUser ||
                      (adminDeleteUserStatus === "loading" &&
                        adminViewedUser?.user_id ===
                          (adminViewedUser && adminViewedUser.user_id))
                    }
                    style={{ marginTop: "15px" }}
                  >
                    {adminDeleteUserStatus === "loading" &&
                    adminViewedUser &&
                    adminViewedUser.user_id ===
                      (adminViewedUser && adminViewedUser.user_id)
                      ? "Видалення..."
                      : `Видалити користувача`}
                  </button>
                  {adminDeleteUserStatus === "succeeded" &&
                    !adminViewedUser && (
                      <p className={styles.successStatus}>
                        Користувача видалено.
                      </p>
                    )}
                  {adminDeleteUserError && (
                    <p className={styles.errorStatus}>
                      {typeof adminDeleteUserError === "string"
                        ? adminDeleteUserError
                        : adminDeleteUserError?.message || "Помилка видалення"}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className={styles.adminSubSection}>
              <h3>Пошук користувачів (загальний)</h3>
              <form
                onSubmit={handleAdminGeneralUserSearch}
                className={styles.adminSearchForm}
              >
                <input
                  type="text"
                  placeholder="Нікнейм, UID, ім'я..."
                  value={adminGeneralSearchQuery}
                  onChange={(e) => setAdminGeneralSearchQuery(e.target.value)}
                  className={styles.formInput}
                />
                <button
                  type="submit"
                  className={styles.submitButtonSmall}
                  disabled={adminSearchStatus === "loading"}
                >
                  {adminSearchStatus === "loading" ? "Пошук..." : "Шукати"}
                </button>
              </form>
              {adminSearchStatus === "loading" && (
                <p className={styles.loadingMessage}>Пошук...</p>
              )}
              {adminSearchError && (
                <p className={styles.errorStatus}>
                  Помилка пошуку:{" "}
                  {typeof adminSearchError === "string"
                    ? adminSearchError
                    : adminSearchError?.message || "Невідома помилка"}
                </p>
              )}
              {adminSearchStatus === "succeeded" &&
                (adminSearchResults.length > 0 ? (
                  <ul className={styles.adminUserList}>
                    {adminSearchResults.map((user) => (
                      <li
                        key={user.user_id}
                        className={styles.adminUserListItem}
                      >
                        <img
                          src={avatarImgUrl(user.user_avatar_url)}
                          alt={user.username}
                          className={styles.adminUserListAvatar}
                        />
                        <div>
                          <span className={styles.adminUserListName}>
                            {user.displayName || user.userName}
                          </span>
                          <span className={styles.adminUserListHandle}>
                            @{user.userName} (ID: {user.user_id})
                          </span>
                        </div>
                        <div className={styles.adminUserListActions}>
                          <button
                            onClick={() => handleSelectAdminSearchedUser(user)}
                            className={styles.actionButtonSmall}
                          >
                            Деталі
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  adminCurrentSearchQuery && (
                    <p>
                      Користувачів за запитом "{adminCurrentSearchQuery}" не
                      знайдено.
                    </p>
                  )
                ))}
            </div>
          </section>
        )}
      </div>

      {isCropModalOpen && imageToCrop && (
        <AvatarCropModal
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCropCancel={handleCropCancel}
          aspectRatio={1}
        />
      )}
    </>
  );
};

export default SettingsPage;
