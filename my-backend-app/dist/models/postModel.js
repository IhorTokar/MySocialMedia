"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCommentFromDB = exports.recursivelyDeleteCommentsAndCount = exports.updatePostImageInDB = exports.getSinglePostByIdFromDB = exports.getPopularPostsFromDB = exports.getFollowingPostsFeedFromDB = exports.getSavedPostsForUserFromDB = exports.unsavePostForUserInDB = exports.savePostForUserInDB = exports.addCommentToDB = exports.getCommentsByPostIdFromDB = exports.removeLikeFromPostInDB = exports.addLikeToPostInDB = exports.searchPostsInDB = exports.updatePostFromDB = exports.deletePostFromDB = exports.addPostToDB = exports.getPostsByUserIdFromDB = exports.getPostsFromDB = void 0;
// my-backend-app/src/models/postModel.ts
const mssql_1 = __importDefault(require("mssql"));
const db_1 = require("../config/db");
const getPostsFromDB = async (limit = 10, offset = 0, userIdForFeed, currentAuthUserId) => {
    try {
        const pool = await (0, db_1.connectDB)();
        let countWhereClause = "";
        const countRequest = pool.request();
        if (userIdForFeed !== undefined) {
            countWhereClause = `WHERE p.user_id = @userIdForFeedParam_count`;
            countRequest.input("userIdForFeedParam_count", mssql_1.default.Int, userIdForFeed);
        }
        // Якщо userIdForFeed не вказано, рахуємо всі пости
        const countResult = await countRequest.query(`SELECT COUNT_BIG(*) as totalCount FROM posts p ${countWhereClause}`);
        const totalCount = Number(countResult.recordset[0].totalCount); // Переконуємося, що це число
        const request = pool.request();
        request.input("limitParam", mssql_1.default.Int, limit);
        request.input("offsetParam", mssql_1.default.Int, offset);
        if (userIdForFeed !== undefined) {
            request.input("userIdForFeedParam_select", mssql_1.default.Int, userIdForFeed);
        }
        let query = `
      SELECT
        p.post_id AS postId, p.user_id AS userId, p.label AS title, p.text AS content, 
        p.media_url AS contentImgURL, p.created_date AS createdAt, 
        u.username AS userNickname, u.user_avatar_url AS userAvatarURL,
        COALESCE(pd.likes, 0) AS likesCount,
        COALESCE(pd.comments, 0) AS commentsCount,
        COALESCE(pd.shares, 0) AS sharesCount
    `;
        if (currentAuthUserId) {
            query += `,
        CAST(CASE WHEN pl.user_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isLikedByCurrentUser,
        CAST(CASE WHEN sp.user_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isSavedByCurrentUser 
      `;
            request.input("currentAuthUserIdParam", mssql_1.default.Int, currentAuthUserId);
        }
        else {
            query += `, CAST(0 AS BIT) AS isLikedByCurrentUser, CAST(0 AS BIT) AS isSavedByCurrentUser`;
        }
        query += `
      FROM posts p
      INNER JOIN users u ON p.user_id = u.user_id
      LEFT JOIN post_data pd ON p.post_id = pd.post_id
    `;
        if (currentAuthUserId) {
            query += `
        LEFT JOIN post_likes pl ON p.post_id = pl.post_id AND pl.user_id = @currentAuthUserIdParam
        LEFT JOIN saved_posts sp ON p.post_id = sp.post_id AND sp.user_id = @currentAuthUserIdParam
      `;
        }
        let mainWhereClause = "";
        if (userIdForFeed !== undefined) {
            mainWhereClause = `WHERE p.user_id = @userIdForFeedParam_select`;
        }
        query += mainWhereClause;
        query += ` 
      ORDER BY p.created_date DESC
      OFFSET @offsetParam ROWS
      FETCH NEXT @limitParam ROWS ONLY;
    `;
        const result = await request.query(query);
        const posts = result.recordset.map((post) => ({
            postId: post.postId,
            userId: post.userId,
            title: post.title,
            content: post.content,
            contentImgURL: post.contentImgURL,
            createdAt: post.createdAt,
            userNickname: post.userNickname,
            userAvatarURL: post.userAvatarURL,
            likesCount: Number(post.likesCount),
            commentsCount: Number(post.commentsCount),
            sharesCount: Number(post.sharesCount),
            isLikedByCurrentUser: !!post.isLikedByCurrentUser,
            isSavedByCurrentUser: !!post.isSavedByCurrentUser
        }));
        return { posts, totalCount };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("❌ Error fetching paginated posts:", errorMessage, error);
        throw new Error(`Database error while fetching paginated posts: ${errorMessage}`);
    }
};
exports.getPostsFromDB = getPostsFromDB;
const getPostsByUserIdFromDB = async (userIdForPosts, limit = 10, offset = 0, currentAuthUserId) => {
    // Ця функція тепер просто обгортка для getPostsFromDB, але з правильним totalCount
    try {
        const pool = await (0, db_1.connectDB)();
        const countRequest = pool.request().input("userIdForPostsCount", mssql_1.default.Int, userIdForPosts);
        const countResult = await countRequest.query(`SELECT COUNT_BIG(*) as totalCount FROM posts WHERE user_id = @userIdForPostsCount`);
        const totalCount = Number(countResult.recordset[0].totalCount);
        // Викликаємо основну функцію getPostsFromDB, передаючи userIdForPosts як фільтр
        const { posts } = await (0, exports.getPostsFromDB)(limit, offset, userIdForPosts, currentAuthUserId);
        return { posts, totalCount };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error in getPostsByUserIdFromDB for user ${userIdForPosts}: ${errorMessage}`, error);
        throw new Error(`Database error in getPostsByUserIdFromDB for user ${userIdForPosts}: ${errorMessage}`);
    }
};
exports.getPostsByUserIdFromDB = getPostsByUserIdFromDB;
/**
 * Додає новий пост та запис у post_data.
 */
const addPostToDB = async (userID, title, content, contentImgFilename = null) => {
    if (!userID || !title || !content) {
        throw new Error("❌ Missing required fields: userID, title, and content");
    }
    const pool = await (0, db_1.connectDB)();
    let transaction = pool.transaction();
    try {
        await transaction.begin();
        const request = transaction.request()
            .input("userID", mssql_1.default.Int, userID)
            .input("title", mssql_1.default.NVarChar, title)
            .input("content", mssql_1.default.NVarChar, content)
            .input("contentImgFilename", mssql_1.default.NVarChar, contentImgFilename || null);
        const postResult = await request.query(`
      INSERT INTO posts (user_id, label, text, media_url, created_date)
      OUTPUT INSERTED.post_id
      VALUES (@userID, @title, @content, @contentImgFilename, GETDATE());
    `);
        const postId = postResult.recordset[0].post_id;
        const postDataRequest = transaction.request();
        await postDataRequest.input("postIDParam", mssql_1.default.Int, postId).query(`
        INSERT INTO post_data (post_id, likes, shares, comments) VALUES (@postIDParam, 0, 0, 0);
    `);
        await transaction.commit();
        return { postId, message: "✅ Post created successfully" };
    }
    catch (error) {
        if (transaction) {
            try {
                await transaction.rollback();
            }
            catch (rbError) {
                console.error("Rollback error in addPostToDB:", rbError);
            }
        }
        if (error instanceof Error) {
            console.error("❌ Error adding post to DB:", error.message);
        }
        else {
            console.error("❌ Error adding post to DB:", error);
        }
        throw new Error("Database error while adding post");
    }
};
exports.addPostToDB = addPostToDB;
/**
 * Видаляє пост та пов'язані дані (включаючи лайки та збереження).
 */
const deletePostFromDB = async (postId, currentUserId, userRole) => {
    if (!postId || !currentUserId) {
        throw new Error("❌ Missing required field: postId or currentUserId");
    }
    const pool = await (0, db_1.connectDB)();
    let transaction = pool.transaction();
    try {
        await transaction.begin();
        const request = transaction.request().input("postIdParam", mssql_1.default.Int, postId);
        if (userRole !== "admin") {
            request.input("currentUserIdParam", mssql_1.default.Int, currentUserId);
            const postOwnerResult = await request.query("SELECT user_id FROM posts WHERE post_id = @postIdParam");
            if (postOwnerResult.recordset.length === 0) {
                throw new Error("⚠ Post not found");
            }
            if (postOwnerResult.recordset[0].user_id !== currentUserId) {
                throw new Error("🚫 Forbidden: You can only delete your own posts.");
            }
        }
        await request.query("DELETE FROM post_likes WHERE post_id = @postIdParam");
        await request.query("DELETE FROM saved_posts WHERE post_id = @postIdParam"); // <-- Додано видалення зі збережених
        await request.query("DELETE FROM comments WHERE post_id = @postIdParam"); // Додано видалення коментарів
        await request.query("DELETE FROM post_data WHERE post_id = @postIdParam");
        const result = await request.query("DELETE FROM posts WHERE post_id = @postIdParam");
        await transaction.commit();
        if (result.rowsAffected[0] === 0) {
            console.warn(`Post with ID ${postId} was not found for deletion or no rows affected.`);
            // Можна кинути помилку, якщо пост мав існувати
            // throw new Error("⚠ Post not found or not deleted");
        }
    }
    catch (error) {
        if (transaction) {
            try {
                await transaction.rollback();
            }
            catch (rbError) {
                console.error("Rollback error in deletePostFromDB:", rbError);
            }
        }
        if (error instanceof Error) {
            console.error("❌ Error deleting post from DB:", error.message);
            if (error.message.includes("Post not found") || error.message.includes("Forbidden")) {
                throw error;
            }
        }
        else {
            console.error("❌ Error deleting post from DB (unknown type):", error);
        }
        throw new Error("Database error while deleting post");
    }
};
exports.deletePostFromDB = deletePostFromDB;
/**
 * Оновлює пост (з перевіркою прав).
 */
const updatePostFromDB = async (postId, currentUserId, userRole, title, content, newImageFilename // undefined - не чіпати зображення, null - видалити зображення, string - нове ім'я
) => {
    const pool = await (0, db_1.connectDB)();
    const transaction = pool.transaction(); // Явно вказуємо тип
    let transactionBegun = false;
    let oldImageFilename = null;
    try {
        await transaction.begin();
        transactionBegun = true;
        // 1. Перевірка власника (якщо не адмін) та отримання старого media_url
        let currentMediaUrlFromDB = null;
        const checkRequest = transaction.request().input("postIdForCheck", mssql_1.default.Int, postId);
        const postCheckQuery = `SELECT user_id, media_url FROM posts WHERE post_id = @postIdForCheck`;
        const checkResult = await checkRequest.query(postCheckQuery);
        if (checkResult.recordset.length === 0) {
            throw new Error(`Post with ID ${postId} not found.`);
        }
        currentMediaUrlFromDB = checkResult.recordset[0].media_url;
        if (userRole !== "admin" && checkResult.recordset[0].user_id !== currentUserId) {
            throw new Error("Forbidden: You can only update your own posts.");
        }
        // Зберігаємо поточний media_url як старе ім'я файлу, ТІЛЬКИ ЯКЩО newImageFilename передано
        // (тобто є намір змінити або видалити зображення)
        if (newImageFilename !== undefined) { // undefined означає "не чіпати поле media_url"
            oldImageFilename = currentMediaUrlFromDB;
        }
        // 2. Формування SQL-запиту для оновлення
        const updateFields = [];
        const updateRequest = transaction.request().input("postIdForUpdate", mssql_1.default.Int, postId);
        if (title !== undefined) {
            updateFields.push("label = @titleParam");
            updateRequest.input("titleParam", mssql_1.default.NVarChar, title);
        }
        if (content !== undefined) {
            updateFields.push("text = @contentParam");
            updateRequest.input("contentParam", mssql_1.default.NVarChar, content);
        }
        // Якщо newImageFilename передано (може бути рядок або null), оновлюємо media_url
        if (newImageFilename !== undefined) {
            updateFields.push("media_url = @imgParam");
            updateRequest.input("imgParam", mssql_1.default.NVarChar, newImageFilename); // newImageFilename може бути null
        }
        if (updateFields.length === 0) {
            console.warn(`[postModel] No fields provided to update for post ${postId}. Transaction will be committed without changes.`);
            await transaction.commit();
            return null; // Нічого не було оновлено, тому повертаємо null для oldImageFilename
        }
        // Додаємо оновлення дати, якщо є хоч якісь зміни
        updateFields.push("updated_date = GETDATE()"); // Припускаю, що у вас є поле updated_date
        const updateQuerySql = `UPDATE posts SET ${updateFields.join(", ")} WHERE post_id = @postIdForUpdate;`;
        const updateResult = await updateRequest.query(updateQuerySql);
        if (updateResult.rowsAffected[0] === 0) {
            // Це не мало б статися, якщо попередній SELECT знайшов пост, але перевіряємо
            throw new Error(`Failed to update post ID ${postId} in DB. Post might have been deleted concurrently.`);
        }
        await transaction.commit();
        console.log(`[postModel] Post ${postId} updated in DB. Transaction committed. Old image filename (if action was taken on image): ${oldImageFilename}`);
        return oldImageFilename; // Повертаємо старе ім'я файлу, якщо зображення змінювалося або видалялося
    }
    catch (error) {
        if (transactionBegun) { // Відкочуємо, тільки якщо транзакція була розпочата
            try {
                console.warn(`[postModel] Error during post update for post ${postId}, attempting rollback... Error: ${error.message}`);
                await transaction.rollback();
                console.log(`[postModel] Transaction for post ${postId} update rolled back successfully.`);
            }
            catch (rollbackError) {
                console.error(`❌ CRITICAL: Error during transaction rollback for post ${postId} update:`, rollbackError);
            }
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error in updatePostFromDB for post ${postId} (main operation): ${errorMessage}`);
        throw new Error(`Database error while updating post ${postId}: ${errorMessage}`);
    }
};
exports.updatePostFromDB = updatePostFromDB;
/**
 * Шукає пости за текстом у заголовку або вмісті.
 * Також включає інформацію про автора та статус лайка для поточного авторизованого користувача.
 */
