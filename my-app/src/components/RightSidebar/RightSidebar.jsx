// my-app/src/components/RightSidebar/RightSidebar.jsx
import React from 'react';
import styles from './RightSidebar.module.css';
import { avatarImgUrl } from '../../utils/ImagesLoadUtil';
import { Link } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/reduxHooks';
import { openPostModal } from '../../redux/uiSlice';

const RightSidebar = React.memo(({
  popularItems, popularItemsStatus, popularItemsError, popularItemsTitle,
  recommendations, recommendationsStatus, recommendationsError, recommendationsTitle,
  onFollowToggle, onShowMore,
  loggedInUserId
}) => {
  const dispatch = useAppDispatch();
  const timestamp = new Date().getTime(); // Для унікальності логів, якщо потрібно

  const handleOpenPopularPostInModal = (postDataFromList, event) => {
    if (event) {
        event.preventDefault(); // Запобігаємо переходу за посиланням <a>, якщо воно є
        event.stopPropagation();
    }
    if (postDataFromList && typeof postDataFromList === 'object' && postDataFromList.postId !== undefined) {
        console.log(`[RightSidebar][${timestamp}] Відкриття популярного поста ID ${postDataFromList.postId} в модалці:`, postDataFromList);
        // Переконуємося, що всі необхідні поля для компонента Post є в postDataFromList
        // (оскільки topicsSlice тепер завантажує FullPostData для популярних постів)
        const modalData = {
            postId: postDataFromList.postId,
            userId: postDataFromList.userId,
            user_name: postDataFromList.userNickname,
            user_avatar: postDataFromList.userAvatarURL,
            text: postDataFromList.content,
            image: postDataFromList.contentImgURL,
            date: postDataFromList.createdAt,
            likeCount: postDataFromList.likesCount,
            commentsCount: postDataFromList.commentsCount,
            sharesCount: postDataFromList.sharesCount,
            isLikedByCurrentUser: postDataFromList.isLikedByCurrentUser,
            isSavedByCurrentUser: postDataFromList.isSavedByCurrentUser,
        };
        dispatch(openPostModal(modalData));
    } else {
        console.error(`[RightSidebar][${timestamp}] Надано неповні або некоректні дані для відкриття поста в модалці з популярних:`, postDataFromList);
    }
  };

  const renderLoading = () => <p className={styles.loadingMessage}>Завантаження...</p>;
  const renderError = (errorMsg) => <p className={styles.errorMessage}>{errorMsg || 'Сталася помилка'}</p>;

  return (
    <aside className={styles.sidebarContainer}>
      <div className={styles.searchSection}>
        <div className={styles.searchInputWrapper}>
          <img
            src={process.env.PUBLIC_URL + "/icons/Search.png"}
            alt="Search Icon"
            className={styles.searchIcon}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <input type="text" placeholder="Пошук по сайту..." className={styles.searchInput} />
        </div>
      </div>

      <div className={styles.infoCard}>
        <h3 className={styles.cardTitle}>{popularItemsTitle || 'Популярні дописи'}</h3>
        {popularItemsStatus === 'loading' && renderLoading()}
        {popularItemsError && renderError(popularItemsError)}
        {popularItemsStatus === 'succeeded' && popularItems && popularItems.length > 0 && (
          <ul className={styles.itemList}>
            {popularItems.slice(0, 5).map(post => (
              <li key={`pop-post-${post.postId}`} className={styles.topicItem} onClick={(e) => handleOpenPopularPostInModal(post, e)} style={{cursor: 'pointer'}}>
                <div className={styles.itemContent}>
                  {post.userNickname && (
                    <Link to={`/profile/${post.userId}`} className={styles.topicAuthorLink} onClick={(e) => e.stopPropagation()}>
                      <span className={styles.topicCategory}>@{post.userNickname}</span>
                    </Link>
                  )}
                  {/* Обгортаємо заголовок в елемент, до якого можна застосувати onClick,
                      або використовуємо onClick на батьківському li.
                      Якщо це <a>, то event.preventDefault() в обробнику важливий.
                  */}
                  <span className={styles.topicNameLink}> {/* Можна зробити <a href="#" onClick...> або просто span */}
                    <span className={styles.topicName}>{post.title || 'Без назви'}</span>
                  </span>
                  <span className={styles.topicPosts}>{post.likesCount || 0} вподобань</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {popularItemsStatus === 'succeeded' && (!popularItems || popularItems.length === 0) && !popularItemsError && (
            <p className={styles.emptyListMessage}>Популярних дописів наразі немає.</p>
        )}
        {popularItemsStatus === 'succeeded' && popularItems && popularItems.length > 5 && (
            <button onClick={() => onShowMore('popularPosts')} className={styles.showMoreButton}>Показати більше</button>
        )}
      </div>

      <div className={styles.infoCard}>
        <h3 className={styles.cardTitle}>{recommendationsTitle || 'Нові користувачі'}</h3>
        {recommendationsStatus === 'loading' && renderLoading()}
        {recommendationsError && renderError(recommendationsError)}
        {recommendationsStatus === 'succeeded' && recommendations && recommendations.length > 0 && (
          <ul className={styles.itemList}>
            {recommendations.slice(0, 3).map(rec => (
              <li key={`rec-${rec.user_id}`} className={styles.recommendationItem}>
                <Link to={`/profile/${rec.user_id}`}>
                    <img
                      src={avatarImgUrl(rec.user_avatar_url)}
                      alt={rec.displayName || rec.userName}
                      className={styles.itemAvatarLarge}
                      onError={(e) => { e.target.onerror = null; e.target.src="/default_avatar.png"; }}
                    />
                </Link>
                <div className={styles.itemContent}>
                   <Link to={`/profile/${rec.user_id}`} className={styles.itemNameLink}>
                        <span className={styles.itemName}>{rec.displayName || rec.userName}</span>
                   </Link>
                  <span className={styles.itemHandle}>@{rec.userName}</span>
                </div>
                {loggedInUserId !== rec.user_id && (
                    <button
                        onClick={() => onFollowToggle(rec.user_id, rec.followed)}
                        className={`${styles.followButton} ${rec.followed ? styles.unfollowButtonActive : ''}`}
                    >
                    {rec.followed ? 'Відстежуєте' : 'Підписатись'}
                    </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {recommendationsStatus === 'succeeded' && (!recommendations || recommendations.length === 0) && !recommendationsError && (
            <p className={styles.emptyListMessage}>Нових користувачів немає.</p>
        )}
        {recommendationsStatus === 'succeeded' && recommendations && recommendations.length > 3 && (
           <button onClick={() => onShowMore('latestUsers')} className={styles.showMoreButton}>Показати більше</button>
        )}
      </div>
    </aside>
  );
});

export default RightSidebar;