import React, { useState, useEffect } from 'react';
import styles from './DeleteConfirmModal.module.css';
// LoadingSpinner import removed as requested

/**
 * Модальне вікно для підтвердження видалення акаунту.
 * Вимагає від користувача введення пароля для підтвердження.
 *
 * @param {boolean} isOpen - Чи відкрите модальне вікно.
 * @param {function} onClose - Функція, що викликається при закритті модального вікна.
 * @param {function} onConfirm - Функція, що викликається при підтвердженні видалення (передає пароль).
 * @param {boolean} loading - Вказує, чи триває операція видалення.
 * @param {string|null} error - Повідомлення про помилку, якщо така є.
 */
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, loading, error }) => {
  const [password, setPassword] = useState('');

  // Скидаємо поле пароля при кожному відкритті модального вікна
  // або якщо операція видалення більше не в стані 'loading'.
  useEffect(() => {
    if (isOpen && !loading) {
      setPassword('');
    }
  }, [isOpen, loading]);

  // Якщо модальне вікно не відкрите, нічого не рендеримо
  if (!isOpen) return null;

  // Обробник подачі форми (підтвердження видалення)
  const handleSubmit = () => {
    if (password.trim()) {
      onConfirm(password); // Викликаємо функцію підтвердження з паролем
    } else {
      // Якщо пароль не введено, попереджаємо користувача
      alert("Будь ласка, введіть пароль.");
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Підтвердити видалення акаунту</h2>
        <p>Будь ласка, введіть ваш пароль, щоб підтвердити видалення акаунту. Цю дію неможливо скасувати.</p>
        <input
          type="password"
          placeholder="Ваш пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.modalInput}
          disabled={loading} // Вимикаємо поле вводу під час завантаження
        />
        {/* Відображення помилки, якщо вона передана */}
        {error && <p className={styles.errorMessage}>{error}</p>}
        <div className={styles.modalActions}>
          <button 
            onClick={onClose} 
            disabled={loading} 
            className={styles.cancelButton}
          >
            Скасувати
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={loading || !password.trim()} // Вимикаємо кнопку, якщо завантаження або пароль порожній
            className={styles.deleteButton}
          >
            {loading ? "Видалення..." : "Видалити акаунт"} {/* Replaced LoadingSpinner with static text */}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;