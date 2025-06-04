// my-app/src/components/Pages/SearchResult/SearchResultsPage.jsx
import React, { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './../../../hooks/reduxHooks';
import { 
    searchUsersPaginated as searchUsers, // <--- ВИПРАВЛЕНО: імпорт та псевдонім
    setCurrentQuery, 
    clearSearchResults 
} from './../../../redux/searchSlice'; 
import { 
    searchPosts as searchPostsFromPostsSlice, // <--- ВИПРАВЛЕНО: імпорт з postsSlice
    resetPostsFeed 
} from './../../../redux/postsSlice'; 
import Post from './../Profile/MyPosts/Post/Post';
import styles from './SearchResultsPage.module.css';
import { avatarImgUrl } from './../../../utils/ImagesLoadUtil';
import { Link } from 'react-router-dom';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const defaultPaginatedState = {
  items: [], currentPage: 0, totalPages: 0, totalItems: 0,
  hasMore: true, status: 'idle', error: null, limit: 10,
};

const SearchResultsPage = () => {
  const dispatch = useAppDispatch();
  const locationQuery = useQuery();
  const query = locationQuery.get('q');

  const {
    currentQuery,
    userResults: userResultsData,
  } = useAppSelector((state) => state.search);

  const {
    items: postResultsToDisplay,
    currentPage: postsCurrentPage,
    hasMore: postsHasMore,
    status: statusPosts,
    error: errorPosts,
    limit: postsLimit = 10 // Додано дефолтний ліміт
  } = useAppSelector(state => state.posts.searchedPosts || defaultPaginatedState);

  const {
    items: userResultsToDisplay,
    currentPage: usersCurrentPage,
    hasMore: usersHasMore,
    status: statusUsers,
    error: errorUsers,
    limit: usersLimit = 10 // Додано дефолтний ліміт
  } = userResultsData || defaultPaginatedState;

  useEffect(() => {
    if (query) {
      if (query !== currentQuery) {
        dispatch(setCurrentQuery(query));
        dispatch(resetPostsFeed({ feedType: 'searchedPosts', query: query }));
        dispatch(searchUsers({ query, page: 1, limit: usersLimit }));
        dispatch(searchPostsFromPostsSlice({ query, page: 1, limit: postsLimit }));
      } else if (userResultsToDisplay.length === 0 && postResultsToDisplay.length === 0 && statusUsers === 'idle' && statusPosts === 'idle') {
        dispatch(searchUsers({ query, page: 1, limit: usersLimit }));
        dispatch(searchPostsFromPostsSlice({ query, page: 1, limit: postsLimit }));
      }
    } else {
        dispatch(clearSearchResults());
        dispatch(resetPostsFeed({ feedType: 'searchedPosts', query: '' }));
    }
  }, [dispatch, query, currentQuery, userResultsToDisplay.length, postResultsToDisplay.length, statusUsers, statusPosts, usersLimit, postsLimit]);

  const usersObserver = useRef();
  const lastUserElementRef = useCallback(node => {
    if (statusUsers === 'loading' || statusUsers === 'loadingMore') return;
    if (usersObserver.current) usersObserver.current.disconnect();
    usersObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && usersHasMore && query) {
        dispatch(searchUsers({ query, page: usersCurrentPage + 1, limit: usersLimit }));
      }
    });
    if (node) usersObserver.current.observe(node);
  }, [statusUsers, usersHasMore, usersCurrentPage, dispatch, query, usersLimit]);

  const postsObserver = useRef();
  const lastPostElementRef = useCallback(node => { // Перейменовано, щоб уникнути конфлікту
    if (statusPosts === 'loading' || statusPosts === 'loadingMore') return;
    if (postsObserver.current) postsObserver.current.disconnect();
    postsObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && postsHasMore && query) {
        dispatch(searchPostsFromPostsSlice({ query, page: postsCurrentPage + 1, limit: postsLimit }));
      }
    });
    if (node) postsObserver.current.observe(node);
  }, [statusPosts, postsHasMore, postsCurrentPage, dispatch, query, postsLimit]);

  return (
    <div className={styles.resultsPageContainer}>
      {query ? (
        <h1>Результати пошуку для: "{query}"</h1>
      ) : (
        <h1>Введіть пошуковий запит</h1>
      )}

      <div className={styles.resultsGrid}>
        <div className={styles.resultsSection}>
          <h2>Користувачі</h2>
          {(statusUsers === 'loading' && usersCurrentPage === 0) && <p>Пошук користувачів...</p>}
          {errorUsers && <p className={styles.error}>Помилка пошуку користувачів: {typeof errorUsers === 'string' ? errorUsers : errorUsers?.error || 'Невідома помилка'}</p>}
          {statusUsers === 'succeeded' && userResultsToDisplay.length === 0 && !errorUsers && (
            <p>Користувачів не знайдено.</p>
          )}
          {userResultsToDisplay.length > 0 && (
            <ul className={styles.userList}>
              {userResultsToDisplay.map((user, index) => {
                const userItem = (
                  <li key={user.user_id || `search-user-${index}`} className={styles.userListItem}>
                    <Link to={`/profile/${user.user_id}`} className={styles.userLink}>
                      <img 
                        src={avatarImgUrl(user.user_avatar_url)} 
                        alt={user.displayName || user.userName} 
                        className={styles.userAvatar}
                        onError={(e) => { e.target.onerror = null; e.target.src="/default_avatar.png"; }}
                      />
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>{user.displayName || user.userName}</span>
                        <span className={styles.userHandle}>@{user.userName}</span>
                      </div>
                    </Link>
                  </li>
                );
                if (userResultsToDisplay.length === index + 1) {
                    return <div ref={lastUserElementRef} key={`ref-user-${user.user_id || index}`}>{userItem}</div>;
                }
                return userItem;
              })}
            </ul>
          )}
          {(statusUsers === 'loadingMore' || (statusUsers === 'loading' && usersCurrentPage > 0)) && <p>Завантаження користувачів...</p>}
          {!usersHasMore && userResultsToDisplay.length > 0 && statusUsers === 'succeeded' && <p>Всі користувачі завантажені.</p>}
        </div>

        <div className={styles.resultsSection}>
          <h2>Дописи</h2>
          {(statusPosts === 'loading' && postsCurrentPage === 0) && <p>Пошук дописів...</p>}
          {errorPosts && <p className={styles.error}>Помилка пошуку дописів: {typeof errorPosts === 'string' ? errorPosts : errorPosts?.error || 'Невідома помилка'}</p>}
          {statusPosts === 'succeeded' && postResultsToDisplay.length === 0 && !errorPosts && (
            <p>Дописів не знайдено.</p>
          )}
          {postResultsToDisplay.length > 0 && (
            <div className={styles.postList}>
              {postResultsToDisplay.map((post, index) => {
                 const postCard = (
                    <Post
                        key={post.postId || `search-post-${index}`}
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
                        isSavedByCurrentUser={!!post.isSavedByCurrentUser}
                    />
                 );
                 if (postResultsToDisplay.length === index + 1) {
                    return <div ref={lastPostElementRef} key={`ref-post-${post.postId || index}`}>{postCard}</div>; // Використовуємо той самий ref, це може бути проблемою
                 }
                 return postCard;
              })}
            </div>
          )}
          {(statusPosts === 'loadingMore' || (statusPosts === 'loading' && postsCurrentPage > 0)) && <p>Завантаження дописів...</p>}
          {!postsHasMore && postResultsToDisplay.length > 0 && statusPosts === 'succeeded' && <p>Всі дописи завантажені.</p>}
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;