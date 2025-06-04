// my-app/src/components/Header/Header.jsx

import React, { useState, useRef, useEffect } from "react";

import styles from "./Header.module.css";

import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";

import { logoutUser } from "../../redux/AuthSlice";

import { clearUserProfile } from "../../redux/userSlice";

import { useNavigate } from "react-router-dom";

import { avatarImgUrl } from "../../utils/ImagesLoadUtil";

import {
  fetchNotifications,
  markNotificationAsRead,
  clearNotificationsState,
} from "../../redux/notificationSlice"; // <-- Імпортуємо

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const menuRef = useRef(null);

  const notificationsRef = useRef(null);

  const dispatch = useAppDispatch();

  const navigate = useNavigate();

  const { profile } = useAppSelector((state) => state.user);

  const isAuthenticated = !!useAppSelector((state) => state.auth.token);

  // Отримуємо дані сповіщень з Redux

  const {
    items: notificationsList,

    unreadCount,

    status: notificationsStatus,

    error: notificationsError,
  } = useAppSelector((state) => state.notifications);

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);

    if (isNotificationsOpen) setIsNotificationsOpen(false);
  };

  const toggleNotifications = () => {
    const opening = !isNotificationsOpen;

    setIsNotificationsOpen(opening);

    if (menuOpen) setMenuOpen(false);

    // Завантажуємо сповіщення, якщо відкриваємо і вони ще не завантажені (або не в процесі)

    if (opening && notificationsStatus === "idle") {
      dispatch(fetchNotifications());
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      dispatch(markNotificationAsRead(notification.id));
    }

    setIsNotificationsOpen(false); // Закриваємо список після кліку

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleLogout = async () => {
    const resultAction = await dispatch(logoutUser());

    if (logoutUser.fulfilled.match(resultAction)) {
      dispatch(clearUserProfile());

      dispatch(clearNotificationsState()); // Очищаємо сповіщення при виході

      navigate("/login");
    } else {
      console.error("Logout failed:", resultAction.payload);

      dispatch(clearUserProfile());

      dispatch(clearNotificationsState());

      localStorage.removeItem("authToken");

      navigate("/login");
    }

    setMenuOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !event.target.closest(`.${styles.avatarWrapper}`)
      ) {
        setMenuOpen(false);
      }

      // Перевіряємо, чи клік був не по іконці сповіщень перед закриттям

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target) &&
        !event.target.closest(
          `.${styles.headerIconButton}[aria-label="Сповіщення"]`
        )
      ) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userAvatar = profile?.user?.user_avatar_url;

  return (
    <header className={styles.header}>
      <div className={styles.leftSide} onClick={() => navigate("/")}>
        <span className={styles.logoText}>NexusConnect</span>
      </div>

      {isAuthenticated && (
        <div className={styles.searchContainer}>
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <button
              type="submit"
              className={styles.searchButtonIcon}
              aria-label="Пошук"
            >
              <img
                src={process.env.PUBLIC_URL + "/icons/Search.png"}
                alt=""
                className={styles.searchIconInForm}
              />
            </button>

            <input
              type="text"
              placeholder="Пошук по сайту..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>
      )}

      <div className={styles.rightSide}>
        {isAuthenticated ? (
          <>
            <button
              className={styles.headerIconButton}
              aria-label="Чати"
              onClick={() => navigate("/dialogs")}
            >
              <img
                src={process.env.PUBLIC_URL + "/icons/Messages.png"}
                alt="Чати"
                className={styles.headerIcon}
              />
            </button>

            <div className={styles.notificationsIconWrapper}>
              <button
                className={styles.headerIconButton}
                aria-label="Сповіщення"
                onClick={toggleNotifications}
              >
                <img
                  src={process.env.PUBLIC_URL + "/icons/Notifications.png"}
                  alt="Сповіщення"
                  className={styles.headerIcon}
                />

                {unreadCount > 0 && (
                  <span className={styles.notificationBadge}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div
                  className={styles.notificationsDropdown}
                  ref={notificationsRef}
                >
                  <div className={styles.dropdownHeader}>
                    <h4>Сповіщення</h4>
                  </div>

                  {notificationsStatus === "loading" && (
                    <p className={styles.loadingMessage}>Завантаження...</p>
                  )}

                  {notificationsError && (
                    <p className={styles.errorMessage}>
                      Помилка: {notificationsError}
                    </p>
                  )}

                  {notificationsStatus === "succeeded" && (
                    <ul className={styles.notificationsList}>
                      {notificationsList.length > 0 ? (
                        notificationsList.map((notif) => (
                          <li
                            key={notif.id}
                            className={`${styles.notificationItem} ${!notif.read ? styles.unread : ""}`}
                            onClick={() => handleNotificationClick(notif)}
                          >
                            <img
                              src={avatarImgUrl(
                                notif.userAvatarFilename
                              )} /* Використовуємо avatarFilename з мокових даних */
                              alt=""
                              className={styles.notificationAvatar}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/default_avatar.png";
                              }}
                            />

                            <div className={styles.notificationContent}>
                              <p className={styles.notificationText}>
                                {notif.text} {notif.count && `(${notif.count})`}
                              </p>

                              <span className={styles.notificationTime}>
                                {notif.time}
                              </span>
                            </div>

                            {!notif.read && (
                              <div className={styles.unreadDot}></div>
                            )}
                          </li>
                        ))
                      ) : (
                        <li className={styles.noNotifications}>
                          У вас немає нових сповіщень.
                        </li>
                      )}
                    </ul>
                  )}

                  <div className={styles.dropdownFooter}>
                    {/* Замініть шлях '/notifications-all' на ваш реальний шлях до сторінки всіх сповіщень, якщо вона є */}

                    <button
                      onClick={() => {
                        navigate("/notifications-all");
                        setIsNotificationsOpen(false);
                      }}
                    >
                      Усі сповіщення
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.avatarWrapper} onClick={toggleMenu}>
              <img
                className={styles.avatar}
                src={
                  userAvatar ? avatarImgUrl(userAvatar) : "/default_avatar.png"
                }
                alt="аватар"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/default_avatar.png";
                }}
              />

              {menuOpen && (
                <div className={styles.dropdownMenu} ref={menuRef}>
                  <p
                    onClick={() => {
                      navigate(
                        profile?.user?.user_id
                          ? `/profile/${profile.user.user_id}`
                          : "/profile"
                      );
                      setMenuOpen(false);
                    }}
                  >
                    Мій профіль
                  </p>

                  <p
                    onClick={() => {
                      navigate("/settings_page");
                      setMenuOpen(false);
                    }}
                  >
                    Налаштування
                  </p>

                  <p onClick={handleLogout}>Вийти</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            className={styles.loginBtn}
            onClick={() => navigate("/login")}
          >
            Увійти
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
