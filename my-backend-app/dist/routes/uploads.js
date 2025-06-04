"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// my-backend-app/src/routes/uploads.ts
const express_1 = __importDefault(require("express"));
const fileUpload_1 = __importDefault(require("../utils/fileUpload"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("../middleware/auth"));
const router = express_1.default.Router();
// 📤 Існуючий маршрут для завантаження аватара (можливо, не використовується, якщо оновлення йде через /api/users/avatar/:userId)
router.post("/upload/avatar", auth_1.default, fileUpload_1.default.single("avatar"), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "Файл не завантажено!" });
        return; // Ранній вихід
    }
    res.json({ filename: req.file.filename }); // Відповідь надсилається, функція завершується
});
// 📤 Існуючий маршрут для завантаження зображення для поста (можливо, не використовується, якщо оновлення йде через PUT /api/posts/:postId)
router.post("/upload/post", auth_1.default, fileUpload_1.default.single("postImage"), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "Файл не завантажено!" });
        return;
    }
    res.json({ filename: req.file.filename });
});
// --- НОВИЙ МАРШРУТ: Завантаження зображення для повідомлення ---
router.post("/upload/message-image", auth_1.default, fileUpload_1.default.single("messageFile"), (req, res) => {
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
router.get("/avatars/:filename", (req, res) => {
    const filename = req.params.filename;
    const safeFilename = path_1.default.basename(filename);
    const filePath = path_1.default.resolve(__dirname, "../../uploads/avatars", safeFilename);
    const timestamp = new Date().toISOString();
    console.log(`[uploads.ts][${timestamp}] Attempting to send avatar file: ${filePath}`);
    res.sendFile(filePath, (err) => {
        if (err) {
            const error = err;
            console.error(`[uploads.ts][${timestamp}] Error sending avatar file ${filePath} (Requested: ${filename}): ${error.message}`);
            // Надсилаємо відповідь про помилку і завершуємо
            if (!res.headersSent) { // Перевіряємо, чи заголовки ще не надіслані
                res.status(error.code === 'ENOENT' ? 404 : 500).json({ error: `File not found or cannot be read: ${safeFilename}` });
            }
        }
        else {
            console.log(`[uploads.ts][${timestamp}] Avatar file ${filePath} sent successfully.`);
        }
    });
});
// 📥 Отримання зображення поста
router.get("/posts/:filename", (req, res) => {
    const filename = req.params.filename;
    const safeFilename = path_1.default.basename(filename);
    const filePath = path_1.default.resolve(__dirname, "../../uploads/posts", safeFilename);
    const timestamp = new Date().toISOString();
    console.log(`[uploads.ts][${timestamp}] Attempting to send post image file: ${filePath}`);
    res.sendFile(filePath, (err) => {
        if (err) {
            const error = err;
            console.error(`[uploads.ts][${timestamp}] Error sending post image file ${filePath} (Requested: ${filename}): ${error.message}`);
            if (!res.headersSent) {
                res.status(error.code === 'ENOENT' ? 404 : 500).json({ error: `File not found or cannot be read: ${safeFilename}` });
            }
        }
        else {
            console.log(`[uploads.ts][${timestamp}] Post image file ${filePath} sent successfully.`);
        }
    });
});
// --- НОВИЙ МАРШРУТ: Отримання зображення з повідомлення ---
router.get("/message-files/:filename", (req, res) => {
    const filename = req.params.filename;
    const safeFilename = path_1.default.basename(filename);
    const filePath = path_1.default.resolve(__dirname, "../../uploads/message_files", safeFilename);
    const timestamp = new Date().toISOString();
    console.log(`[uploads.ts][${timestamp}] Attempting to send message file: ${filePath}`);
    res.sendFile(filePath, (err) => {
        if (err) {
            const error = err;
            console.error(`[uploads.ts][${timestamp}] Error sending message file ${filePath} (Requested: ${filename}): ${error.message}`);
            if (!res.headersSent) {
                res.status(error.code === 'ENOENT' ? 404 : 500).json({ error: `Message file not found or cannot be read: ${safeFilename}` });
            }
        }
        else {
            console.log(`[uploads.ts][${timestamp}] Message file ${filePath} sent successfully.`);
        }
    });
});
// -----------------------------------------------------------
exports.default = router;
