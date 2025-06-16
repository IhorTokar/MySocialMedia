"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestUsersController = exports.getSelfFollowersController = exports.getSelfFollowingController = exports.adminEditUserDetailsController = exports.updateMyDetailsController = exports.logoutUser = exports.unfollowUserController = exports.followUserController = exports.getUserByEmail = exports.updateUserAvatar = exports.changeUserRole = exports.updatePassword = exports.deleteUser = exports.getUserDetailsForAdminController = exports.searchUsersController = exports.getUserProfileById = exports.getUserByUID = exports.getAllUsers = exports.deleteMyAccountController = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const userModel_1 = require("../models/userModel");
const promises_1 = __importDefault(require("fs/promises")); // <--- ДОДАНО ІМПОРТ fs.promises
const path_1 = __importDefault(require("path"));
// ========================================================================
// ==                      GET Request Handlers                          ==
// ========================================================================
const getAllUsers = async (req, res, next) => {
    const currentUserId = req.user?.userID;
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = parseInt(String(req.query.limit || '10'), 10);
    const offset = (page - 1) * limit;
    if (!currentUserId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const { users, totalCount } = await (0, userModel_1.getUsersWithFollowStatus)(currentUserId, limit, offset);
        res.json({
            users,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalItems: totalCount
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllUsers = getAllUsers;
const getUserByUID = async (req, res, next) => {
    const { uid } = req.params;
    if (!uid) {
        /* ... */ return;
    }
    try {
        const user = await (0, userModel_1.getUserByUIDFromDB)(uid);
        if (!user) {
            /* ... */ return;
        }
        res.json(user);
    }
    catch (error) {
        next(error);
    }
};
exports.getUserByUID = getUserByUID;
const getUserProfileById = async (req, res, next) => {
    try {
        const targetUserIdParam = req.params.userId;
        const targetUserId = parseInt(targetUserIdParam, 10);
        const currentAuthUserId = req.user?.userID; // ID залогіненого користувача з токена
        if (isNaN(targetUserId)) {
            res.status(400).json({ error: "Invalid User ID format" });
            return;
        }
        // Передаємо targetUserId та currentAuthUserId (може бути undefined, якщо запит неавторизований)
        const userProfile = await (0, userModel_1.getUserByIdFromDB)(targetUserId, currentAuthUserId);
        if (!userProfile) {
            res.status(404).json({ error: "User profile not found" });
            return;
        }
        // userProfile вже містить isFollowedByCurrentUser, якщо currentAuthUserId був переданий
        res.json(userProfile);
    }
    catch (error) {
        next(error);
    }
};
exports.getUserProfileById = getUserProfileById;
const searchUsersController = async (req, res, next) => {
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
        const { users, totalCount } = await (0, userModel_1.searchUsersInDB)(searchQuery.trim(), limit, offset, currentAuthUserId);
        res.json({
            users: users || [],
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalItems: totalCount,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.searchUsersController = searchUsersController;
const getUserDetailsForAdminController = async (req, res, next) => {
    if (req.user?.role !== "admin") {
        /* ... */ return;
    }
    const userIdToView = parseInt(req.params.userId, 10);
    if (isNaN(userIdToView)) {
        /* ... */ return;
    }
    try {
        const userProfile = await (0, userModel_1.getFullUserProfileByIdForAdmin)(userIdToView);
        if (!userProfile) {
            /* ... */ return;
        }
        res.json(userProfile); // Пам'ятайте про небезпеку повернення всіх даних, навіть адміну
    }
    catch (error) {
        next(error);
    }
};
exports.getUserDetailsForAdminController = getUserDetailsForAdminController;
// ========================================================================
// ==                   POST/PUT/DELETE Request Handlers                 ==
// ========================================================================
const deleteUser = async (req, res, next) => {
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
        await (0, userModel_1.deleteUserFromDB)(userIdToDelete);
        res
            .status(200)
            .json({ message: `User with ID ${userIdToDelete} deleted successfully` });
    }
    catch (error) {
        /* ... */ next(error);
    }
};
exports.deleteUser = deleteUser;
const deleteMyAccountController = async (req, res, next) => {
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
        const user = await (0, userModel_1.getFullUserByID)(userIdFromToken);
        // Перевірка, чи користувача знайдено і чи є у нього хеш пароля
        if (!user || !user.password_hash) {
            res.status(404).json({ error: "User not found or password hash missing." });
            return;
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password_hash); // <-- Порівнюємо з password_hash
        // Якщо пароль невірний, повертаємо помилку 403 Forbidden
        if (!isPasswordValid) {
            res.status(403).json({ error: "Incorrect password. Account deletion failed." });
            return;
        }
        await (0, userModel_1.deleteUserFromDB)(userIdFromToken);
        res.status(200).json({ message: "Account deleted successfully." });
    }
    catch (error) {
        // Обробка помилок бази даних або інших непередбачених помилок
        console.error(`Error in deleteMyAccountController for user ${userIdFromToken}:`, error);
        // Специфічна обробка, якщо deleteUserFromDB кидає помилку "User not found"
        if (error instanceof Error && error.message.includes("User not found")) {
            res.status(404).json({ error: "User not found." });
        }
        else {
            // Передача помилки наступному middleware (вашому централізованому обробнику помилок)
            next(error);
        }
    }
};
exports.deleteMyAccountController = deleteMyAccountController;
const updatePassword = async (req, res, next) => {
    const userId = req.user?.userID;
    const { oldPassword, newPassword } = req.body;
    if (!userId) {
        /* ... */ return;
    }
    if (!oldPassword ||
        !newPassword ||
        typeof newPassword !== "string" ||
        newPassword.length < 8 ||
        oldPassword === newPassword) {
        /* ... */ return;
    }
    try {
        const privateUserData = await (0, userModel_1.getPrivateUserDataByUserId)(userId);
        if (!privateUserData || !privateUserData.password_hash) {
            /* ... */ return;
        }
        const isMatch = await bcrypt_1.default.compare(oldPassword, privateUserData.password_hash);
        if (!isMatch) {
            /* ... */ return;
        }
        const hashedNewPassword = await bcrypt_1.default.hash(newPassword, 10);
        await (0, userModel_1.updatePasswordInDB)(userId, hashedNewPassword);
        res.status(200).json({ message: "Password updated successfully." });
    }
    catch (error) {
        /* ... */ next(error);
    }
};
exports.updatePassword = updatePassword;
const changeUserRole = async (req, res, next) => {
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
        await (0, userModel_1.updateUserRole)(userIdNum, newRole);
        res
            .status(200)
            .json({
            message: `User role for user ID ${userIdNum} updated successfully to ${newRole}.`,
        });
    }
    catch (error) {
        /* ... */ next(error);
    }
};
exports.changeUserRole = changeUserRole;
const updateUserAvatar = async (req, res, next) => {
    const typedReq = req;
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
        return;
    }
    if (userIdFromToken !== userIdToUpdate && userRoleFromToken !== "admin") {
        res.status(403).json({ error: "Permission denied. You can only update your own avatar." });
        return;
    }
    if (!typedReq.file) {
        res.status(400).json({ error: "Файл аватара не завантажено." });
        return;
    }
    const newAvatarFilename = typedReq.file.filename;
    try {
        const oldAvatarFilename = await (0, userModel_1.updateUserAvatarInDB)(userIdToUpdate, newAvatarFilename);
        if (oldAvatarFilename &&
            typeof oldAvatarFilename === 'string' &&
            oldAvatarFilename.trim() !== '' &&
            oldAvatarFilename !== 'default_avatar.png' &&
            !oldAvatarFilename.toLowerCase().includes('default_avatar.png')) { // Перевірка без урахування регістру
            // path.basename для безпеки, якщо oldAvatarFilename містить шлях
            const safeOldFilename = path_1.default.basename(oldAvatarFilename);
            const oldAvatarServerPath = path_1.default.resolve(__dirname, '../../uploads/avatars', safeOldFilename); // <--- 'avatars' (нижній регістр)
            console.log(`[usersController][${timestamp}] Attempting to delete old avatar file: ${oldAvatarServerPath}`);
            try {
                await promises_1.default.access(oldAvatarServerPath);
                await promises_1.default.unlink(oldAvatarServerPath);
                console.log(`[usersController][${timestamp}] Successfully deleted old avatar file: ${oldAvatarServerPath}`);
            }
            catch (unlinkError) {
                const unlinkErr = unlinkError;
                if (unlinkErr.message.includes('ENOENT')) {
                    console.warn(`[usersController][${timestamp}] Old avatar file not found, skipping deletion: ${oldAvatarServerPath}`);
                }
                else {
                    console.warn(`[usersController][${timestamp}] Could not delete old avatar file '${oldAvatarServerPath}':`, unlinkErr.message);
                }
            }
        }
        res.status(200).json({
            message: "Avatar updated successfully",
            avatarFilename: newAvatarFilename, // Повертаємо тільки ім'я файлу
        });
    }
    catch (error) {
        if (typedReq.file && typedReq.file.path) {
            try {
                console.warn(`[usersController][${timestamp}] Error during DB update for avatar. Attempting to delete uploaded file: ${typedReq.file.path}`);
                await promises_1.default.unlink(typedReq.file.path);
                console.log(`[usersController][${timestamp}] Rolled back uploaded file due to DB error: ${typedReq.file.path}`);
            }
            catch (cleanupError) {
                console.error(`[usersController][${timestamp}] Error cleaning up uploaded file ${typedReq.file.path} after DB error:`, cleanupError);
            }
        }
        next(error);
    }
};
exports.updateUserAvatar = updateUserAvatar;
const getUserByEmail = async (req, res, next) => {
    // Цей ендпоінт може бути небезпечним, якщо він публічний і повертає забагато даних
    // Краще використовувати його тільки для внутрішніх потреб або з обмеженнями
    const { email } = req.body;
    if (!email || typeof email !== "string") {
        /* ... */ return;
    }
    try {
        const user = await (0, userModel_1.getUserByEmailFromDB)(email); // Повертає об'єднані дані, включаючи password_hash!
        if (!user) {
            /* ... */ return;
        }
        const { password_hash, ...userDataToSend } = user; // Видаляємо хеш
        res.status(200).json(userDataToSend);
    }
    catch (error) {
        next(error);
    }
};
exports.getUserByEmail = getUserByEmail;
const followUserController = async (req, res, next) => {
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
        await (0, userModel_1.followUserInDB)(followerId, followingId);
        res
            .status(200)
            .json({ message: `Successfully followed user ${followingId}` });
    }
    catch (error) {
        next(error);
    }
};
exports.followUserController = followUserController;
const unfollowUserController = async (req, res, next) => {
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
        await (0, userModel_1.unfollowUserInDB)(followerId, followingId);
        res
            .status(200)
            .json({ message: `Successfully unfollowed user ${followingId}` });
    }
    catch (error) {
        next(error);
    }
};
exports.unfollowUserController = unfollowUserController;
// Функція logoutUser була перенесена до authController.ts або має бути оновлена тут
// Я залишу вашу поточну реалізацію logoutUser, яку ви надали, оскільки вона вже async
const logoutUser = async (req, res, next) => {
    const userId = req.user?.userID;
    try {
        if (userId) {
            await (0, userModel_1.updateUserLastLogoutTime)(userId);
        }
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });
        res.status(200).json({ message: "Logout successful" });
    }
    catch (error) {
        console.error("Error during logout process, but clearing cookie anyway:", error);
        res.clearCookie("token", {
        /* ... */
        });
        res
            .status(200)
            .json({ message: "Logout processed, but with internal issues." });
    }
};
exports.logoutUser = logoutUser;
const updateMyDetailsController = async (req, res, next) => {
    const userId = req.user?.userID;
    if (!userId) {
        res
            .status(401)
            .json({ error: "Unauthorized: User ID not found in token." });
        return;
    }
    const { display_name, about_me, phone, gender } = req.body;
    const detailsToUpdate = {};
    if (display_name !== undefined)
        detailsToUpdate.display_name = display_name;
    if (about_me !== undefined)
        detailsToUpdate.about_me = about_me;
    if (phone !== undefined)
        detailsToUpdate.phone = phone;
    if (gender !== undefined)
        detailsToUpdate.gender = gender;
    if (Object.keys(detailsToUpdate).length === 0) {
        res.status(400).json({ error: "No details provided for update." });
        return;
    }
    try {
        const wasUpdated = await (0, userModel_1.updateUserDetailsInDB)(userId, detailsToUpdate);
        const currentFullProfile = await (0, userModel_1.getAuthenticatedUserProfileData)(userId);
        if (!currentFullProfile) {
            // Це дуже малоймовірно, якщо користувач авторизований
            return next(new Error("Failed to retrieve user profile after update attempt."));
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
            console.log(`User details updated for userId ${userId}. Data sent to frontend:`, responsePayload);
            res.status(200).json(responsePayload);
        }
        else {
            console.log(`User details submitted for userId ${userId}, but no actual changes were made in DB. Current data sent to frontend:`, responsePayload);
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
    }
    catch (error) {
        next(error);
    }
};
exports.updateMyDetailsController = updateMyDetailsController;
const adminEditUserDetailsController = async (req, res, next) => {
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
    const { username, display_name, about_me, gender, email, phone } = req.body;
    // Базова валідація (додайте більш детальну за потреби)
    if (email && !/.+@.+\..+/.test(email)) {
        // Проста перевірка формату email
        res.status(400).json({ error: "Некоректний формат email." });
        return;
    }
    // Можна додати перевірку довжини username, display_name тощо.
    const detailsToUpdate = {};
    if (username !== undefined)
        detailsToUpdate.username = username;
    if (display_name !== undefined)
        detailsToUpdate.display_name = display_name;
    if (about_me !== undefined)
        detailsToUpdate.about_me = about_me;
    if (gender !== undefined)
        detailsToUpdate.gender = gender;
    if (email !== undefined)
        detailsToUpdate.email = email;
    if (phone !== undefined)
        detailsToUpdate.phone = phone;
    if (Object.keys(detailsToUpdate).length === 0) {
        res.status(400).json({ error: "Не надано жодних даних для оновлення." });
        return;
    }
    try {
        const wasUpdated = await (0, userModel_1.adminUpdateUserCoreDetails)(userIdToEdit, detailsToUpdate);
        // Повертаємо повний оновлений профіль користувача
        const updatedFullProfile = await (0, userModel_1.getAuthenticatedUserProfileData)(userIdToEdit);
        if (!updatedFullProfile) {
            // Малоймовірно, якщо оновлення пройшло, але для безпеки
            return next(new Error("Не вдалося отримати оновлений профіль користувача після збереження змін."));
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
        }
        else {
            res
                .status(200)
                .json({
                message: "Дані не були змінені (можливо, вони вже актуальні).",
                userProfile: responsePayload,
            });
        }
    }
    catch (error) {
        // Обробка помилок унікальності з моделі
        if (error instanceof Error &&
            error.message.includes("вже використовується")) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
};
exports.adminEditUserDetailsController = adminEditUserDetailsController;
const getSelfFollowingController = async (req, res, next) => {
    const currentUserId = req.user?.userID;
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = parseInt(String(req.query.limit || '10'), 10);
    const offset = (page - 1) * limit;
    if (!currentUserId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const { users, totalCount } = await (0, userModel_1.getFollowingListForUser)(currentUserId, limit, offset, currentUserId);
        res.json({
            users,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalItems: totalCount,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getSelfFollowingController = getSelfFollowingController;
const getSelfFollowersController = async (req, res, next) => {
    const currentUserId = req.user?.userID;
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = parseInt(String(req.query.limit || '10'), 10);
    const offset = (page - 1) * limit;
    if (!currentUserId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const { users, totalCount } = await (0, userModel_1.getFollowersListForUser)(currentUserId, limit, offset, currentUserId);
        res.json({
            users,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalItems: totalCount,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getSelfFollowersController = getSelfFollowersController;
const getLatestUsersController = async (req, res, next) => {
    const currentAuthUserId = req.user?.userID;
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = parseInt(String(req.query.limit || '3'), 10); // Залишаємо дефолт 3, якщо такий був
    const offset = (page - 1) * limit;
    try {
        const { users, totalCount } = await (0, userModel_1.getLatestUsersFromDB)(limit, offset, currentAuthUserId);
        res.json({
            users,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalItems: totalCount,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getLatestUsersController = getLatestUsersController;
