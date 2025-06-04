"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// my-backend-app/src/middleware/auth.ts
const jsonwebtoken_1 = __importStar(require("jsonwebtoken"));
const auth = (req, res, next) => {
    // Отримуємо повний шлях запиту для логування (наприклад, /api/users/me)
    const fullPath = req.originalUrl || req.url;
    const timestamp = new Date().toISOString(); // Часова мітка для кожного логу
    // === Початок логування для конкретного запиту ===
    console.log(`\n[AUTH MIDDLEWARE][${timestamp}] === Запит до: ${fullPath} ===`);
    // Логуємо весь об'єкт req.cookies, щоб побачити, що саме бачить cookie-parser
    // УВАГА: В продакшені це може логувати чутливі дані, якщо у вас є інші cookies.
    // Для дебагу це дуже корисно.
    console.log(`[AUTH MIDDLEWARE][${timestamp}] Вміст req.cookies для '${fullPath}':`, JSON.stringify(req.cookies));
    // Отримуємо токен саме з req.cookies.token (якщо ваш cookie називається 'token')
    const token = req.cookies.token;
    // Логуємо, чи знайдено токен
    console.log(`[AUTH MIDDLEWARE][${timestamp}] Значення req.cookies.token для '${fullPath}': ${token ? `ОТРИМАНО (початок: ${String(token).substring(0, 20)}...)` : 'ВІДСУТНІЙ або undefined'}`);
    // Перевірка, чи токен взагалі прийшов
    if (!token) {
        console.error(`[AUTH MIDDLEWARE][${timestamp}] Помилка для '${fullPath}': Токен не надано (req.cookies.token порожній або undefined). Відповідь 401.`);
        res.status(401).json({ error: "Unauthorized: No token provided" });
        return;
    }
    // Перевірка наявності JWT_SECRET в змінних середовища
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error(`[AUTH MIDDLEWARE][${timestamp}] КРИТИЧНА ПОМИЛКА для '${fullPath}': JWT_SECRET не встановлено на сервері! Перевірте .env файл. Відповідь 500.`);
        res.status(500).json({ error: "Internal Server Error: JWT configuration missing" });
        return;
    }
    try {
        console.log(`[AUTH MIDDLEWARE][${timestamp}] Для '${fullPath}': Спроба верифікації токена...`);
        // Верифікація токена
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // Логування успішної верифікації (в продакшені можна прибрати деталі decoded, залишивши тільки userID)
        console.log(`[AUTH MIDDLEWARE][${timestamp}] Для '${fullPath}': Токен УСПІШНО верифіковано. UserID: ${decoded.userID}, Email: ${decoded.email}, Role: ${decoded.role}`);
        // Додаємо розшифровані дані користувача до об'єкта запиту
        req.user = {
            userID: decoded.userID,
            email: decoded.email,
            role: decoded.role
        };
        next(); // Передаємо управління наступному middleware або обробнику маршруту
    }
    catch (error) {
        const err = error; // Приведення типу для доступу до error.name та error.message
        console.error(`[AUTH MIDDLEWARE][${timestamp}] Помилка для '${fullPath}': Верифікація токена НЕ ВДАЛАСЯ. Тип помилки: ${err.name}, Повідомлення: ${err.message}`);
        // Для більш детального аналізу можна роздрукувати весь об'єкт помилки: console.error(err);
        if (err instanceof jsonwebtoken_1.TokenExpiredError) {
            res.status(401).json({ error: "Unauthorized: Token expired" });
        }
        else if (err instanceof jsonwebtoken_1.JsonWebTokenError) { // Обробляє різні помилки JWT (invalid signature, malformed, etc.)
            res.status(401).json({ error: `Forbidden: Invalid token (${err.message})` });
        }
        else {
            // Для інших непередбачених помилок
            res.status(500).json({ error: "Internal Server Error during token verification" });
        }
        return; // Важливо завершити виконання функції після відправки відповіді
    }
};
exports.default = auth;
