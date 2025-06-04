// my-app/src/components/Pages/Dialogs/DialogsContainer.jsx
import React, { useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    fetchMessages, sendMessage, fetchChats, setSelectedChat, receiveMessage, clearDialogState
} from "../../../redux/dialogsSlice";
import Dialogs from "./Dialogs";

function DialogsContainer() {
  const dispatch = useDispatch();
  // Прибираємо типізацію <WebSocket | null> для useRef в JSX файлі
  const webSocketRef = useRef(null); // Ref для WebSocket

  // Отримуємо дані зі стану
  const {
    chats, selectedChatPartnerId, messages, status, error, chatsStatus, chatsError
  } = useSelector((state) => state.dialogs);
  const currentUserId = useSelector(state => state.user.profile?.user?.user_id ? parseInt(state.user.profile.user.user_id, 10) : null);
  const profileLoading = useSelector((state) => state.user.loading);
  const profileError = useSelector((state) => state.user.error);
  const authToken = useSelector((state) => state.auth.token); // Токен для WS

  // Завантаження HTTP даних
  useEffect(() => {
    if (currentUserId === null) {
        if (webSocketRef.current) {
             webSocketRef.current.close();
             webSocketRef.current = null;
        }
        dispatch(clearDialogState());
        return;
    }
    if (chatsStatus === "idle") dispatch(fetchChats());
    if (status === "idle") dispatch(fetchMessages());
  }, [dispatch, chatsStatus, status, currentUserId]);

  // --- WebSocket Connection Effect ---
  useEffect(() => {
    if (!authToken || currentUserId === null) {
        if (webSocketRef.current) {
            console.log("Closing WebSocket due to missing auth token or user ID...");
            webSocketRef.current.close(1000, "User logged out or token expired");
            webSocketRef.current = null;
        }
        return;
    }

    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
        console.log("WebSocket already connected.");
        return;
    }

    const wsUrl = `ws://localhost:5000?token=${authToken}`;
    console.log(`Attempting to connect WebSocket: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    webSocketRef.current = ws;

    ws.onopen = () => {
        console.log("WebSocket Connected");
    };

    ws.onclose = (event) => {
        console.log(`WebSocket Disconnected: Code=${event.code}, Reason=${event.reason}`);
        if (webSocketRef.current === ws) {
             webSocketRef.current = null;
        }
    };

    ws.onerror = (event) => {
        console.error("WebSocket Error:", event);
    };

    ws.onmessage = (event) => {
        try {
            // --- ВИПРАВЛЕНО: Прибираємо 'as string' ---
            // event.data зазвичай вже є рядком, якщо сервер надсилає текст
            const messageData = JSON.parse(event.data);
            // --- КІНЕЦЬ ВИПРАВЛЕННЯ ---
            console.log("WebSocket Message Received:", messageData);

            if (messageData.type === 'new_message' && messageData.payload) {
                dispatch(receiveMessage(messageData.payload));
            }
        } catch (e) {
            console.error("Failed to parse WebSocket message:", event.data, e);
        }
    };

    return () => {
      if (webSocketRef.current) {
        console.log("Closing WebSocket connection on cleanup...");
        webSocketRef.current.close(1000, "Component unmounting or dependencies changed");
        webSocketRef.current = null;
      }
    };
  }, [currentUserId, authToken, dispatch]);

  // --- Решта коду контейнера ---
  const handleSelectChat = useCallback((partnerId) => {
    dispatch(setSelectedChat(partnerId));
  }, [dispatch]);

  const sendMessageClick = useCallback(
    (messageText) => {
      if (selectedChatPartnerId !== null && messageText.trim()) {
        dispatch(sendMessage({
          receiverID: selectedChatPartnerId,
          message: messageText
        }));
      } else {
        console.warn("Cannot send message: No chat selected or message is empty.");
      }
    },
    [dispatch, selectedChatPartnerId]
  );

  const filteredMessages = (currentUserId !== null && messages.length > 0)
    ? messages.filter(msg => {
        const partnerIdNum = (selectedChatPartnerId !== null && selectedChatPartnerId !== undefined) ? parseInt(selectedChatPartnerId, 10) : null;
        if (partnerIdNum === null || isNaN(partnerIdNum)) return false;
        return (msg.senderID === partnerIdNum && msg.receiverID === currentUserId) ||
               (msg.receiverID === partnerIdNum && msg.senderID === currentUserId);
      })
    : [];

  // Умовний рендеринг
  if (profileLoading) { return <div>Завантаження даних користувача...</div>; }
  if (profileError && !currentUserId) { return <div>Помилка завантаження профілю: {profileError}. Будь ласка, спробуйте увійти.</div>; }
  if (currentUserId === null && !profileLoading) { return <div>Будь ласка, увійдіть в систему для перегляду діалогів.</div>; }

  return (
    <Dialogs
      chats={chats}
      selectedChatPartnerId={selectedChatPartnerId}
      messages={filteredMessages}
      currentUserId={currentUserId}
      sendMessage={sendMessageClick}
      handleSelectChat={handleSelectChat}
      messageStatus={status}
      messageError={error}
      chatsStatus={chatsStatus}
      chatsError={chatsError}
    />
  );
}

export default DialogsContainer;

