// my-backend-app/src/types/express.d.ts
import 'express'; // Важливо для розширення існуючих типів Express
// Якщо ви використовуєте типи з multer, їх також можна додати
// import { File } from 'multer'; 

// Визначте структуру вашого JWT payload для req.user
interface UserPayload {
  userID: number;
  email: string; // Переконайтесь, що auth.ts додає це поле до req.user
  role?: string;
  // Додайте інші поля, які є у вашому JWT payload
}

declare global {
  namespace Express {
    export interface Request {
      user?: UserPayload; // Тепер req.user буде мати цей тип у всьому проекті
      file?: Multer.File; // Тип для одного завантаженого файлу
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] }; // Для кількох файлів
    }
  }
}

// Якщо ви не імпортуєте нічого з 'multer' безпосередньо тут, 
// але хочете використовувати глобальний тип Multer.File,
// можливо, доведеться додати /// <reference types="multer" /> на початку файлу
// або налаштувати tsconfig.json, щоб він бачив типи multer.
// Найпростіше - просто використовувати Express.Multer.File, як я зробив вище.

export {}; // Цей порожній експорт робить файл модулем TypeScript