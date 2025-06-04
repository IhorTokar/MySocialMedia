// my-app/src/components/Pages/Users/UsersContainer.jsx
import React, { useEffect, useCallback, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/reduxHooks";
import {
  fetchAllUsers,
  fetchMyFollowing,
  fetchMyFollowers,
  followUser,
  unfollowUser,
  resetUsersFeed,
} from "../../../redux/usersSlice";
import Users from "./Users";
import styles from './UsersContainer.module.css'; // Стилі для контейнера, якщо є

const defaultPaginatedFeedState = {
  items: [], currentPage: 0, totalPages: 0, totalItems: 0,
  hasMore: true, status: 'idle', error: null,
  limit: 15, // Типовий ліміт, може бути перевизначений для конкретної стрічки
  feedType: null,
};

// Визначаємо ліміти для кожної стрічки тут
const feedLimits = {
    allUsers: 20,
    myFollowing: 15,
    myFollowers: 15,
};

function UsersContainer() {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState('allUsers'); // 'allUsers', 'myFollowing', 'myFollowers'

  const loggedInUserId = useAppSelector(state =>
    state.user.profile?.user?.user_id
      ? parseInt(String(state.user.profile.user.user_id), 10)
      : (state.auth.user?.user_id
          ? parseInt(String(state.auth.user.user_id), 10)
          : null)
  );

  // Доданий лог для перевірки
  useEffect(() => {
    console.log('[UsersContainer] Actual loggedInUserId after selector:', loggedInUserId);
  }, [loggedInUserId]);


  const currentFeedKey = activeTab === 'allUsers' ? 'allUsers' :
                       activeTab === 'myFollowing' ? 'myFollowing' : 'myFollowers';

  const defaultLimitForCurrentFeed = feedLimits[currentFeedKey] || defaultPaginatedFeedState.limit;

  const currentFeedData = useAppSelector(state =>
    state.users[currentFeedKey] || {
      ...defaultPaginatedFeedState,
      limit: defaultLimitForCurrentFeed,
      feedType: currentFeedKey
    }
  );

  const {
    items: usersToDisplay,
    currentPage,
    hasMore,
    status,
    error,
    limit = currentFeedData?.limit || defaultLimitForCurrentFeed, // Переконуємось, що ліміт визначений
  } = currentFeedData;

  const usersStateForEffect = useAppSelector(state => state.users);

  const observer = useRef();
  const lastUserElementRef = useCallback(node => {
    if (status === 'loading' || status === 'loadingMore') return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        console.log(`[UsersContainer] Last user for tab '${activeTab}' visible, fetching page ${currentPage + 1}`);
        let actionToDispatch;
        if (activeTab === 'allUsers') {
          actionToDispatch = fetchAllUsers({ page: currentPage + 1, limit });
        } else if (activeTab === 'myFollowing' && loggedInUserId) {
          actionToDispatch = fetchMyFollowing({ page: currentPage + 1, limit });
        } else if (activeTab === 'myFollowers' && loggedInUserId) {
          actionToDispatch = fetchMyFollowers({ page: currentPage + 1, limit });
        }
        if (actionToDispatch) {
          dispatch(actionToDispatch);
        }
      }
    });
    if (node) observer.current.observe(node);
  }, [status, hasMore, currentPage, dispatch, limit, activeTab, loggedInUserId]);

  useEffect(() => {
    const currentLimitForFetch = usersStateForEffect[currentFeedKey]?.limit || feedLimits[currentFeedKey] || defaultPaginatedFeedState.limit;
    const feedDataForEffect = usersStateForEffect[currentFeedKey] || { status: 'idle', items: [], hasMore: true, error: null, limit: currentLimitForFetch };

    if (loggedInUserId !== null && (activeTab === 'myFollowing' || activeTab === 'myFollowers')) {
        // Для вкладок, що потребують авторизації
        if (feedDataForEffect.status === 'idle' ||
            (feedDataForEffect.status === 'succeeded' && feedDataForEffect.items.length === 0 && feedDataForEffect.hasMore && !feedDataForEffect.error)) {
            console.log(`[UsersContainer] Initial fetch for AUTH tab '${activeTab}', page 1, limit ${feedDataForEffect.limit}`);
            let actionToDispatch;
            if (activeTab === 'myFollowing') {
                actionToDispatch = fetchMyFollowing({ page: 1, limit: feedDataForEffect.limit });
            } else if (activeTab === 'myFollowers') {
                actionToDispatch = fetchMyFollowers({ page: 1, limit: feedDataForEffect.limit });
            }
            if (actionToDispatch) {
                dispatch(actionToDispatch);
            }
        }
    } else if (activeTab === 'allUsers') {
        // Для вкладки "Всі користувачі", яка може бути доступна і без авторизації
        if (feedDataForEffect.status === 'idle' ||
            (feedDataForEffect.status === 'succeeded' && feedDataForEffect.items.length === 0 && feedDataForEffect.hasMore && !feedDataForEffect.error)) {
            console.log(`[UsersContainer] Initial fetch for tab 'allUsers', page 1, limit ${feedDataForEffect.limit}`);
            dispatch(fetchAllUsers({ page: 1, limit: feedDataForEffect.limit }));
        }
    }
  }, [dispatch, activeTab, loggedInUserId, usersStateForEffect, currentFeedKey, limit]);


  const handleTabChange = (newTab) => {
    if (newTab !== activeTab) {
      // Скидаємо стан ПОПЕРЕДНЬОЇ активної вкладки перед перемиканням
      // Це забезпечить, що при поверненні на вкладку дані будуть завантажені заново,
      // якщо це бажана поведінка. Якщо ні - цей dispatch можна прибрати.
      dispatch(resetUsersFeed({ feedType: currentFeedKey }));
      setActiveTab(newTab);
      // Нова стрічка буде завантажена через useEffect, оскільки activeTab зміниться,
      // і її стан, ймовірно, буде 'idle' після скидання (або якщо вона ще не завантажувалася).
    }
  };

  // Ефект для очищення стрічки при розмонтуванні UsersContainer або зміні ключа стрічки
  useEffect(() => {
    const feedKeyForCleanup = currentFeedKey;
    return () => {
      console.log("[UsersContainer] Cleanup effect. Resetting user feed:", feedKeyForCleanup);
      dispatch(resetUsersFeed({ feedType: feedKeyForCleanup }));
    };
  }, [dispatch, currentFeedKey]);


  const handleFollowToggle = async (userIdToToggle, currentFollowedStatus) => {
    if (!loggedInUserId) {
      alert("Будь ласка, увійдіть, щоб підписуватися на користувачів.");
      return;
    }
    const actionToDispatch = currentFollowedStatus ? unfollowUser(userIdToToggle) : followUser(userIdToToggle);
    try {
      await dispatch(actionToDispatch).unwrap();
      // Після успішної підписки/відписки, якщо ми на вкладці "Відстежуєте",
      // скидаємо її, щоб вона перезавантажилася з актуальними даними.
      // Для "Підписники" та "Всі користувачі" слайс usersSlice має оновити
      // поле isFollowedByCurrentUser через updateUserFollowStatusInLists.
      if (activeTab === 'myFollowing') {
          dispatch(resetUsersFeed({ feedType: 'myFollowing' }));
          // Запит на нові дані спрацює в useEffect, оскільки статус стане 'idle'
      }
    } catch (err) {
      console.error("Follow/Unfollow error in UsersContainer:", err);
      alert(err.error || err.message || "Не вдалося виконати дію.");
    }
  };

  const canShowPersonalTabs = !!loggedInUserId;

  return (
    <div className={styles.usersPageContainer}>
      <Users
        users={usersToDisplay}
        status={status}
        error={error?.error || typeof error === 'string' ? error : null}
        onFollowToggle={handleFollowToggle}
        loggedInUserId={loggedInUserId}
        lastUserElementRef={lastUserElementRef}
        isLoadingMore={status === 'loadingMore' || (status === 'loading' && currentPage > 0)}
        hasMoreUsers={hasMore}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        canShowPersonalTabs={canShowPersonalTabs}
      />
    </div>
  );
}

export default UsersContainer;