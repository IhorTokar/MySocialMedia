// my-app/src/components/RightSidebar/RightSideBarController.jsx
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../../hooks/reduxHooks';
import { fetchPopularPosts, resetPostsFeed } from '../../redux/postsSlice';
import { fetchLatestUsers, resetLatestUsers } from '../../redux/recommendationsSlice';
import { followUser, unfollowUser } from '../../redux/usersSlice';
import RightSidebar from './RightSidebar';

const RightSideBarController = () => {
  const dispatch = useAppDispatch();
  
  // Дані для популярних постів з postsSlice
  const {
    items: popularItems,
    status: popularPostsStatus,
    error: popularPostsError,
    limit: popularPostsLimit
  } = useSelector(state => state.posts.popularPosts);

  // Дані для нових користувачів з recommendationsSlice
  const {
    items: latestUsersRecommendations,
    status: latestUsersStatus,
    error: latestUsersError,
    limit: latestUsersLimit
  } = useSelector(state => state.recommendations.latestUsers);

  const loggedInUserId = useSelector(state => state.auth.user?.user_id || state.user.profile?.user?.user_id);

  useEffect(() => {
    const effectTimestamp = new Date().toISOString();
    console.log(`[RightSideBarController][${effectTimestamp}] useEffect. PopularStatus: ${popularPostsStatus}, LatestUsersStatus: ${latestUsersStatus}`);
    
    // <<< ЗМІНА: Прибираємо перевірку на токен для популярних постів.
    // Цей запит тепер буде відправлятися завжди, коли компонент завантажується.
    // Бекенд обробить запит коректно завдяки authOptional middleware.
    if (popularPostsStatus === 'idle') {
      console.log(`[RightSideBarController][${effectTimestamp}] Dispatching fetchPopularPosts. Limit: ${popularPostsLimit || 5}, Page: 1`);
      dispatch(fetchPopularPosts({ page: 1, limit: popularPostsLimit || 5 }));
    }
    
    // Завантажуємо нових користувачів. Ця логіка залишається без змін.
    if (latestUsersStatus === 'idle') {
      console.log(`[RightSideBarController][${effectTimestamp}] Dispatching fetchLatestUsers. Limit: ${latestUsersLimit || 3}, Page: 1`);
      dispatch(fetchLatestUsers({ page: 1, limit: latestUsersLimit || 3 }));
    }
    // Залежність від `authToken` більше не потрібна для цього ефекту
  }, [dispatch, popularPostsStatus, latestUsersStatus, popularPostsLimit, latestUsersLimit]);

  // Очищення при розмонтуванні
  useEffect(() => {
    return () => {
        dispatch(resetPostsFeed({ feedType: 'popularPosts' }));
        dispatch(resetLatestUsers());
    }
  }, [dispatch]);


  const handleFollowToggle = async (userIdToToggle, currentFollowedStatus) => {
    const actionTimestamp = new Date().toISOString();
    const actionToDispatch = currentFollowedStatus ? unfollowUser(userIdToToggle) : followUser(userIdToToggle);
    console.log(`[RightSideBarController][${actionTimestamp}] Toggling follow for user ID ${userIdToToggle}. Currently followed: ${currentFollowedStatus}`);
    try {
      await dispatch(actionToDispatch).unwrap();
      console.log(`[RightSideBarController][${actionTimestamp}] Follow/Unfollow action for user ID ${userIdToToggle} successful.`);
    } catch (error) {
      console.error(`[RightSideBarController][${actionTimestamp}] Помилка при follow/unfollow для user ID ${userIdToToggle}:`, error);
    }
  };

  const handleShowMore = (section) => {
    const actionTimestamp = new Date().toISOString();
    console.log(`[RightSideBarController][${actionTimestamp}] Показати більше для секції: ${section}`);
    if (section === 'latestUsers') {
        alert("Функція 'Показати більше' для нових користувачів ще не реалізована.");
    } else if (section === 'popularPosts') {
        alert("Функція 'Показати більше' для популярних постів ще не реалізована.");
    }
  };

  return (
    <RightSidebar
      popularItems={popularItems || []}
      popularItemsStatus={popularPostsStatus}
      popularItemsError={popularPostsError}
      popularItemsTitle="Популярні дописи"

      recommendations={latestUsersRecommendations || []}
      recommendationsStatus={latestUsersStatus}
      recommendationsError={latestUsersError}
      recommendationsTitle="Нові користувачі"

      onFollowToggle={handleFollowToggle}
      onShowMore={handleShowMore}
      loggedInUserId={loggedInUserId}
    />
  );
};

export default RightSideBarController;