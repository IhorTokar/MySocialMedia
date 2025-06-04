"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const users_1 = __importDefault(require("./users"));
const posts_1 = __importDefault(require("./posts"));
const messages_1 = __importDefault(require("./messages"));
const uploads_1 = __importDefault(require("./uploads"));
const notifications_1 = __importDefault(require("./notifications"));
const router = express_1.default.Router();
// Логування кожного запиту (для дебагу)
router.use((req, res, next) => {
    console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
// Основні маршрути
router.use("/users", users_1.default);
router.use("/posts", posts_1.default);
router.use("/messages", messages_1.default);
router.use("/uploads", uploads_1.default);
router.use("/notifications", notifications_1.default);
// Обробка помилкових маршрутів
router.use("*", (req, res) => {
    res.status(404).json({ error: "🚫 Route not found" });
});
exports.default = router;
