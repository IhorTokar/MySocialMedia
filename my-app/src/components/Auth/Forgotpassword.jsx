import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import s from './Auth.module.css';

// Глобальна змінна для імітації тимчасового сховища
// У реальному застосунку це повинен бути серверний кеш (наприклад, Redis)
const verificationCodes = new Map();

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState('requestEmail'); // 'requestEmail', 'verifyCode', 'resetPassword', 'success'
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Функція для генерації випадкового 6-значного коду
  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Функція для імітації надсилання email
  // У реальному застосунку, тут був би виклик до вашого бекенд-сервісу,
  // який би надсилав справжній email за допомогою SMTP або стороннього сервісу (SendGrid, Mailgun тощо).
  const simulateSendEmail = (recipientEmail, verificationCode) => {
    return new Promise(resolve => {
      setTimeout(() => {
        console.log(`Імітація надсилання email на ${recipientEmail} з кодом: ${verificationCode}`);
        console.log(`Текст листа: Ваш код підтвердження: ${verificationCode}. Цей код дійсний протягом 5 хвилин.`);
        resolve();
      }, 1500); // Імітуємо затримку мережевого запиту
    });
  };

  // Крок 1: Запит коду
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email) {
      setError('Будь ласка, введіть вашу електронну пошту.');
      return;
    }
    setIsLoading(true);
    try {
      const generatedCode = generateCode();
      // Імітація тимчасового зберігання коду на 5 хвилин
      const expiryTime = Date.now() + 5 * 60 * 1000; // 5 хвилин у мілісекундах
      verificationCodes.set(email, { code: generatedCode, expiry: expiryTime });
      
      await simulateSendEmail(email, generatedCode); // Виклик імітованої функції надсилання

      setMessage('Код підтвердження відправлено на вашу пошту. Перевірте папку "Вхідні" або "Спам".');
      setStep('verifyCode');
    } catch (err) {
      console.error("Помилка при запиті коду:", err);
      setError('Не вдалося надіслати код. Спробуйте ще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  // Крок 2: Перевірка коду
  const handleVerifyCode = (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!code) {
      setError('Будь ласка, введіть код підтвердження.');
      return;
    }
    setIsLoading(true);
    try {
      const storedData = verificationCodes.get(email);
      if (storedData && storedData.code === code && Date.now() < storedData.expiry) {
        setMessage('Код підтверджено. Тепер ви можете встановити новий пароль.');
        setStep('resetPassword');
        verificationCodes.delete(email); // Видалити код після успішної перевірки
      } else {
        setError('Невірний код або термін його дії закінчився.');
      }
    } catch (err) {
      setError('Виникла помилка під час перевірки коду.');
    } finally {
      setIsLoading(false);
    }
  };

  // Крок 3: Встановлення нового пароля
  const handleResetPassword = (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newPassword !== confirmPassword) {
      setError('Паролі не співпадають.');
      return;
    }
    if (newPassword.length < 6) { // Приклад простої валідації
      setError('Пароль має бути не менше 6 символів.');
      return;
    }
    setIsLoading(true);
    try {
      // Тут була б логіка оновлення пароля на бекенді
      console.log(`Пароль для ${email} успішно змінено на: ${newPassword}`);
      setMessage('Ваш пароль успішно змінено!');
      setStep('success');
      setEmail(''); // Очистити email після успішного скидання
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError('Не вдалося скинути пароль. Спробуйте пізніше.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormStep = () => {
    switch (step) {
      case 'requestEmail':
        return (
          <>
            <h2 className={s.formSubtitle}>Введіть вашу електронну пошту</h2>
            <form onSubmit={handleRequestCode} className={s.inputGroup}>
              <input
                type="email"
                placeholder="Ваш Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={s.authInput}
                autoComplete="email"
                required
              />
              {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
              {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
              <button type="submit" className={s.submitButton} disabled={isLoading}>
                {isLoading ? 'Надсилання...' : 'Надіслати код підтвердження'}
              </button>
            </form>
          </>
        );
      case 'verifyCode':
        return (
          <>
            <h2 className={s.formSubtitle}>Введіть код з електронної пошти</h2>
            <form onSubmit={handleVerifyCode} className={s.inputGroup}>
              <p style={{ fontSize: '14px', color: '#555', marginBottom: '15px' }}>
                Ми надіслали 6-значний код на <strong>{email}</strong>.
                Він дійсний протягом 5 хвилин.
              </p>
              <input
                type="text"
                placeholder="Код підтвердження"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={s.authInput}
                maxLength="6"
                required
              />
              {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
              {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
              <button type="submit" className={s.submitButton} disabled={isLoading}>
                {isLoading ? 'Перевірка...' : 'Перевірити код'}
              </button>
              <button
                type="button"
                className={s.forgotLink} // Використовуємо той самий стиль для повторного надсилання
                onClick={() => { setStep('requestEmail'); setError(''); setMessage('');}}
                disabled={isLoading}
                style={{marginTop: '15px'}}
              >
                Надіслати код повторно
              </button>
            </form>
          </>
        );
      case 'resetPassword':
        return (
          <>
            <h2 className={s.formSubtitle}>Встановіть новий пароль</h2>
            <form onSubmit={handleResetPassword} className={s.inputGroup}>
              <input
                type="password"
                placeholder="Новий пароль"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={s.authInput}
                autoComplete="new-password"
                required
              />
              <input
                type="password"
                placeholder="Підтвердіть пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={s.authInput}
                autoComplete="new-password"
                required
              />
              {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
              {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
              <button type="submit" className={s.submitButton} disabled={isLoading}>
                {isLoading ? 'Оновлення...' : 'Змінити пароль'}
              </button>
            </form>
          </>
        );
      case 'success':
        return (
          <>
            <h2 className={s.formSubtitle}>Пароль успішно змінено!</h2>
            <p style={{ textAlign: 'center', color: 'green', fontSize: '18px', marginBottom: '20px' }}>
              {message}
            </p>
            <button type="button" className={s.submitButton} onClick={() => navigate('/login')}>
              Повернутися до входу
            </button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className={s.authContainer}>
      <h1 className={s.authTitle}>Відновлення паролю</h1>
      <div className={s.authForm}>
        {renderFormStep()}
      </div>
      <div className={s.authFooter}>
        <div className={s.divider}></div>
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <span className={s.loginPrompt}>Згадали пароль?</span>
          <a href="/login" className={s.loginLink}>
            Увійти
          </a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
