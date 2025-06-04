// my-backend-app/src/app.ts
import dotenv from 'dotenv';
dotenv.config(); // Завантажуємо змінні середовища ЯКНАЙРАНІШЕ

// --- Перевірка критичних змінних середовища ---
if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined.");
    process.exit(1);
}
// --- Кінець перевірки ---

import express from 'express';
import path from 'path';
import http from 'http'; // <-- Імпортуємо http модуль
import { connectDB, closeDB } from './config/db'; // Імпортуємо closeDB для коректного завершення
import routes from './routes'; // Ваш головний роутер (/api)
import errorHandler from './middleware/errorHandler';
import cors from "cors";
import cookieParser from "cookie-parser";
import { initializeWebSocket } from './services/websocketService'; // <-- Імпортуємо ініціалізатор WebSocket

const API_URL_BASE = "http://localhost:"; // База для логування URL

const app = express();

// Підключення до бази даних
connectDB().catch(err => {
    console.error("Failed to connect to DB on startup:", err);
    process.exit(1); // Зупиняємо додаток, якщо БД недоступна при старті
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000", // Використовуємо змінну середовища
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'))); // Шлях до папки uploads

// Маршрути API
app.use('/api', routes); // Всі ваші API роути під /api

// Головний маршрут (для перевірки, що сервер працює)
app.get('/', (req, res) => {
  res.send('API is running');
});

// Обробка помилок (має бути після всіх маршрутів)
app.use(errorHandler);

// --- Запуск HTTP сервера та WebSocket сервера ---
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000; // Використовуємо порт 5000

// Створюємо HTTP сервер з Express додатком
const server = http.createServer(app);

// Ініціалізуємо WebSocket сервер, передаючи йому HTTP сервер
initializeWebSocket(server);

// Запускаємо HTTP сервер (а не app напряму)
server.listen(port, () => {
    console.log(`Server started on port ${port}`);
    console.log(`API available at ${API_URL_BASE}${port}/api`);
    console.log(`WebSocket available at ws://localhost:${port}`); 
});

// --- Обробка коректного завершення ---
const shutdown = async () => {
    console.log('Shutting down server...');
    server.close(async (err) => {
        if (err) {
            console.error('Error closing HTTP server:', err);
        } else {
            console.log('HTTP server closed.');
        }
        await closeDB(); 
        process.exit(err ? 1 : 0);
    });
};

process.on('SIGTERM', shutdown); 
process.on('SIGINT', shutdown); 