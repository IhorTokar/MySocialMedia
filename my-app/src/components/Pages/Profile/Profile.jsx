// my-app/src/components/Pages/Profile/Profile.jsx
import React, { useEffect } from "react";
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import MyPostsContainer from "./MyPosts/MyPostsContainer";
import ProfileInfo from "./Profileinfo/Profileinfo"; // Або ProfileInfoContainer, як було у вашій структурі
import {
    fetchUserProfile,
    fetchUserProfileById,
    clearViewedProfile,
    clearUserProfile
} from '../../../redux/userSlice';
import { useAppDispatch } from "../../../hooks/reduxHooks";
import styles from './Profile.module.css';

function Profile() {
  const dispatch = useAppDispatch();
  const { userId: userIdFromParams } = useParams();

  const token = useSelector(state => state.auth.token);
  const authUserData = useSelector(state => state.auth.user); // Дані з /login

  // Використовуємо ті стани, які були у вашій "старій" userSlice
  const {
    profile: ownProfileDataFromStore, // Дані з /users/me
    loading: ownProfileLoading,
    error: ownProfileError,
    viewedProfile,
    viewedProfileLoading,
    viewedProfileError
  } = useSelector(state => state.user);

  const loggedInUserId = ownProfileDataFromStore?.user?.user_id
                         ? parseInt(String(ownProfileDataFromStore.user.user_id), 10)
                         : (authUserData?.user_id ? parseInt(String(authUserData.user_id), 10) : null);

  const paramUserIdNum = userIdFromParams ? parseInt(userIdFromParams, 10) : null;
  const isOwnProfile = !paramUserIdNum || (loggedInUserId !== null && paramUserIdNum === loggedInUserId);
  const targetId = isOwnProfile ? loggedInUserId : paramUserIdNum;

  useEffect(() => {
    console.log(`[Profile.jsx - REVERTED] Effect. Param: ${userIdFromParams}, LoggedInID: ${loggedInUserId}, isOwn: ${isOwnProfile}, TargetID: ${targetId}, Token: ${!!token}`);
    if (isOwnProfile) {
      // Для власного профілю
      if (token && !ownProfileDataFromStore && !ownProfileLoading && !ownProfileError) {
        console.log("[Profile.jsx - REVERTED] Own profile. Fetching...");
        dispatch(fetchUserProfile());
      } else if (!token && ownProfileDataFromStore) {
         dispatch(clearUserProfile());
      }
    } else if (targetId) {
      // Для чужого профілю
      // Завантажуємо, якщо viewedProfile не для цього targetId, або була помилка, і не йде завантаження
      if ((!viewedProfile || viewedProfile.user_id !== targetId || viewedProfileError) && !viewedProfileLoading) {
        console.log(`[Profile.jsx - REVERTED] Fetching other user's profile ID: ${targetId}`);
        dispatch(clearViewedProfile()); // Очистити попередній, якщо є
        dispatch(fetchUserProfileById(targetId));
      }
    }
  }, [
    dispatch, targetId, isOwnProfile, token, loggedInUserId, // Ключові залежності
    ownProfileDataFromStore, viewedProfile, // Дані
    ownProfileLoading, ownProfileError,     // Статуси для свого профілю
    viewedProfileLoading, viewedProfileError, // Статуси для чужого профілю
    userIdFromParams // Для оновлення при зміні URL
  ]);

  // Логіка визначення, що відображати
  let userToDisplay = null;
  let isLoading = false;
  let errorToDisplay = null;

  if (isOwnProfile) {
    userToDisplay = ownProfileDataFromStore?.user;
    isLoading = ownProfileLoading && !ownProfileDataFromStore; // Завантаження, якщо даних ще немає
    errorToDisplay = ownProfileError;
  } else if (targetId) {
    userToDisplay = (viewedProfile && viewedProfile.user_id === targetId) ? viewedProfile : null;
    isLoading = viewedProfileLoading && (!userToDisplay || userToDisplay.user_id !== targetId);
    errorToDisplay = viewedProfileError;
  }
  
  const isFollowedStatus = !isOwnProfile && userToDisplay ? !!userToDisplay.isFollowedByCurrentUser : false;


  // Умови рендерингу (спрощені, адаптуйте до вашого початкового варіанту)
  if (isLoading) return <div className={styles.messageContainer}>Завантаження даних профілю...</div>;
  if (errorToDisplay && !userToDisplay) return <div className={`${styles.messageContainer} ${styles.error}`}>Помилка завантаження профілю.</div>;
  if (!userToDisplay && targetId && !isOwnProfile) return <div className={styles.messageContainer}>Профіль не знайдено.</div>;
  if (!userToDisplay && isOwnProfile && !token) return <div className={styles.messageContainer}>Будь ласка, увійдіть.</div>;
  if (!userToDisplay && isOwnProfile && token) return <div className={styles.messageContainer}>Очікування даних профілю...</div>;
  if (!userToDisplay) return <div className={styles.messageContainer}>Дані профілю недоступні.</div>;


  return (
    <div className={styles.profilePageLayout}>
      <ProfileInfo
        user={userToDisplay}
        isOwnProfile={isOwnProfile}
        viewedUserId={isOwnProfile ? null : userToDisplay?.user_id}
        isFollowed={isFollowedStatus}
      />
      <div className={styles.postsSectionContainer}>
        <MyPostsContainer profileUserId={userToDisplay?.user_id} isOwnProfile={isOwnProfile} />
      </div>
    </div>
  );
}

export default Profile;