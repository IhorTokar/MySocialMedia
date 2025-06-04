// my-app/src/components/Pages/Dialogs/Dialogs.jsx
import React, { useState, useCallback, useRef, useEffect } from "react";
import styles from "./Dialogs.module.css"; // Використовуємо 'styles' як імпорт
import DialogItem from "./DialogItem/DialogItem";
import Message from "./Message/Message";
import { useAppDispatch, useAppSelector } from "../../../hooks/reduxHooks";
import { sendMessage, fetchMessages, resetSendMessageStatus, fetchChats, clearMessages } from "../../../redux/dialogsSlice"; // Додано fetchChats
import { FaPaperclip, FaTimes, FaPaperPlane } from 'react-icons/fa';
import axios from 'axios';
import { avatarImgUrl } from "../../../utils/ImagesLoadUtil";

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function Dialogs({
  chats = [],
  selectedChatPartnerId,
  messages = [],
  currentUserId,
  handleSelectChat, // Ця функція передається з DialogsContainer
  messageStatus,
  messageError,
  chatsStatus,
  chatsError
}) {
  const dispatch = useAppDispatch();
  const { sendMessageStatus, sendMessageError } = useAppSelector(state => state.dialogs);

  const [messageText, setMessageText] = useState("");
  const [imageFileToSend, setImageFileToSend] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const messagesEndRef = useRef(null);
  const messagesWindowRef = useRef(null);
  const prevChatIdRef = useRef(selectedChatPartnerId);
  const prevMessagesLengthRef = useRef(messages.length);
  const messagesFetchedForPartnerRef = useRef(null);

  useEffect(() => {
    if (selectedChatPartnerId && currentUserId) {
      if (selectedChatPartnerId !== messagesFetchedForPartnerRef.current || messageStatus === 'idle') {
        console.log(`[Dialogs.jsx] Fetching messages for selected partner: ${selectedChatPartnerId}. Current status: ${messageStatus}`);
        dispatch(fetchMessages(selectedChatPartnerId));
        messagesFetchedForPartnerRef.current = selectedChatPartnerId;
      }
    } else {
      messagesFetchedForPartnerRef.current = null;
    }
  }, [selectedChatPartnerId, currentUserId, dispatch, messageStatus]); // Видалено 'messages' з залежностей

  useEffect(() => {
    const messagesWindow = messagesWindowRef.current;
    const messagesEnd = messagesEndRef.current;
    if (!messagesWindow || !messagesEnd) return;

    const isNewChat = prevChatIdRef.current !== selectedChatPartnerId;
    const newMessageAdded = !isNewChat && messages.length > prevMessagesLengthRef.current;
    const scrollThreshold = 150;
    const isNearBottom = messagesWindow.scrollHeight - messagesWindow.scrollTop - messagesWindow.clientHeight < scrollThreshold;

    if (isNewChat) {
        messagesWindow.scrollTop = messagesWindow.scrollHeight;
    } else if (newMessageAdded && isNearBottom) {
        messagesEnd.scrollIntoView({ behavior: "smooth", block: "end" });
    }

    prevChatIdRef.current = selectedChatPartnerId;
    prevMessagesLengthRef.current = messages.length;
  }, [messages, selectedChatPartnerId]);

  const handleInputChange = useCallback((e) => {
    setMessageText(e.target.value);
    if (sendMessageStatus !== 'idle') {
        dispatch(resetSendMessageStatus());
    }
  }, [sendMessageStatus, dispatch]);

  const handleFileSelect = (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Файл занадто великий. Максимальний розмір 5MB.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setImageFileToSend(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeSelectedImage = () => {
    setImageFileToSend(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleActualSendMessage = async () => {
    if (!selectedChatPartnerId || (!messageText.trim() && !imageFileToSend)) {
      console.warn("Нічого відправляти: текст порожній і файл не вибрано.");
      return;
    }
    if (sendMessageStatus === 'loading' || isUploadingImage) return;

    dispatch(resetSendMessageStatus());
    let uploadedImageFilename = null;

    if (imageFileToSend) {
      setIsUploadingImage(true);
      const formData = new FormData();
      formData.append('messageFile', imageFileToSend);
      try {
        const uploadResponse = await axios.post(`${API_BASE_URL}/uploads/upload/message-image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true,
        });
        uploadedImageFilename = uploadResponse.data.filename;
        console.log('[Dialogs.jsx] Зображення для повідомлення успішно завантажено:', uploadedImageFilename);
      } catch (error) {
        console.error("[Dialogs.jsx] Помилка завантаження зображення для повідомлення:", error.response?.data || error.message);
        alert(`Не вдалося завантажити зображення: ${error.response?.data?.error || error.message}.`);
        setIsUploadingImage(false);
        if (!messageText.trim()) return;
      }
    }

    if (messageText.trim() || uploadedImageFilename) {
      const partnerIdToSendMessage = selectedChatPartnerId;
      dispatch(sendMessage({
        receiverID: partnerIdToSendMessage,
        message: messageText.trim(),
        messageFilename: uploadedImageFilename,
      }))
      .unwrap()
      .then((sentMessage) => {
        setMessageText("");
        removeSelectedImage();
        
        const chatExists = chats.some(chat => chat.partnerId === partnerIdToSendMessage);
        if (!chatExists && sentMessage) { // Перевіряємо, чи повідомлення успішно надіслано
          console.log(`[Dialogs.jsx] New chat started with ${partnerIdToSendMessage}, re-fetching chats.`);
          dispatch(fetchChats());
        }
      })
      .catch((err) => {
        console.error("[Dialogs.jsx] Помилка надсилання повідомлення (з slice):", err);
      })
      .finally(() => {
        setIsUploadingImage(false);
      });
    } else {
        setIsUploadingImage(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleActualSendMessage();
    }
  };

  const selectedPartnerDetails = chats.find(chat => chat.partnerId === selectedChatPartnerId);

  return (
    <div className={styles.dialogs}>
      <div className={styles.dialogs_items}>
        {chatsStatus === "loading" && <p className={styles.loadingMessage}>Завантаження чатів...</p>}
        {chatsError && <p className={styles.error}>Помилка завантаження чатів: {chatsError}</p>}
        {chats.length > 0 ? (
          chats.map((chat) => (
            <DialogItem
              key={chat.partnerId}
              id={chat.partnerId}
              name={chat.partnerName || chat.partnerUsername}
              avatar={chat.partnerAvatarUrl}
              lastMessage={chat.lastMessage || (chat.lastMessageFileUrl ? '[Зображення]' : '')}
              lastMessageTime={chat.lastMessageCreatedAt}
              onClick={() => handleSelectChat(chat.partnerId)}
              isActive={chat.partnerId === selectedChatPartnerId}
            />
          ))
        ) : (
          chatsStatus === 'succeeded' && <p className={styles.noChatsMessage}>Немає активних чатів. Почніть спілкування!</p>
        )}
      </div>

      <div className={styles.messages}>
        {!selectedChatPartnerId ? (
          <div className={styles.noChatSelected}>Виберіть чат для перегляду повідомлень</div>
        ) : (
          <>
            <div className={styles.chatHeader}>
              {selectedPartnerDetails && (
                <>
                  <img 
                    src={avatarImgUrl(selectedPartnerDetails.partnerAvatarUrl)} 
                    alt={selectedPartnerDetails.partnerName || selectedPartnerDetails.partnerUsername} 
                    className={styles.chatHeaderAvatar}
                    onError={(e) => { e.target.onerror = null; e.target.src = "/default_avatar.png"; }}
                  />
                  <span className={styles.chatHeaderName}>{selectedPartnerDetails.partnerName || selectedPartnerDetails.partnerUsername}</span>
                </>
              )}
            </div>
            <div className={styles.messagesWindow} ref={messagesWindowRef}>
              {messageStatus === "loading" && messages.length === 0 && <p className={styles.loadingMessage}>Завантаження повідомлень...</p>}
              {messageError && <p className={styles.error}>Помилка завантаження повідомлень: {messageError}</p>}
              {messages.length > 0 ? (
                messages.map((message) => (
                  <Message
                    key={message.messageID}
                    messageData={message}
                    currentUserId={currentUserId}
                  />
                ))
              ) : (
                 messageStatus === 'succeeded' && <p className={styles.noMessages}>Немає повідомлень у цьому чаті. Напишіть першим!</p>
              )}
              <div ref={messagesEndRef} style={{ height: '1px' }} />
            </div>

            <div className={styles.messageInputContainer}>
              {imagePreviewUrl && (
                  <div className={styles.imagePreviewWrapper}>
                      <img src={imagePreviewUrl} alt="Передперегляд" className={styles.imagePreviewThumb} />
                      <button onClick={removeSelectedImage} className={styles.removeImagePreviewBtn} aria-label="Видалити зображення">
                          <FaTimes />
                      </button>
                  </div>
              )}
              <div className={styles.messageInputArea}>
                  <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                      id="messageImageUploadDialogs"
                  />
                  <button 
                      type="button" 
                      onClick={triggerFileInput} 
                      className={styles.attachButton} 
                      aria-label="Прикріпити зображення" 
                      disabled={isUploadingImage || messageStatus === 'loading'}
                  >
                      <FaPaperclip />
                  </button>
                  <textarea
                      value={messageText}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Напишіть повідомлення..."
                      rows="1"
                      className={styles.messageTextarea}
                      disabled={isUploadingImage || messageStatus === 'loading'}
                  />
                  <button
                      onClick={handleActualSendMessage}
                      className={styles.sendButton}
                      disabled={messageStatus === 'loading' || isUploadingImage || (!messageText.trim() && !imageFileToSend)}
                  >
                      {isUploadingImage ? '...' : <FaPaperPlane />}
                  </button>
              </div>
            </div>
            {sendMessageStatus === 'failed' && sendMessageError && (
                <p className={styles.error} style={{padding: '0 15px 10px', textAlign: 'right'}}>
                    {typeof sendMessageError === 'string' ? sendMessageError : (typeof sendMessageError === 'object' && sendMessageError !== null ? sendMessageError.message || 'Не вдалося надіслати' : 'Не вдалося надіслати')}
                </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Dialogs;