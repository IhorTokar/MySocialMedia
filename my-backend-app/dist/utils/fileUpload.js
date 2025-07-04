"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// my-backend-app/src/utils/fileUpload.ts
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs")); // Використовуємо синхронний fs для перевірки/створення папок
// Функція для створення папок, якщо їх немає
const ensureUploadsDirectoriesExist = () => {
    const uploadsDir = path_1.default.resolve(__dirname, '../../uploads');
    const avatarsDir = path_1.default.join(uploadsDir, 'avatars');
    const postsDir = path_1.default.join(uploadsDir, 'posts');
    const messagesDir = path_1.default.join(uploadsDir, 'message_files'); // <--- Папка для файлів повідомлень
    const otherDir = path_1.default.join(uploadsDir, 'other'); // <--- Папка для інших файлів
    console.log('[fileUpload] Checking uploads directories...');
    if (!fs_1.default.existsSync(uploadsDir)) {
        console.log(`[fileUpload] Creating base uploads directory: ${uploadsDir}`);
        fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs_1.default.existsSync(avatarsDir)) {
        console.log(`[fileUpload] Creating avatars directory: ${avatarsDir}`);
        fs_1.default.mkdirSync(avatarsDir, { recursive: true });
    }
    if (!fs_1.default.existsSync(postsDir)) {
        console.log(`[fileUpload] Creating posts directory: ${postsDir}`);
        fs_1.default.mkdirSync(postsDir, { recursive: true });
    }
    if (!fs_1.default.existsSync(messagesDir)) {
        console.log(`[fileUpload] Creating message_files directory: ${messagesDir}`);
        fs_1.default.mkdirSync(messagesDir, { recursive: true });
    }
    if (!fs_1.default.existsSync(otherDir)) {
        console.log(`[fileUpload] Creating other directory: ${otherDir}`);
        fs_1.default.mkdirSync(otherDir, { recursive: true });
    }
    console.log('[fileUpload] Uploads directories verified/created.');
};
ensureUploadsDirectoriesExist(); // Викликаємо при завантаженні модуля
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        let targetFolder = '';
        const timestamp = new Date().toISOString();
        console.log(`[fileUpload][${timestamp}] Determining destination for fieldname: "${file.fieldname}"`);
        if (file.fieldname === "userAvatar") {
            targetFolder = path_1.default.resolve(__dirname, "../../uploads/avatars");
        }
        else if (file.fieldname === "contentImg" || file.fieldname === "postImage") {
            targetFolder = path_1.default.resolve(__dirname, "../../uploads/posts");
        }
        else if (file.fieldname === "messageFile") { // <--- Обробка для файлів повідомлень
            targetFolder = path_1.default.resolve(__dirname, "../../uploads/message_files");
        }
        else {
            console.warn(`[fileUpload][${timestamp}] Unknown fieldname "${file.fieldname}", attempting to save to "uploads/other"`);
            targetFolder = path_1.default.resolve(__dirname, "../../uploads/other");
        }
        // Додаткова перевірка/створення папки (хоча ensureUploadsDirectoriesExist має це робити)
        if (!fs_1.default.existsSync(targetFolder)) {
            console.log(`[fileUpload][${timestamp}] Destination folder ${targetFolder} not found for fieldname "${file.fieldname}". Creating it.`);
            try {
                fs_1.default.mkdirSync(targetFolder, { recursive: true });
            }
            catch (mkdirError) {
                const err = mkdirError;
                console.error(`[fileUpload][${timestamp}] Failed to create directory ${targetFolder}:`, err.message);
                return cb(err, targetFolder); // Передаємо помилку в callback multer
            }
        }
        console.log(`[fileUpload][${timestamp}] Saving file with fieldname "${file.fieldname}" to: ${targetFolder}`);
        cb(null, targetFolder);
    },
    filename: (req, file, cb) => {
        const timestamp = new Date().toISOString();
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        let safeOriginalName = 'uploaded_file';
        if (file.originalname) {
            try {
                // Спроба декодувати, якщо браузер міг надіслати в іншому кодуванні
                safeOriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
            }
            catch (e) {
                safeOriginalName = file.originalname;
            }
            safeOriginalName = safeOriginalName
                .replace(/\s+/g, '_') // Замінюємо пробіли на підкреслення
                .replace(/[^\w.-]/g, ''); // Видаляємо всі символи, крім букв, цифр, підкреслень, крапок, дефісів
            if (!safeOriginalName || safeOriginalName === '.')
                safeOriginalName = `file${path_1.default.extname(file.originalname) || ''}`; // Якщо ім'я стало порожнім
        }
        const newFilename = `${uniqueSuffix}-${safeOriginalName}`;
        console.log(`[fileUpload][${timestamp}] Original filename: "${file.originalname}", Safe original name for saving: "${safeOriginalName}", Generated filename: "${newFilename}"`);
        cb(null, newFilename);
    },
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/; // Дозволені типи файлів
    const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    const timestamp = new Date().toISOString();
    if (mimetype && extname) {
        console.log(`[fileUpload][${timestamp}] File type accepted: ${file.originalname} (mimetype: ${file.mimetype})`);
        cb(null, true); // Прийняти файл
    }
    else {
        console.warn(`[fileUpload][${timestamp}] Unsupported file type attempted: ${file.originalname} (mimetype: ${file.mimetype})`);
        // Передаємо помилку в callback, щоб multer міг її обробити
        // Це дозволить нашому глобальному обробнику помилок її зловити
        cb(new Error("Unsupported file type. Only JPEG, JPG, PNG, GIF, WEBP are allowed."));
    }
};
const limits = {
    fileSize: 1024 * 1024 * 5 // 5 MB ліміт на розмір файлу
};
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: limits
});
exports.default = upload;
