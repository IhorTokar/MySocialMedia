// my-app/src/components/Modals/ImageModal/ImageModal.jsx
import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { closeImageModal } from '../../../redux/uiSlice';
import styles from './ImageModal.module.css';
import { FaTimes, FaSearchPlus, FaSearchMinus, FaUndo } from 'react-icons/fa'; // Додаємо іконки для зуму
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch"; // Імпортуємо компоненти бібліотеки

// Компонент для кнопок керування зумом
const Controls = () => {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className={styles.zoomControls}>
      <button onClick={() => zoomIn()} className={styles.controlButton} aria-label="Збільшити">
        <FaSearchPlus />
      </button>
      <button onClick={() => zoomOut()} className={styles.controlButton} aria-label="Зменшити">
        <FaSearchMinus />
      </button>
      <button onClick={() => resetTransform()} className={styles.controlButton} aria-label="Скинути масштабування">
        <FaUndo />
      </button>
    </div>
  );
};

const ImageModal = () => {
  const dispatch = useDispatch();
  const { isImageModalOpen, imageModalUrl, imageModalAlt } = useSelector((state) => state.ui);

  const handleClose = useCallback(() => {
    dispatch(closeImageModal());
  }, [dispatch]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (isImageModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isImageModalOpen, handleClose]);


  if (!isImageModalOpen || !imageModalUrl) {
    return null;
  }

  return (
    <div className={styles.imageModalOverlay} onClick={handleClose} role="dialog" aria-modal="true">
      {/* Зупиняємо спливання, щоб клік по зображенню/контролам не закривав модалку */}
      <div className={styles.imageModalContentWrapper} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={handleClose} aria-label="Закрити зображення">
          <FaTimes />
        </button>
        
        <TransformWrapper
          initialScale={1}
          minScale={0.5} // Мінімальний зум
          maxScale={5}   // Максимальний зум
          limitToBounds={true} // Не дозволяти виходити за межі зображення при панорамуванні
          doubleClick={{ disabled: false, step: 1 }} // Зум по подвійному кліку (крок 1 = x2 зум)
          wheel={{ step: 0.2 }} // Чутливість зуму колесом
          pinch={{ step: 0.5 }} // Чутливість зуму жестом
        >
          {/* Передаємо Controls як функцію, щоб вона мала доступ до контексту TransformWrapper */}
          {() => (
            <>
              <Controls /> {/* Кнопки керування */}
              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%" }}
                contentStyle={{ width: "100%", height: "100%", display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <img src={imageModalUrl} alt={imageModalAlt} className={styles.fullImage} />
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
};

export default ImageModal;