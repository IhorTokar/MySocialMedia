// my-app/src/components/Modals/AvatarCropModal/AvatarCropModal.jsx
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import styles from './AvatarCropModal.module.css';
import { FaTimes } from 'react-icons/fa'; // Для кнопки закриття
import getCroppedImg from './cropImage'; // Утиліта для кадрування (створимо її нижче)

const AvatarCropModal = ({ imageSrc, onCropComplete, onCropCancel, aspectRatio = 1 / 1 }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropChange = useCallback((location) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((newZoom) => {
    setZoom(newZoom);
  }, []);

  const onComplete = useCallback((croppedArea, croppedAreaPx) => {
    console.log("[AvatarCropModal] onComplete - croppedArea:", croppedArea, "croppedAreaPixels:", croppedAreaPx);
    setCroppedAreaPixels(croppedAreaPx);
  }, []);

  const handleApplyCrop = async () => {
    if (!croppedAreaPixels || !imageSrc) {
      console.error("[AvatarCropModal] Немає даних для кадрування.");
      return;
    }
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      // Перетворюємо Blob на File для зручності передачі
      const croppedImageFile = new File([croppedImageBlob], "cropped_avatar.png", { type: croppedImageBlob.type });
      onCropComplete(croppedImageFile, URL.createObjectURL(croppedImageBlob)); // Передаємо файл та URL для прев'ю
    } catch (e) {
      console.error("[AvatarCropModal] Помилка при кадруванні зображення:", e);
      onCropCancel(); // Закриваємо модалку в разі помилки
    }
  };

  if (!imageSrc) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={onCropCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onCropCancel} aria-label="Скасувати кадрування">
          <FaTimes />
        </button>
        <h3 className={styles.modalTitle}>Кадрувати аватар</h3>
        <div className={styles.cropperContainer}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio} // 1/1 для квадратного аватара
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onComplete}
            cropShape="round" // Робимо область кадрування круглою
            showGrid={false}  // Можна вимкнути сітку
          />
        </div>
        <div className={styles.controls}>
          <label htmlFor="zoomSlider" className={styles.zoomLabel}>Масштаб:</label>
          <input
            type="range"
            id="zoomSlider"
            value={zoom}
            min={1}
            max={3}
            step={0.05}
            aria-labelledby="zoom-label"
            onChange={(e) => onZoomChange(parseFloat(e.target.value))}
            className={styles.zoomSlider}
          />
        </div>
        <div className={styles.actionButtons}>
          <button onClick={onCropCancel} className={`${styles.formButton} ${styles.cancelButton}`}>
            Скасувати
          </button>
          <button onClick={handleApplyCrop} className={`${styles.formButton} ${styles.applyButton}`}>
            Застосувати
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarCropModal;