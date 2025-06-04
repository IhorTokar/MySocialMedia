// my-app/src/components/Pages/Profile/MyPosts/Post/CommentItem.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './CommentItem.module.css';
import { avatarImgUrl } from '../../../../../utils/ImagesLoadUtil';
import { formatDate } from '../../../../../utils/dateUtil';
import { useAppDispatch, useAppSelector } from '../../../../../hooks/reduxHooks';
import { addComment, clearAddCommentStatus, deleteComment, resetDeleteCommentStatus } from '../../../../../redux/commentsSlice';
import { FaReply, FaAngleDown, FaAngleUp, FaEdit, FaTrash } from 'react-icons/fa';

const CommentItem = ({ comment, postId, allCommentsForPost, level = 0, onReplyToComment }) => {
  const dispatch = useAppDispatch();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showNestedReplies, setShowNestedReplies] = useState(false);

  const loggedInUserId = useAppSelector(state =>
    state.auth.user?.user_id
      ? parseInt(String(state.auth.user.user_id), 10)
      : (state.user.profile?.user?.user_id
          ? parseInt(String(state.user.profile.user.user_id), 10)
          : null)
  );
  const loggedInUserRole = useAppSelector(state => state.auth.user?.role || state.user.profile?.role);

  const { addCommentStatus: currentReplyStatus, addCommentError: currentReplyError } = useAppSelector(state => state.comments);
  const { deleteCommentStatus, deleteCommentError } = useAppSelector(state => state.comments);

  // Визначаємо, чи йде видалення саме цього коментаря
  const isDeletingThisComment = deleteCommentStatus === 'loading' &&
                               deleteCommentError?.postId === postId && // Перевіряємо postId з помилки
                               deleteCommentError?.commentId === comment.comment_id;

  useEffect(() => {
    // Якщо є глобальна помилка видалення, але вона не стосується цього коментаря,
    // ми її не відображаємо локально. Глобальний resetDeleteCommentStatus
    // має викликатися, наприклад, при успішному видаленні іншого коментаря або при розмонтуванні.
    if (deleteCommentError && (deleteCommentError.postId !== postId || deleteCommentError.commentId !== comment.comment_id)) {
      // Це помилка не для цього коментаря
    }
  }, [deleteCommentError, postId, comment.comment_id]);


  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !postId || !comment.comment_id) return;

    if (currentReplyError && currentReplyStatus === 'failed' && currentReplyError.parentCommentId === comment.comment_id) {
        dispatch(clearAddCommentStatus());
    }

    const resultAction = await dispatch(addComment({
        postId,
        text: replyText,
        parentCommentId: comment.comment_id
    }));

    if (addComment.fulfilled.match(resultAction)) {
      setReplyText("");
      setShowReplyForm(false);
      setShowNestedReplies(true);
    }
  };

  const childComments = useMemo(() => {
    return allCommentsForPost && Array.isArray(allCommentsForPost)
      ? allCommentsForPost.filter(c => c.parent_comment_id === comment.comment_id)
      : [];
  }, [allCommentsForPost, comment.comment_id]);

  const handleToggleNestedReplies = (e) => {
    e.stopPropagation();
    setShowNestedReplies(prev => !prev);
  };

  const handleToggleReplyForm = (e) => {
    e.stopPropagation();
    setShowReplyForm(prev => !prev);
    if (replyText && !showReplyForm) {
        setReplyText('');
    }
    if (currentReplyStatus === 'failed' && currentReplyError && currentReplyError.parentCommentId === comment.comment_id){
        dispatch(clearAddCommentStatus());
    }
  };

  const canManageComment = loggedInUserId === comment.user_id || loggedInUserRole === 'admin';

  const handleEditComment = () => {
    console.log("Редагувати коментар:", comment.comment_id);
    alert("Функція редагування коментаря ще не реалізована.");
  };

  const handleDeleteComment = async () => {
    if (isDeletingThisComment) return;

    if (window.confirm("Ви впевнені, що хочете видалити цей коментар та всі відповіді на нього? Це не можна буде скасувати.")) {
        // Скидаємо статус помилки перед новим запитом, якщо помилка стосувалася цього коментаря
        if (deleteCommentError && deleteCommentError.postId === postId && deleteCommentError.commentId === comment.comment_id) {
            dispatch(resetDeleteCommentStatus());
        }
        try {
            await dispatch(deleteComment({ postId: postId, commentId: comment.comment_id })).unwrap();
            // Успішне видалення обробляється в extraReducers slices/commentsSlice.js
            // Оновлення лічильника постів відбувається через postsSlice, який викликається з commentsSlice
        } catch (error) {
            const errorMsg = (typeof error === 'object' && error !== null && (error.error || error.message)) ? (error.error || error.message) : 'Не вдалося видалити коментар.';
            alert(`Помилка видалення: ${errorMsg}`);
            console.error("Failed to delete comment (UI):", error);
        }
    }
  };

  const indentationStyle = {
    marginLeft: `${level * 20}px`,
    paddingLeft: level > 0 ? '20px' : '0',
    borderLeft: level > 0 ? `2px solid var(--card-border-color-alpha)` : 'none',
    position: 'relative',
  };
  const lineConnectorStyle = level > 0 ? styles.lineConnector : '';

  return (
    <div className={`${styles.commentItemWrapper} ${lineConnectorStyle}`} style={indentationStyle} id={`comment-wrapper-${comment.comment_id}`}>
      <div className={styles.commentItem} id={`comment-${comment.comment_id}`}>
        <Link to={`/profile/${comment.user_id}`} className={styles.commentAvatarLink}>
          <img
              src={avatarImgUrl(comment.user_avatar_url)}
              alt={comment.username}
              className={styles.commentAvatar}
              onError={(e) => { e.target.onerror = null; e.target.src="/default_avatar.png"; }}
          />
        </Link>
        <div className={styles.commentContent}>
          <div className={styles.commentHeader}>
            <Link to={`/profile/${comment.user_id}`} className={styles.commentAuthor}>
              {comment.username}
            </Link>
            <span className={styles.commentDate}>{formatDate(comment.created_date, { timeOnlyIfToday: true })}</span>
          </div>
          <p className={styles.commentText}>{comment.text}</p>
          <div className={styles.commentActions}>
            <button onClick={handleToggleReplyForm} className={styles.actionLink}>
              <FaReply style={{ marginRight: '4px' }} /> {showReplyForm ? 'Скасувати' : 'Відповісти'}
            </button>
            {canManageComment && (
                <>
                    {/* <button onClick={handleEditComment} className={styles.actionLink}><FaEdit style={{ marginRight: '4px' }}/> Редагувати</button> */}
                    <button
                        onClick={handleDeleteComment}
                        className={`${styles.actionLink} ${styles.deleteActionLink}`}
                        disabled={isDeletingThisComment}
                    >
                        {isDeletingThisComment ? <><FaTrash style={{ marginRight: '4px' }}/> Видалення...</> : <><FaTrash style={{ marginRight: '4px' }}/> Видалити</>}
                    </button>
                </>
            )}
            {childComments.length > 0 && (
              <button onClick={handleToggleNestedReplies} className={styles.toggleRepliesButton}>
                {showNestedReplies ? <FaAngleUp /> : <FaAngleDown />}{' '}
                {showNestedReplies ? 'Приховати' : `Відповіді (${childComments.length})`}
              </button>
            )}
          </div>

          {/* Відображення помилки видалення, якщо вона стосується цього коментаря */}
          {deleteCommentStatus === 'failed' && deleteCommentError &&
           deleteCommentError.postId === postId && deleteCommentError.commentId === comment.comment_id && (
            <p className={styles.commentError}>
                {typeof deleteCommentError.error === 'string' ? deleteCommentError.error : 'Не вдалося видалити коментар.'}
            </p>
          )}

          {showReplyForm && (
            <form onSubmit={handleReplySubmit} className={styles.replyForm}>
              <textarea
                placeholder={`Ваша відповідь для ${comment.username}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows="2"
                className={styles.replyTextarea}
                autoFocus
              />
              <div className={styles.replyFormActions}>
                <button
                  type="submit"
                  className={styles.replySubmitButton}
                  disabled={currentReplyStatus === 'loading' || !replyText.trim()}
                >
                  {currentReplyStatus === 'loading' ? 'Відправка...' : 'Відповісти'}
                </button>
              </div>
              {currentReplyStatus === 'failed' && currentReplyError && currentReplyError.parentCommentId === comment.comment_id &&
                <p className={styles.commentError}>
                  {typeof currentReplyError.message === 'string' ? currentReplyError.message : 'Не вдалося надіслати відповідь.'}
                </p>
              }
            </form>
          )}
        </div>
      </div>

      {showNestedReplies && childComments.length > 0 && (
        <div className={styles.nestedCommentsContainer}>
          {childComments.map(reply => (
            <CommentItem
                key={reply.comment_id}
                comment={reply}
                postId={postId}
                allCommentsForPost={allCommentsForPost}
                level={level + 1}
                onReplyToComment={onReplyToComment}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;