const searchPostsInDB = async (searchQuery, limit = 10, offset = 0, currentAuthUserId) => {
    if (!searchQuery || searchQuery.trim() === "") {
        return { posts: [], totalCount: 0 };
    }
    try {
        const pool = await (0, db_1.connectDB)();
        const countRequest = pool.request().input("queryParamCount", mssql_1.default.NVarChar, `%${searchQuery}%`);
        const countResult = await countRequest.query(`SELECT COUNT_BIG(*) as totalCount FROM posts p WHERE (p.text LIKE @queryParamCount OR p.label LIKE @queryParamCount)`);
        const totalCount = Number(countResult.recordset[0].totalCount);
        const request = pool.request();
        request.input("queryParam", mssql_1.default.NVarChar, `%${searchQuery}%`);
        request.input("limitParam", mssql_1.default.Int, limit);
        request.input("offsetParam", mssql_1.default.Int, offset);
        let query = `
      SELECT
        p.post_id AS postId, p.user_id AS userId, p.label AS title, p.text AS content, 
        p.media_url AS contentImgURL, p.created_date AS createdAt, 
        u.username AS userNickname, u.user_avatar_url AS userAvatarURL,
        COALESCE(pd.likes, 0) AS likesCount,
        COALESCE(pd.comments, 0) AS commentsCount,
        COALESCE(pd.shares, 0) AS sharesCount
    `;
        if (currentAuthUserId) {
            query += `, CAST(CASE WHEN pl.user_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isLikedByCurrentUser, CAST(CASE WHEN sp.user_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isSavedByCurrentUser`;
            request.input("currentAuthUserIdParam", mssql_1.default.Int, currentAuthUserId);
        }
        else {
            query += `, CAST(0 AS BIT) AS isLikedByCurrentUser, CAST(0 AS BIT) AS isSavedByCurrentUser`;
        }
        query += `
      FROM posts p
      INNER JOIN users u ON p.user_id = u.user_id
      LEFT JOIN post_data pd ON p.post_id = pd.post_id
    `;
        if (currentAuthUserId) {
            query += `
        LEFT JOIN post_likes pl ON p.post_id = pl.post_id AND pl.user_id = @currentAuthUserIdParam
        LEFT JOIN saved_posts sp ON p.post_id = sp.post_id AND sp.user_id = @currentAuthUserIdParam
      `;
        }
        query += `
      WHERE (p.text LIKE @queryParam OR p.label LIKE @queryParam)
      ORDER BY p.created_date DESC
      OFFSET @offsetParam ROWS
      FETCH NEXT @limitParam ROWS ONLY;
    `;
        const result = await request.query(query);
        const posts = result.recordset.map((post) => ({
            postId: post.postId, userId: post.userId, title: post.title, content: post.content,
            contentImgURL: post.contentImgURL, createdAt: post.createdAt,
            userNickname: post.userNickname, userAvatarURL: post.userAvatarURL,
            likesCount: Number(post.likesCount), commentsCount: Number(post.commentsCount), sharesCount: Number(post.sharesCount),
            isLikedByCurrentUser: !!post.isLikedByCurrentUser,
            isSavedByCurrentUser: !!post.isSavedByCurrentUser
        }));
        return { posts, totalCount };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("❌ Error searching posts in DB (paginated):", errorMessage, error);
        throw new Error(`Database error while searching posts (paginated): ${errorMessage}`);
    }
};
exports.searchPostsInDB = searchPostsInDB;
/**
 * Додає лайк до поста від користувача.
 */
