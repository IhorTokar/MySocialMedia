"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.connectDB = connectDB;
exports.closeDB = closeDB;
const mssql_1 = __importDefault(require("mssql"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Перевірка наявності змінних середовища
if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_SERVER || !process.env.DB_DATABASE) {
    throw new Error('Missing database configuration in environment variables');
}
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};
let pool;
// Підключення до бази даних
async function connectDB() {
    try {
        if (!pool || !pool.connected) {
            exports.pool = pool = await mssql_1.default.connect(config);
            console.log('Connected to SQL Server');
        }
        return pool; // Повертаємо існуюче підключення
    }
    catch (err) {
        // Перевіряємо, чи є помилка об'єктом, і має властивість `message`
        if (err instanceof Error) {
            console.error('Failed to connect to SQL Server:', err.message);
        }
        else {
            console.error('Failed to connect to SQL Server:', err);
        }
        throw new Error('Database connection failed');
    }
}
// Закриття підключення
async function closeDB() {
    if (pool) {
        await pool.close();
        console.log('SQL Server connection closed');
    }
}
