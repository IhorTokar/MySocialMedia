// my-app/src/components/Pages/Profile/MyPosts/MyPostsContainer.jsx
import React, { useEffect, useCallback, useRef } from "react";
// import { useSelector } from "react-redux"; // <--- ПРИБИРАЄМО ЦЕЙ ІМПОРТ
import { useAppDispatch, useAppSelector } from "../../../../hooks/reduxHooks"; // <--- useAppSelector ВЖЕ ІМПОРТОВАНО ТУТ
import {
  fetchUserPosts,
  addPost,
  resetPostsFeed
} from "../../../../redux/postsSlice";
import MyPosts from "./MyPosts";

// Визначимо дефолтний стан тут, щоб уникнути помилок, якщо userPostsData ще немає
const defaultUserPostsFeedState = {
  items: [],
  currentPage: 0,
  totalPages: 0,
  totalItems: 0,
  limit: 10,
  hasMore: true,
  status: 'idle',
  error: null,
  feedType: null, // Важливо для ідентифікації
};

function MyPostsContainer({ profileUserId, isOwnProfile }) {
  const dispatch = useAppDispatch();

  // Тепер useAppSelector буде знайдено
  const userPostsData = useAppSelector(state =>
    profileUserId && state.posts.userPosts && state.posts.userPosts[profileUserId] 
      ? state.posts.userPosts[profileUserId] 
      : null // Повертаємо null, якщо даних немає, деструктуризація нижче впорається
  );

  const {
    items: postsToDisplay = [],
    currentPage = 0,
    // totalPages = 0, // Закоментовано, бо не використовується в цьому компоненті безпосередньо
    // totalItems = 0, // Закоментовано, бо не використовується
    limit = defaultUserPostsFeedState.limit, // Беремо ліміт з дефолтного стану
    hasMore = true,
    status = 'idle', // Дефолтний статус
    error = null,
    feedType // Отримуємо feedType для перевірки
  } = userPostsData || defaultUserPostsFeedState; 
  
  const loggedInUserId = useAppSelector(state => 
    state.auth.user?.user_id ? parseInt(String(state.auth.user.user_id), 10) : 
    (state.user.profile?.user?.user_id ? parseInt(String(state.user.profile.user.user_id), 10) : null)
  );

  const observer = useRef();
  const lastPostElementRef = useCallback(node => {
    if (status === 'loading' || status === 'loadingMore') return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && profileUserId) {
        dispatch(fetchUserPosts({ userId: profileUserId, page: currentPage + 1, limit }));
      }
    });
    if (node) observer.current.observe(node);
  }, [status, hasMore, currentPage, dispatch, profileUserId, limit]);

  useEffect(() => {
    if (profileUserId !== null && profileUserId !== undefined) {
      const expectedFeedType = `userPosts-${profileUserId}`;
      if (status === 'idle' || 
          (feedType !== expectedFeedType) || // Завантажуємо, якщо це інший користувач
          (status === 'succeeded' && postsToDisplay.length === 0 && hasMore && !error)) {
        console.log(`MyPostsContainer: (Effect 1) Запит/перезапит постів для profileUserId: ${profileUserId}. Поточний статус: ${status}, feedType: ${feedType}`);
        dispatch(resetPostsFeed({ feedType: 'userPosts', userId: profileUserId }));
        dispatch(fetchUserPosts({ userId: profileUserId, page: 1, limit }));
      }
    }
  }, [dispatch, profileUserId, status, postsToDisplay.length, hasMore, error, limit, feedType]); // Додано feedType до залежностей

  useEffect(() => {
    return () => {
      if (profileUserId !== null && profileUserId !== undefined) {
        console.log(`MyPostsContainer: (Effect cleanup) Компонент розмонтовується або profileUserId змінився для ID: ${profileUserId}. Скидаю стрічку userPosts.`);
        dispatch(resetPostsFeed({ feedType: 'userPosts', userId: profileUserId }));
      }
    };
  }, [dispatch, profileUserId]);

  const handleAddPost = (title, content, contentImg) => {
    if (!loggedInUserId) {
      alert("Будь ласка, увійдіть, щоб створити пост.");
      return;
    }
    if (isOwnProfile && loggedInUserId && profileUserId === loggedInUserId) {
      dispatch(addPost({ title, content, contentImg }));
    } else {
      console.warn("Спроба додати пост не на власній сторінці профілю або ID не співпадають.");
    }
  };
  
  return (
    <MyPosts
      posts={postsToDisplay}
      status={status}
      error={error}
      addPost={isOwnProfile && profileUserId === loggedInUserId ? handleAddPost : undefined}
      canCreatePosts={isOwnProfile && profileUserId === loggedInUserId}
      lastPostElementRef={lastPostElementRef}
      isLoadingMore={status === 'loadingMore' || (status === 'loading' && currentPage > 0)}
      hasMorePosts={hasMore}
      profileUserId={profileUserId}
    />
  );
}

export default MyPostsContainer;