const addLikeToPostInDB = async (postId, userId) => {
    let transaction;
    try {
        const pool = await (0, db_1.connectDB)();
        transaction = pool.transaction();
        await transaction.begin();
        const request = transaction.request();
        request.input("postId", mssql_1.default.Int, postId);
        request.input("userId", mssql_1.default.Int, userId);
        await request.query(`
      INSERT INTO post_likes (user_id, post_id) VALUES (@userId, @postId);
    `);
        await request.query(`
      UPDATE post_data 
      SET likes = (SELECT COUNT(*) FROM post_likes WHERE post_id = @postId) 
      WHERE post_id = @postId;
      
      IF @@ROWCOUNT = 0 AND NOT EXISTS (SELECT 1 FROM post_data WHERE post_id = @postId)
      BEGIN
        INSERT INTO post_data (post_id, likes, comments, shares) VALUES (@postId, 1, 0, 0);
      END
    `);
        await transaction.commit();
        console.log(`User ${userId} liked post ${postId}`);
        return true;
    }
    catch (error) {
        if (transaction) {
            try {
                await transaction.rollback();
                console.log("Transaction rolled back in addLikeToPostInDB (error or duplicate).");
            }
            catch (rollbackError) {
                console.error("Error rolling back transaction in addLikeToPostInDB:", rollbackError);
            }
        }
        if (error instanceof mssql_1.default.RequestError && error.number === 2627) {
            console.warn(`User ${userId} already liked post ${postId}.`);
            return true;
        }
        console.error(`❌ Error adding like to post ${postId} by user ${userId}:`, error);
        return false;
    }
};
exports.addLikeToPostInDB = addLikeToPostInDB;
/**
 * Видаляє лайк з поста від користувача.
 */
