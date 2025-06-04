// my-app/src/redux/dialogsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const initialState = {
  chats: [],
  selectedChatPartnerId: null,
  messages: [],
  status: 'idle', // для messages: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,    // для messages
  chatsStatus: 'idle', // для chats
  chatsError: null,    // для chats
  sendMessageStatus: 'idle',
  sendMessageError: null,
  deleteMessageStatus: 'idle',
  deleteMessageError: null,
  updateMessageStatus: 'idle', // Для редагування повідомлення
  updateMessageError: null,
};

// --- Async Thunks ---
export const fetchChats = createAsyncThunk(
  'dialogs/fetchChats',
  async (_, { getState, rejectWithValue }) => {
    const timestamp = new Date().toISOString();
    // console.log(`[dialogsSlice][${timestamp}] Fetching chats...`);
    try {
      const token = getState().auth.token;
      if (!token) return rejectWithValue('Not authenticated');
      const response = await axios.get(`${API_BASE_URL}/messages/chats`, { withCredentials: true });
      // console.log(`[dialogsSlice][${timestamp}] Chats fetched:`, response.data);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Failed to fetch chats';
      console.error(`[dialogsSlice][${timestamp}] Error fetching chats:`, message);
      return rejectWithValue(message);
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'dialogs/fetchMessages',
  async (partnerId, { getState, rejectWithValue }) => {
    const timestamp = new Date().toISOString();
    // console.log(`[dialogsSlice][${timestamp}] Fetching messages for partner ID: ${partnerId}`);
    if (!partnerId) return rejectWithValue('Partner ID is required to fetch messages');
    try {
      const token = getState().auth.token;
      if (!token) return rejectWithValue('Not authenticated');
      const response = await axios.get(`${API_BASE_URL}/messages`, {
        params: { partnerId },
        withCredentials: true,
      });
      // console.log(`[dialogsSlice][${timestamp}] Messages for partner ${partnerId} fetched:`, response.data);
      return { messages: response.data || [], partnerId };
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Failed to fetch messages';
      console.error(`[dialogsSlice][${timestamp}] Error fetching messages for partner ${partnerId}:`, message);
      return rejectWithValue(message);
    }
  }
);

export const sendMessage = createAsyncThunk(
  'dialogs/sendMessage',
  async ({ receiverID, message, messageFilename, currentUserId }, { getState, rejectWithValue }) => {
    const timestamp = new Date().toISOString();
    // console.log(`[dialogsSlice][${timestamp}] Attempting to send message. Receiver: ${receiverID}, Text: "${message}", File: ${messageFilename}`);
    try {
      const token = getState().auth.token;
      if (!token) return rejectWithValue('Not authenticated');
      const payload = {
        receiverID,
        message: message || '',
        messageFilename: messageFilename || null
      };
      const response = await axios.post(`${API_BASE_URL}/messages`, payload, {
        withCredentials: true
      });
      // console.log(`[dialogsSlice][${timestamp}] Message sent successfully:`, response.data);
      // Повертаємо currentUserId разом з відповіддю для використання в fulfilled
      return { ...response.data, currentUserIdForUpdate: currentUserId };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send message';
      console.error(`[dialogsSlice][${timestamp}] Error sending message:`, errorMessage, error.response);
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteMessageById = createAsyncThunk(
  'dialogs/deleteMessageById',
  async ({ messageID, partnerId }, { getState, rejectWithValue }) => {
    const timestamp = new Date().toISOString();
    // console.log(`[dialogsSlice][${timestamp}] Attempting to delete message ID: ${messageID} from chat with partner: ${partnerId}`);
    try {
      const token = getState().auth.token;
      if (!token) {
        return rejectWithValue({ message: 'Not authenticated', messageID });
      }
      await axios.delete(`${API_BASE_URL}/messages/${messageID}`, {
        withCredentials: true,
      });
      // console.log(`[dialogsSlice][${timestamp}] Message ID ${messageID} deleted successfully on backend.`);
      return { messageID, partnerId };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete message';
      console.error(`[dialogsSlice][${timestamp}] Error deleting message ID ${messageID}:`, errorMessage, error.response);
      return rejectWithValue({ message: errorMessage, messageID, originalError: error.response?.data });
    }
  }
);

export const updateMessageById = createAsyncThunk(
  'dialogs/updateMessageById',
  async ({ messageID, newText, messageFilenameAction, partnerId }, { getState, rejectWithValue }) => {
    // messageFilenameAction: undefined (не чіпати), null (видалити файл на бекенді)
    const timestamp = new Date().toISOString();
    console.log(`[dialogsSlice][${timestamp}] Attempting to update message ID: ${messageID}. New text: "${newText}", Image Action: ${messageFilenameAction}`);
    try {
      const token = getState().auth.token;
      if (!token) {
        return rejectWithValue({ message: 'Not authenticated', messageID });
      }
      
      const payload = {};
      let hasChanges = false;
      if (newText !== undefined) { // Передаємо тільки якщо є зміни
        payload.message = newText;
        hasChanges = true;
      }
      if (messageFilenameAction !== undefined) { // undefined означає, що зображення не чіпалося
        payload.messageFilename = messageFilenameAction; // null для видалення, string для нового (поки не реалізовано нове)
        hasChanges = true;
      }

      if (!hasChanges) {
        console.warn(`[dialogsSlice][${timestamp}] updateMessageById: No actual data to update for message ${messageID}.`);
        // Можна повернути поточне повідомлення або спеціальний об'єкт, щоб не викликати помилку
        // Але краще, щоб компонент не викликав thunk, якщо немає змін.
        // Для запобігання запиту, можна: return { noChanges: true, messageID };
        // Або, якщо бекенд обробляє це нормально, продовжити.
        // Поки що, якщо компонент викликав, значить є намір.
      }

      const response = await axios.put(`${API_BASE_URL}/messages/${messageID}`, payload, {
        headers: { 'Content-Type': 'application/json' }, // Завжди JSON, бо файл не надсилаємо цим ендпоінтом
        withCredentials: true,
      });
      console.log(`[dialogsSlice][${timestamp}] Message ID ${messageID} updated successfully:`, response.data);
      // Повертаємо partnerId для оновлення UI (списку чатів)
      return { updatedMessage: response.data, partnerId };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update message';
      console.error(`[dialogsSlice][${timestamp}] Error updating message ID ${messageID}:`, errorMessage, error.response);
      return rejectWithValue({ message: errorMessage, messageID, originalError: error.response?.data });
    }
  }
);


const dialogsSlice = createSlice({
  name: 'dialogs',
  initialState,
  reducers: {
    setSelectedChat: (state, action) => {
      const newPartnerId = action.payload;
      if (state.selectedChatPartnerId !== newPartnerId) {
        state.selectedChatPartnerId = newPartnerId;
        state.messages = [];
        state.status = 'idle';
        state.error = null;
      }
    },
    receiveMessage: (state, action) => {
      const { newMessageData, currentUserId } = action.payload;
      // console.log("[dialogsSlice] receiveMessage via WebSocket:", newMessageData, "Current User ID:", currentUserId);

      if (!currentUserId) {
        console.warn("[dialogsSlice] receiveMessage: currentUserId is missing in payload.");
        if (state.selectedChatPartnerId === newMessageData.senderID || state.selectedChatPartnerId === newMessageData.receiverID) {
            const existingMessage = state.messages.find(msg => msg.messageID === newMessageData.messageID);
            if (!existingMessage) { state.messages.push(newMessageData); }
        }
        return;
      }

      const partnerIdForChatUpdate = newMessageData.senderID === currentUserId ? newMessageData.receiverID : newMessageData.senderID;

      if (state.selectedChatPartnerId === partnerIdForChatUpdate) {
        const existingMessage = state.messages.find(msg => msg.messageID === newMessageData.messageID);
        if (!existingMessage) { state.messages.push(newMessageData); }
      }
      
      const chatIndex = state.chats.findIndex(chat => chat.partnerId === partnerIdForChatUpdate);
      if (chatIndex !== -1) {
        state.chats[chatIndex].lastMessage = newMessageData.message || (newMessageData.messageFileContentUrl ? '[Зображення]' : '');
        state.chats[chatIndex].lastMessageCreatedAt = newMessageData.send_at;
        const updatedChat = state.chats.splice(chatIndex, 1)[0];
        state.chats.unshift(updatedChat);
      } else {
         console.warn(`[dialogsSlice] Received message for a new chat partner (ID: ${partnerIdForChatUpdate}). Re-fetching chats.`);
         state.chatsStatus = 'idle'; 
      }
    },
    clearDialogState: (state) => {
      state.chats = []; state.selectedChatPartnerId = null; state.messages = [];
      state.status = 'idle'; state.error = null;
      state.chatsStatus = 'idle'; state.chatsError = null;
      state.sendMessageStatus = 'idle'; state.sendMessageError = null;
      state.deleteMessageStatus = 'idle'; state.deleteMessageError = null;
      state.updateMessageStatus = 'idle'; state.updateMessageError = null;
    },
    resetSendMessageStatus: (state) => {
      state.sendMessageStatus = 'idle'; state.sendMessageError = null;
    },
    resetDeleteMessageStatus: (state) => {
      state.deleteMessageStatus = 'idle'; state.deleteMessageError = null;
    },
    resetUpdateMessageStatus: (state) => {
      state.updateMessageStatus = 'idle'; state.updateMessageError = null;
    },
    clearMessages: (state) => {
        state.messages = []; state.status = 'idle'; state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChats.pending, (state) => { state.chatsStatus = 'loading'; state.chatsError = null; })
      .addCase(fetchChats.fulfilled, (state, action) => { state.chatsStatus = 'succeeded'; state.chats = action.payload || []; })
      .addCase(fetchChats.rejected, (state, action) => { state.chatsStatus = 'failed'; state.chatsError = action.payload; })

      .addCase(fetchMessages.pending, (state, action) => {
        if (state.selectedChatPartnerId === action.meta.arg) {
          state.status = 'loading'; state.error = null;
        }
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        if (state.selectedChatPartnerId === action.payload.partnerId) {
          state.status = 'succeeded'; state.messages = action.payload.messages || []; state.error = null;
        }
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        if (state.selectedChatPartnerId === action.meta.arg) {
          state.status = 'failed'; state.error = action.payload; state.messages = [];
        }
      })

      .addCase(sendMessage.pending, (state) => { state.sendMessageStatus = 'loading'; state.sendMessageError = null; })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sendMessageStatus = 'succeeded';
        const newMessage = action.payload;
        const currentUserId = newMessage.currentUserIdForUpdate;

        if (newMessage && (state.selectedChatPartnerId === newMessage.receiverID || state.selectedChatPartnerId === newMessage.senderID)) {
          const existingMessage = state.messages.find(msg => msg.messageID === newMessage.messageID);
          if (!existingMessage) {
            state.messages.push(newMessage);
          }
        }
        if (currentUserId){
            const partnerIdForChatUpdate = newMessage.senderID === currentUserId ? newMessage.receiverID : newMessage.senderID;
            const chatIndex = state.chats.findIndex(chat => chat.partnerId === partnerIdForChatUpdate);
            if (chatIndex !== -1) {
            state.chats[chatIndex].lastMessage = newMessage.message || (newMessage.messageFileContentUrl ? '[Зображення]' : '');
            state.chats[chatIndex].lastMessageCreatedAt = newMessage.send_at;
            const updatedChat = state.chats.splice(chatIndex, 1)[0];
            state.chats.unshift(updatedChat);
            } else {
                state.chatsStatus = 'idle';
            }
        } else {
            console.warn("[dialogsSlice] sendMessage.fulfilled: currentUserId was not available. Chat list might not update for new chats.");
            state.chatsStatus = 'idle';
        }
      })
      .addCase(sendMessage.rejected, (state, action) => { state.sendMessageStatus = 'failed'; state.sendMessageError = action.payload; })
      
      .addCase(deleteMessageById.pending, (state, action) => {
        state.deleteMessageStatus = 'loading';
        state.deleteMessageError = { messageID: action.meta.arg.messageID, message: null };
      })
      .addCase(deleteMessageById.fulfilled, (state, action) => {
        state.deleteMessageStatus = 'succeeded';
        const { messageID, partnerId } = action.payload;
        if (state.selectedChatPartnerId === partnerId) {
          state.messages = state.messages.filter(msg => msg.messageID !== messageID);
        }
        const chatIndex = state.chats.findIndex(chat => chat.partnerId === partnerId);
        if (chatIndex !== -1) {
            if (state.messages.length > 0 && state.selectedChatPartnerId === partnerId) {
                const lastMsgInCurrentChat = state.messages[state.messages.length - 1];
                state.chats[chatIndex].lastMessage = lastMsgInCurrentChat.message || (lastMsgInCurrentChat.messageFileContentUrl ? '[Зображення]' : '');
                state.chats[chatIndex].lastMessageCreatedAt = lastMsgInCurrentChat.send_at;
            } else if (state.selectedChatPartnerId === partnerId && state.messages.length === 0) {
                state.chats[chatIndex].lastMessage = ""; // Якщо немає повідомлень, останнє - порожнє
                state.chats[chatIndex].lastMessageCreatedAt = new Date(0).toISOString(); // Для сортування
                 // Або можна перезавантажити чати, щоб отримати актуальне останнє з БД
                 // state.chatsStatus = 'idle';
            } else {
                 // Якщо це не активний чат, краще перезавантажити для актуалізації lastMessage
                 state.chatsStatus = 'idle'; 
            }
            // Пересортовуємо чати, щоб оновлений чат був нагорі
            const updatedChat = state.chats.splice(chatIndex, 1)[0];
            state.chats.unshift(updatedChat);
        }
        state.deleteMessageError = null;
      })
      .addCase(deleteMessageById.rejected, (state, action) => {
        state.deleteMessageStatus = 'failed';
        state.deleteMessageError = action.payload;
      })

      // updateMessageById
      .addCase(updateMessageById.pending, (state, action) => {
        state.updateMessageStatus = 'loading';
        state.updateMessageError = { messageID: action.meta.arg.messageID, message: null };
      })
      .addCase(updateMessageById.fulfilled, (state, action) => {
        state.updateMessageStatus = 'succeeded';
        const { updatedMessage, partnerId } = action.payload;
        if (updatedMessage && state.selectedChatPartnerId === partnerId) {
          const index = state.messages.findIndex(msg => msg.messageID === updatedMessage.messageID);
          if (index !== -1) {
            state.messages[index] = updatedMessage;
          }
        }
        const chatIndex = state.chats.findIndex(chat => chat.partnerId === partnerId);
        if (chatIndex !== -1) {
            // Перевіряємо, чи оновлене повідомлення є останнім в чаті
            let isLast = false;
            if (state.selectedChatPartnerId === partnerId && state.messages.length > 0) {
                // Сортуємо повідомлення чату за датою, щоб знайти останнє
                const sortedMessages = [...state.messages].sort((a, b) => new Date(b.send_at).getTime() - new Date(a.send_at).getTime());
                if (sortedMessages.length > 0 && sortedMessages[0].messageID === updatedMessage.messageID) {
                    isLast = true;
                }
            } else {
                // Якщо це не активний чат, або він порожній
                if (new Date(updatedMessage.send_at) >= new Date(state.chats[chatIndex].lastMessageCreatedAt)) {
                    isLast = true;
                }
            }

            if(isLast) {
                state.chats[chatIndex].lastMessage = updatedMessage.message || (updatedMessage.messageFileContentUrl ? '[Зображення]' : '');
                state.chats[chatIndex].lastMessageCreatedAt = updatedMessage.send_at;
                const currentChat = state.chats.splice(chatIndex, 1)[0];
                state.chats.unshift(currentChat);
            }
        }
        state.updateMessageError = null;
      })
      .addCase(updateMessageById.rejected, (state, action) => {
        state.updateMessageStatus = 'failed';
        state.updateMessageError = action.payload;
      });
  },
});

export const {
  setSelectedChat, receiveMessage, clearDialogState,
  resetSendMessageStatus, resetDeleteMessageStatus, clearMessages,
  resetUpdateMessageStatus // Додано експорт
} = dialogsSlice.actions;

export default dialogsSlice.reducer;