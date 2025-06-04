import sql, { ConnectionPool } from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

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

let pool: ConnectionPool;

// Підключення до бази даних
async function connectDB() {
  try {
    if (!pool || !pool.connected) {
      pool = await sql.connect(config);
      console.log('Connected to SQL Server');
    }
    return pool; // Повертаємо існуюче підключення
  } catch (err) {
    // Перевіряємо, чи є помилка об'єктом, і має властивість `message`
    if (err instanceof Error) {
      console.error('Failed to connect to SQL Server:', err.message);
    } else {
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

export { connectDB, closeDB, pool };