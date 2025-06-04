// my-app/src/components/Modals/EditPostModal/EditPostModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { closeEditPostModal } from '../../../redux/uiSlice';
import { updatePostById, resetUpdatePostStatus } from '../../../redux/postsSlice';
import styles from './EditPostModal.module.css';
import { FaTimes } from 'react-icons/fa';
import { postImgUrl } from '../../../utils/ImagesLoadUtil';

const EditPostModal = () => {
  const dispatch = useDispatch();
  const { isEditPostModalOpen, editingPostData } = useSelector((state) => state.ui);
  const { updatePostStatus, updatePostError } = useSelector((state) => state.posts);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [newImageFile, setNewImageFile] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (editingPostData) {
      setTitle(editingPostData.title || ''); // editingPostData.title має бути актуальним заголовком
      setContent(editingPostData.content || ''); // editingPostData.content має бути актуальним текстом
      setCurrentImageUrl(editingPostData.contentImgURL ? postImgUrl(editingPostData.contentImgURL) : null);
      setNewImageFile(null);
      setNewImagePreview(null);
    } else {
      setTitle('');
      setContent('');
      setCurrentImageUrl(null);
      setNewImageFile(null);
      setNewImagePreview(null);
    }
    if (isEditPostModalOpen) {
        dispatch(resetUpdatePostStatus());
    }
  }, [editingPostData, isEditPostModalOpen, dispatch]);

  const handleClose = () => {
    dispatch(closeEditPostModal());
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
         alert("Файл занадто великий. Максимальний розмір 5MB.");
         if(fileInputRef.current) fileInputRef.current.value = "";
         setNewImageFile(null);
         setNewImagePreview(null);
         return;
      }
      setNewImageFile(file);
      setNewImagePreview(URL.createObjectURL(file));
    } else {
      setNewImageFile(null);
      setNewImagePreview(null);
    }
  };

  const handleRemoveNewImage = () => {
    setNewImageFile(null);
    setNewImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const handleDeleteCurrentImage = () => {
      if (window.confirm("Ви впевнені, що хочете видалити поточне зображення поста?")) {
          setNewImageFile(null); 
          setNewImagePreview('DELETE_IMAGE'); 
          setCurrentImageUrl(null); 
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingPostData || !editingPostData.postId) return;

    const originalTitle = editingPostData.title || '';
    const originalContent = editingPostData.content || '';

    const hasTitleChanged = title !== originalTitle;
    const hasContentChanged = content !== originalContent;
    const hasImageChanged = newImageFile || newImagePreview === 'DELETE_IMAGE';

    if (!hasTitleChanged && !hasContentChanged && !hasImageChanged) {
        alert("Змін не виявлено.");
        return;
    }
    
    if (updatePostStatus === 'loading') return;
    dispatch(resetUpdatePostStatus());

    const updatePayload = {};
    if (hasTitleChanged) updatePayload.title = title;
    if (hasContentChanged) updatePayload.content = content;
    
    // Якщо видаляємо зображення, але не завантажуємо нове, 
    // newImageFile буде null, а deleteCurrentImage буде true.
    // Якщо завантажуємо нове, newImageFile буде File, deleteCurrentImage буде false (або неважливо).
    // Якщо нічого не робимо з зображенням, newImageFile буде null, deleteCurrentImage буде false.

    const resultAction = await dispatch(updatePostById({
      postId: editingPostData.postId,
      updateData: updatePayload, 
      newImageFile: newImageFile, 
      deleteCurrentImage: newImagePreview === 'DELETE_IMAGE'
    }));

    if (updatePostById.fulfilled.match(resultAction)) {
      handleClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };
    if (isEditPostModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isEditPostModalOpen, handleClose]); // Додано handleClose до залежностей

  if (!isEditPostModalOpen || !editingPostData) {
    return null;
  }

  // Виправляємо логіку canSubmit
  const canSubmit = (title.trim() !== '' || content.trim() !== '' || newImageFile || newImagePreview === 'DELETE_IMAGE');

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={handleClose} aria-label="Закрити редагування">
          <FaTimes />
        </button>
        <h2 className={styles.modalTitle}>Редагувати допис</h2>
        <form onSubmit={handleSubmit} className={styles.editForm}>
          <div className={styles.formGroup}>
            <label htmlFor="editPostTitle">Заголовок:</label>
            <input
              type="text"
              id="editPostTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="editPostContent">Текст допису:</label>
            <textarea
              id="editPostContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows="8"
              className={styles.formTextarea}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Зображення поста:</label>
            {(newImagePreview && newImagePreview !== 'DELETE_IMAGE') ? (
              <div className={styles.imagePreviewContainer}>
                <img src={newImagePreview} alt="Нове зображення (передперегляд)" className={styles.imagePreviewItem} />
                <button type="button" onClick={handleRemoveNewImage} className={styles.removeImageButtonModal} aria-label="Прибрати нове зображення">&times;</button>
              </div>
            ) : currentImageUrl ? (
              <div className={styles.imagePreviewContainer}>
                <img src={currentImageUrl} alt="Поточне зображення" className={styles.imagePreviewItem} />
                <button type="button" onClick={handleDeleteCurrentImage} className={styles.removeImageButtonModal} aria-label="Видалити поточне зображення">&times;</button>
              </div>
            ) : (
                 newImagePreview === 'DELETE_IMAGE' ? <p className={styles.imageRemovedInfo}>Поточне зображення буде видалено.</p> : <p>Немає зображення.</p>
            )}
            <input
              type="file"
              accept="image/png, image/jpeg, image/gif, image/webp"
              ref={fileInputRef}
              onChange={handleFileChange}
              className={styles.hiddenFileInput}
              id="editPostImageInput"
            />
            <label htmlFor="editPostImageInput" className={styles.uploadImageButton}>
              {currentImageUrl || (newImagePreview && newImagePreview !== 'DELETE_IMAGE') ? 'Змінити зображення' : 'Додати зображення'}
            </label>
          </div>

          {updatePostStatus === 'failed' && updatePostError && (
            <p className={styles.errorMessage}>
              Помилка оновлення: {typeof updatePostError === 'string' ? updatePostError : (typeof updatePostError === 'object' && updatePostError !== null && updatePostError.message) || 'Невідома помилка'}
            </p>
          )}

          <div className={styles.formActions}>
            <button type="button" onClick={handleClose} className={`${styles.formButton} ${styles.cancelButton}`}>
              Скасувати
            </button>
            <button type="submit" className={`${styles.formButton} ${styles.saveButton}`} disabled={updatePostStatus === 'loading' || !canSubmit}>
              {updatePostStatus === 'loading' ? 'Збереження...' : 'Зберегти зміни'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPostModal;