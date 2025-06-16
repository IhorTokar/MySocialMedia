// my-backend-app/src/controllers/authController.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  // Функції для отримання даних (зазвичай використовуються в GET або для перевірок)
  getUserByEmailFromDB,
  checkEmailExistsInDB,
  getAuthenticatedUserProfileData,
  // getUserByIdFromDB, // Ця функція, ймовірно, більше не потрібна в authController, якщо getCurrentUser використовує getAuthenticatedUserProfileData

  // Функції для створення/зміни даних (зазвичай використовуються в POST, PUT)
  addUserToDB,
  updateUserPasswordAsAdmin,
} from "../models/userModel";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not set in environment variables.");
  process.exit(1); // Зупиняємо додаток, якщо секрет не встановлено
}

// ========================================================================
// ==                      GET Request Handlers                          ==
// ========================================================================

/**
 * Отримує дані поточного авторизованого користувача.
 * Обробляє GET /api/users/me
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.userID; // Отримуємо ID з токена (додається middleware 'auth')

  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    // Викликаємо функцію, що повертає повний профіль (публічні + приватні дані)
    const authenticatedProfileData =
      await getAuthenticatedUserProfileData(userId);

    if (!authenticatedProfileData) {
      res
        .status(404)
        .json({ error: "User associated with this token not found" });
      return;
    }

    // Формуємо відповідь у бажаній структурі для фронтенду
    const responsePayload = {
      user: {
        // Публічна частина
        user_id: authenticatedProfileData.user_id,
        username: authenticatedProfileData.userName,
        display_name: authenticatedProfileData.displayName,
        uid: authenticatedProfileData.uid,
        profile_picture_url: authenticatedProfileData.profile_picture_url,
        gender: authenticatedProfileData.gender,
        user_avatar_url: authenticatedProfileData.user_avatar_url,
        about_me: authenticatedProfileData.about_me,
        created_at: authenticatedProfileData.created_at,
        last_logout: authenticatedProfileData.last_logout,
      },
      // Приватні поля на верхньому рівні
      email: authenticatedProfileData.email,
      phone: authenticatedProfileData.phone,
      role: authenticatedProfileData.role,
      date_of_birth: authenticatedProfileData.date_of_birth,
    };

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error("Error fetching current user data for /me endpoint:", error);
    next(error); // Передаємо помилку в централізований обробник
  }
};

// ========================================================================
// ==                      POST Request Handlers                         ==
// ========================================================================

/**
 * Обробляє логін користувача.
 * Обробляє POST /api/users/login
 */
export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res
      .status(400)
      .json({ error: "Missing required fields: email or password" });
    return;
  }
  try {
    const user = await getUserByEmailFromDB(email); // Ця функція повертає і приватні дані, включаючи password_hash

    if (!user) {
      res.status(401).json({ error: "Invalid credentials: User not found" });
      return;
    }

    // Перевіряємо, чи user.password_hash існує перед порівнянням
    if (!user.password_hash) {
      console.error(`User ${email} found but has no password_hash.`);
      res
        .status(500)
        .json({ error: "Internal server error: User account issue." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res
        .status(401)
        .json({ error: "Invalid credentials: Incorrect password" });
      return;
    }

    // Перевірка JWT_SECRET (хоча вона є на початку файлу, тут для надійності перед підписом)
    if (!JWT_SECRET) {
      // Ця помилка вже мала б зупинити додаток, але для повноти
      console.error("JWT_SECRET missing during login attempt!");
      res.status(500).json({ error: "Internal server configuration error." });
      return;
    }

    const tokenPayload = {
      userID: user.user_id,
      email: user.email,
      role: user.role || "user", // Важливо: user.role може бути undefined, якщо його немає в user_private
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "12h" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // secure: true тільки для HTTPS
      sameSite: "strict", // Або 'lax', залежно від потреб
      maxAge: 3600 * 12000, // 1 година
    });

    // Не відправляємо хеш пароля на клієнт
    const { password_hash, ...userDataToSend } = user;

    res.status(200).json({
      message: "Login successful",
      user: userDataToSend, // Відправляємо дані користувача (без хешу)
      token: token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Обробляє реєстрацію нового користувача.
 * Обробляє POST /api/users/register
 */
export const registrateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const {
    userName, // Це ваш `username` для таблиці `users`
    displayName, // Це ваш `display_name` для таблиці `users`
    gender,
    email,
    password,
    phone,
    date_of_birth, 
  } = req.body;

  // Припускаємо, що userAvatarUrl встановлюється за замовчуванням або буде інший механізм
  const userAvatarUrl = "default_avatar.png";
  const profilePictureUrl = " ";

  // Валідація обов'язкових полів
  if (!userName || !email || !password || !phone || !displayName || !gender) {
    res
      .status(400)
      .json({
        error:
          "All required fields must be provided: userName, displayName, gender, email, password, phone.",
      });
    return;
  }
  if (date_of_birth && isNaN(Date.parse(date_of_birth))) {
    res
      .status(400)
      .json({
        error: "Invalid date format for date_of_birth. Use YYYY-MM-DD.",
      });
    return;
  }

  try {
    const emailExists = await checkEmailExistsInDB(email);
    if (emailExists) {
      res.status(400).json({ error: "Email already in use" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await addUserToDB(
      userName, // username для таблиці users
      displayName, 
      gender,
      email,
      hashedPassword,
      phone,
      profilePictureUrl,
      userAvatarUrl, 
      date_of_birth
    );

    res.status(201).json({
      message: "User created successfully",
      userId: newUser.userId,
 
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unsupported file type")
    ) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (
      error instanceof Error &&
      error.message.includes("Email already exists")
    ) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
};

export const adminResetUserPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { userId } = req.params; // Отримуємо userId з параметрів URL
  const { newPassword } = req.body; // Отримуємо новий пароль з тіла запиту

  // Отримуємо роль користувача, який робить запит, з токена (після authMiddleware)
  const requestingUserRole = req.user?.role;
  const requestingUserId = req.user?.userID;

  // 1. Перевірка на роль адміністратора
  if (!requestingUserRole || requestingUserRole !== "admin") {
    res.status(403).json({ error: "Access Denied: Only administrators can perform this action." });
    return;
  }

  // 2. Валідація вхідних даних
  if (!userId || isNaN(parseInt(userId as string))) {
    res.status(400).json({ error: "Недійсний ID користувача." });
    return;
  }
  const targetUserId = parseInt(userId as string);

  if (!newPassword || newPassword.length < 8) { // Мінімальна довжина пароля, відповідно до вашої логіки реєстрації
    res.status(400).json({ error: "Новий пароль повинен бути щонайменше 8 символів." });
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateUserPasswordAsAdmin(targetUserId, hashedPassword);

    res.status(200).json({ message: `Пароль користувача ${targetUserId} успішно скинуто.` });
  } catch (error) {
    console.error(`Error in adminResetUserPassword for user ${targetUserId}:`, error);
    next(error); // Передаємо помилку в централізований обробник
  }
};
