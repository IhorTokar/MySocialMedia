import express from "express";
import userRoutes from "./users";
import postRoutes from "./posts";
import messageRoutes from "./messages";
import upload from "./uploads";
import notificationRoutes from "./notifications"
const router = express.Router();

// Логування кожного запиту (для дебагу)
router.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Основні маршрути
router.use("/users", userRoutes);
router.use("/posts", postRoutes);
router.use("/messages", messageRoutes);
router.use("/uploads", upload);
router.use("/notifications", notificationRoutes);
// Обробка помилкових маршрутів
router.use("*", (req, res) => {
  res.status(404).json({ error: "🚫 Route not found" });
});

export default router;
