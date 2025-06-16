// my-backend-app/src/controllers/usersController.ts
import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import {
  getUsersWithFollowStatus,
  deleteUserFromDB,
  getUserByEmailFromDB,
  // checkEmailExistsInDB, // Якщо не використовується, можна прибрати
  updatePasswordInDB,
  updateUserRole,
  updateUserAvatarInDB,
  getUserByUIDFromDB,
  getUserByIdFromDB,
  getPrivateUserDataByUserId,
  followUserInDB,
  unfollowUserInDB,
  searchUsersInDB,
  updateUserLastLogoutTime, // Для logoutUser
  updateUserDetailsInDB, // Для updateMyDetailsController
  getFullUserProfileByIdForAdmin, // Для getUserDetailsForAdminController
  getAuthenticatedUserProfileData, // Для updateMyDetailsController (і для getCurrentUser в authController)
  adminUpdateUserCoreDetails,
  getFollowingListForUser,
  getFollowersListForUser,
  getLatestUsersFromDB,
  getFullUserByID,
} from "../models/userModel";
import { AdminUserDetailsUpdatePayload } from "../types/userTypes";
import fs from 'fs/promises';   // <--- ДОДАНО ІМПОРТ fs.promises
import path from 'path'; 

// Інтерфейс для тіла запиту при оновленні деталей
interface UserDetailsUpdatePayload {
  display_name?: string;
  about_me?: string;
  phone?: string;
  gender?: string;
}

// ========================================================================
// ==                      GET Request Handlers                          ==
// ========================================================================

const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const currentUserId = req.user?.userID;
  const page = parseInt(String(req.query.page || '1'), 10);
  const limit = parseInt(String(req.query.limit || '10'), 10);
  const offset = (page - 1) * limit;

  if (!currentUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return; 
  }
  try {
    const { users, totalCount } = await getUsersWithFollowStatus(currentUserId, limit, offset);
    res.json({
        users,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount
    });
  } catch (error) {
    next(error);
  }
};

const getUserByUID = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { uid } = req.params;
  if (!uid) {
    /* ... */ return;
  }
  try {
    const user = await getUserByUIDFromDB(uid);
    if (!user) {
      /* ... */ return;
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const getUserProfileById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const targetUserIdParam = req.params.userId;
    const targetUserId = parseInt(targetUserIdParam, 10);
    const currentAuthUserId = req.user?.userID; // ID залогіненого користувача з токена

    if (isNaN(targetUserId)) {
      res.status(400).json({ error: "Invalid User ID format" });
      return;
    }

    // Передаємо targetUserId та currentAuthUserId (може бути undefined, якщо запит неавторизований)
    const userProfile = await getUserByIdFromDB(
      targetUserId,
      currentAuthUserId
    );

    if (!userProfile) {
      res.status(404).json({ error: "User profile not found" });
      return;
    }

    // userProfile вже містить isFollowedByCurrentUser, якщо currentAuthUserId був переданий
    res.json(userProfile);
  } catch (error) {
    next(error);
  }
};

const searchUsersController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const searchQuery = String(req.query.q || '');
  const currentAuthUserId = req.user?.userID;
  const page = parseInt(String(req.query.page || '1'), 10);
  const limit = parseInt(String(req.query.limit || '10'), 10);
  const offset = (page - 1) * limit;

  if (!searchQuery.trim()) {
    res.status(400).json({ error: "Search query 'q' is required." });
    return;
  }
  try {
    const { users, totalCount } = await searchUsersInDB(searchQuery.trim(), limit, offset, currentAuthUserId);
    res.json({
        users: users || [],
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
    });
  } catch (error) {
    next(error);
  }
};

const getUserDetailsForAdminController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.user?.role !== "admin") {
    /* ... */ return;
  }
  const userIdToView = parseInt(req.params.userId, 10);
  if (isNaN(userIdToView)) {
    /* ... */ return;
  }
  try {
    const userProfile = await getFullUserProfileByIdForAdmin(userIdToView);
    if (!userProfile) {
      /* ... */ return;
    }
    res.json(userProfile); // Пам'ятайте про небезпеку повернення всіх даних, навіть адміну
  } catch (error) {
    next(error);
  }
};

// ========================================================================
// ==                   POST/PUT/DELETE Request Handlers                 ==
// ========================================================================

