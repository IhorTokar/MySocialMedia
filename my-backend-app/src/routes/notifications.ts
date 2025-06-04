// my-backend-app/src/routes/notifications.ts
import express from "express";
import { getAllNotifications } from "../controllers/notificationsController";
import auth from "../middleware/auth";

const router = express.Router();

// GET /api/notifications - Отримати всі сповіщення для поточного користувача
router.get("/", auth, getAllNotifications);

// Можна додати маршрут для позначення сповіщень як прочитаних, якщо потрібно
// POST /api/notifications/:notificationId/read
// router.post("/:notificationId/read", auth, markNotificationAsReadController); 

export default router;