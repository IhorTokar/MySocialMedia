"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrateUser = exports.loginUser = exports.getCurrentUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const userModel_1 = require("../models/userModel");
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
const getCurrentUser = async (req, res, next) => {
    const userId = req.user?.userID; // Отримуємо ID з токена (додається middleware 'auth')
    if (!userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }
    try {
        // Викликаємо функцію, що повертає повний профіль (публічні + приватні дані)
        const authenticatedProfileData = await (0, userModel_1.getAuthenticatedUserProfileData)(userId);
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
    }
    catch (error) {
        console.error("Error fetching current user data for /me endpoint:", error);
        next(error); // Передаємо помилку в централізований обробник
    }
};
exports.getCurrentUser = getCurrentUser;
// ========================================================================
// ==                      POST Request Handlers                         ==
// ========================================================================
/**
 * Обробляє логін користувача.
 * Обробляє POST /api/users/login
 */
const loginUser = async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res
            .status(400)
            .json({ error: "Missing required fields: email or password" });
        return;
    }
    try {
        const user = await (0, userModel_1.getUserByEmailFromDB)(email); // Ця функція повертає і приватні дані, включаючи password_hash
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
        const isMatch = await bcrypt_1.default.compare(password, user.password_hash);
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
        const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, { expiresIn: "12h" });
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
    }
    catch (error) {
        next(error);
    }
};
exports.loginUser = loginUser;
/**
 * Обробляє реєстрацію нового користувача.
 * Обробляє POST /api/users/register
 */
const registrateUser = async (req, res, next) => {
    const { userName, // Це ваш `username` для таблиці `users`
    displayName, // Це ваш `display_name` для таблиці `users`
    gender, email, password, phone, date_of_birth, // Переконайтесь, що формат дати правильний або валідується/конвертується
     } = req.body;
    // Припускаємо, що userAvatarUrl встановлюється за замовчуванням або буде інший механізм
    const userAvatarUrl = "/uploads/avatars/default_avatar.png";
    // Валідація обов'язкових полів
    if (!userName || !email || !password || !phone || !displayName || !gender) {
        res
            .status(400)
            .json({
            error: "All required fields must be provided: userName, displayName, gender, email, password, phone.",
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
        const emailExists = await (0, userModel_1.checkEmailExistsInDB)(email);
        if (emailExists) {
            res.status(400).json({ error: "Email already in use" });
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        // Передаємо displayName як другий параметр, якщо addUserToDB очікує його там
        const newUser = await (0, userModel_1.addUserToDB)(userName, // username для таблиці users
        displayName, // display_name для таблиці users
        gender, email, hashedPassword, phone, "", // profilePictureUrl - поки порожній
        userAvatarUrl, // userAvatar - дефолтний
        date_of_birth);
        res.status(201).json({
            message: "User created successfully",
            userId: newUser.userId,
            // Можна повернути і інші дані нового користувача, якщо потрібно,
            // наприклад, для автоматичного логіну після реєстрації (але це окрема логіка)
            // avatar: userAvatarUrl // Якщо фронтенд очікує це
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message.includes("Unsupported file type")) {
            res.status(400).json({ error: error.message });
            return;
        }
        if (error instanceof Error &&
            error.message.includes("Email already exists")) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
};
exports.registrateUser = registrateUser;