const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userIdFromToken = req.user?.userID;
  const userIdToDelete = parseInt(req.params.id, 10);
  const userMakingRequestRole = req.user?.role;
  if (isNaN(userIdToDelete)) {
    /* ... */ return;
  }
  if (userIdFromToken !== userIdToDelete && userMakingRequestRole !== "admin") {
    /* ... */ return;
  }
  try {
    await deleteUserFromDB(userIdToDelete);
    res
      .status(200)
      .json({ message: `User with ID ${userIdToDelete} deleted successfully` });
  } catch (error) {
    /* ... */ next(error);
  }
};

export const deleteMyAccountController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Отримуємо ID користувача з токена автентифікації
  const userIdFromToken = req.user?.userID;
  // Отримуємо пароль з тіла запиту (який надсилає фронтенд)
  const { password } = req.body; 

  if (!userIdFromToken) {
    res.status(401).json({ error: "Unauthorized: User ID not found in token." });
    return;
  }

  if (!password) {
    res.status(400).json({ error: "Password is required to delete the account." });
    return;
  }

  try {
    const user = await getFullUserByID(userIdFromToken); 
    
    // Перевірка, чи користувача знайдено і чи є у нього хеш пароля
    if (!user || !user.password_hash) { 
      res.status(404).json({ error: "User not found or password hash missing." });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash); // <-- Порівнюємо з password_hash
    
    // Якщо пароль невірний, повертаємо помилку 403 Forbidden
    if (!isPasswordValid) {
      res.status(403).json({ error: "Incorrect password. Account deletion failed." });
      return;
    }

    await deleteUserFromDB(userIdFromToken);

    res.status(200).json({ message: "Account deleted successfully." });
  } catch (error) {
    // Обробка помилок бази даних або інших непередбачених помилок
    console.error(`Error in deleteMyAccountController for user ${userIdFromToken}:`, error);
    
    // Специфічна обробка, якщо deleteUserFromDB кидає помилку "User not found"
    if (error instanceof Error && error.message.includes("User not found")) {
        res.status(404).json({ error: "User not found." });
    } else {
        // Передача помилки наступному middleware (вашому централізованому обробнику помилок)
        next(error); 
    }
  }
};


const updatePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.userID;
  const { oldPassword, newPassword } = req.body;
  if (!userId) {
    /* ... */ return;
  }
  if (
    !oldPassword ||
    !newPassword ||
    typeof newPassword !== "string" ||
    newPassword.length < 8 ||
    oldPassword === newPassword
  ) {
    /* ... */ return;
  }
  try {
    const privateUserData = await getPrivateUserDataByUserId(userId);
    if (!privateUserData || !privateUserData.password_hash) {
      /* ... */ return;
    }
    const isMatch = await bcrypt.compare(
      oldPassword,
      privateUserData.password_hash
    );
    if (!isMatch) {
      /* ... */ return;
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await updatePasswordInDB(userId, hashedNewPassword);
    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    /* ... */ next(error);
  }
};

const changeUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Тут має бути перевірка на адміна req.user?.role === 'admin'
  if (req.user?.role !== "admin") {
    res
      .status(403)
      .json({ error: "Forbidden: Only admins can change user roles." });
    return;
  }
  const { userId, newRole } = req.body;
  const userIdNum = parseInt(userId, 10);
  if (isNaN(userIdNum) || !newRole) {
    /* ... */ return;
  }
  const validRoles = ["user", "admin", "moderator"];
  if (!validRoles.includes(newRole)) {
    /* ... */ return;
  }
  try {
    await updateUserRole(userIdNum, newRole);
    res
      .status(200)
      .json({
        message: `User role for user ID ${userIdNum} updated successfully to ${newRole}.`,
      });
  } catch (error) {
    /* ... */ next(error);
  }
};

const updateUserAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const typedReq = req as (Request & { user?: { userID: number, role?: string }, file?: Express.Multer.File });

  const userIdToUpdate = parseInt(req.params.userId, 10);
  const userIdFromToken = typedReq.user?.userID;
  const userRoleFromToken = typedReq.user?.role;

  const timestamp = new Date().toISOString();
  console.log(`[usersController][${timestamp}] Attempting to update avatar for userIdToUpdate: ${userIdToUpdate}, by userIdFromToken: ${userIdFromToken}, role: ${userRoleFromToken}`);

  if (isNaN(userIdToUpdate)) {
     res.status(400).json({ error: "Invalid User ID format in URL." });
     return;
  }
  if (!userIdFromToken) {
      res.status(401).json({ error: "Unauthorized: User not authenticated." });
      return
  }
  if (userIdFromToken !== userIdToUpdate && userRoleFromToken !== "admin") {
     res.status(403).json({ error: "Permission denied. You can only update your own avatar." });
     return
  }
  if (!typedReq.file) {
     res.status(400).json({ error: "Файл аватара не завантажено." });
     return
  }

  const newAvatarFilename = typedReq.file.filename;

  try {
    const oldAvatarFilename = await updateUserAvatarInDB(userIdToUpdate, newAvatarFilename);

    if (oldAvatarFilename &&
        typeof oldAvatarFilename === 'string' &&
        oldAvatarFilename.trim() !== '' &&
        oldAvatarFilename !== 'default_avatar.png' &&
        !oldAvatarFilename.toLowerCase().includes('default_avatar.png')) { // Перевірка без урахування регістру

      // path.basename для безпеки, якщо oldAvatarFilename містить шлях
      const safeOldFilename = path.basename(oldAvatarFilename);
      const oldAvatarServerPath = path.resolve(__dirname, '../../uploads/avatars', safeOldFilename); // <--- 'avatars' (нижній регістр)

      console.log(`[usersController][${timestamp}] Attempting to delete old avatar file: ${oldAvatarServerPath}`);
      try {
        await fs.access(oldAvatarServerPath);
        await fs.unlink(oldAvatarServerPath);
        console.log(`[usersController][${timestamp}] Successfully deleted old avatar file: ${oldAvatarServerPath}`);
      } catch (unlinkError) {
        const unlinkErr = unlinkError as Error;
        if (unlinkErr.message.includes('ENOENT')) {
             console.warn(`[usersController][${timestamp}] Old avatar file not found, skipping deletion: ${oldAvatarServerPath}`);
        } else {
            console.warn(`[usersController][${timestamp}] Could not delete old avatar file '${oldAvatarServerPath}':`, unlinkErr.message);
        }
      }
    }

    res.status(200).json({
        message: "Avatar updated successfully",
        avatarFilename: newAvatarFilename, // Повертаємо тільки ім'я файлу
    });

  } catch (error) {
    if (typedReq.file && typedReq.file.path) {
        try {
            console.warn(`[usersController][${timestamp}] Error during DB update for avatar. Attempting to delete uploaded file: ${typedReq.file.path}`);
            await fs.unlink(typedReq.file.path);
            console.log(`[usersController][${timestamp}] Rolled back uploaded file due to DB error: ${typedReq.file.path}`);
        } catch (cleanupError) {
            console.error(`[usersController][${timestamp}] Error cleaning up uploaded file ${typedReq.file.path} after DB error:`, cleanupError);
        }
    }
    next(error);
  }
};


const getUserByEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Цей ендпоінт може бути небезпечним, якщо він публічний і повертає забагато даних
  // Краще використовувати його тільки для внутрішніх потреб або з обмеженнями
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    /* ... */ return;
  }
  try {
    const user = await getUserByEmailFromDB(email); // Повертає об'єднані дані, включаючи password_hash!
    if (!user) {
      /* ... */ return;
    }
    const { password_hash, ...userDataToSend } = user; // Видаляємо хеш
    res.status(200).json(userDataToSend);
  } catch (error) {
    next(error);
  }
};

const followUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const followerId = req.user?.userID;
  const followingIdParam = req.params.userId;
  if (!followerId) {
    /* ... */ return;
  }
  const followingId = parseInt(followingIdParam, 10);
  if (isNaN(followingId)) {
    /* ... */ return;
  }
  if (followerId === followingId) {
    /* ... */ return;
  }
  try {
    await followUserInDB(followerId, followingId);
    res
      .status(200)
      .json({ message: `Successfully followed user ${followingId}` });
  } catch (error) {
    next(error);
  }
};

const unfollowUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const followerId = req.user?.userID;
  const followingIdParam = req.params.userId;
  if (!followerId) {
    /* ... */ return;
  }
  const followingId = parseInt(followingIdParam, 10);
  if (isNaN(followingId)) {
    /* ... */ return;
  }
  if (followerId === followingId) {
    /* ... */ return;
  }
  try {
    await unfollowUserInDB(followerId, followingId);
    res
      .status(200)
      .json({ message: `Successfully unfollowed user ${followingId}` });
  } catch (error) {
    next(error);
  }
};

