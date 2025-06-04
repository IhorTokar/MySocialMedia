"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// my-backend-app/src/routes/messages.ts
const express_1 = __importDefault(require("express"));
const messagesController_1 = require("../controllers/messagesController");
const auth_1 = __importDefault(require("../middleware/auth"));
const router = express_1.default.Router();
router.get("/chats", auth_1.default, messagesController_1.getUserChats);
router.get("/", auth_1.default, messagesController_1.getUserMessages);
router.post("/", auth_1.default, messagesController_1.addNewMessage);
// Оновлений маршрут для повідомлення: DELETE для видалення, PUT для оновлення
router.route("/:messageId")
    .put(auth_1.default, messagesController_1.updateMessage) // <--- НОВИЙ МАРШРУТ ДЛЯ РЕДАГУВАННЯ
    .delete(auth_1.default, messagesController_1.deleteMessage);
exports.default = router;
