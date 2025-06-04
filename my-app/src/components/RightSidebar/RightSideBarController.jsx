// my-app/src/components/RightSidebar/RightSideBarController.jsx
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux'; // Використовуємо useAppSelector
import { useAppDispatch } from '../../hooks/reduxHooks';
import { fetchPopularPosts, resetPostsFeed } from '../../redux/postsSlice'; // Імпортуємо з postsSlice
import { fetchLatestUsers, updateRecommendationFollowStatus, resetLatestUsers } from '../../redux/recommendationsSlice';
import { followUser, unfollowUser } from '../../redux/usersSlice';
import RightSidebar from './RightSidebar';

const RightSideBarController = () => {
  const dispatch = useAppDispatch();
  
  // Дані для популярних постів з postsSlice
  const {
    items: popularItems, // Перейменовано для передачі в RightSidebar
    status: popularPostsStatus,
    error: popularPostsError,
    limit: popularPostsLimit // Беремо ліміт зі стану
  } = useSelector(state => state.posts.popularPosts);

  // Дані для нових користувачів з recommendationsSlice
  const {
    items: latestUsersRecommendations, // Перейменовано для передачі в RightSidebar
    status: latestUsersStatus,
    error: latestUsersError,
    limit: latestUsersLimit // Беремо ліміт зі стану
  } = useSelector(state => state.recommendations.latestUsers);

  const loggedInUserId = useSelector(state => state.auth.user?.user_id || state.user.profile?.user?.user_id);
  const authToken = useSelector(state => state.auth.token); // Додано для перевірки перед запитом

  useEffect(() => {
    const effectTimestamp = new Date().toISOString();
    console.log(`[RightSideBarController][${effectTimestamp}] useEffect. PopularStatus: ${popularPostsStatus}, LatestUsersStatus: ${latestUsersStatus}, AuthToken: ${!!authToken}`);
    
    // Завантажуємо популярні пости, якщо статус idle і є токен (бо ендпоінт захищений)
    if (popularPostsStatus === 'idle' && authToken) {
      console.log(`[RightSideBarController][${effectTimestamp}] Dispatching fetchPopularPosts. Limit: ${popularPostsLimit || 5}, Page: 1`);
      dispatch(fetchPopularPosts({ page: 1, limit: popularPostsLimit || 5 }));
    } else if (popularPostsStatus === 'idle' && !authToken) {
        console.log(`[RightSideBarController][${effectTimestamp}] Skipping fetchPopularPosts, no token.`);
    }
    
    // Завантажуємо нових користувачів, якщо статус idle
    // (ендпоінт /latest може бути публічним або опціонально захищеним)
    if (latestUsersStatus === 'idle') {
      console.log(`[RightSideBarController][${effectTimestamp}] Dispatching fetchLatestUsers. Limit: ${latestUsersLimit || 3}, Page: 1`);
      dispatch(fetchLatestUsers({ page: 1, limit: latestUsersLimit || 3 }));
    }
  }, [dispatch, popularPostsStatus, latestUsersStatus, authToken, popularPostsLimit, latestUsersLimit]);

  // Очищення при розмонтуванні (опціонально)
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
      // updateUserFollowStatusInLists в usersSlice та .addCase в recommendationsSlice мають оновити стан
      // dispatch(updateRecommendationFollowStatus({ userId: userIdToToggle, followed: !currentFollowedStatus })); // Цей action може бути вже не потрібен, якщо recommendationsSlice слухає followUser/unfollowUser
    } catch (error) {
      console.error(`[RightSideBarController][${actionTimestamp}] Помилка при follow/unfollow для user ID ${userIdToToggle}:`, error);
    }
  };

  const handleShowMore = (section) => {
    const actionTimestamp = new Date().toISOString();
    console.log(`[RightSideBarController][${actionTimestamp}] Показати більше для секції: ${section}`);
    if (section === 'latestUsers') {
        // Тут можна викликати dispatch(fetchLatestUsers({ page: nextPage, limit: ... }))
        alert("Функція 'Показати більше' для нових користувачів ще не реалізована (або перехід на сторінку).");
    } else if (section === 'popularPosts') {
        // Тут можна викликати dispatch(fetchPopularPosts({ page: nextPage, limit: ... }))
        alert("Функція 'Показати більше' для популярних постів ще не реалізована (або перехід на сторінку).");
    }
  };

  return (
    <RightSidebar
      popularItems={popularItems || []} // Передаємо правильну змінну
      popularItemsStatus={popularPostsStatus}
      popularItemsError={popularPostsError}
      popularItemsTitle="Популярні дописи"

      recommendations={latestUsersRecommendations || []} // Передаємо правильну змінну
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