// my-backend-app/src/routes/messages.ts
import express from "express";
import {
  getUserMessages, addNewMessage, deleteMessage, getUserChats,
  updateMessage // <--- Імпортуємо новий контролер
} from "../controllers/messagesController";
import auth from "../middleware/auth";

const router = express.Router();

router.get("/chats", auth, getUserChats);
router.get("/", auth, getUserMessages); 
router.post("/", auth, addNewMessage);

// Оновлений маршрут для повідомлення: DELETE для видалення, PUT для оновлення
router.route("/:messageId")
  .put(auth, updateMessage) // <--- НОВИЙ МАРШРУТ ДЛЯ РЕДАГУВАННЯ
  .delete(auth, deleteMessage);

export default router;