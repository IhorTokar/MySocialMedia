// my-app/src/components/Pages/Profile/Profileinfo/Profileinfo.jsx
import React from "react";
import { useNavigate } from 'react-router-dom';
import styles from "./Profileinfo.module.css";
import { avatarImgUrl } from '../../../../utils/ImagesLoadUtil';
import { useAppDispatch, useAppSelector } from '../../../../hooks/reduxHooks';
import { setSelectedChat } from '../../../../redux/dialogsSlice';
import { FaUserEdit, FaUserPlus, FaUserCheck, FaEnvelope } from 'react-icons/fa';
// Припускаємо, що followUser та unfollowUser також імпортуються, якщо onFollowToggle не передається
import { followUser, unfollowUser } from '../../../../redux/usersSlice';
import { setViewedProfileFollowStatus } from '../../../../redux/userSlice';


function ProfileInfo({
    user,
    isOwnProfile,
    viewedUserId, // Важливо для чужих профілів
    isFollowed,   // Поточний статус підписки
    // onFollowToggle, // Можна прибрати, якщо логіка тепер всередині
    // onEditProfile,  // Можна прибрати
    postsCount = user?.postsCount || 0,
    followersCount = user?.followersCount || 0,
    followingCount = user?.followingCount || 0
}) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { followStatus } = useAppSelector(state => state.users);
  const loggedInUserId = useAppSelector(state =>
    state.auth.user?.user_id ? parseInt(String(state.auth.user.user_id), 10) :
    (state.user.profile?.user?.user_id ? parseInt(String(state.user.profile.user.user_id), 10) : null)
  );

  if (!user || !user.user_id) {
    return <div className={styles.profileInfoLoading}>Завантаження інформації профілю...</div>;
  }

  const displayName = user.displayName || user.display_name || user.userName || user.username || "Ім'я не вказано";
  const userHandle = user.userName || user.username ? `@${user.userName || user.username}` : (user.uid ? `@${user.uid.substring(0,8)}` : "@unknown");
  const aboutMe = user.about_me || "";
  const avatarFileName = user.user_avatar_url; // Тепер це ім'я файлу
  const bannerUrl = user.profile_banner_url || "/background.png";

  const handleEditProfile = () => {
    navigate('/settings_page');
  };

  const actualViewedUserId = isOwnProfile ? loggedInUserId : viewedUserId;

  const handleFollow = async () => {
    if (actualViewedUserId && followStatus !== 'loading' && actualViewedUserId !== loggedInUserId) {
      dispatch(setViewedProfileFollowStatus({ userId: actualViewedUserId, followed: true })); // Оптимістичне оновлення
      try {
        await dispatch(followUser(actualViewedUserId)).unwrap();
      } catch (error) {
        dispatch(setViewedProfileFollowStatus({ userId: actualViewedUserId, followed: false })); // Відкат
        console.error("Failed to follow user:", error);
      }
    }
  };

  const handleUnfollow = async () => {
    if (actualViewedUserId && followStatus !== 'loading' && actualViewedUserId !== loggedInUserId) {
      dispatch(setViewedProfileFollowStatus({ userId: actualViewedUserId, followed: false })); // Оптимістичне оновлення
      try {
        await dispatch(unfollowUser(actualViewedUserId)).unwrap();
      } catch (error) {
        dispatch(setViewedProfileFollowStatus({ userId: actualViewedUserId, followed: true })); // Відкат
        console.error("Failed to unfollow user:", error);
      }
    }
  };

  const handleWriteMessage = () => {
    if (isOwnProfile || !actualViewedUserId || actualViewedUserId === loggedInUserId) return;
    dispatch(setSelectedChat(actualViewedUserId));
    navigate('/dialogs');
  };

  const shouldShowFollowButton = !isOwnProfile && actualViewedUserId && actualViewedUserId !== loggedInUserId;
  const shouldShowWriteMessageButton = !isOwnProfile && actualViewedUserId && actualViewedUserId !== loggedInUserId;

  return (
    <div className={styles.profileInfoCardWrapper}> {/* Нова обгортка для банера та картки */}
      <div className={styles.bannerWrapper}>
        <img
          src={bannerUrl}
          alt="Банер профілю"
          className={styles.banner}
          onError={(e) => { e.target.onerror = null; e.target.src = "/background.png"; }}
        />
      </div>

      <div className={styles.profileInfoCard}>
        {/* Аватар тепер перший дочірній елемент profileInfoCard для легшого позиціонування */}
        <div className={styles.avatarPositioner}> {/* Нова обгортка для позиціонування аватара */}
          <div className={styles.avatarImageContainer}> {/* Рамка */}
            <img
              src={avatarImgUrl(avatarFileName)}
              alt={`Аватар ${displayName}`}
              className={styles.avatar}
              onError={(e) => { e.target.onerror = null; e.target.src = "/default_avatar.png"; }}
            />
          </div>
        </div>

        <div className={styles.actionsRow}>
          {isOwnProfile ? (
            <button className={`${styles.profileActionButton} ${styles.editButton}`} onClick={handleEditProfile}>
              <FaUserEdit /> Редагувати профіль
            </button>
          ) : (
            <>
              {shouldShowFollowButton && (
                isFollowed ? (
                  <button
                    onClick={handleUnfollow}
                    className={`${styles.profileActionButton} ${styles.unfollowButton}`}
                    disabled={followStatus === 'loading'}
                  >
                    {followStatus === 'loading' ? 'Обробка...' : <><FaUserCheck /> Відстежуєте</>}
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    className={`${styles.profileActionButton} ${styles.followButton}`}
                    disabled={followStatus === 'loading'}
                  >
                    {followStatus === 'loading' ? 'Обробка...' : <><FaUserPlus /> Підписатись</>}
                  </button>
                )
              )}
              {shouldShowWriteMessageButton && (
                <button
                  onClick={handleWriteMessage}
                  className={`${styles.profileActionButton} ${styles.messageButton}`}
                >
                  <FaEnvelope /> Написати
                </button>
              )}
            </>
          )}
        </div>

        {/* Цей div тепер є .userInfo з вашої розмітки */}
        <div className={`${styles.userInfo} ${"Profileinfo_userInfo__CBGUb"}`}> {/* Зберігаємо ваш клас для ідентифікації */}
          <div className={`${styles.userNames} ${"Profileinfo_userNames__6DSdU"}`}>
            <h2 className={`${styles.displayName} ${"Profileinfo_displayName__uchOu"}`}>{displayName}</h2>
            {userHandle && <p className={`${styles.userHandle} ${"Profileinfo_userHandle__mHcwi"}`}>{userHandle}</p>}
          </div>
          {aboutMe && <p className={`${styles.bio} ${"Profileinfo_bio__5Hr2w"}`}>{aboutMe}</p>}
          <div className={`${styles.userStats} ${"Profileinfo_userStats__QU1SP"}`}>
            <span className={styles.statItem}><strong>5</strong> {postsCount === 1 ? 'допис' : (postsCount >=2 && postsCount <=4 ? 'дописи' : 'дописів')}</span>
            <span className={styles.statItem}><strong>0</strong> {followersCount === 1 ? 'підписник' : (followersCount === 0 || followersCount > 4 ? 'підписників' : 'підписники')}</span>
            <span className={styles.statItem}><strong>4</strong> відстежує</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileInfo;