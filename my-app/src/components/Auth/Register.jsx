// src/components/Auth/Register.jsx
import React, { useState, useEffect } from 'react'; // Додано useState, useEffect
import { useDispatch, useSelector } from 'react-redux'; // Додано хуки Redux
import { registerUser, resetAuthStatus } from '../../redux/AuthSlice'; // Імпортуємо дію та скидання статусу
import s from './Auth.module.css';
import { useNavigate, Link } from 'react-router-dom'; // Додано Link

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // Отримуємо статус та помилку з auth стану
  const { status, error } = useSelector((state) => state.auth);

  // Стан для полів форми
  const [formData, setFormData] = useState({
    userName: '',
    displayName: '',
    gender: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    day: '',
    month: '',
    year: '',
    // avatarFile: null, // Закоментовано, бо не використовуємо завантаження аватара
  });
  const [formErrors, setFormErrors] = useState({}); // Стан для помилок валідації

  // Обробник зміни значень полів
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Очищаємо помилку для цього поля при зміні
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: null });
    }
  };

  // Функція валідації форми
  const validateForm = () => {
     let errors = {};
     if (!formData.userName.trim()) errors.userName = "Нікнейм обов'язковий";
     if (!formData.displayName.trim()) errors.displayName = "Ім'я для відображення обов'язкове";
     if (!formData.gender) errors.gender = "Виберіть стать";
     if (!formData.email.trim()) errors.email = "Email обов'язковий";
     else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = "Неправильний формат email";
     if (!formData.password) errors.password = "Пароль обов'язковий";
     else if (formData.password.length < 8) errors.password = "Пароль має містити щонайменше 8 символів";
     if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Паролі не співпадають";
     if (!formData.phone.trim()) errors.phone = "Телефон обов'язковий";
     // Проста перевірка дати (чи вибрані всі поля)
     if (!formData.day || !formData.month || !formData.year) errors.date = "Вкажіть повну дату народження";

     setFormErrors(errors);
     return Object.keys(errors).length === 0;
  }

  // Обробник відправки форми
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) return; // Зупиняємо, якщо є помилки валідації

    // Формуємо дату народження (якщо всі поля вибрані)
    const date_of_birth = (formData.year && formData.month && formData.day)
        ? `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`
        : undefined; // Або null, якщо поле в БД дозволяє

    // Готуємо дані для відправки (без confirmPassword)
    const userData = {
        userName: formData.userName.trim(),
        displayName: formData.displayName.trim(),
        gender: formData.gender,
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
        date_of_birth: date_of_birth
    };

    // Діспатчимо асинхронну дію registerUser
    const resultAction = await dispatch(registerUser(userData));

    // Перевіряємо, чи реєстрація пройшла успішно
    if (registerUser.fulfilled.match(resultAction)) {
        alert('Реєстрація успішна! Тепер ви можете увійти.'); // Повідомлення користувачу
        navigate('/login'); // Перенаправляємо на сторінку логіну
    }
    // Помилки обробляються через useSelector та відображаються нижче
  };

  // Генерація опцій для дати (можна винести в окрему утиліту)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  // Скидання статусу помилки Redux при розмонтуванні
//   useEffect(() => {
//     return () => {
//       if (status !== 'idle') {
//         dispatch(resetAuthStatus()); // Потрібно додати цей редюсер в AuthSlice
//       }
//     };
//   }, [dispatch, status]);

  return (
    <div className={s.authContainer}>
      <h1 className={s.authTitle}>Приєднуйся сьогодні</h1>

      <form onSubmit={handleRegister} className={s.authForm}>
        <h2 className={s.formSubtitle}>Створити акаунт</h2>

        <div className={s.inputGroup}>
          {/* Поля вводу з обробниками та name */}
          <input type="text" name="userName" placeholder="Нікнейм" value={formData.userName} onChange={handleChange} className={s.authInput} />
          {formErrors.userName && <p className={s.errorText}>{formErrors.userName}</p>}

          <input type="text" name="displayName" placeholder="Ім'я для відображення" value={formData.displayName} onChange={handleChange} className={s.authInput} />
          {formErrors.displayName && <p className={s.errorText}>{formErrors.displayName}</p>}

          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className={s.authInput} />
          {formErrors.email && <p className={s.errorText}>{formErrors.email}</p>}

          <input type="password" name="password" placeholder="Пароль (мін. 8 символів)" value={formData.password} onChange={handleChange} className={s.authInput} />
          {formErrors.password && <p className={s.errorText}>{formErrors.password}</p>}

          <input type="password" name="confirmPassword" placeholder="Підтвердіть пароль" value={formData.confirmPassword} onChange={handleChange} className={s.authInput} />
          {formErrors.confirmPassword && <p className={s.errorText}>{formErrors.confirmPassword}</p>}

          <input type="tel" name="phone" placeholder="Телефон" value={formData.phone} onChange={handleChange} className={s.authInput} />
          {formErrors.phone && <p className={s.errorText}>{formErrors.phone}</p>}

           {/* Вибір статі */}
           <select name="gender" value={formData.gender} onChange={handleChange} className={s.dateSelect}>
             <option value="" disabled>Стать</option>
             <option value="male">Чоловіча</option>
             <option value="female">Жіноча</option>
             <option value="other">Інша</option>
           </select>
           {formErrors.gender && <p className={s.errorText}>{formErrors.gender}</p>}
        </div>

        <h2 className={s.formSubtitle}>Дата Народження</h2>
        <div className={s.dateInputs}>
          <select name="month" value={formData.month} onChange={handleChange} className={s.dateSelect}>
            <option value="" disabled>Місяць</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select name="day" value={formData.day} onChange={handleChange} className={s.dateSelect}>
            <option value="" disabled>День</option>
            {days.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select name="year" value={formData.year} onChange={handleChange} className={s.dateSelect}>
            <option value="" disabled>Рік</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
         {formErrors.date && <p className={s.errorText}>{formErrors.date}</p>}

        {/* Відображення помилки від Redux */}
        {error && status === 'failed' && <p className={s.errorText}>Помилка реєстрації: {error}</p>}

        <button type="submit" className={s.submitButton} disabled={status === 'loading'}>
          {status === 'loading' ? 'Реєстрація...' : 'Зареєструватися'}
        </button>
      </form>

      <div className={s.authFooter}>
        <p className={s.termsText}>
          Реєструючись, ви погоджуєтесь з Умовами надання послуг та Політикою конфіденційності.
        </p>
        <div className={s.divider}></div>
        <p className={s.loginPrompt}>
          Вже маєш акаунт?{' '}
          {/* Використовуємо Link для навігації */}
          <Link to="/login" className={s.loginLink}>Увійти в систему</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
