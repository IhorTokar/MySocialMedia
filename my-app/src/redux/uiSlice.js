// my-app/src/redux/uiSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isPostModalOpen: false,
  modalPostData: null,
  isEditPostModalOpen: false,
  editingPostData: null,
  // --- ДОДАНО ПОЛЯ для модального вікна перегляду зображення ---
  isImageModalOpen: false,
  imageModalUrl: null,
  imageModalAlt: '',
  // ------------------------------------------------------
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openPostModal: (state, action) => {
      state.isPostModalOpen = true;
      state.modalPostData = action.payload;
      state.isEditPostModalOpen = false;
      state.editingPostData = null;
      state.isImageModalOpen = false; // Закриваємо інші модалки
      state.imageModalUrl = null;
    },
    closePostModal: (state) => {
      state.isPostModalOpen = false;
      state.modalPostData = null;
    },
    openEditPostModal: (state, action) => {
      state.isEditPostModalOpen = true;
      state.editingPostData = action.payload;
      state.isPostModalOpen = false;
      state.modalPostData = null;
      state.isImageModalOpen = false; // Закриваємо інші модалки
      state.imageModalUrl = null;
    },
    closeEditPostModal: (state) => {
      state.isEditPostModalOpen = false;
      state.editingPostData = null;
    },
    // --- ДОДАНО РЕДЬЮСЕРИ для модального вікна перегляду зображення ---
    openImageModal: (state, action) => {
      // Закриваємо інші модалки
      state.isPostModalOpen = false;
      state.modalPostData = null;
      state.isEditPostModalOpen = false;
      state.editingPostData = null;

      state.isImageModalOpen = true;
      state.imageModalUrl = action.payload.url;
      state.imageModalAlt = action.payload.alt || 'Зображення';
    },
    closeImageModal: (state) => {
      state.isImageModalOpen = false;
      state.imageModalUrl = null;
      state.imageModalAlt = '';
    },
    // ---------------------------------------------------------------
  },
});

export const {
  openPostModal,
  closePostModal,
  openEditPostModal,
  closeEditPostModal,
  openImageModal,  // <--- ДОДАНО ДО ЕКСПОРТУ
  closeImageModal, // <--- ДОДАНО ДО ЕКСПОРТУ
} = uiSlice.actions;

export default uiSlice.reducer;