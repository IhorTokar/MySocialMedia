"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// my-backend-app/src/routes/notifications.ts
const express_1 = __importDefault(require("express"));
const notificationsController_1 = require("../controllers/notificationsController");
const auth_1 = __importDefault(require("../middleware/auth"));
const router = express_1.default.Router();
// GET /api/notifications - Отримати всі сповіщення для поточного користувача
router.get("/", auth_1.default, notificationsController_1.getAllNotifications);
// Можна додати маршрут для позначення сповіщень як прочитаних, якщо потрібно
// POST /api/notifications/:notificationId/read
// router.post("/:notificationId/read", auth, markNotificationAsReadController); 
exports.default = router;
