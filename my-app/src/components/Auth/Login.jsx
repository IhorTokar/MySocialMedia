import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../../redux/AuthSlice';
import { fetchUserProfile } from '../../redux/userSlice';
import s from './Auth.module.css';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((state) => state.auth || {});

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Додаємо новий стан для відстеження спроби входу
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setHasAttemptedLogin(true); // Встановлюємо, що користувач зробив спробу входу
    dispatch(loginUser({ email, password }));
  };

  useEffect(() => {
    if (status === 'succeeded') {
      console.log("[Login.jsx] Login successful. Dispatching fetchUserProfile.");
      dispatch(fetchUserProfile());
      navigate('/profile');
    }
  }, [status, navigate, dispatch]);

  return (
    <div className={s.authContainer}>
      <h1 className={s.authTitle}>Вітаємо Назад!</h1>
      <div className={s.authForm}>
        <h2 className={s.formSubtitle}>Введіть свій Email та пароль</h2>
        <form onSubmit={handleLogin} className={s.inputGroup}>
          <input
            type="text"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={s.authInput}
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={s.authInput}
            autoComplete="current-password"
          />
          {/* Показуємо помилку тільки якщо була спроба входу і статус 'failed' */}
          {hasAttemptedLogin && status === 'failed' && error && (
            <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>
          )}
          <button type="submit" className={s.submitButton} disabled={status === 'loading'}>
            {status === 'loading' ? 'Завантаження...' : 'Увійти в систему'}
          </button>
        </form>
      </div>
      <a href="/forgot-password" className={s.forgotLink}>
        Забули пароль?
      </a>
      <div className={s.authFooter}>
        <div className={s.divider}></div>
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <span className={s.loginPrompt}>Немає акаунта?</span>
          <a href="/register" className={s.registerLink}>
            Зареєструватися
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;