// Функція logoutUser була перенесена до authController.ts або має бути оновлена тут
// Я залишу вашу поточну реалізацію logoutUser, яку ви надали, оскільки вона вже async
const logoutUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.userID;
  try {
    if (userId) {
      await updateUserLastLogoutTime(userId);
    }
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error(
      "Error during logout process, but clearing cookie anyway:",
      error
    );
    res.clearCookie("token", {
      /* ... */
    });
    res
      .status(200)
      .json({ message: "Logout processed, but with internal issues." });
  }
};

const updateMyDetailsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.userID;

  if (!userId) {
    res
      .status(401)
      .json({ error: "Unauthorized: User ID not found in token." });
    return;
  }

  const { display_name, about_me, phone, gender } =
    req.body as UserDetailsUpdatePayload;

  const detailsToUpdate: UserDetailsUpdatePayload = {};
  if (display_name !== undefined) detailsToUpdate.display_name = display_name;
  if (about_me !== undefined) detailsToUpdate.about_me = about_me;
  if (phone !== undefined) detailsToUpdate.phone = phone;
  if (gender !== undefined) detailsToUpdate.gender = gender;

  if (Object.keys(detailsToUpdate).length === 0) {
    res.status(400).json({ error: "No details provided for update." });
    return;
  }

  try {
    const wasUpdated = await updateUserDetailsInDB(userId, detailsToUpdate);
    const currentFullProfile = await getAuthenticatedUserProfileData(userId);

    if (!currentFullProfile) {
      // Це дуже малоймовірно, якщо користувач авторизований
      return next(
        new Error("Failed to retrieve user profile after update attempt.")
      );
    }

    // Формуємо відповідь в узгодженій структурі
    const responsePayload = {
      user: {
        user_id: currentFullProfile.user_id,
        username: currentFullProfile.userName,
        display_name: currentFullProfile.displayName,
        uid: currentFullProfile.uid,
        profile_picture_url: currentFullProfile.profile_picture_url,
        gender: currentFullProfile.gender,
        user_avatar_url: currentFullProfile.user_avatar_url,
        about_me: currentFullProfile.about_me,
        created_at: currentFullProfile.created_at,
        last_logout: currentFullProfile.last_logout,
      },
      email: currentFullProfile.email,
      phone: currentFullProfile.phone,
      role: currentFullProfile.role,
      date_of_birth: currentFullProfile.date_of_birth,
    };

    if (wasUpdated) {
      console.log(
        `User details updated for userId ${userId}. Data sent to frontend:`,
        responsePayload
      );
      res.status(200).json(responsePayload);
    } else {
      console.log(
        `User details submitted for userId ${userId}, but no actual changes were made in DB. Current data sent to frontend:`,
        responsePayload
      );
      // Якщо дані не змінилися, все одно повертаємо поточний профіль з повідомленням
      // Розгортаємо responsePayload в об'єкт відповіді, щоб message був поруч з іншими полями
      res.status(200).json({
        message: "No changes were applied (data might be the same as current).",
        // Розгортаємо тут, щоб у відповіді були 'user', 'email', 'phone' і т.д.
        user: responsePayload.user,
        email: responsePayload.email,
        phone: responsePayload.phone,
        role: responsePayload.role,
        date_of_birth: responsePayload.date_of_birth,
        // Або просто: ...responsePayload (якщо message не конфліктує з полями в responsePayload)
        // Краще явно перерахувати, щоб уникнути несподіванок, або щоб message був окремим полем:
        // data: responsePayload
      });
    }
  } catch (error) {
    next(error);
  }
};

const adminEditUserDetailsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.user?.role !== "admin") {
    res
      .status(403)
      .json({ error: "Доступ заборонено: потрібні права адміністратора." });
    return;
  }

  const userIdToEdit = parseInt(req.params.userId, 10);
  if (isNaN(userIdToEdit)) {
    res
      .status(400)
      .json({ error: "Некоректний ID користувача в параметрах запиту." });
    return;
  }

  const { username, display_name, about_me, gender, email, phone } =
    req.body as AdminUserDetailsUpdatePayload;

  // Базова валідація (додайте більш детальну за потреби)
  if (email && !/.+@.+\..+/.test(email)) {
    // Проста перевірка формату email
    res.status(400).json({ error: "Некоректний формат email." });
    return;
  }
  // Можна додати перевірку довжини username, display_name тощо.

  const detailsToUpdate: AdminUserDetailsUpdatePayload = {};
  if (username !== undefined) detailsToUpdate.username = username;
  if (display_name !== undefined) detailsToUpdate.display_name = display_name;
  if (about_me !== undefined) detailsToUpdate.about_me = about_me;
  if (gender !== undefined) detailsToUpdate.gender = gender;
  if (email !== undefined) detailsToUpdate.email = email;
  if (phone !== undefined) detailsToUpdate.phone = phone;

  if (Object.keys(detailsToUpdate).length === 0) {
    res.status(400).json({ error: "Не надано жодних даних для оновлення." });
    return;
  }

  try {
    const wasUpdated = await adminUpdateUserCoreDetails(
      userIdToEdit,
      detailsToUpdate
    );

    // Повертаємо повний оновлений профіль користувача
    const updatedFullProfile =
      await getAuthenticatedUserProfileData(userIdToEdit);
    if (!updatedFullProfile) {
      // Малоймовірно, якщо оновлення пройшло, але для безпеки
      return next(
        new Error(
          "Не вдалося отримати оновлений профіль користувача після збереження змін."
        )
      );
    }

    // Структуруємо відповідь так само, як /api/users/me
    const responsePayload = {
      user: {
        user_id: updatedFullProfile.user_id,
        username: updatedFullProfile.userName,
        display_name: updatedFullProfile.displayName,
        uid: updatedFullProfile.uid,
        profile_picture_url: updatedFullProfile.profile_picture_url,
        gender: updatedFullProfile.gender,
        user_avatar_url: updatedFullProfile.user_avatar_url,
        about_me: updatedFullProfile.about_me,
        created_at: updatedFullProfile.created_at,
        last_logout: updatedFullProfile.last_logout,
      },
      email: updatedFullProfile.email,
      phone: updatedFullProfile.phone,
      role: updatedFullProfile.role,
      date_of_birth: updatedFullProfile.date_of_birth,
    };

    if (wasUpdated) {
      res
        .status(200)
        .json({
          message: "Дані користувача успішно оновлено адміном.",
          userProfile: responsePayload,
        });
    } else {
      res
        .status(200)
        .json({
          message: "Дані не були змінені (можливо, вони вже актуальні).",
          userProfile: responsePayload,
        });
    }
  } catch (error) {
    // Обробка помилок унікальності з моделі
    if (
      error instanceof Error &&
      error.message.includes("вже використовується")
    ) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
};

const getSelfFollowingController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const currentUserId = req.user?.userID;
  const page = parseInt(String(req.query.page || '1'), 10);
  const limit = parseInt(String(req.query.limit || '10'), 10);
  const offset = (page - 1) * limit;

  if (!currentUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { users, totalCount } = await getFollowingListForUser(currentUserId, limit, offset, currentUserId);
    res.json({
      users,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalItems: totalCount,
    });
  } catch (error) {
    next(error);
  }
};

const getSelfFollowersController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const currentUserId = req.user?.userID;
  const page = parseInt(String(req.query.page || '1'), 10);
  const limit = parseInt(String(req.query.limit || '10'), 10);
  const offset = (page - 1) * limit;

  if (!currentUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { users, totalCount } = await getFollowersListForUser(currentUserId, limit, offset, currentUserId);
    res.json({
      users,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalItems: totalCount,
    });
  } catch (error) {
    next(error);
  }
};

const getLatestUsersController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const currentAuthUserId = req.user?.userID;
  const page = parseInt(String(req.query.page || '1'), 10);
  const limit = parseInt(String(req.query.limit || '3'), 10); // Залишаємо дефолт 3, якщо такий був
  const offset = (page - 1) * limit;

  try {
    const { users, totalCount } = await getLatestUsersFromDB(limit, offset, currentAuthUserId);
    res.json({
      users,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalItems: totalCount,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================================================
// ==                           Exports                                  ==
// ========================================================================
export {
  getAllUsers,
  getUserByUID,
  getUserProfileById,
  searchUsersController,
  getUserDetailsForAdminController,
  deleteUser,
  updatePassword,
  changeUserRole,
  updateUserAvatar,
  getUserByEmail, // Будьте обережні з цим ендпоінтом, якщо він публічний
  followUserController,
  unfollowUserController,
  logoutUser, // Експортуємо оновлену версію
  updateMyDetailsController,
  adminEditUserDetailsController,
  getSelfFollowingController,
  getSelfFollowersController,
  getLatestUsersController,
};