const removeLikeFromPostInDB = async (postId, userId) => {
    let transaction;
    try {
        const pool = await (0, db_1.connectDB)();
        transaction = pool.transaction();
        await transaction.begin();
        const request = transaction.request();
        request.input("postId", mssql_1.default.Int, postId);
        request.input("userId", mssql_1.default.Int, userId);
        const result = await request.query(`
      DELETE FROM post_likes WHERE user_id = @userId AND post_id = @postId;
    `);
        if (result.rowsAffected[0] > 0) {
            await request.query(`
        UPDATE post_data 
        SET likes = (SELECT COUNT(*) FROM post_likes WHERE post_id = @postId)
        WHERE post_id = @postId;
      `);
            await transaction.commit();
            console.log(`User ${userId} unliked post ${postId}`);
            return true;
        }
        else {
            if (transaction) {
                await transaction.rollback();
            }
            console.warn(`User ${userId} had not liked post ${postId} or like already removed.`);
            return false;
        }
    }
    catch (error) {
        if (transaction) {
            try {
                await transaction.rollback();
                console.log("Transaction rolled back in removeLikeFromPostInDB due to error.");
            }
            catch (rollbackError) {
                console.error("Error rolling back transaction in removeLikeFromPostInDB:", rollbackError);
            }
        }
        console.error(`❌ Error removing like from post ${postId} by user ${userId}:`, error);
        return false;
    }
};
exports.removeLikeFromPostInDB = removeLikeFromPostInDB;
const getCommentsByPostIdFromDB = async (postId) => {
    try {
        const pool = await (0, db_1.connectDB)();
        const result = await pool.request()
            .input('postId', mssql_1.default.Int, postId)
            .query(`
        SELECT 
            c.comment_id, c.post_id, c.user_id, c.text, c.created_date, c.parent_comment_id,
            u.username, u.user_avatar_url 
        FROM comments c
        INNER JOIN users u ON c.user_id = u.user_id
        WHERE c.post_id = @postId
        ORDER BY c.created_date ASC; -- Завантажуємо всі коментарі, фронтенд може побудувати дерево
      `);
        // Ваша версія мала "as CommentWithAuthorData[]". Якщо поля збігаються, це нормально.
        // Якщо ні, потрібен був би .map() для приведення. Залишаю як у вас:
        return result.recordset;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error fetching comments for post ${postId}:`, errorMessage);
        throw new Error(`Database error while fetching comments for post ${postId}: ${errorMessage}`);
    }
};
exports.getCommentsByPostIdFromDB = getCommentsByPostIdFromDB;
/**
 * Додає новий коментар до поста (або як відповідь на інший коментар).
 * @param postId ID поста.
 * @param userId ID користувача, що додає коментар.
 * @param text Текст коментаря.
 * @param parentCommentId Необов'язковий ID батьківського коментаря.
 * @returns Створений об'єкт коментаря з даними автора.
 */
const addCommentToDB = async (postId, userId, text, parentCommentId) => {
    let transaction;
    try {
        const pool = await (0, db_1.connectDB)();
        transaction = pool.transaction();
        await transaction.begin();
        const request = transaction.request()
            .input('postId', mssql_1.default.Int, postId)
            .input('userId', mssql_1.default.Int, userId)
            .input('text', mssql_1.default.NVarChar, text);
        if (parentCommentId !== undefined && parentCommentId !== null) {
            request.input('parentCommentId', mssql_1.default.Int, parentCommentId);
        }
        else {
            request.input('parentCommentId', mssql_1.default.Int, null); // Явно передаємо NULL
        }
        // Додаємо коментар
        const resultInsert = await request.query(`
      INSERT INTO comments (post_id, user_id, text, created_date, parent_comment_id)
      OUTPUT INSERTED.comment_id, INSERTED.created_date, INSERTED.parent_comment_id
      VALUES (@postId, @userId, @text, GETDATE(), @parentCommentId);
    `);
        const newCommentId = resultInsert.recordset[0].comment_id;
        const newCommentDate = resultInsert.recordset[0].created_date;
        const newParentCommentId = resultInsert.recordset[0].parent_comment_id;
        // Оновлюємо лічильник коментарів у post_data
        const updatePostDataRequest = transaction.request();
        await updatePostDataRequest
            .input('postIdForCount', mssql_1.default.Int, postId)
            .query(`
            UPDATE post_data 
            SET comments = (SELECT COUNT(*) FROM comments WHERE post_id = @postIdForCount)
            WHERE post_id = @postIdForCount;

            IF @@ROWCOUNT = 0 AND NOT EXISTS (SELECT 1 FROM post_data WHERE post_id = @postIdForCount)
            BEGIN
                INSERT INTO post_data (post_id, likes, comments, shares) VALUES (@postIdForCount, 0, 1, 0);
            END
        `);
        await transaction.commit();
        // Повертаємо повний об'єкт коментаря, включаючи дані користувача
        const userRequest = pool.request();
        const userResult = await userRequest
            .input('userIdParamForComment', mssql_1.default.Int, userId)
            .query('SELECT username, user_avatar_url FROM users WHERE user_id = @userIdParamForComment');
        if (userResult.recordset.length > 0) {
            return {
                comment_id: newCommentId,
                post_id: postId,
                user_id: userId,
                text: text,
                created_date: newCommentDate,
                parent_comment_id: newParentCommentId,
                username: userResult.recordset[0].username,
                user_avatar_url: userResult.recordset[0].user_avatar_url
            };
        }
        return null;
    }
    catch (error) {
        if (transaction) {
            try {
                await transaction.rollback();
            }
            catch (rbErr) {
                console.error("Rollback error in addCommentToDB:", rbErr);
            }
        }
        console.error(`❌ Error adding comment to post ${postId} by user ${userId}:`, error);
        throw new Error('Database error while adding comment');
    }
};
exports.addCommentToDB = addCommentToDB;
const savePostForUserInDB = async (userId, postId) => {
    try {
        const pool = await (0, db_1.connectDB)();
        await pool.request()
            .input('userId', mssql_1.default.Int, userId)
            .input('postId', mssql_1.default.Int, postId)
            .query('INSERT INTO saved_posts (user_id, post_id, saved_at) VALUES (@userId, @postId, GETDATE())'); // Додано saved_at
        console.log(`User ${userId} saved post ${postId}`);
        return true;
    }
    catch (error) {
        if (error instanceof mssql_1.default.RequestError && error.number === 2627) {
            console.warn(`User ${userId} already saved post ${postId}.`);
            return true;
        }
        console.error(`❌ Error saving post ${postId} for user ${userId}:`, error);
        throw new Error('Database error while saving post');
    }
};
exports.savePostForUserInDB = savePostForUserInDB;
/**
 * Видаляє пост зі збережених для користувача.
 */
const unsavePostForUserInDB = async (userId, postId) => {
    try {
        const pool = await (0, db_1.connectDB)();
        const result = await pool.request()
            .input('userId', mssql_1.default.Int, userId)
            .input('postId', mssql_1.default.Int, postId)
            .query('DELETE FROM saved_posts WHERE user_id = @userId AND post_id = @postId');
        if (result.rowsAffected[0] > 0) {
            console.log(`User ${userId} unsaved post ${postId}`);
        }
        else {
            console.warn(`User ${userId} had not saved post ${postId}, or it was already unsaved.`);
        }
        return true;
    }
    catch (error) {
        console.error(`❌ Error unsaving post ${postId} for user ${userId}:`, error);
        throw new Error('Database error while unsaving post');
    }
};
exports.unsavePostForUserInDB = unsavePostForUserInDB;
/**
 * Отримує список збережених постів для користувача.
 */
const getSavedPostsForUserFromDB = async (targetUserId, currentAuthUserIdForLikes, // Цей параметр потрібен для isLikedByCurrentUser
limit = 10, // Додаємо параметри пагінації
offset = 0) => {
    const logPrefix = `[postModel][getSavedPostsForUserFromDB][UserID: ${targetUserId}]`;
    console.log(`${logPrefix} Called with limit: ${limit}, offset: ${offset}, currentAuthUserIdForLikes: ${currentAuthUserIdForLikes}`);
    try {
        const pool = await (0, db_1.connectDB)();
        // Запит для загальної кількості збережених постів
        const countRequest = pool.request().input("targetUserIdCount", mssql_1.default.Int, targetUserId);
        const countResult = await countRequest.query(`SELECT COUNT_BIG(*) as totalCount FROM saved_posts WHERE user_id = @targetUserIdCount`);
        const totalCount = Number(countResult.recordset[0].totalCount);
        console.log(`${logPrefix} Total saved posts for user: ${totalCount}`);
        // Запит для отримання порції збережених постів
        const request = pool.request()
            .input('targetUserIdParam', mssql_1.default.Int, targetUserId)
            .input('currentAuthUserIdParam', mssql_1.default.Int, currentAuthUserIdForLikes)
            .input("limitParam", mssql_1.default.Int, limit)
            .input("offsetParam", mssql_1.default.Int, offset);
        const query = `
      SELECT
        p.post_id AS postId, p.user_id AS userId, p.label AS title, p.text AS content, 
        p.media_url AS contentImgURL, p.created_date AS createdAt, 
        u.username AS userNickname, u.user_avatar_url AS userAvatarURL,
        COALESCE(pd.likes, 0) AS likesCount,
        COALESCE(pd.comments, 0) AS commentsCount,
        COALESCE(pd.shares, 0) AS sharesCount,
        CAST(1 AS BIT) AS isSavedByCurrentUser, -- Для збережених постів це завжди true
        CAST(CASE WHEN pl.user_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isLikedByCurrentUser
      FROM posts p
      INNER JOIN users u ON p.user_id = u.user_id
      INNER JOIN saved_posts sp ON p.post_id = sp.post_id 
      LEFT JOIN post_data pd ON p.post_id = pd.post_id
      LEFT JOIN post_likes pl ON p.post_id = pl.post_id AND pl.user_id = @currentAuthUserIdParam
      WHERE sp.user_id = @targetUserIdParam 
      ORDER BY sp.saved_at DESC
      OFFSET @offsetParam ROWS
      FETCH NEXT @limitParam ROWS ONLY;
    `;
        console.log(`${logPrefix} Executing query: ${query.substring(0, 300)}...`); // Логуємо частину запиту
        const result = await request.query(query);
        console.log(`${logPrefix} Query result recordset length: ${result.recordset.length}`);
        const posts = result.recordset.map((post) => ({
            postId: post.postId,
            userId: post.userId,
            title: post.title,
            content: post.content,
            contentImgURL: post.contentImgURL,
            createdAt: post.createdAt,
            userNickname: post.userNickname,
            userAvatarURL: post.userAvatarURL,
            likesCount: Number(post.likesCount),
            commentsCount: Number(post.commentsCount),
            sharesCount: Number(post.sharesCount),
            isLikedByCurrentUser: !!post.isLikedByCurrentUser,
            isSavedByCurrentUser: !!post.isSavedByCurrentUser // Тут завжди true
        }));
        console.log(`${logPrefix} Mapped posts count: ${posts.length}`);
        return { posts, totalCount };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`${logPrefix} ❌ Error fetching saved posts for user ${targetUserId}:`, errorMessage, error);
        throw new Error(`Database error while fetching saved posts: ${errorMessage}`);
    }
};
exports.getSavedPostsForUserFromDB = getSavedPostsForUserFromDB;
const getFollowingPostsFeedFromDB = async (currentAuthUserId, limit = 10, offset = 0) => {
    try {
        const pool = await (0, db_1.connectDB)();
        const countRequest = pool.request().input("currentAuthUserIdCount", mssql_1.default.Int, currentAuthUserId);
        const countResult = await countRequest.query(`
      SELECT COUNT_BIG(DISTINCT p.post_id) as totalCount 
      FROM posts p
      INNER JOIN followers f ON p.user_id = f.following_id
      WHERE f.follower_id = @currentAuthUserIdCount
    `);
        const totalCount = Number(countResult.recordset[0].totalCount);
        const request = pool.request();
        request.input("currentAuthUserIdParam", mssql_1.default.Int, currentAuthUserId);
        request.input("limitParam", mssql_1.default.Int, limit);
        request.input("offsetParam", mssql_1.default.Int, offset);
        const query = `
      SELECT
        p.post_id AS postId, p.user_id AS userId, p.label AS title, p.text AS content, 
        p.media_url AS contentImgURL, p.created_date AS createdAt, 
        u.username AS userNickname, u.user_avatar_url AS userAvatarURL,
        COALESCE(pd.likes, 0) AS likesCount,
        COALESCE(pd.comments, 0) AS commentsCount,
        COALESCE(pd.shares, 0) AS sharesCount,
        CAST(CASE WHEN pl.user_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isLikedByCurrentUser,
        CAST(CASE WHEN sp.user_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isSavedByCurrentUser
      FROM posts p
      INNER JOIN users u ON p.user_id = u.user_id
      INNER JOIN followers f ON p.user_id = f.following_id
      LEFT JOIN post_data pd ON p.post_id = pd.post_id
      LEFT JOIN post_likes pl ON p.post_id = pl.post_id AND pl.user_id = @currentAuthUserIdParam
      LEFT JOIN saved_posts sp ON p.post_id = sp.post_id AND sp.user_id = @currentAuthUserIdParam
      WHERE f.follower_id = @currentAuthUserIdParam
      ORDER BY p.created_date DESC
      OFFSET @offsetParam ROWS
      FETCH NEXT @limitParam ROWS ONLY;
    `;
        const result = await request.query(query);
        const posts = result.recordset.map((post) => ({
            postId: post.postId,
            userId: post.userId,
            title: post.title,
            content: post.content,
            contentImgURL: post.contentImgURL,
            createdAt: post.createdAt,
            userNickname: post.userNickname,
            userAvatarURL: post.userAvatarURL,
            likesCount: Number(post.likesCount),
            commentsCount: Number(post.commentsCount),
            sharesCount: Number(post.sharesCount),
            isLikedByCurrentUser: !!post.isLikedByCurrentUser,
            isSavedByCurrentUser: !!post.isSavedByCurrentUser
        }));
        return { posts, totalCount };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("❌ Error fetching following posts feed (paginated):", errorMessage, error);
        throw new Error(`Database error while fetching following posts feed (paginated): ${errorMessage}`);
    }
};
exports.getFollowingPostsFeedFromDB = getFollowingPostsFeedFromDB;
/**
 * Отримує найпопулярніші пости з бази даних за кількістю лайків.
 * @param limit Кількість постів для повернення.
 * @returns Масив об'єктів популярних постів.
 */
const getPopularPostsFromDB = async (limit = 5, // Змінено дефолтний ліміт для популярних
offset = 0, currentAuthUserId) => {
    try {
        const pool = await (0, db_1.connectDB)();
        // Для популярних постів, загальна кількість - це всі пости, оскільки ми просто сортуємо їх
        const countResult = await pool.request().query(`SELECT COUNT_BIG(*) as totalCount FROM posts`);
        const totalCount = Number(countResult.recordset[0].totalCount);
        const request = pool.request()
            .input("limitParam", mssql_1.default.Int, limit)
            .input("offsetParam", mssql_1.default.Int, offset);
        let query = `
      SELECT
        p.post_id AS postId, p.user_id AS userId, p.label AS title, p.text AS content, 
        p.media_url AS contentImgURL, p.created_date AS createdAt, 
        u.username AS userNickname, u.user_avatar_url AS userAvatarURL,
        COALESCE(pd.likes, 0) AS likesCount,
        COALESCE(pd.comments, 0) AS commentsCount,
        COALESCE(pd.shares, 0) AS sharesCount
    `;
        if (currentAuthUserId) {
            query += `, CAST(CASE WHEN pl.user_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isLikedByCurrentUser, CAST(CASE WHEN sp.user_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isSavedByCurrentUser`;
            request.input("currentAuthUserIdParam", mssql_1.default.Int, currentAuthUserId);
        }
        else {
            query += `, CAST(0 AS BIT) AS isLikedByCurrentUser, CAST(0 AS BIT) AS isSavedByCurrentUser`;
        }
        query += `
      FROM posts p
      INNER JOIN users u ON p.user_id = u.user_id
      LEFT JOIN post_data pd ON p.post_id = pd.post_id
    `;
        if (currentAuthUserId) {
            query += `
        LEFT JOIN post_likes pl ON p.post_id = pl.post_id AND pl.user_id = @currentAuthUserIdParam
        LEFT JOIN saved_posts sp ON p.post_id = sp.post_id AND sp.user_id = @currentAuthUserIdParam
      `;
        }
        query += ` 
      ORDER BY COALESCE(pd.likes, 0) DESC, p.created_date DESC
      OFFSET @offsetParam ROWS
      FETCH NEXT @limitParam ROWS ONLY;
    `;
        const result = await request.query(query);
        const posts = result.recordset.map((post) => ({
            postId: post.postId, userId: post.userId, title: post.title, content: post.content,
            contentImgURL: post.contentImgURL, createdAt: post.createdAt,
            userNickname: post.userNickname, userAvatarURL: post.userAvatarURL,
            likesCount: Number(post.likesCount), commentsCount: Number(post.commentsCount), sharesCount: Number(post.sharesCount),
            isLikedByCurrentUser: !!post.isLikedByCurrentUser,
            isSavedByCurrentUser: !!post.isSavedByCurrentUser
        }));
        return { posts, totalCount };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("❌ Error fetching popular posts (paginated):", errorMessage, error);
        throw new Error(`Database error while fetching popular posts (paginated): ${errorMessage}`);
    }
};
exports.getPopularPostsFromDB = getPopularPostsFromDB;
const getSinglePostByIdFromDB = async (postId, currentAuthUserId) => {
    try {
        const pool = await (0, db_1.connectDB)();
        const request = pool.request().input("postIdParam", mssql_1.default.Int, postId);
        let query = `
      SELECT
        p.post_id AS postId, p.user_id AS userId, p.label AS title, p.text AS content,
        p.media_url AS contentImgURL, p.created_date AS createdAt,
        u.username AS userNickname, u.user_avatar_url AS userAvatarURL,
        COALESCE(pd.likes, 0) AS likesCount,
        COALESCE(pd.comments, 0) AS commentsCount,
        COALESCE(pd.shares, 0) AS sharesCount
    `;
        if (currentAuthUserId) {
            query += `,
        CAST(CASE WHEN pl.user_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isLikedByCurrentUser,
        CAST(CASE WHEN sp.user_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isSavedByCurrentUser
      `;
            request.input("currentAuthUserIdParam", mssql_1.default.Int, currentAuthUserId);
        }
        else {
            query += `, CAST(0 AS BIT) AS isLikedByCurrentUser, CAST(0 AS BIT) AS isSavedByCurrentUser`;
        }
        query += `
      FROM posts p
      INNER JOIN users u ON p.user_id = u.user_id
      LEFT JOIN post_data pd ON p.post_id = pd.post_id
    `;
        if (currentAuthUserId) {
            query += `
        LEFT JOIN post_likes pl ON p.post_id = pl.post_id AND pl.user_id = @currentAuthUserIdParam
        LEFT JOIN saved_posts sp ON p.post_id = sp.post_id AND sp.user_id = @currentAuthUserIdParam
      `;
        }
        query += ` WHERE p.post_id = @postIdParam;`;
        const result = await request.query(query);
        if (result.recordset.length === 0) {
            return null;
        }
        const post = result.recordset[0];
        return {
            postId: post.postId,
            userId: post.userId,
            title: post.title,
            content: post.content,
            contentImgURL: post.contentImgURL, // Важливо для отримання старого імені файлу
            createdAt: post.createdAt,
            userNickname: post.userNickname,
            userAvatarURL: post.userAvatarURL,
            likesCount: post.likesCount,
            commentsCount: post.commentsCount,
            sharesCount: post.sharesCount,
            isLikedByCurrentUser: !!post.isLikedByCurrentUser,
            isSavedByCurrentUser: !!post.isSavedByCurrentUser,
        };
    }
    catch (error) {
        console.error(`❌ Error fetching single post by ID ${postId} from DB:`, error);
        throw new Error("Database error while fetching single post by ID");
    }
};
exports.getSinglePostByIdFromDB = getSinglePostByIdFromDB;
const updatePostImageInDB = async (postId, newImageFilename) => {
    let oldImageFilename = null;
    const pool = await (0, db_1.connectDB)();
    const transaction = pool.transaction();
    let transactionBegun = false;
    try {
        await transaction.begin();
        transactionBegun = true;
        // 1. Отримуємо поточне (старе) ім'я файлу зображення (media_url)
        const selectRequest = transaction.request().input("postIdSelect", mssql_1.default.Int, postId);
        const resultSelect = await selectRequest.query(`SELECT media_url FROM posts WHERE post_id = @postIdSelect`);
        if (resultSelect.recordset.length > 0) {
            oldImageFilename = resultSelect.recordset[0].media_url;
        }
        else {
            // Якщо пост не знайдено, транзакція буде відкочена
            throw new Error(`Post with ID ${postId} not found for image update.`);
        }
        // 2. Оновлюємо media_url на нове ім'я файлу
        const updateRequest = transaction.request()
            .input("postIdUpdate", mssql_1.default.Int, postId)
            .input("newImageFilename", mssql_1.default.NVarChar, newImageFilename); // Може бути null, якщо зображення видаляється
        const resultUpdate = await updateRequest.query(`UPDATE posts SET media_url = @newImageFilename WHERE post_id = @postIdUpdate`);
        if (resultUpdate.rowsAffected[0] === 0) {
            // Це не мало б статися, якщо попередній SELECT знайшов пост
            throw new Error(`Failed to update image for post ID ${postId}. Post might have been deleted concurrently.`);
        }
        await transaction.commit();
        console.log(`[postModel] Image for post ${postId} updated in DB. Old filename: ${oldImageFilename}, New filename: ${newImageFilename}`);
        return oldImageFilename;
    }
    catch (error) {
        if (transactionBegun && transaction) {
            try {
                console.warn(`[postModel] Error during post image update for post ${postId}, attempting rollback...`);
                await transaction.rollback();
                console.log(`[postModel] Transaction for post ${postId} image update rolled back.`);
            }
            catch (rollbackError) {
                console.error(`❌ CRITICAL: Error during transaction rollback for post ${postId} image update:`, rollbackError);
            }
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error in updatePostImageInDB for post ${postId}: ${errorMessage}`);
        throw new Error(`Database error while updating post image for post ${postId}: ${errorMessage}`);
    }
};
exports.updatePostImageInDB = updatePostImageInDB;
const recursivelyDeleteCommentsAndCount = async (commentId, transaction // Використовуємо імпортований тип MSSQLTransaction
) => {
    let deletedCount = 0;
    // Знаходимо всі прямі відповіді на цей коментар
    const repliesResult = await transaction.request()
        .input('parentCommentIdParam', mssql_1.default.Int, commentId)
        .query('SELECT comment_id FROM comments WHERE parent_comment_id = @parentCommentIdParam');
    for (const reply of repliesResult.recordset) {
        // Рекурсивно видаляємо кожну відповідь та додаємо до лічильника
        deletedCount += await (0, exports.recursivelyDeleteCommentsAndCount)(reply.comment_id, transaction);
    }
    // Видаляємо сам коментар (батьківський або поточну відповідь)
    const deleteResult = await transaction.request()
        .input('commentIdToDelete', mssql_1.default.Int, commentId)
        .query('DELETE FROM comments WHERE comment_id = @commentIdToDelete');
    if (deleteResult.rowsAffected[0] > 0) {
        deletedCount += 1; // Додаємо 1 за сам видалений коментар
    }
    return deletedCount;
};
exports.recursivelyDeleteCommentsAndCount = recursivelyDeleteCommentsAndCount;
const deleteCommentFromDB = async (commentId, requestingUserId, userRole, postId) => {
    const pool = await (0, db_1.connectDB)();
    const transaction = pool.transaction();
    let transactionBegun = false; // Прапорець для відстеження стану транзакції
    try {
        await transaction.begin();
        transactionBegun = true; // Транзакцію успішно розпочато
        // 1. Перевірка прав: чи є користувач автором або адміном
        const commentCheckRequest = transaction.request()
            .input('commentIdParam', mssql_1.default.Int, commentId);
        const commentCheckResult = await commentCheckRequest.query(`SELECT user_id FROM comments WHERE comment_id = @commentIdParam`);
        if (commentCheckResult.recordset.length === 0) {
            throw new Error("Comment not found");
        }
        const commentAuthorId = commentCheckResult.recordset[0].user_id;
        if (commentAuthorId !== requestingUserId && userRole !== 'admin') {
            throw new Error("Forbidden: You can only delete your own comments or you are not an admin.");
        }
        // 2. Рекурсивне видалення коментаря та його відповідей
        const totalDeletedComments = await (0, exports.recursivelyDeleteCommentsAndCount)(commentId, transaction);
        if (totalDeletedComments === 0) {
            console.warn(`[postModel] deleteCommentFromDB: No comments were deleted by recursivelyDeleteCommentsAndCount for commentId ${commentId}. This might indicate the comment was deleted concurrently after the initial check.`);
            throw new Error("Failed to delete comment as it might have been removed after initial check.");
        }
        // 3. Оновлення лічильника коментарів у post_data
        const updatePostDataRequest = transaction.request()
            .input('postIdForCountUpdate', mssql_1.default.Int, postId)
            .input('deletedCountParam', mssql_1.default.Int, totalDeletedComments);
        await updatePostDataRequest.query(`UPDATE post_data SET comments = comments - @deletedCountParam WHERE post_id = @postIdForCountUpdate AND comments >= @deletedCountParam;
         UPDATE post_data SET comments = 0 WHERE post_id = @postIdForCountUpdate AND comments < @deletedCountParam;`);
        await transaction.commit();
        return { success: true, deletedCommentsCount: totalDeletedComments };
    }
    catch (error) {
        if (transactionBegun) {
            try {
                await transaction.rollback();
                console.log(`[postModel] Transaction for deleting commentId ${commentId} rolled back due to error.`);
            }
            catch (rbErr) {
                console.error(`Rollback error in deleteCommentFromDB (commentId ${commentId}):`, rbErr);
            }
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error in deleteCommentFromDB (ID: ${commentId}):`, errorMessage);
        if (error instanceof Error && (error.message.includes("Comment not found") || error.message.includes("Forbidden"))) {
            throw error;
        }
        throw new Error(`Database error while deleting comment: ${errorMessage}`);
    }
};
exports.deleteCommentFromDB = deleteCommentFromDB;
