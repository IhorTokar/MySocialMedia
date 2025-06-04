"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// my-backend-app/src/routes/users.ts
const express_1 = __importDefault(require("express"));
const usersController_1 = require("../controllers/usersController"); // Переконайтесь, що всі ці контролери імпортовані
const authController_1 = require("../controllers/authController"); // Припускаємо, що logoutUser тепер тут або має бути тут
const validateUser_1 = __importDefault(require("../middleware/validateUser"));
const auth_1 = __importDefault(require("../middleware/auth"));
const fileUpload_1 = __importDefault(require("../utils/fileUpload")); // Для updateUserAvatar
const postsController_1 = require("../controllers/postsController");
const router = express_1.default.Router();
// --- Маршрути автентифікації та реєстрації (зазвичай з authController) ---
router.post("/register", validateUser_1.default, authController_1.registrateUser);
router.post("/login", authController_1.loginUser);
router.post("/logout", auth_1.default, usersController_1.logoutUser); // Використовуємо logoutUser з authController, який оновлює last_logout
router.get("/me", auth_1.default, authController_1.getCurrentUser);
// --- Маршрути, що стосуються поточного користувача (/me/...) ---
router.put("/me/details", auth_1.default, usersController_1.updateMyDetailsController);
router.get("/me/following", auth_1.default, usersController_1.getSelfFollowingController);
router.get("/me/followers", auth_1.default, usersController_1.getSelfFollowersController);
router.get("/me/saved-posts", auth_1.default, postsController_1.getMySavedPostsController);
router.put("/update-password", auth_1.default, usersController_1.updatePassword); // Оновлення власного пароля
router.get("/latest", usersController_1.getLatestUsersController);
// --- Маршрути адміністрування (починаються з /admin/) ---
router.get("/admin/details/:userId", auth_1.default, usersController_1.getUserDetailsForAdminController);
router.put("/admin/update/:userId", auth_1.default, usersController_1.adminEditUserDetailsController);
// router.put("/admin/change-role/:userId", auth, changeUserRole); // Можливо, краще так, ніж з тіла запиту
// --- Загальні маршрути (мають йти після більш специфічних) ---
router.get("/search", auth_1.default, usersController_1.searchUsersController); // Пошук користувачів
// router.get("/uid/:uid", auth, getUserByUID); // Якщо потрібен окремий маршрут для UID
// --- Маршрути, що стосуються конкретного користувача за ID (мають йти ПІСЛЯ /search, /admin/..., /me/...) ---
router.post("/:userId/follow", auth_1.default, usersController_1.followUserController); // Змінив порядок post на get, бо це дія над ресурсом :userId/follow
router.delete("/:userId/follow", auth_1.default, usersController_1.unfollowUserController);
router.get("/:userId", auth_1.default, usersController_1.getUserProfileById); // Отримання публічного профілю за ID
router.delete("/:userId", auth_1.default, usersController_1.deleteUser); // Видалення користувача (з перевіркою прав в контролері)
router.put("/avatar/:userId", auth_1.default, fileUpload_1.default.single('userAvatar'), usersController_1.updateUserAvatar); // Оновлення аватара (змінив :id на :userId)
router.put("/change-role", auth_1.default, usersController_1.changeUserRole); // Цей маршрут приймає userId в тілі, що нормально для адмін дії
// --- Найбільш загальний маршрут для /users (список всіх) ---
router.get("/", auth_1.default, usersController_1.getAllUsers);
exports.default = router;
