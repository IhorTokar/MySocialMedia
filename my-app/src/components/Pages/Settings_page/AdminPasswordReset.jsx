import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { adminResetUserPassword, resetAdminPasswordResetStatus } from '../../../redux/AuthSlice';
import s from './Settings_page.module.css'; // Використовуємо існуючі стилі для форми

// Компонент AdminPasswordReset тепер приймає проп adminUserToResetId
const AdminPasswordReset = ({ adminUserToResetId }) => {
  const dispatch = useDispatch();
  const { adminPasswordResetStatus, adminPasswordResetError } = useSelector((state) => state.auth);

  // Ініціалізуємо стан userIdToReset з пропу adminUserToResetId
  const [userIdToReset, setUserIdToReset] = useState(adminUserToResetId || '');
  const [newPassword, setNewPassword] = useState('');

  // Оновлюємо userIdToReset та скидаємо форму/статус, якщо проп adminUserToResetId змінюється
  useEffect(() => {
    if (adminUserToResetId) {
      setUserIdToReset(String(adminUserToResetId)); // Переконаємось, що це рядок
      setNewPassword(''); // Очищаємо поле нового пароля
      dispatch(resetAdminPasswordResetStatus()); // Скидаємо статус операції при зміні ID
    } else {
      // Якщо adminUserToResetId став null/undefined (наприклад, після видалення користувача або очищення пошуку)
      setUserIdToReset(''); // Очищаємо поле ID
      setNewPassword(''); // Очищаємо поле нового пароля
      dispatch(resetAdminPasswordResetStatus()); // Скидаємо статус
    }
  }, [adminUserToResetId, dispatch]); // Додав dispatch як залежність

  // Очищаємо статус після успіху/помилки, коли компонент розмонтовується
  useEffect(() => {
    return () => {
      dispatch(resetAdminPasswordResetStatus());
    };
  }, [dispatch]);

  // Обробник відправки форми скидання пароля адміном
  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(resetAdminPasswordResetStatus()); // Скидаємо попередні стани
    
    if (!userIdToReset.trim() || !newPassword) {
      alert('Будь ласка, введіть ID користувача та новий пароль.'); // Використовуйте кращий спосіб сповіщень
      return;
    }
    if (newPassword.length < 8) {
      alert('Новий пароль повинен бути щонайменше 8 символів.'); // Використовуйте кращий спосіб сповіщень
      return;
    }

    const resultAction = await dispatch(adminResetUserPassword({ 
      userId: parseInt(userIdToReset), // Перетворюємо ID на число
      newPassword: newPassword 
    }));

    if (adminResetUserPassword.fulfilled.match(resultAction)) {
        setUserIdToReset(''); // Очищаємо форму після успіху
        setNewPassword('');
        alert('Пароль користувача успішно скинуто!');
    } else if (adminResetUserPassword.rejected.match(resultAction)) {
        const errorMsg = typeof resultAction.payload === 'string' ? resultAction.payload : (resultAction.payload?.message || 'Спробуйте ще раз.');
        alert(`Помилка скидання пароля: ${errorMsg}`);
    }
  };

  // Визначаємо, чи поле ID має бути readOnly
  const isUserIdReadOnly = !!adminUserToResetId; // Буде true, якщо ID передано з пропса

  return (
    // Цей div залишився для логічного групування полів форми та їх стилізації
    // Зовнішні стилі (рамка, відступи) тепер будуть надаватися батьківським компонентом
    <div style={{ borderBottom: '1px solid var(--card-border-color, #E0E0E0)', paddingBottom: '20px', marginBottom: '20px' }}>
        <h3>Змінити пароль користувача (Адмін)</h3>
        <form onSubmit={handleSubmit} className={s.settingsForm}>
          <div className={s.formGroup}>
            <label htmlFor="adminResetUserId">ID користувача:</label>
            <input
              type="number" // Тип number для ID
              id="adminResetUserId"
              name="userId"
              placeholder="Введіть User ID"
              value={userIdToReset}
              onChange={(e) => setUserIdToReset(e.target.value)}
              className={`${s.formInput} ${isUserIdReadOnly ? s.readOnlyInput : ''}`} // Додаємо клас для стилізації readOnly
              required
              readOnly={isUserIdReadOnly} // Встановлюємо readOnly атрибут
            />
          </div>
          <div className={s.formGroup}>
            <label htmlFor="adminResetNewPassword">Новий пароль:</label>
            <input
              type="password"
              id="adminResetNewPassword"
              name="newPassword"
              placeholder="Введіть новий пароль"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={s.formInput}
              required
              minLength={8}
            />
          </div>
          <button type="submit" className={s.submitButtonSmall} disabled={adminPasswordResetStatus === 'loading'}>
            {adminPasswordResetStatus === 'loading' ? 'Скидання...' : 'Скинути пароль'}
          </button>
          {adminPasswordResetStatus === 'succeeded' && (
            <p className={s.successStatus}>Пароль успішно скинуто!</p>
          )}
          {adminPasswordResetStatus === 'failed' && adminPasswordResetError && (
            <p className={s.errorStatus}>
              Помилка: {typeof adminPasswordResetError === 'string' ? adminPasswordResetError : (adminPasswordResetError?.message || 'Не вдалося скинути пароль адміністратором.')}
            </p>
          )}
        </form>
    </div>
  );
};

export default AdminPasswordReset;