// my-backend-app/src/routes/users.ts
import express from "express";
import {
  getAllUsers,
  deleteUser,
  // logoutUser, // Перенесено або буде в authController
  updatePassword,
  changeUserRole,
  followUserController,   
  unfollowUserController, 
  getUserProfileById,
  searchUsersController,
  updateMyDetailsController,
  getUserDetailsForAdminController, // Для адміна: отримати деталі
  adminEditUserDetailsController,  // Для адміна: оновити деталі
  getSelfFollowingController,     // Для /me/following
  getSelfFollowersController,     // Для /me/followers
  updateUserAvatar,              // Для оновлення аватара
  getUserByUID,                     // Для пошуку за UID, якщо такий маршрут буде
  logoutUser,
  getLatestUsersController
} from "../controllers/usersController"; // Переконайтесь, що всі ці контролери імпортовані

import { 
  loginUser, 
  registrateUser, 
  getCurrentUser, // Перейменовуємо, щоб уникнути конфлікту, якщо logoutUser є і в usersController
} from "../controllers/authController"; // Припускаємо, що logoutUser тепер тут або має бути тут

import validateUser from "../middleware/validateUser";
import auth from "../middleware/auth";
import upload from "../utils/fileUpload"; // Для updateUserAvatar
import { getMySavedPostsController } from "../controllers/postsController";

const router = express.Router();

// --- Маршрути автентифікації та реєстрації (зазвичай з authController) ---
router.post("/register", validateUser, registrateUser);
router.post("/login", loginUser);
router.post("/logout", auth, logoutUser); // Використовуємо logoutUser з authController, який оновлює last_logout


router.get("/me", auth,getCurrentUser);

// --- Маршрути, що стосуються поточного користувача (/me/...) ---
router.put("/me/details", auth, updateMyDetailsController);
router.get("/me/following", auth, getSelfFollowingController);
router.get("/me/followers", auth, getSelfFollowersController);
router.get("/me/saved-posts", auth, getMySavedPostsController);
router.put("/update-password", auth, updatePassword); // Оновлення власного пароля
router.get("/latest", getLatestUsersController);

// --- Маршрути адміністрування (починаються з /admin/) ---
router.get("/admin/details/:userId", auth, getUserDetailsForAdminController);
router.put("/admin/update/:userId", auth, adminEditUserDetailsController);
// router.put("/admin/change-role/:userId", auth, changeUserRole); // Можливо, краще так, ніж з тіла запиту

// --- Загальні маршрути (мають йти після більш специфічних) ---
router.get("/search", auth, searchUsersController); // Пошук користувачів
// router.get("/uid/:uid", auth, getUserByUID); // Якщо потрібен окремий маршрут для UID

// --- Маршрути, що стосуються конкретного користувача за ID (мають йти ПІСЛЯ /search, /admin/..., /me/...) ---
router.post("/:userId/follow", auth, followUserController); // Змінив порядок post на get, бо це дія над ресурсом :userId/follow
router.delete("/:userId/follow", auth, unfollowUserController);
router.get("/:userId", auth, getUserProfileById); // Отримання публічного профілю за ID
router.delete("/:userId", auth, deleteUser); // Видалення користувача (з перевіркою прав в контролері)
router.put("/avatar/:userId", auth, upload.single('userAvatar'), updateUserAvatar); // Оновлення аватара (змінив :id на :userId)
router.put("/change-role", auth, changeUserRole); // Цей маршрут приймає userId в тілі, що нормально для адмін дії

// --- Найбільш загальний маршрут для /users (список всіх) ---
router.get("/", auth, getAllUsers); 



export default router;