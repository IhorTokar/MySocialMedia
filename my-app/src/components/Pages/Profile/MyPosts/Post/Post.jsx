import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import s from './Post.module.css';
import {
    FaHeart, FaRegHeart, FaComment,
    FaShare, FaEllipsisH, FaBookmark, FaRegBookmark,
    FaEdit, FaTrash, FaReply as FaReplyMain
} from "react-icons/fa";
import { avatarImgUrl, postImgUrl } from "../../../../../utils/ImagesLoadUtil";
import { formatDate } from "../../../../../utils/dateUtil";
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from "../../../../../hooks/reduxHooks";
import {
    likePost, unlikePost, resetLikeStatus,
    savePost, unsavePost, resetSaveActionStatus,
    deletePostById, resetDeletePostStatus
} from "../../../../../redux/postsSlice";
import {
    fetchComments, addComment, clearAddCommentStatus
} from "../../../../../redux/commentsSlice";
import CommentItem from './CommentItem';
import { openPostModal, openEditPostModal } from "../../../../../redux/uiSlice";

function Post({
    postId,
    userId,
    title,
    user_name,
    user_avatar,
    text,
    image,
    date,
    likeCount,
    commentsCount: initialCommentsCount, // Використовуємо початкову кількість коментарів
    sharesCount,
    isLikedByCurrentUser: initialIsLiked,
    isSavedByCurrentUser: initialIsSaved,
    isInsideModal = false
}) {
  const dispatch = useAppDispatch();
  const menuRef = useRef(null);
  const commentTextareaRef = useRef(null);

  const [isPostMenuOpen, setIsPostMenuOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyTo, setReplyTo] = useState(null); // { commentId: number, authorName: string, authorId: number } | null

  const auth = useAppSelector(state => state.auth);
  const currentUserProfile = useAppSelector(state => state.user.profile);
  
  const loggedInUserId = auth.user?.user_id || currentUserProfile?.user?.user_id;
  const loggedInUserRole = auth.user?.role || currentUserProfile?.role;
  const loggedInUserForComment = useAppSelector(state => state.user.profile?.user || state.auth.user);

  const { 
    likeStatus, likeError, 
    saveActionStatus, saveActionError, 
    deletePostStatus, deletePostError 
  } = useAppSelector(state => state.posts);
  
  const postCommentsData = useAppSelector(state => state.comments.commentsByPostId[postId]);
  const allCommentsForThisPost = useMemo(() => postCommentsData?.items || [], [postCommentsData]);
  const commentsStatus = postCommentsData?.status || 'idle';
  const commentsError = postCommentsData?.error || null;
  
  const { addCommentStatus, addCommentError: newCommentSubmitError } = useAppSelector(state => state.comments);

  const currentPostData = useMemo(() => ({
    postId, userId, title, 
    userNickname: user_name, 
    userAvatarURL: user_avatar,
    content: text, 
    contentImgURL: image, 
    createdAt: date,
    likesCount: likeCount, 
    commentsCount: initialCommentsCount, // Зберігаємо початкову кількість коментарів
    sharesCount, 
    isLikedByCurrentUser: initialIsLiked, 
    isSavedByCurrentUser: initialIsSaved
  }), [postId, userId, title, user_name, user_avatar, text, image, date, likeCount, initialCommentsCount, sharesCount, initialIsLiked, initialIsSaved]);

  const handleOpenPostInViewModal = useCallback((e) => {
    if (isInsideModal) return;
    
    const interactiveSelector = [
        'button', 'a', 'textarea', 'input',
        s.commentFormAvatar ? `.${s.commentFormAvatar}` : null,
        s.postMenuWrapper ? `.${s.postMenuWrapper}` : null,
        s.replyForm ? `.${s.replyForm}` : null,
        s.commentActions ? `.${s.commentActions}` : null
    ].filter(Boolean).join(', ');

    if (interactiveSelector && e.target.closest(interactiveSelector)) {
      return;
    }

    if (postId !== undefined) {
        dispatch(openPostModal(currentPostData));
    } else {
        console.error("Post.jsx: Неможливо відкрити пост в модалці перегляду, postId не визначено.");
    }
  }, [dispatch, postId, currentPostData, isInsideModal, s]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          !event.target.closest(`.${s.moreOptionsButton}[data-postid="${postId}"]`)) {
        setIsPostMenuOpen(false);
      }
    };
    if (isPostMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPostMenuOpen, postId, s.moreOptionsButton]);

  useEffect(() => {
    if (showComments && postId && commentsStatus === 'idle' && allCommentsForThisPost.length === 0) {
      dispatch(fetchComments(postId));
    }
  }, [showComments, postId, commentsStatus, dispatch, allCommentsForThisPost.length]);

  const topLevelComments = useMemo(() => {
    return allCommentsForThisPost.filter(comment => !comment.parent_comment_id);
  }, [allCommentsForThisPost]);

  const canManagePost = loggedInUserId === userId || loggedInUserRole === 'admin';
  const isAdminManagingOthersPost = loggedInUserRole === 'admin' && loggedInUserId !== userId;
  
  const isValidAuthorUserId = userId !== undefined && userId !== null;
  const authorDisplayName = user_name || "Unknown User";
  const authorUserHandle = user_name ? `@${user_name}` : "@unknown";

  const handleTogglePostMenu = useCallback((e) => {
    e.stopPropagation();
    if (deletePostError?.postId === postId) {
        dispatch(resetDeletePostStatus());
    }
    setIsPostMenuOpen(prev => !prev);
  }, [deletePostError, postId, dispatch]);

  const handleDeletePost = useCallback(() => {
    setIsPostMenuOpen(false);
    if (window.confirm("Ви впевнені, що хочете видалити цей пост?")) {
      dispatch(deletePostById(postId));
    }
  }, [dispatch, postId]);

  const handleEditPost = useCallback(() => {
    setIsPostMenuOpen(false);
    const postDataForEdit = { ...currentPostData };
    dispatch(openEditPostModal(postDataForEdit));
  }, [dispatch, currentPostData]);

  const handleLikeToggle = useCallback(() => {
    if (likeStatus === 'loading' && (likeError?.postId === postId || !likeError)) return;
    if(likeError?.postId === postId) dispatch(resetLikeStatus());
    if (currentPostData.isLikedByCurrentUser) {
      dispatch(unlikePost(postId));
    } else {
      dispatch(likePost(postId));
    }
  }, [dispatch, postId, currentPostData.isLikedByCurrentUser, likeStatus, likeError]);

  const handleSaveToggle = useCallback(() => {
    if (saveActionStatus === 'loading' && (saveActionError?.postId === postId || !saveActionError)) return;
    if(saveActionError?.postId === postId) dispatch(resetSaveActionStatus());
    if (currentPostData.isSavedByCurrentUser) {
      dispatch(unsavePost(postId));
    } else {
      dispatch(savePost(postId));
    }
  }, [dispatch, postId, currentPostData.isSavedByCurrentUser, saveActionStatus, saveActionError]);
  
  const handleToggleComments = useCallback(() => {
    setShowComments(prev => !prev);
    if (!showComments && addCommentStatus === 'failed') {
        dispatch(clearAddCommentStatus());
    } else if (showComments && addCommentStatus === 'failed') {
         dispatch(clearAddCommentStatus());
    }
    setReplyTo(null);
  }, [addCommentStatus, dispatch, showComments]);

  const handleSetReplyTo = useCallback((replyInfo) => {
    setReplyTo(replyInfo);
    if (replyInfo) {
      setNewCommentText(`@${replyInfo.authorName} `);
      commentTextareaRef.current?.focus();
    } else {
      if (replyTo && newCommentText.startsWith(`@${replyTo.authorName} `)) {
        setNewCommentText('');
      }
    }
  }, [newCommentText, replyTo]);

  const cancelMainReply = useCallback(() => {
    setReplyTo(null);
    if (replyTo && newCommentText.startsWith(`@${replyTo.authorName} `)) {
        setNewCommentText('');
    }
  }, [newCommentText, replyTo]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    const parentIdForNewComment = replyTo ? replyTo.commentId : null;
    if (!newCommentText.trim() || !postId || !loggedInUserId) {
        console.warn(`[Post.jsx] Cannot add comment: empty text ('${newCommentText}'), no postId (${postId}), or not logged in (${loggedInUserId}). ParentID for this attempt: ${parentIdForNewComment}`);
        return;
    }
    
    if (newCommentSubmitError && addCommentStatus === 'failed' && 
        (newCommentSubmitError.parentCommentId === parentIdForNewComment || (parentIdForNewComment === null && newCommentSubmitError.parentCommentId === null) ) ) {
        dispatch(clearAddCommentStatus());
    }

    let textToSend = newCommentText.trim();
    if (replyTo && textToSend.startsWith(`@${replyTo.authorName} `)) {
        textToSend = textToSend.substring(`@${replyTo.authorName} `.length).trim();
    }

    if(!textToSend) { 
        if (parentIdForNewComment !== null) {
            setNewCommentText(''); 
            alert("Текст відповіді не може бути порожнім після видалення @імені.");
            return;
        }
        alert("Коментар не може бути порожнім.");
        return;
    }

    const resultAction = await dispatch(addComment({ 
      postId, 
      text: textToSend, 
      parentCommentId: parentIdForNewComment 
    }));

    if (addComment.fulfilled.match(resultAction)) {
      setNewCommentText("");
      setReplyTo(null);
    }
  };

  const handleShare = useCallback(() => {
    const postUrl = `${window.location.origin}/posts/${postId}`;
    document.execCommand('copy', false, postUrl); // Використовуємо document.execCommand для сумісності з iframe
    alert('Посилання на пост скопійовано!');
  }, [postId]);

  const currentPostLikeError = useMemo(() => (likeError?.postId === postId ? likeError.message : null), [likeError, postId]);
  const currentPostSaveError = useMemo(() => (saveActionError?.postId === postId ? saveActionError.message : null), [saveActionError, postId]);
  const currentPostDeleteError = useMemo(() => (deletePostError?.postId === postId ? deletePostError.message : null), [deletePostError, postId]);

  // Змінено: використовуємо initialCommentsCount для відображення загальної кількості коментарів
  // dynamicCommentsCount тепер просто відображає кількість завантажених коментарів,
  // але для кнопки використовуємо загальну кількість
  const displayCommentsCount = initialCommentsCount; 

  if (postId === undefined) {
    return <div className={s.postCard} style={{color: 'var(--error-text-color)'}}>Помилка: ID поста не визначено.</div>;
  }

  return (
    <article className={s.postCard} onClick={handleOpenPostInViewModal}>
      <div className={s.postHeader}>
        <div className={s.authorInfo}>
          {isValidAuthorUserId ? (
            <Link to={`/profile/${userId}`} className={s.avatarLink} onClick={(e) => e.stopPropagation()}>
              <img src={avatarImgUrl(user_avatar)} alt={`Аватар ${authorDisplayName}`} className={s.avatar} onError={(e) => { e.target.onerror = null; e.target.src = "/default_avatar.png"; }} />
            </Link>
          ) : (
            <img src={avatarImgUrl(user_avatar)} alt={`Аватар ${authorDisplayName}`} className={s.avatar} onError={(e) => { e.target.onerror = null; e.target.src = "/default_avatar.png"; }} />
          )}
          <div className={s.nameAndDate}>
            <div className={s.authorNames}>
              {isValidAuthorUserId ? (
                <Link to={`/profile/${userId}`} className={s.usernameLink} onClick={(e) => e.stopPropagation()}>
                  <span className={s.displayName}>{authorDisplayName}</span>
                </Link>
              ) : (
                <span className={s.displayName}>{authorDisplayName}</span>
              )}
              <span className={s.userHandle}>{authorUserHandle}</span>
            </div>
            <span className={s.dotSeparator}>·</span>
            <span className={s.date}>{formatDate(date)}</span>
          </div>
        </div>
        {canManagePost && !isInsideModal && (
          <div className={s.postMenuWrapper} ref={menuRef}>
            <button className={`${s.moreOptionsButton} ${isAdminManagingOthersPost ? s.adminActionIcon : ''}`} aria-label="Опції допису" onClick={handleTogglePostMenu} data-postid={postId}>
              <FaEllipsisH />
            </button>
            {isPostMenuOpen && (
              <div className={`${s.postDropdownMenu} ${isAdminManagingOthersPost ? s.adminDropdown : ''}`}>
                <button onClick={(e) => { e.stopPropagation(); handleEditPost(); }} className={s.dropdownItem}>
                  <FaEdit /> Редагувати
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDeletePost(); }} className={`${s.dropdownItem} ${s.deleteItem}`}>
                  <FaTrash /> Видалити
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={s.postContent} style={isInsideModal ? {cursor: 'default'} : {cursor: 'pointer'}} >
        {title && <h3 className={s.postTitle}>{title}</h3>}
        {text && <p className={s.postText}>{text}</p>}
        {image && ( <div className={s.postImageContainer}><img src={postImgUrl(image)} alt="Зображення допису" className={s.postImage} /></div> )}
      </div>

      {currentPostLikeError && <p className={s.likeErrorText}>{currentPostLikeError}</p>}
      {currentPostSaveError && <p className={s.likeErrorText}>{currentPostSaveError}</p>}
      {deletePostStatus === 'loading' && deletePostError?.postId === postId && <p className={s.loadingMessage}>Видалення...</p>}
      {currentPostDeleteError && <p className={`${s.errorText} ${s.actionError}`}>{currentPostDeleteError}</p>}

      <div className={s.postActions}>
        <button className={`${s.actionButton} ${currentPostData.isLikedByCurrentUser ? s.liked : ''}`} onClick={(e) => {e.stopPropagation(); handleLikeToggle();}} aria-label={`Лайк, ${currentPostData.likesCount}`} disabled={likeStatus === 'loading' && (likeError?.postId === postId || !likeError)}>
          {currentPostData.isLikedByCurrentUser ? <FaHeart style={{ color: '#F91880' }}/> : <FaRegHeart />}
          <span>{currentPostData.likesCount > 0 ? currentPostData.likesCount : ''}</span>
        </button>
        <button className={s.actionButton} onClick={(e) => {e.stopPropagation(); handleToggleComments();}} aria-label={`Коментар, ${displayCommentsCount}`}>
          <FaComment /> <span>{displayCommentsCount > 0 ? displayCommentsCount : ''}</span>
        </button>
        <button className={s.actionButton} onClick={(e) => {e.stopPropagation(); handleShare();}} aria-label={`Поділитися`}>
          <FaShare /> {/* Кількість поширень тепер відображається біля кнопки "Зберегти" */}
        </button>
        <button className={`${s.actionButton} ${currentPostData.isSavedByCurrentUser ? s.saved : ''}`} onClick={(e) => {e.stopPropagation(); handleSaveToggle();}} aria-label={`Зберегти, ${currentPostData.sharesCount}`} disabled={saveActionStatus === 'loading' && (saveActionError?.postId === postId || !saveActionError)}>
          {currentPostData.isSavedByCurrentUser ? <FaBookmark style={{ color: 'var(--accent-color)' }} /> : <FaRegBookmark />}
          <span>{currentPostData.sharesCount > 0 ? currentPostData.sharesCount : ''}</span>
        </button>
      </div>

      {showComments && (
        <div className={s.commentsSection} onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleAddComment} className={s.addCommentForm}>
            {loggedInUserForComment && ( 
              <img 
                src={avatarImgUrl(loggedInUserForComment.user_avatar_url)} 
                alt="Ваш аватар" 
                className={s.commentFormAvatar} 
                onError={(e) => { e.target.onerror = null; e.target.src="/default_avatar.png"; }} 
              /> 
            )}
            <div className={s.textareaWrapper}>
                {replyTo && (
                <div className={s.replyingToContainer}>
                    <span>Відповідь для <Link to={replyTo.authorId ? `/profile/${replyTo.authorId}` : '#'} onClick={(e)=>e.stopPropagation()}><b>{replyTo.authorName}</b></Link></span>
                    <button type="button" onClick={cancelMainReply} className={s.cancelReplyButton}>Скасувати</button>
                </div>
                )}
                <textarea
                  ref={commentTextareaRef}
                  placeholder={replyTo ? `Ваша відповідь...` : "Напишіть коментар..."}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  rows="1"
                  className={s.commentTextarea} 
                />
            </div>
            <button 
              type="submit" 
              className={s.commentSubmitButton} 
              disabled={addCommentStatus === 'loading' || !newCommentText.trim()}
              aria-label={replyTo ? 'Відповісти на коментар' : 'Надіслати коментар'}
            >
              {addCommentStatus === 'loading' ? '...' : (replyTo ? <FaReplyMain size="1em"/> : 'Надіслати')}
            </button>
          </form>
          {addCommentStatus === 'failed' && newCommentSubmitError && 
            (!replyTo || (replyTo && newCommentSubmitError.parentCommentId === replyTo.commentId)) && 
            (<p className={s.commentError}>
                {typeof newCommentSubmitError.message === 'string' ? newCommentSubmitError.message : (typeof newCommentSubmitError === 'object' && newCommentSubmitError !== null ? newCommentSubmitError.error || 'Не вдалося додати коментар.' : 'Не вдалося додати коментар.')}
            </p>)
          }

          <div className={s.commentsList}>
            {commentsStatus === 'loading' && allCommentsForThisPost.length === 0 && <p className={s.loadingMessage}>Завантаження коментарів...</p>}
            {commentsError && <p className={s.error}>Помилка завантаження коментарів: {commentsError}</p>}
            {commentsStatus === 'succeeded' && topLevelComments.length === 0 && !commentsError && (
                <p className={s.noComments}>Коментарів ще немає. Будьте першим!</p>
            )}
            {commentsStatus === 'succeeded' && topLevelComments.length > 0 && (
              topLevelComments.map(comment => (
                <CommentItem
                  key={comment.comment_id}
                  comment={comment}
                  postId={postId}
                  allCommentsForPost={allCommentsForThisPost}
                  level={0} 
                  onReply={handleSetReplyTo} 
                />
              ))
            )}
          </div>
        </div>
      )}
    </article>
  );
};

export default Post;