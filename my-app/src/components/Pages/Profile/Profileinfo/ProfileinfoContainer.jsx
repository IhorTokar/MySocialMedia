// my-app/src/components/Pages/Profile/ProfileInfo/ProfileInfoContainer.jsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUserProfile } from '../../../../redux/userSlice'; 
import ProfileInfo from './Profileinfo';

function ProfileInfoContainer() {
  const dispatch = useDispatch();
  const { profile, loading, error } = useSelector((state) => state.user);


  useEffect(() => {
    // Перевіряємо, чи є профіль і чи не йде завантаження/немає помилки,
    // щоб уникнути зайвих запитів, якщо дані вже є або була помилка.
    if (!profile && !loading && !error) {
      dispatch(fetchUserProfile());
    }
 
  }, [dispatch, profile, loading, error]);

  
  if (loading) {
    return <div>Завантаження інформації профілю...</div>;
  }

  if (error) {
    return <div>Помилка завантаження профілю: {error}</div>;
  }


  const userData = profile?.user;

  if (!userData) {
    // Можливо, варто показати повідомлення або null,
    // залежно від того, як Profile.jsx обробляє відсутність цього блоку
    return <div>Не вдалося завантажити дані профілю.</div>;
  }

  return <ProfileInfo user={userData} />;
}

export default ProfileInfoContainer;