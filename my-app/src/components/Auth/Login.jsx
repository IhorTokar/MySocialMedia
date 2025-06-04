// my-app/src/components/Auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../../redux/AuthSlice';
import { fetchUserProfile } from '../../redux/userSlice'; // Імпорт на місці
import s from './Auth.module.css';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((state) => state.auth || {}); // token тут не використовувався для логіки useEffect

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    dispatch(loginUser({ email, password }));
  };

  useEffect(() => {
    // Це логіка, яка, ймовірно, була у вас спочатку
    if (status === 'succeeded') {
      console.log("[Login.jsx - REVERTED] Login successful. Dispatching fetchUserProfile.");
      dispatch(fetchUserProfile());
      navigate('/profile');
    }
  }, [status, navigate, dispatch]); // Залежність від token тут не була критичною, якщо status='succeeded' вже означає наявність токену

  return (
    <div className={s.authContainer}>
      <h1 className={s.authTitle}>Вітаємо Назад!</h1>
      <div className={s.authForm}>
        <h2 className={s.formSubtitle}>Введіть свій нікнейм та пароль</h2> {/* Або Email, як було у вашому оригіналі */}
        <form onSubmit={handleLogin} className={s.inputGroup}>
          <input
            type="text"
            placeholder="Email" // Або Нікнейм
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={s.authInput}
            autoComplete="email" // Або username
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={s.authInput}
            autoComplete="current-password"
          />
          {status === 'failed' && error && (
            <p style={{ color: 'red' }}>{error}</p>
          )}
          <button type="submit" className={s.submitButton} disabled={status === 'loading'}>
            {status === 'loading' ? 'Завантаження...' : 'Увійти в систему'}
          </button>
        </form>
      </div>
      <div className={s.authFooter}>
        <a href="/register" className={s.registerLink}>
          Немає акаунта? Зареєструватися
        </a>
      </div>
    </div>
  );
};

export default Login;