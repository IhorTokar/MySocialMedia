// my-backend-app/src/routes/uploads.ts
import express, { Request, Response } from "express";
import upload from "../utils/fileUpload";
import path from "path";
import auth from "../middleware/auth";

const router = express.Router();

// Визначимо MulterRequest тут, якщо він потрібен тільки в цьому файлі
// Або краще розширити глобальний Express.Request, як ми робили раніше
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// 📤 Існуючий маршрут для завантаження аватара (можливо, не використовується, якщо оновлення йде через /api/users/avatar/:userId)
router.post("/upload/avatar", auth, upload.single("avatar"), (req: MulterRequest, res: Response): void => { // Змінено тип повернення на void
  if (!req.file) {
    res.status(400).json({ error: "Файл не завантажено!" });
    return; // Ранній вихід
  }
  res.json({ filename: req.file.filename }); // Відповідь надсилається, функція завершується
});

// 📤 Існуючий маршрут для завантаження зображення для поста (можливо, не використовується, якщо оновлення йде через PUT /api/posts/:postId)
router.post("/upload/post", auth, upload.single("postImage"), (req: MulterRequest, res: Response): void => { // Змінено тип повернення на void
  if (!req.file) {
    res.status(400).json({ error: "Файл не завантажено!" });
    return;
  }
  res.json({ filename: req.file.filename });
});

// --- НОВИЙ МАРШРУТ: Завантаження зображення для повідомлення ---
router.post("/upload/message-image", auth, upload.single("messageFile"), (req: MulterRequest, res: Response): void => { // Змінено тип повернення на void
  const timestamp = new Date().toISOString();
  if (!req.file) {
    console.error(`[uploads.ts][${timestamp}] Upload message image failed: No file uploaded.`);
    res.status(400).json({ error: "Файл для повідомлення не завантажено!" });
    return;
  }
  console.log(`[uploads.ts][${timestamp}] Message file uploaded successfully: ${req.file.filename}`);
  res.json({ filename: req.file.filename });
});
// --------------------------------------------------------------

// 📥 Отримання аватара
router.get("/avatars/:filename", (req: Request, res: Response): void => { // Змінено тип повернення на void
  const filename = req.params.filename;
  const safeFilename = path.basename(filename);
  const filePath = path.resolve(__dirname, "../../uploads/avatars", safeFilename);
  const timestamp = new Date().toISOString();
  console.log(`[uploads.ts][${timestamp}] Attempting to send avatar file: ${filePath}`);
  res.sendFile(filePath, (err) => {
    if (err) {
      const error = err as NodeJS.ErrnoException;
      console.error(`[uploads.ts][${timestamp}] Error sending avatar file ${filePath} (Requested: ${filename}): ${error.message}`);
      // Надсилаємо відповідь про помилку і завершуємо
      if (!res.headersSent) { // Перевіряємо, чи заголовки ще не надіслані
        res.status(error.code === 'ENOENT' ? 404 : 500).json({error: `File not found or cannot be read: ${safeFilename}`});
      }
    } else {
      console.log(`[uploads.ts][${timestamp}] Avatar file ${filePath} sent successfully.`);
    }
  });
});

// 📥 Отримання зображення поста
router.get("/posts/:filename", (req: Request, res: Response): void => { // Змінено тип повернення на void
  const filename = req.params.filename;
  const safeFilename = path.basename(filename);
  const filePath = path.resolve(__dirname, "../../uploads/posts", safeFilename);
  const timestamp = new Date().toISOString();
  console.log(`[uploads.ts][${timestamp}] Attempting to send post image file: ${filePath}`);
  res.sendFile(filePath, (err) => {
    if (err) {
      const error = err as NodeJS.ErrnoException;
      console.error(`[uploads.ts][${timestamp}] Error sending post image file ${filePath} (Requested: ${filename}): ${error.message}`);
      if (!res.headersSent) {
        res.status(error.code === 'ENOENT' ? 404 : 500).json({error: `File not found or cannot be read: ${safeFilename}`});
      }
    } else {
      console.log(`[uploads.ts][${timestamp}] Post image file ${filePath} sent successfully.`);
    }
  });
});

// --- НОВИЙ МАРШРУТ: Отримання зображення з повідомлення ---
router.get("/message-files/:filename", (req: Request, res: Response): void => { // Змінено тип повернення на void
  const filename = req.params.filename;
  const safeFilename = path.basename(filename);
  const filePath = path.resolve(__dirname, "../../uploads/message_files", safeFilename);
  const timestamp = new Date().toISOString();
  console.log(`[uploads.ts][${timestamp}] Attempting to send message file: ${filePath}`);
  res.sendFile(filePath, (err) => {
    if (err) {
      const error = err as NodeJS.ErrnoException;
      console.error(`[uploads.ts][${timestamp}] Error sending message file ${filePath} (Requested: ${filename}): ${error.message}`);
      if (!res.headersSent) {
        res.status(error.code === 'ENOENT' ? 404 : 500).json({error: `Message file not found or cannot be read: ${safeFilename}`});
      }
    } else {
      console.log(`[uploads.ts][${timestamp}] Message file ${filePath} sent successfully.`);
    }
  });
});
// -----------------------------------------------------------

export default router;