import { Request, Response, NextFunction } from "express";
// Можна імпортувати кастомні класи помилок, якщо ви їх створите
// import { ValidationError, NotFoundError, AuthenticationError } from '../errors';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Логування помилки (завжди корисно)
  console.error(`[${new Date().toISOString()}] Error on ${req.method} ${req.path}`);
  console.error("Error Name:", err.name);
  console.error("Error Message:", err.message);
  console.error("Error Stack:", err.stack); // Не надсилайте стек клієнту в production!

  let statusCode = 500;
  let responseBody: { error: string; details?: any } = {
    error: "Internal Server Error",
  };

  // Обробка специфічних типів помилок (приклади)
  if (err.name === 'ValidationError' /* || err instanceof ValidationError */) {
      statusCode = 400; // Bad Request
      responseBody = { error: "Validation Failed", details: err.message || err.errors };
  } else if (err.name === 'AuthenticationError' /* || err instanceof AuthenticationError */) {
      statusCode = 401; // Unauthorized
      responseBody = { error: "Authentication Failed", details: err.message };
  } else if (err.name === 'ForbiddenError') { // Наприклад, для прав доступу
       statusCode = 403; // Forbidden
       responseBody = { error: "Access Denied", details: err.message };
  } else if (err.name === 'NotFoundError' /* || err instanceof NotFoundError */) {
      statusCode = 404; // Not Found
      responseBody = { error: "Resource Not Found", details: err.message };
  } else if (err.code === 'EBADCSRFTOKEN') { // Приклад для csurf middleware
       statusCode = 403;
       responseBody = { error: 'Invalid CSRF token' };
  }
   // Додайте обробку інших типів помилок тут...

  // Не надсилаємо деталі помилки та стек в production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
      responseBody = { error: "An unexpected error occurred. Please try again later." };
  } else if (process.env.NODE_ENV !== 'production') {
       // В режимі розробки можна додати більше деталей
       responseBody.details = responseBody.details || err.message;
       // responseBody.stack = err.stack; // Обережно з надсиланням стеку
  }


  res.status(statusCode).json(responseBody);
};

export default errorHandler;