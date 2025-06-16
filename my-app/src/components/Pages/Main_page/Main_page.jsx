// my-app/src/components/Pages/Main_page/Main_page.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./../../../hooks/reduxHooks";
import {
    fetchPosts,
    fetchFollowingPosts,
    addPost,
    resetPostsFeed,
    resetAddPostStatus
} from "../../../redux/postsSlice";
import styles from "./Main_page.module.css";
import Post from "../Profile/MyPosts/Post/Post";
import imageIconPath from "../../../assets/icons/Image_as_file.png";
import { avatarImgUrl } from "../../../utils/ImagesLoadUtil";
// import Loader from '../../../Loader/Loader'; // ВИДАЛЕНО

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Дефолтні значення для пагінованого стану, якщо вони ще не в Redux
const defaultPaginatedState = {
  items: [], currentPage: 0, totalPages: 0, totalItems: 0,
  hasMore: true, status: 'idle', error: null,
};

const MainPage = () => {
  const dispatch = useAppDispatch();
  const postsState = useAppSelector(state => state.posts);

  const [isCreatePostExpanded, setIsCreatePostExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const contentTextareaRef = useRef(null);

  const [activeTab, setActiveTab] = useState('forYou');

  const currentFeedKey = activeTab === 'forYou' ? 'mainFeed' : 'followingFeed';
  
  // Отримуємо дані для активної вкладки з Redux, використовуючи дефолтні значення, якщо стрічка ще не ініціалізована
  const {
    items: postsToDisplay,
    currentPage,
    hasMore,
    status: currentFeedStatus,
    error: currentFeedError,
    limit: currentFeedLimit = (currentFeedKey === 'popularPosts' ? 5 : 10) // Встановлюємо ліміт за замовчуванням
  } = useAppSelector(state => state.posts[currentFeedKey] || 
                           (currentFeedKey === 'mainFeed' ? postsState.mainFeed : 
                           (currentFeedKey === 'followingFeed' ? postsState.followingFeed : defaultPaginatedState))
                    );
  
  const { status: addPostStatus, error: addPostError } = useAppSelector((state) => state.posts);
  const currentUser = useAppSelector((state) => state.user.profile?.user);
  const currentUserId = currentUser?.user_id;
  const currentUserAvatar = currentUser?.user_avatar_url;


  const observer = useRef();
  const lastPostElementRef = useCallback(node => {
    if (currentFeedStatus === 'loading' || currentFeedStatus === 'loadingMore') return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        console.log(`[MainPage] Last element for ${activeTab} visible, fetching page ${currentPage + 1}`);
        if (activeTab === 'forYou') {
          dispatch(fetchPosts({ page: currentPage + 1, limit: currentFeedLimit }));
        } else if (activeTab === 'following' && currentUserId) {
          dispatch(fetchFollowingPosts({ page: currentPage + 1, limit: currentFeedLimit }));
        }
      }
    });
    if (node) observer.current.observe(node);
  }, [currentFeedStatus, hasMore, currentPage, dispatch, activeTab, currentFeedLimit, currentUserId]);

  useEffect(() => {
    // Використовуємо деструктуровані значення з useSelector
    if (currentFeedStatus === 'idle' || (currentFeedStatus === 'succeeded' && postsToDisplay.length === 0 && hasMore && !currentFeedError)) {
      console.log(`[MainPage] Initial fetch or empty feed for ${activeTab}, page 1, limit ${currentFeedLimit}`);
      if (activeTab === 'forYou') {
        dispatch(fetchPosts({ page: 1, limit: currentFeedLimit }));
      } else if (activeTab === 'following' && currentUserId) {
        dispatch(fetchFollowingPosts({ page: 1, limit: currentFeedLimit }));
      }
    }
  }, [dispatch, activeTab, currentUserId, currentFeedStatus, postsToDisplay.length, hasMore, currentFeedError, currentFeedLimit]);

  const handleTabChange = (newTab) => {
      if (newTab !== activeTab) {
          const feedToResetOnClick = newTab === 'forYou' ? 'mainFeed' : 'followingFeed';
          dispatch(resetPostsFeed({ feedType: feedToResetOnClick }));
          setActiveTab(newTab);
      }
  };
  
  const handleCreatePostTriggerClick = () => setIsCreatePostExpanded(true);

  const closeExpandedForm = () => {
    setIsCreatePostExpanded(false); setTitle(""); setContent("");
    setImageFile(null); setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (addPostStatus !== 'idle') dispatch(resetAddPostStatus());
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
    if (contentTextareaRef.current) {
      contentTextareaRef.current.style.height = 'auto';
      contentTextareaRef.current.style.height = `${e.target.scrollHeight}px`;
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("Файл занадто великий. Максимальний розмір 5MB.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if ((!content.trim() && !title.trim() && !imageFile) || addPostStatus === 'loading') {
      if (!content.trim() && !title.trim() && !imageFile) {
        alert("Будь ласка, додайте текст, заголовок або зображення для поста.");
      }
      return;
    }
    const postData = { title: title.trim(), content: content.trim(), contentImg: imageFile };
    const resultAction = await dispatch(addPost(postData));
    if (addPost.fulfilled.match(resultAction)) {
      closeExpandedForm();
    }
  };

   useEffect(() => {
    if (isCreatePostExpanded && contentTextareaRef.current) {
        contentTextareaRef.current.focus();
        contentTextareaRef.current.style.height = 'auto';
        contentTextareaRef.current.style.height = `${contentTextareaRef.current.scrollHeight}px`;
    }
  }, [isCreatePostExpanded]);

  return (
    <div className={styles.mainPageWrapper}>
      <div className={styles.tabsHeader}>
        <button
          className={`${styles.tabButton} ${activeTab === 'forYou' ? styles.activeTab : ''}`}
          onClick={() => handleTabChange('forYou')}
          disabled={currentFeedStatus === 'loading' || currentFeedStatus === 'loadingMore'} 
        >
          Для тебе
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'following' ? styles.activeTab : ''}`}
          onClick={() => handleTabChange('following')}
          disabled={currentFeedStatus === 'loading' || currentFeedStatus === 'loadingMore' || !currentUserId}
        >
          Слідкуєте
        </button>
      </div>

      

      {currentUserId && (
        <div className={styles.createPostContainer}>
            <div
                className={`${styles.createPostTrigger} ${isCreatePostExpanded ? styles.expandedTrigger : ''}`}
                onClick={!isCreatePostExpanded ? handleCreatePostTriggerClick : undefined}
                role={!isCreatePostExpanded ? "button" : undefined}
                tabIndex={!isCreatePostExpanded ? 0 : undefined}
                onKeyDown={!isCreatePostExpanded ? (e) => e.key === 'Enter' && handleCreatePostTriggerClick() : undefined} 
            >
                <img
                    src={currentUserAvatar ? avatarImgUrl(currentUserAvatar) : "/default_avatar.png"}
                    alt="Ваш аватар"
                    className={styles.createPostAvatar}
                    onError={(e) => { e.target.onerror = null; e.target.src="/default_avatar.png"; }} 
                />
                {!isCreatePostExpanded ? (
                    <div className={styles.createPostInputPlaceholder}>Напишіть, що у вас на думці...</div>
                ) : (
                    <textarea
                        ref={contentTextareaRef}
                        className={`${styles.expandedContentTextarea} ${styles.inTriggerTextarea}`}
                        placeholder="Що у вас нового?"
                        value={content}
                        onChange={handleContentChange}
                        rows="1"
                        />
                )}
                {!isCreatePostExpanded && (
                    <div className={styles.createPostActions}>
                        <button
                            className={styles.createPostActionButton}
                            aria-label="Додати зображення"
                            onClick={(e) => { e.stopPropagation(); handleCreatePostTriggerClick(); setTimeout(() => fileInputRef.current?.click(), 0); }} 
                        >
                            <img src={imageIconPath} alt="Image" className={styles.createPostActionIcon} />
                            <span>Зображення</span>
                        </button>
                    </div>
                )}
            </div>
            {isCreatePostExpanded && (
            <form className={styles.expandedPostForm} onSubmit={handlePostSubmit}>
                <input
                  type="text"
                  className={styles.expandedTitleInput}
                  placeholder="Заголовок (необов'язково)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)} 
                />
                {imagePreview && (
                    <div className={styles.imagePreviewContainer}>
                        <img src={imagePreview} alt="Передперегляд" className={styles.imagePreview} />
                        <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); if(fileInputRef.current) fileInputRef.current.value = ""; }} className={styles.removeImageButton} aria-label="Видалити зображення">
                            &times;
                        </button>
                    </div>
                )}
                <div className={styles.expandedFormActionsBar}>
                    <div className={styles.attachmentButtons}>
                        <button type="button" className={styles.expandedFormIconButton} onClick={() => fileInputRef.current?.click()} aria-label="Додати зображення">
                             <img src={imageIconPath} alt="" className={styles.expandedFormActionIcon} />
                        </button>
                    </div>
                    <input type="file" accept="image/*" onChange={handleFileChange} className={styles.hiddenFileInput} ref={fileInputRef} id="main-page-file-input" />
                    <div className={styles.submitActions}>
                        <button type="button" className={`${styles.formButton} ${styles.cancelButton}`} onClick={closeExpandedForm}>Скасувати</button>
                        <button type="submit" className={`${styles.formButton} ${styles.publishButton}`} disabled={addPostStatus === 'loading' || (!content.trim() && !title.trim() && !imageFile)} >
                            {addPostStatus === 'loading' ? 'Публікація...' : 'Опублікувати'}
                        </button>
                    </div>
                </div>
                {addPostStatus === 'failed' && addPostError && (
                    <p className={styles.error} style={{marginTop: '10px', textAlign: 'center'}}>
                        Помилка додавання поста: {typeof addPostError === 'string' ? addPostError : addPostError.message || 'Невідома помилка'}
                    </p>
                )}
            </form>
            )}
        </div>
      )}

      <div className={styles.postsFeed}>
        {(currentFeedStatus === "loading" && currentPage === 0) && (
            <div className={styles.pageLoaderContainer}><p>Завантаження постів...</p></div>
        )}
        {currentFeedStatus === "failed" && currentPage === 0 && currentFeedError && (
            <div className={styles.errorLoadingFullPage}>Помилка завантаження постів: {typeof currentFeedError === 'string' ? currentFeedError : currentFeedError?.error || 'Невідома помилка'}</div>
        )}
        
        {postsToDisplay.length === 0 && currentFeedStatus === 'succeeded' && !currentFeedError && (
          <p className={styles.noPostsMessage}>
            {activeTab === 'forYou' 
                ? 'Наразі немає постів для відображення. Створіть перший!' 
                : (currentUserId ? 'Немає постів від користувачів, на яких ви підписані.' : 'Увійдіть, щоб побачити стрічку підписок.')
            }
          </p>
        )}

        <div className={styles.postsList}>
          {postsToDisplay.map((post, index) => {
            const postCard = (
              <Post
                key={post.postId || `post-${post.userId}-${index}`}
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
            if (postsToDisplay.length === index + 1) {
              return <div ref={lastPostElementRef} key={`ref-${post.postId || index}`}>{postCard}</div>;
            }
            return postCard;
          })}
        </div>

        {(currentFeedStatus === 'loadingMore' || (currentFeedStatus === 'loading' && currentPage > 0)) && (
          <div className={styles.loadingMoreContainer}><p>Завантаження...</p></div>
        )}

        {!hasMore && postsToDisplay.length > 0 && currentFeedStatus === 'succeeded' && (
          <p className={styles.endOfFeedMessage}>Ви переглянули всі пости.</p>
        )}
        
        {currentFeedStatus === 'failed' && currentPage > 0 && currentFeedError && (
           <div className={styles.errorLoadingMore}>
              <p>Не вдалося завантажити більше постів: {typeof currentFeedError === 'string' ? currentFeedError : currentFeedError?.error || 'Невідома помилка'}</p>
              <button 
                  onClick={() => {
                      if (activeTab === 'forYou') {
                          dispatch(fetchPosts({ page: currentPage + 1, limit: currentFeedLimit }));
                      } else if (activeTab === 'following') {
                          dispatch(fetchFollowingPosts({ page: currentPage + 1, limit: currentFeedLimit }));
                      }
                  }} 
                  className={styles.retryButton}
                  disabled={currentFeedStatus === 'loadingMore' || currentFeedStatus === 'loading'}
              >
                  Спробувати ще
              </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainPage;