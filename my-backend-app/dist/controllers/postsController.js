"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unsavePostController = exports.unlikePostController = exports.deletePost = exports.updatePost = exports.addCommentToPostController = exports.savePostController = exports.likePostController = exports.addPost = exports.getSinglePostByIdController = exports.getPopularPostsController = exports.getFollowingFeedController = exports.deleteCommentController = exports.getCommentsForPostController = exports.getMySavedPostsController = exports.searchPostsController = exports.getPostsByUserId = exports.getPosts = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const postModel_1 = require("../models/postModel");
// Локальний інтерфейс AuthenticatedRequest більше не потрібен
// --- GET Handlers ---
const getPosts = async (req, res, next) => {
    const currentAuthUserId = req.user?.userID;
    const page = parseInt(String(req.query.page || "1"), 10);
    const limit = parseInt(String(req.query.limit || "10"), 10);
    const offset = (page - 1) * limit;
    try {
        const { posts, totalCount } = await (0, postModel_1.getPostsFromDB)(limit, offset, undefined, currentAuthUserId);
        res.json({
            posts,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalItems: totalCount,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPosts = getPosts;
const getPostsByUserId = async (req, res, next) => {
    const currentAuthUserId = req.user?.userID;
    const userIdToView = parseInt(req.params.userId, 10);
    const page = parseInt(String(req.query.page || "1"), 10);
    const limit = parseInt(String(req.query.limit || "10"), 10);
    const offset = (page - 1) * limit;
    if (isNaN(userIdToView)) {
        res.status(400).json({ error: "Invalid User ID format" });
        return;
    }
    try {
        const { posts, totalCount } = await (0, postModel_1.getPostsByUserIdFromDB)(userIdToView, limit, offset, currentAuthUserId);
        res.json({
            posts,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalItems: totalCount,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPostsByUserId = getPostsByUserId;
const searchPostsController = async (req, res, next) => {
    const searchQuery = String(req.query.q || "");
    const currentAuthUserId = req.user?.userID;
    const page = parseInt(String(req.query.page || "1"), 10);
    const limit = parseInt(String(req.query.limit || "10"), 10);
    const offset = (page - 1) * limit;
    if (!searchQuery.trim()) {
        res
            .status(400)
            .json({
            error: "Пошуковий запит 'q' є обов'язковим і не може бути порожнім.",
        });
        return;
    }
    try {
        const { posts, totalCount } = await (0, postModel_1.searchPostsInDB)(searchQuery.trim(), limit, offset, currentAuthUserId);
        res.json({
            posts: posts || [],
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalItems: totalCount,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.searchPostsController = searchPostsController;
const getMySavedPostsController = async (req, res, next) => {
    const userId = req.user?.userID;
    if (!userId) {
        res
            .status(401)
            .json({ error: "Unauthorized for getMySavedPostsController" });
        return;
    }
    try {
        const savedPosts = await (0, postModel_1.getSavedPostsForUserFromDB)(userId, userId);
        res.json(savedPosts);
    }
    catch (error) {
        next(error);
    }
};
exports.getMySavedPostsController = getMySavedPostsController;
const getCommentsForPostController = async (req, // Може бути просто Request, якщо не потрібен req.user
res, next) => {
    // Тип повернення void
    try {
        const postId = parseInt(req.params.postId, 10);
        if (isNaN(postId)) {
            res.status(400).json({ error: "Invalid Post ID" });
            return; // Ранній вихід
        }
        // Викликаємо модельну функцію тільки з postId
        const comments = await (0, postModel_1.getCommentsByPostIdFromDB)(postId);
        res.json(comments); // Немає return
    }
    catch (error) {
        next(error);
    }
};
exports.getCommentsForPostController = getCommentsForPostController;
const deleteCommentController = async (req, res, next) => {
    const postId = parseInt(req.params.postId, 10);
    const commentId = parseInt(req.params.commentId, 10);
    const currentUserId = req.user?.userID;
    const userRole = req.user?.role || 'user';
    if (isNaN(postId) || isNaN(commentId)) {
        res.status(400).json({ error: "Invalid Post ID or Comment ID format" });
        return;
    }
    if (!currentUserId) {
        res.status(401).json({ error: "Unauthorized for deleting comment" });
        return;
    }
    try {
        const { success, deletedCommentsCount } = await (0, postModel_1.deleteCommentFromDB)(commentId, currentUserId, userRole, postId);
        if (success && deletedCommentsCount > 0) {
            // Після успішного видалення коментаря, отримуємо оновлені дані поста
            // щоб фронтенд міг оновити лічильник коментарів
            const updatedPost = await (0, postModel_1.getSinglePostByIdFromDB)(postId, currentUserId);
            res.status(200).json({
                message: `Comment ${commentId} and ${deletedCommentsCount - 1} replies deleted successfully.`,
                deletedCommentsCount: deletedCommentsCount,
                updatedPost: updatedPost // Повертаємо оновлений пост
            });
        }
        else {
            // Цей блок не мав би спрацювати, якщо deleteCommentFromDB кидає помилку при невдачі
            // Але для повноти, якщо б вона повертала { success: false }
            res.status(500).json({ error: "Comment deletion may not have occurred or comment was not found." });
        }
    }
    catch (error) {
        if (error instanceof Error && (error.message.includes("Comment not found") || error.message.includes("Forbidden"))) {
            res.status(error.message.includes("Forbidden") ? 403 : 404).json({ error: error.message });
            return;
        }
        next(error);
    }
};
exports.deleteCommentController = deleteCommentController;
const getFollowingFeedController = async (req, res, next) => {
    const currentAuthUserId = req.user?.userID;
    const page = parseInt(String(req.query.page || "1"), 10);
    const limit = parseInt(String(req.query.limit || "10"), 10);
    const offset = (page - 1) * limit;
    if (!currentAuthUserId) {
        res
            .status(401)
            .json({
            error: "Unauthorized: User must be logged in to view following feed.",
        });
        return;
    }
    try {
        const { posts, totalCount } = await (0, postModel_1.getFollowingPostsFeedFromDB)(currentAuthUserId, limit, offset);
        res.json({
            posts,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalItems: totalCount,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getFollowingFeedController = getFollowingFeedController;
const getPopularPostsController = async (req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[postsController][${timestamp}] ENTERING getPopularPostsController. req.user =`, req.user); // <--- НОВИЙ ЛОГ
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = parseInt(String(req.query.limit || '5'), 10);
    const offset = (page - 1) * limit;
    const currentAuthUserId = req.user?.userID;
    if (isNaN(limit) || limit <= 0) {
        console.log(`[postsController][${timestamp}] getPopularPostsController - Invalid limit parameter.`); // <--- НОВИЙ ЛОГ
        res.status(400).json({ error: "Invalid 'limit' parameter." });
        return;
    }
    try {
        console.log(`[postsController][${timestamp}] getPopularPostsController - Calling getPopularPostsFromDB with limit=${limit}, offset=${offset}, currentAuthUserId=${currentAuthUserId}`); // <--- НОВИЙ ЛОГ
        const { posts, totalCount } = await (0, postModel_1.getPopularPostsFromDB)(limit, offset, currentAuthUserId);
        console.log(`[postsController][${timestamp}] getPopularPostsController - Received ${posts.length} posts, totalCount ${totalCount} from DB.`); // <--- НОВИЙ ЛОГ
        res.json({
            posts,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalItems: totalCount,
        });
    }
    catch (error) {
        console.error(`[postsController][${timestamp}] getPopularPostsController - Error:`, error); // <--- НОВИЙ ЛОГ
        next(error);
    }
};
exports.getPopularPostsController = getPopularPostsController;
const getSinglePostByIdController = async (req, res, next) => {
    const postId = parseInt(req.params.postId, 10);
    const currentAuthUserId = req.user?.userID;
    if (isNaN(postId)) {
        res.status(400).json({ error: "Invalid Post ID" });
        return;
    }
    try {
        const post = await (0, postModel_1.getSinglePostByIdFromDB)(postId, currentAuthUserId);
        if (!post) {
            res.status(404).json({ error: "Post not found" });
            return;
        }
        res.json(post);
    }
    catch (error) {
        next(error);
    }
};
exports.getSinglePostByIdController = getSinglePostByIdController;
// --- POST Handlers ---
const addPost = async (req, res, next) => {
    const loggedInUserId = req.user?.userID;
    const { title, content } = req.body;
    const contentImgFilename = req.file ? req.file.filename : null;
    if (!loggedInUserId) {
        if (req.file?.path) {
            try {
                await promises_1.default.unlink(req.file.path);
            }
            catch (e) {
                console.error("Error deleting file on unauth addPost:", e);
            }
        }
        res.status(401).json({ error: "Unauthorized for addPost" });
        return;
    }
    if ((!content || String(content).trim() === "" || !title) && !contentImgFilename) {
        if (req.file?.path) {
            try {
                await promises_1.default.unlink(req.file.path);
            }
            catch (e) {
                console.error("Error deleting file on empty addPost:", e);
            }
        }
        res.status(400).json({ error: "Post content or image is required" });
        return;
    }
    try {
        const result = await (0, postModel_1.addPostToDB)(loggedInUserId, title || "", String(content || ""), contentImgFilename);
        if (result && result.postId) {
            const createdPost = await (0, postModel_1.getSinglePostByIdFromDB)(result.postId, loggedInUserId);
            if (createdPost) {
                res.status(201).json(createdPost);
            }
            else {
                res
                    .status(201)
                    .json({
                    message: "Post created, but could not retrieve full data.",
                    postId: result.postId,
                });
            }
        }
        else {
            if (req.file?.path) {
                try {
                    await promises_1.default.unlink(req.file.path);
                }
                catch (e) {
                    console.error("Error deleting file on failed addPost DB op:", e);
                }
            }
            res
                .status(500)
                .json({
                error: "Failed to get created post ID from database operation.",
            });
        }
    }
    catch (error) {
        if (req.file?.path) {
            try {
                await promises_1.default.unlink(req.file.path);
            }
            catch (e) {
                console.error("Error deleting file on addPost catch:", e);
            }
        }
        next(error);
    }
};
exports.addPost = addPost;
const likePostController = async (req, res, next) => {
    const postId = parseInt(req.params.postId, 10);
    const userId = req.user?.userID;
    if (isNaN(postId)) {
        res.status(400).json({ error: "Invalid Post ID" });
        return;
    }
    if (!userId) {
        res.status(401).json({ error: "Unauthorized for likePost" });
        return;
    }
    try {
        await (0, postModel_1.addLikeToPostInDB)(postId, userId);
        const targetPost = await (0, postModel_1.getSinglePostByIdFromDB)(postId, userId);
        if (targetPost) {
            res
                .status(200)
                .json({ message: "Post liked successfully", post: targetPost });
        }
        else {
            res
                .status(404)
                .json({ message: "Post not found after like action", post: null });
        }
    }
    catch (error) {
        next(error);
    }
};
exports.likePostController = likePostController;
const savePostController = async (req, res, next) => {
    const postId = parseInt(req.params.postId, 10);
    const userId = req.user?.userID;
    if (isNaN(postId)) {
        res.status(400).json({ error: "Invalid Post ID" });
        return;
    }
    if (!userId) {
        res.status(401).json({ error: "Unauthorized for savePost" });
        return;
    }
    try {
        await (0, postModel_1.savePostForUserInDB)(userId, postId);
        const targetPost = await (0, postModel_1.getSinglePostByIdFromDB)(postId, userId);
        res
            .status(200)
            .json({ message: "Post saved successfully", post: targetPost || null });
    }
    catch (error) {
        next(error);
    }
};
exports.savePostController = savePostController;
const addCommentToPostController = async (req, res, next) => {
    const postId = parseInt(req.params.postId, 10);
    const userId = req.user?.userID;
    const { text, parentCommentId } = req.body;
    if (isNaN(postId)) {
        res.status(400).json({ error: "Invalid Post ID" });
        return;
    }
    if (!userId) {
        res.status(401).json({ error: "Unauthorized. Please log in to comment." });
        return;
    }
    if (!text || typeof text !== "string" || text.trim() === "") {
        res.status(400).json({ error: "Comment text is required." });
        return;
    }
    const parentId = parentCommentId !== undefined && parentCommentId !== null
        ? parseInt(String(parentCommentId), 10)
        : null;
    if (parentCommentId !== undefined &&
        parentCommentId !== null &&
        isNaN(parentId)) {
        res.status(400).json({ error: "Invalid parent_comment_id format." });
        return;
    }
    try {
        const newComment = await (0, postModel_1.addCommentToDB)(postId, userId, text.trim(), parentId);
        if (newComment) {
            // Після додавання коментаря, оновлюємо лічильник коментарів для поста
            // і повертаємо новий коментар та оновлений пост.
            // Це можна зробити, викликавши getPostsFromDB, або якщо addCommentToDB повертає достатньо даних.
            // Зараз addCommentToDB оновлює лічильник, але повертає тільки дані коментаря.
            // Для простоти, повернемо новий коментар. Фронтенд може оновити лічильник поста окремо або перезавантажити пости.
            res.status(201).json(newComment);
        }
        else {
            res
                .status(500)
                .json({ error: "Failed to create comment or retrieve comment data." });
        }
    }
    catch (error) {
        next(error);
    }
};
exports.addCommentToPostController = addCommentToPostController;
// --- PUT Handlers ---
const updatePost = async (req, res, next) => {
    const loggedInUserId = req.user?.userID;
    const userRole = req.user?.role || "user";
    const postId = parseInt(req.params.postId, 10);
    const { title, content, deleteContentImg } = req.body; // Отримуємо deleteContentImg з тіла
    let newImageFilename = undefined; // undefined - не чіпати, null - видалити, string - нове ім'я
    if (req.file) {
        newImageFilename = req.file.filename;
    }
    else if (deleteContentImg === "true" || deleteContentImg === true) {
        newImageFilename = null; // Сигнал для моделі встановити media_url в NULL
    }
    // Якщо req.file немає і deleteContentImg не 'true', то newImageFilename залишається undefined (не чіпати зображення)
    const timestamp = new Date().toISOString();
    console.log(`[postsController][${timestamp}] Attempting to update post ID: ${postId} by user ID: ${loggedInUserId}. New image filename: ${newImageFilename}. Title: ${title}, Content: ${content ? String(content).substring(0, 10) + "..." : "N/A"}`);
    if (!loggedInUserId) {
        if (req.file?.path) {
            try {
                await promises_1.default.unlink(req.file.path);
            }
            catch (e) {
                /*ignore*/
            }
        }
        res.status(401).json({ error: "Unauthorized for updatePost" });
        return;
    }
    if (isNaN(postId)) {
        if (req.file?.path) {
            try {
                await promises_1.default.unlink(req.file.path);
            }
            catch (e) {
                /*ignore*/
            }
        }
        res.status(400).json({ error: "Invalid Post ID format" });
        return;
    }
    const titleIsPresent = title !== undefined && title !== null;
    const contentIsPresent = content !== undefined && content !== null;
    // Потрібно щось оновлювати: текст, заголовок, АБО є дія з зображенням (нове або видалення старого)
    if (!titleIsPresent && !contentIsPresent && newImageFilename === undefined) {
        res
            .status(400)
            .json({
            error: "At least one field (title, content, or image action) is required for update",
        });
        return;
    }
    try {
        // updatePostFromDB приймає newImageFilename (string | null | undefined)
        const oldImageFilename = await (0, postModel_1.updatePostFromDB)(postId, loggedInUserId, userRole, title, // Може бути undefined
        content, // Може бути undefined
        newImageFilename // Може бути string (нове ім'я), null (видалити), undefined (не чіпати)
        );
        // Логіка видалення старого файлу зображення, якщо воно було і замінюється або видаляється
        if (newImageFilename !== undefined &&
            oldImageFilename &&
            oldImageFilename.trim() !== "" &&
            !oldImageFilename.toLowerCase().includes("default_")) {
            // Якщо newImageFilename є (рядок або null), і oldImageFilename існував (і не дефолтний)
            if (newImageFilename === null ||
                (typeof newImageFilename === "string" &&
                    oldImageFilename !== newImageFilename)) {
                const safeOldFilename = path_1.default.basename(oldImageFilename);
                const oldImageServerPath = path_1.default.resolve(__dirname, "../../uploads/posts", safeOldFilename);
                try {
                    await promises_1.default.access(oldImageServerPath);
                    await promises_1.default.unlink(oldImageServerPath);
                    console.log(`[postsController][${timestamp}] Successfully deleted old post image: ${oldImageServerPath}`);
                }
                catch (unlinkError) {
                    // @ts-ignore
                    if (unlinkError.message.includes("ENOENT")) {
                        console.warn(`[postsController][${timestamp}] Old post image not found for deletion: ${oldImageServerPath}`);
                    }
                    else {
                        console.warn(`[postsController][${timestamp}] Could not delete old post image '${oldImageServerPath}':`, unlinkError.message);
                    }
                }
            }
        }
        const updatedPost = await (0, postModel_1.getSinglePostByIdFromDB)(postId, loggedInUserId);
        if (updatedPost) {
            res.status(200).json(updatedPost);
        }
        else {
            res
                .status(404)
                .json({
                message: "Post was updated, but failed to retrieve it afterwards.",
            });
        }
    }
    catch (error) {
        // Якщо була помилка і завантажувався новий файл, видаляємо його
        if (req.file &&
            req.file.path &&
            newImageFilename !== undefined &&
            newImageFilename !== null) {
            // Тільки якщо це був новий файл
            try {
                console.warn(`[postsController][${timestamp}] Error during DB update for post ${postId}. Attempting to delete newly uploaded file: ${req.file.path}`);
                await promises_1.default.unlink(req.file.path);
                console.log(`[postsController][${timestamp}] Rolled back (deleted) newly uploaded file for post ${postId} due to error.`);
            }
            catch (cleanupError) {
                console.error(`[postsController][${timestamp}] CRITICAL: Error cleaning up uploaded file ${req.file.path} for post ${postId} after a primary error:`, cleanupError);
            }
        }
        if (error instanceof Error &&
            (error.message.includes("Post not found") ||
                error.message.includes("Forbidden"))) {
            res
                .status(error.message.includes("Forbidden") ? 403 : 404)
                .json({ error: error.message });
            return;
        }
        next(error);
    }
};
exports.updatePost = updatePost;
// --- DELETE Handlers ---
const deletePost = async (req, res, next) => {
    const loggedInUserId = req.user?.userID;
    const userRole = req.user?.role || "user";
    const postId = parseInt(req.params.postId, 10);
    if (!loggedInUserId) {
        res.status(401).json({ error: "Unauthorized for deletePost" });
        return;
    }
    if (isNaN(postId)) {
        res.status(400).json({ error: "Invalid Post ID format" });
        return;
    }
    try {
        await (0, postModel_1.deletePostFromDB)(postId, loggedInUserId, userRole);
        res.status(200).json({ message: `Post ${postId} deleted successfully` });
    }
    catch (error) {
        if (error instanceof Error &&
            (error.message.includes("Post not found") ||
                error.message.includes("Forbidden"))) {
            res
                .status(error.message.includes("Forbidden") ? 403 : 404)
                .json({ error: error.message });
            return;
        }
        next(error);
    }
};
exports.deletePost = deletePost;
const unlikePostController = async (req, res, next) => {
    const postId = parseInt(req.params.postId, 10);
    const userId = req.user?.userID;
    if (isNaN(postId)) {
        res.status(400).json({ error: "Invalid Post ID" });
        return;
    }
    if (!userId) {
        res.status(401).json({ error: "Unauthorized for unlikePost" });
        return;
    }
    try {
        await (0, postModel_1.removeLikeFromPostInDB)(postId, userId);
        const targetPost = await (0, postModel_1.getSinglePostByIdFromDB)(postId, userId);
        if (targetPost) {
            res
                .status(200)
                .json({ message: "Post unliked successfully", post: targetPost });
        }
        else {
            res
                .status(404)
                .json({ message: "Post not found after unlike action.", post: null });
        }
    }
    catch (error) {
        next(error);
    }
};
exports.unlikePostController = unlikePostController;
const unsavePostController = async (req, res, next) => {
    const postId = parseInt(req.params.postId, 10);
    const userId = req.user?.userID;
    if (isNaN(postId)) {
        res.status(400).json({ error: "Invalid Post ID" });
        return;
    }
    if (!userId) {
        res.status(401).json({ error: "Unauthorized for unsavePost" });
        return;
    }
    try {
        await (0, postModel_1.unsavePostForUserInDB)(userId, postId);
        const targetPost = await (0, postModel_1.getSinglePostByIdFromDB)(postId, userId);
        res
            .status(200)
            .json({ message: "Post unsaved successfully", post: targetPost || null });
    }
    catch (error) {
        next(error);
    }
};
exports.unsavePostController = unsavePostController;
