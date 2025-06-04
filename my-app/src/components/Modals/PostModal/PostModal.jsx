// my-app/src/components/Modals/PostModal/PostModal.jsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { closePostModal } from '../../../redux/uiSlice';
import Post from '../../Pages/Profile/MyPosts/Post/Post'; // Ваш існуючий компонент Post
import styles from './PostModal.module.css';
import { FaTimes } from 'react-icons/fa';

const PostModal = () => {
  const dispatch = useDispatch();
  const { isPostModalOpen, modalPostData } = useSelector((state) => state.ui);

  const handleClose = () => {
    dispatch(closePostModal());
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (isPostModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isPostModalOpen]); // Залежність тільки від isPostModalOpen

  if (!isPostModalOpen || !modalPostData) {
    return null;
  }

  const postProps = {
    postId: modalPostData.postId,
    userId: modalPostData.userId,
    user_name: modalPostData.userNickname || modalPostData.user_name,
    user_avatar: modalPostData.userAvatarURL || modalPostData.user_avatar,
    text: modalPostData.content || modalPostData.text,
    image: modalPostData.contentImgURL || modalPostData.image,
    date: modalPostData.createdAt || modalPostData.date,
    likeCount: modalPostData.likesCount || 0,
    commentsCount: modalPostData.commentsCount || 0,
    sharesCount: modalPostData.sharesCount || 0,
    isLikedByCurrentUser: !!modalPostData.isLikedByCurrentUser,
    isSavedByCurrentUser: !!modalPostData.isSavedByCurrentUser,
    isInsideModal: true, // <--- ДОДАНО ЦЕЙ ПРОПС
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={handleClose} aria-label="Закрити пост">
          <FaTimes />
        </button>
        <div className={styles.postWrapperScrollable}>
            {modalPostData && modalPostData.postId !== undefined ? (
                <Post {...postProps} />
            ) : (
                <p className={styles.loadingMessageModal}>Дані поста не завантажені або некоректні.</p>
            )}
        </div>
      </div>
    </div>
  );
};

export default PostModal;