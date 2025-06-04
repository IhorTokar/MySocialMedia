// my-app/src/components/Pages/Dialogs/Message/Message.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./../Dialogs.module.css";
import { avatarImgUrl, generateMessageFileRemoteUrl } from "../../../../utils/ImagesLoadUtil";
import { formatDate } from "../../../../utils/dateUtil";
import { useAppDispatch, useAppSelector } from "../../../../hooks/reduxHooks";
import { openImageModal } from "../../../../redux/uiSlice";
import { deleteMessageById, updateMessageById, resetUpdateMessageStatus } from "../../../../redux/dialogsSlice";
import { FaEllipsisV, FaTrash, FaEdit, FaSave, FaTimesCircle } from 'react-icons/fa';

const Message = ({ messageData, currentUserId }) => {
  // --- ВСІ ХУКИ ВИЗНАЧАЄМО ТУТ, ДО УМОВИ РАННЬОГО ПОВЕРНЕННЯ ---
  const dispatch = useAppDispatch();
  const { updateMessageStatus, updateMessageError, deleteMessageStatus } = useAppSelector(state => state.dialogs);

  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Ініціалізуємо editedText з messageData.message або порожнім рядком,
  // але useEffect нижче оновить його, коли messageData стане доступним.
  const [editedText, setEditedText] = useState(messageData?.message || ""); 
  const [deleteImageFlag, setDeleteImageFlag] = useState(false);
  
  const editInputRef = useRef(null);

  // --- Початок useCallback хуків ---
  const handleDeleteMessage = useCallback(async (e) => {
    e.stopPropagation();
    if (deleteMessageStatus === 'loading' || !messageData) return; // Додано перевірку на messageData
    if (window.confirm("Ви впевнені, що хочете видалити це повідомлення?")) {
      const partnerId = messageData.senderID === currentUserId ? messageData.receiverID : messageData.senderID;
      try {
        await dispatch(deleteMessageById({ messageID: messageData.messageID, partnerId })).unwrap();
        setShowActions(false);
      } catch (error) {
        console.error("Помилка видалення повідомлення (на фронтенді):", error);
        const errorMessage = typeof error === 'string' ? error : (error?.message || "Не вдалося видалити повідомлення.");
        alert(errorMessage);
      }
    }
  }, [dispatch, messageData, currentUserId, deleteMessageStatus]); // Додано messageData та currentUserId

  const handleEditMessage = useCallback((e) => {
    e.stopPropagation();
    if (!messageData) return; // Додано перевірку
    setEditedText(messageData.message || ""); 
    setDeleteImageFlag(false); 
    setIsEditing(true);
    setShowActions(false);
  }, [messageData]); // Додано messageData

  const handleCancelEdit = useCallback(() => {
    if (!messageData) return; // Додано перевірку
    setIsEditing(false);
    setEditedText(messageData.message || "");
    setDeleteImageFlag(false);
    dispatch(resetUpdateMessageStatus()); 
  }, [messageData, dispatch]); // Додано messageData

  const handleSaveEdit = useCallback(async () => {
    if (updateMessageStatus === 'loading' || !messageData) return;

    const newText = editedText.trim();
    const currentImageStillExists = messageData.messageFileContentUrl && !deleteImageFlag;

    const textChanged = newText !== (messageData.message || "").trim();
    const imageActionTaken = deleteImageFlag && messageData.messageFileContentUrl;

    if (!textChanged && !imageActionTaken) {
      setIsEditing(false);
      return;
    }
    
    if (newText === "" && !currentImageStillExists ) {
        alert("Повідомлення не може бути повністю порожнім.");
        return;
    }

    const payload = {
      messageID: messageData.messageID,
      partnerId: messageData.senderID === currentUserId ? messageData.receiverID : messageData.senderID,
      newText: textChanged ? newText : undefined, 
      messageFilenameAction: imageActionTaken ? null : undefined,
    };
    
    try {
      await dispatch(updateMessageById(payload)).unwrap();
      setIsEditing(false);
    } catch (error) {
      console.error("Помилка оновлення повідомлення:", error);
    }
  }, [dispatch, messageData, currentUserId, editedText, deleteImageFlag, updateMessageStatus]); // Додано залежності

  const handleImageClick = useCallback((e) => {
    e.stopPropagation();
    if (messageData?.messageFileContentUrl) {
      const imageUrl = generateMessageFileRemoteUrl(messageData.messageFileContentUrl);
      if (imageUrl) {
        dispatch(openImageModal({ url: imageUrl, alt: messageData.message || `Зображення від ${messageData.senderNickname}` }));
      }
    }
  }, [dispatch, messageData]); // Додано messageData
  // --- Кінець useCallback хуків ---


  useEffect(() => {
    if (messageData) {
      setEditedText(messageData.message || "");
      // Скидаємо deleteImageFlag тільки якщо ми не в режимі редагування,
      // або якщо messageData змінилося (наприклад, прийшло нове повідомлення)
      if(!isEditing) {
        setDeleteImageFlag(false);
      }
    }
  }, [messageData, isEditing]); // Залежність isEditing важлива, щоб не скидати прапорець під час редагування

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      const textLength = editInputRef.current.value.length;
      editInputRef.current.selectionStart = textLength;
      editInputRef.current.selectionEnd = textLength;
      
      if (updateMessageStatus !== 'idle') {
        dispatch(resetUpdateMessageStatus());
      }
    }
  }, [isEditing, updateMessageStatus, dispatch]);

  // --- УМОВА РАННЬОГО ПОВЕРНЕННЯ ТЕПЕР ПІСЛЯ ВСІХ ХУКІВ ---
  if (!messageData) {
    return null; 
  }
  // ---------------------------------------------------------

  const {
    messageID, senderID, message: originalMessage, messageFileContentUrl,
    send_at, senderNickname, senderAvatarURL, receiverID
  } = messageData;

  const isOwnMessage = senderID === currentUserId;
  const messageBlockClass = isOwnMessage ? `${styles.messageBlock} ${styles.ownMessage}` : styles.messageBlock;
  const currentImageUrl = messageFileContentUrl ? generateMessageFileRemoteUrl(messageFileContentUrl) : null;

  const handleToggleActions = (e) => {
    e.stopPropagation();
    setShowActions(prev => !prev);
  };

  return (
    <div className={messageBlockClass} onMouseLeave={!isEditing ? () => setShowActions(false) : undefined}>
      {!isOwnMessage && (
        <div className={styles.avatarContainerForMessage}>
          <img 
              src={avatarImgUrl(senderAvatarURL)} 
              alt={senderNickname || 'avatar'} 
              className={styles.messageSenderAvatar}
              onError={(e) => { e.target.onerror = null; e.target.src = "/default_avatar.png"; }}
          />
        </div>
      )}

      <div className={styles.messageMainBlock}>
        {!isOwnMessage && senderNickname && (
          <div className={styles.senderNameText}>{senderNickname}</div>
        )}
        
        <div className={styles.messageContentWrapper}>
          {isEditing ? (
            <div className={styles.editFormContainer}>
              <textarea
                ref={editInputRef}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className={styles.editTextarea}
                rows={Math.max(1, Math.min(5, (editedText.match(/\n/g) || []).length + 1))}
              />
              {currentImageUrl && !deleteImageFlag && (
                <div className={styles.editImagePreviewContainer}>
                  <img src={currentImageUrl} alt="Поточне зображення" className={styles.editImagePreview} />
                  <button onClick={() => setDeleteImageFlag(true)} className={styles.deleteImageButton} title="Видалити зображення">
                    <FaTimesCircle />
                  </button>
                </div>
              )}
              {deleteImageFlag && currentImageUrl && <p className={styles.imageMarkedForDeletion}>Зображення буде видалено</p>}
              {updateMessageStatus === 'failed' && updateMessageError && updateMessageError.messageID === messageID && (
                 <p className={styles.editErrorMessage}>{ typeof updateMessageError.message === 'string' ? updateMessageError.message : "Помилка збереження"}</p>
              )}
              <div className={styles.editActions}>
                <button onClick={handleCancelEdit} className={`${styles.editButton} ${styles.cancelEditButton}`}>
                  Скасувати
                </button>
                <button onClick={handleSaveEdit} className={`${styles.editButton} ${styles.saveEditButton}`} disabled={updateMessageStatus === 'loading'}>
                  {updateMessageStatus === 'loading' ? "Збереження..." : <><FaSave /> Зберегти</>}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.messageContent}>
              {originalMessage && <div className={styles.messageText}>{originalMessage}</div>}
              {currentImageUrl && (
                <div className={styles.messageImageContainer} onClick={handleImageClick}>
                  <img 
                    src={currentImageUrl} 
                    alt="Вкладення" 
                    className={styles.messageImageContent} 
                    onError={(e) => { 
                        console.warn(`[Message.jsx] Не вдалося завантажити зображення: ${currentImageUrl}`);
                        e.target.style.display='none';
                    }}
                  />
                </div>
              )}
              <span className={styles.messageTimestamp}>{formatDate(send_at, {timeOnlyIfToday: true})}</span>
            </div>
          )}

          {isOwnMessage && !isEditing && (
            <div className={styles.messageActionsButtonContainer}>
                <button className={styles.messageActionButton} onClick={handleToggleActions} aria-label="Дії">
                    <FaEllipsisV />
                </button>
                {showActions && (
                    <div className={styles.messageActionsDropdown}>
                        <button className={styles.dropdownItem} onClick={handleEditMessage}>
                            <FaEdit style={{ marginRight: '8px' }} /> Редагувати
                        </button>
                        <button className={`${styles.dropdownItem} ${styles.deleteItem}`} onClick={handleDeleteMessage} disabled={deleteMessageStatus === 'loading'}>
                            {deleteMessageStatus === 'loading' ? "Видалення..." : <><FaTrash style={{ marginRight: '8px' }} /> Видалити</>}
                        </button>
                    </div>
                )}
            </div>
          )}
        </div>
      </div>

      {isOwnMessage && senderAvatarURL && (
         <div className={styles.avatarContainerForMessage}>
            <img 
                src={avatarImgUrl(senderAvatarURL)}
                alt={senderNickname || 'my-avatar'} 
                className={styles.messageSenderAvatar}
                onError={(e) => { e.target.onerror = null; e.target.src = "/default_avatar.png"; }}
            />
        </div>
       )}
    </div>
  );
};

export default Message;