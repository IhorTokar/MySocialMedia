// my-app/src/pages/SavedPostsPage.jsx
import React, { useEffect, useRef, useCallback } from 'react';
// import { useSelector } from 'react-redux'; // <--- ПРИБИРАЄМО ЦЕЙ ІМПОРТ
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks'; // <--- ТЕПЕР useAppSelector ІМПОРТУЄТЬСЯ ЗВІДСИ
import { fetchSavedPosts, resetPostsFeed } from '../../../redux/postsSlice';
import Post from '../Profile/MyPosts/Post/Post';
import styles from './SavedPostsPage.module.css'; // Переконайтеся, що цей файл існує
// import Loader from '../../Loader/Loader'; // Закоментовано, бо у вас його немає

// Дефолтний стан для пагінованої стрічки, якщо вона ще не в Redux
const defaultPaginatedState = {
  items: [], currentPage: 0, totalPages: 0, totalItems: 0,
  hasMore: true, status: 'idle', error: null, limit: 10, // Ліміт за замовчуванням
  feedType: 'savedPostsFeed', // Додаємо feedType сюди теж
};

const SavedPostsPage = () => {
  const dispatch = useAppDispatch();
  
  const {
    items: savedPostsToDisplay,
    currentPage,
    hasMore,
    status: currentFeedStatus,
    error: currentFeedError,
    limit: currentFeedLimit
  } = useAppSelector(state => state.posts.savedPostsFeed || defaultPaginatedState);

  const isAuthenticated = !!useAppSelector(state => state.auth.token);

  const observer = useRef();
  const lastPostElementRef = useCallback(node => {
    if (currentFeedStatus === 'loading' || currentFeedStatus === 'loadingMore') return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        console.log(`[SavedPostsPage] Last saved post visible, fetching page ${currentPage + 1}`);
        dispatch(fetchSavedPosts({ page: currentPage + 1, limit: currentFeedLimit }));
      }
    });
    if (node) observer.current.observe(node);
  }, [currentFeedStatus, hasMore, currentPage, dispatch, currentFeedLimit]);

  useEffect(() => {
    if (isAuthenticated) {
      if (currentFeedStatus === 'idle' || (currentFeedStatus === 'succeeded' && savedPostsToDisplay.length === 0 && hasMore && !currentFeedError)) {
        console.log('[SavedPostsPage] Initial fetch for saved posts, page 1.');
        // Скидаємо перед першим завантаженням, щоб уникнути дублікатів при поверненні на сторінку
        dispatch(resetPostsFeed({ feedType: 'savedPostsFeed' }));
        dispatch(fetchSavedPosts({ page: 1, limit: currentFeedLimit }));
      }
    } else {
        dispatch(resetPostsFeed({ feedType: 'savedPostsFeed' }));
    }
    
    // Очищення при розмонтуванні
    return () => {
        // dispatch(resetPostsFeed({ feedType: 'savedPostsFeed' })); // Можна залишити, якщо хочете завжди свіжі дані
    }
  }, [dispatch, isAuthenticated, currentFeedStatus, savedPostsToDisplay.length, hasMore, currentFeedError, currentFeedLimit]);


  if (!isAuthenticated && currentFeedStatus !== 'loading') { // Додано перевірку на статус, щоб не показувати, поки йде перевірка авторизації
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Збережені пости</h1>
            <p className={styles.emptyMessage}>Будь ласка, увійдіть, щоб переглянути свої збережені пости.</p>
        </div>
    );
  }

  if (currentFeedStatus === 'loading' && currentPage === 0) {
    return <div className={styles.container}><p className={styles.loadingMessage}>Завантаження збережених постів...</p></div>;
  }

  if (currentFeedStatus === 'failed' && currentPage === 0 && currentFeedError) {
    return <div className={styles.container}><p className={styles.error}>Помилка завантаження: {typeof currentFeedError === 'string' ? currentFeedError : currentFeedError.error || 'Невідома помилка'}</p></div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Збережені пости</h1>
      {savedPostsToDisplay.length === 0 && currentFeedStatus === 'succeeded' && !currentFeedError && (
        <p className={styles.emptyMessage}>У вас ще немає збережених постів.</p>
      )}
      <div className={styles.postsGrid}> {/* Або styles.postsList, залежно від ваших стилів */}
        {savedPostsToDisplay.map((post, index) => {
           const postCard = (
            <Post
              key={post.postId || `saved-post-${index}`}
              postId={post.postId}
              userId={post.userId}
              title={post.title}
              user_name={post.userNickname}
              user_avatar={post.userAvatarURL}
              text={post.content}
              image={post.contentImgURL}
              date={post.createdAt}
              likeCount={post.likesCount || 0}
              commentsCount={post.commentsCount || 0}
              sharesCount={post.sharesCount || 0}
              isLikedByCurrentUser={!!post.isLikedByCurrentUser}
              isSavedByCurrentUser={true} 
            />
          );
          if (savedPostsToDisplay.length === index + 1) {
            return <div ref={lastPostElementRef} key={`ref-saved-${post.postId || index}`}>{postCard}</div>;
          }
          return postCard;
        })}
      </div>

      {(currentFeedStatus === 'loadingMore' || (currentFeedStatus === 'loading' && currentPage > 0)) && (
          <div className={styles.loadingMoreContainer}><p>Завантаження...</p></div>
      )}

      {!hasMore && savedPostsToDisplay.length > 0 && currentFeedStatus === 'succeeded' && (
        <p className={styles.endOfFeedMessage}>Ви переглянули всі збережені пости.</p>
      )}
      
      {currentFeedStatus === 'failed' && currentPage > 0 && currentFeedError && (
         <div className={styles.errorLoadingMore}>
            <p>Не вдалося завантажити більше: {typeof currentFeedError === 'string' ? currentFeedError : currentFeedError.error || 'Невідома помилка'}</p>
            <button 
                onClick={() => dispatch(fetchSavedPosts({ page: currentPage + 1, limit: currentFeedLimit }))} 
                className={styles.retryButton}
                disabled={currentFeedStatus === 'loadingMore' || currentFeedStatus === 'loading'}
            >
                Спробувати ще
            </button>
        </div>
      )}
    </div>
  );
};

export default SavedPostsPage;