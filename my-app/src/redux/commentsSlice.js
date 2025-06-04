// my-app/src/redux/commentsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
// Імпортуємо action з postsSlice для оновлення поста (лічильника коментарів)
// Переконайся, що цей action створений та експортований в postsSlice.js!
import { updatePostInFeeds } from './postsSlice';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const initialState = {
  commentsByPostId: {}, // Об'єкт, де ключ - postId, значення - { items: [], status: 'idle', error: null }
  addCommentStatus: 'idle',
  addCommentError: null,
  deleteCommentStatus: 'idle', // Статус для операції видалення
  deleteCommentError: null,   // Помилка для операції видалення (об'єкт { postId, commentId, error })
};

// Thunk для завантаження коментарів до конкретного поста
export const fetchComments = createAsyncThunk(
  'comments/fetchComments',
  async (postId, { getState, rejectWithValue }) => {
    if (!postId) return rejectWithValue('Post ID is required');
    try {
      const response = await axios.get(`${API_BASE_URL}/posts/${postId}/comments`);
      return { postId, comments: response.data };
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Failed to fetch comments';
      return rejectWithValue({ postId, error: message });
    }
  }
);

// Thunk для додавання нового коментаря
export const addComment = createAsyncThunk(
  'comments/addComment',
  async ({ postId, text, parentCommentId }, { getState, dispatch, rejectWithValue }) => {
    if (!postId || !text || text.trim() === '') {
      return rejectWithValue({ error: 'Post ID and comment text are required', parentCommentId });
    }
    try {
      const token = getState().auth.token;
      if (!token) return rejectWithValue({ error: 'User not authenticated to add comment', parentCommentId });

      const body = { text: text.trim() };
      if (parentCommentId !== undefined && parentCommentId !== null) {
        body.parentCommentId = parentCommentId;
      }

      const response = await axios.post(`${API_BASE_URL}/posts/${postId}/comments`, body, {
        withCredentials: true,
      });
      // Якщо бекенд повертає оновлений пост (з новим лічильником коментарів)
      // після додавання коментаря, можна його тут обробити.
      // Наприклад, якщо response.data.updatedPost існує:
      // if (response.data.updatedPost) {
      //   dispatch(updatePostInFeeds(response.data.updatedPost));
      // }
      return response.data; // Очікуємо повний об'єкт коментаря
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Failed to add comment';
      return rejectWithValue({ postId, error: message, parentCommentId });
    }
  }
);

// Thunk для видалення коментаря
export const deleteComment = createAsyncThunk(
  'comments/deleteComment',
  async ({ postId, commentId }, { getState, dispatch, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      if (!token) return rejectWithValue({ error: 'User not authenticated to delete comment' });

      const response = await axios.delete(`${API_BASE_URL}/posts/${postId}/comments/${commentId}`, {
        withCredentials: true,
      });
      // Очікуємо, що бекенд поверне { message, deletedCommentsCount, updatedPost }
      if (response.data.updatedPost) {
        // Диспатчимо оновлення поста в postsSlice (оновлення лічильника коментарів)
        dispatch(updatePostInFeeds(response.data.updatedPost));
      }
      return { postId, commentId, deletedCommentsCount: response.data.deletedCommentsCount };
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Failed to delete comment';
      return rejectWithValue({ postId, commentId, error: message });
    }
  }
);

const commentsSlice = createSlice({
  name: 'comments',
  initialState,
  reducers: {
    clearAddCommentStatus: (state) => {
      state.addCommentStatus = 'idle';
      state.addCommentError = null;
    },
    clearCommentsForPost: (state, action) => {
      const postId = action.payload;
      if (state.commentsByPostId[postId]) {
        delete state.commentsByPostId[postId];
      }
    },
    resetDeleteCommentStatus: (state) => {
      state.deleteCommentStatus = 'idle';
      state.deleteCommentError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchComments
      .addCase(fetchComments.pending, (state, action) => {
        const postId = action.meta.arg;
        state.commentsByPostId[postId] = {
          ...(state.commentsByPostId[postId] || { items: [] }),
          status: 'loading',
          error: null,
        };
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        const { postId, comments } = action.payload;
        state.commentsByPostId[postId] = {
          items: comments,
          status: 'succeeded',
          error: null,
        };
      })
      .addCase(fetchComments.rejected, (state, action) => {
        const postId = action.meta.arg;
        state.commentsByPostId[postId] = {
          ...(state.commentsByPostId[postId] || { items: [] }),
          status: 'failed',
          error: action.payload.error,
        };
      })
      // addComment
      .addCase(addComment.pending, (state) => {
        state.addCommentStatus = 'loading';
        state.addCommentError = null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.addCommentStatus = 'succeeded';
        const newComment = action.payload;
        const postId = newComment.post_id;
        if (!state.commentsByPostId[postId]) {
          state.commentsByPostId[postId] = { items: [], status: 'idle', error: null };
        }
        // Додаємо новий коментар або відповідь у правильне місце
        if (newComment.parent_comment_id) {
            // Якщо це відповідь, додаємо її до списку.
            // Для правильного відображення вкладеності, компонент CommentItem сам знайде своїх дітей.
            state.commentsByPostId[postId].items.push(newComment);
        } else {
            // Якщо це коментар верхнього рівня, додаємо його в кінець.
            state.commentsByPostId[postId].items.push(newComment);
        }
        // Оновлення лічильника коментарів тепер відбувається через dispatch(updatePostInFeeds)
        // яке має бути викликане з thunk `addComment`, якщо бекенд повертає оновлений пост.
        // Або, якщо `addComment` повертає `updatedPost` напряму, це вже оброблено в thunk.
      })
      .addCase(addComment.rejected, (state, action) => {
        state.addCommentStatus = 'failed';
        // Зберігаємо parentCommentId, якщо помилка стосується відповіді
        state.addCommentError = {
            message: action.payload.error,
            parentCommentId: action.payload.parentCommentId
        };
      })
      // deleteComment
      .addCase(deleteComment.pending, (state, action) => {
        state.deleteCommentStatus = 'loading';
        // Зберігаємо ID коментаря, для якого йде видалення, щоб UI міг реагувати
        state.deleteCommentError = { postId: action.meta.arg.postId, commentId: action.meta.arg.commentId, error: null };
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.deleteCommentStatus = 'succeeded';
        const { postId, commentId } = action.payload; // deletedCommentsCount тут не використовується для зміни стану, бо лічильник оновлюється через postsSlice
        if (state.commentsByPostId[postId]) {
          const items = state.commentsByPostId[postId].items;
          // Функція для рекурсивного отримання ID всіх дочірніх коментарів
          const getChildrenIds = (cId, allItems) => {
              let ids = [];
              const directChildren = allItems.filter(item => item.parent_comment_id === cId);
              for (const child of directChildren) {
                  ids.push(child.comment_id);
                  ids = ids.concat(getChildrenIds(child.comment_id, allItems));
              }
              return ids;
          };
          const allIdsToDelete = [commentId, ...getChildrenIds(commentId, items)];
          state.commentsByPostId[postId].items = items.filter(comment => !allIdsToDelete.includes(comment.comment_id));
        }
        state.deleteCommentError = null; // Скидаємо помилку при успіху
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.deleteCommentStatus = 'failed';
        state.deleteCommentError = action.payload; // payload: { postId, commentId, error }
      });
  },
});

export const { clearAddCommentStatus, clearCommentsForPost, resetDeleteCommentStatus } = commentsSlice.actions;
export default commentsSlice.reducer;