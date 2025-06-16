"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSingleMessageById = exports.updateMessageInDB = exports.getChatsForUser = exports.deleteMessageFromDB = exports.addMessage = exports.getMessagesForUser = void 0;
// my-backend-app/src/models/messageModel.ts
const mssql_1 = __importDefault(require("mssql"));
const db_1 = require("../config/db");
/**
 * Отримує всі повідомлення для діалогу між двома користувачами.
 * @param userId1 - ID першого користувача (зазвичай поточного).
 * @param userId2 - ID другого користувача (співрозмовника).
 * @returns Масив об'єктів повідомлень.
 */
const getMessagesForUser = async (userId1, userId2) => {
    if (!userId1 || !userId2) {
        throw new Error("❌ Missing required fields: userId1 and userId2");
    }
    try {
        const pool = await (0, db_1.connectDB)();
        const request = pool.request()
            .input('userId1', mssql_1.default.Int, userId1)
            .input('userId2', mssql_1.default.Int, userId2);
        const result = await request.query(`
      SELECT
        m.message_id AS messageID, m.sender_id AS senderID, m.receiver_id AS receiverID,
        m.message, m.message_file_content_url AS messageFileContentUrl, m.created_at AS send_at,
        s.username AS senderNickname, s.user_avatar_url AS senderAvatarURL,
        r.username AS receiverNickname, r.user_avatar_url AS receiverAvatarURL
      FROM messages m
      JOIN users s ON m.sender_id = s.user_id
      JOIN users r ON m.receiver_id = r.user_id
      WHERE (m.sender_id = @userId1 AND m.receiver_id = @userId2) 
         OR (m.sender_id = @userId2 AND m.receiver_id = @userId1)
      ORDER BY m.created_at ASC;
    `);
        return result.recordset;
    }
    catch (error) {
        console.error("❌ Error fetching messages for dialog:", error);
        throw new Error("Database error while fetching user messages for dialog");
    }
};
exports.getMessagesForUser = getMessagesForUser;
/**
 * Додає нове повідомлення до бази даних.
 * @param senderID - ID відправника.
 * @param receiverID - ID отримувача.
 * @param message - Текст повідомлення (може бути порожнім, якщо є файл).
 * @param messageFilename - Ім'я файлу зображення (необов'язково).
 * @returns Об'єкт створеного повідомлення з даними відправника та отримувача.
 */
const addMessage = async (senderID, receiverID, message, messageFilename) => {
    if (!senderID || !receiverID) {
        throw new Error("❌ Missing required fields: senderID and receiverID");
    }
    if ((!message || message.trim() === '') && (!messageFilename || messageFilename.trim() === '')) {
        throw new Error("❌ Message content or file is required.");
    }
    const timestamp = new Date().toISOString();
    console.log(`[messageModel][${timestamp}] Adding message from ${senderID} to ${receiverID}. File: ${messageFilename}`);
    try {
        const pool = await (0, db_1.connectDB)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const request = transaction.request()
                .input('senderID', mssql_1.default.Int, senderID)
                .input('receiverID', mssql_1.default.Int, receiverID)
                .input('message', mssql_1.default.NVarChar, message || null) // Дозволяємо null, якщо є тільки файл
                .input('messageFileContentUrl', mssql_1.default.NVarChar, messageFilename || null) // Зберігаємо ім'я файлу
                .input('created_at', mssql_1.default.DateTime, new Date()); // Використовуємо GETDATE() або new Date()
            const result = await request.query(`
          INSERT INTO messages (sender_id, receiver_id, message, message_file_content_url, created_at)
          OUTPUT INSERTED.message_id as messageID, INSERTED.sender_id as senderID,
                 INSERTED.receiver_id as receiverID, INSERTED.message,
                 INSERTED.message_file_content_url as messageFileContentUrl, INSERTED.created_at as send_at
          VALUES (@senderID, @receiverID, @message, @messageFileContentUrl, @created_at);
        `);
            if (result.recordset && result.recordset.length > 0) {
                const newMessage = result.recordset[0];
                const userRequestSender = transaction.request(); // Використовуємо той самий request в межах транзакції
                const senderDataResult = await userRequestSender.input('senderIdParam', mssql_1.default.Int, newMessage.senderID)
                    .query('SELECT username as senderNickname, user_avatar_url as senderAvatarURL FROM users WHERE user_id = @senderIdParam');
                const userRequestReceiver = transaction.request();
                const receiverDataResult = await userRequestReceiver.input('receiverIdParam', mssql_1.default.Int, newMessage.receiverID)
                    .query('SELECT username as receiverNickname, user_avatar_url as receiverAvatarURL FROM users WHERE user_id = @receiverIdParam');
                await transaction.commit();
                console.log(`[messageModel][${timestamp}] Message from ${senderID} to ${receiverID} added and transaction committed.`);
                return {
                    messageID: newMessage.messageID,
                    senderID: newMessage.senderID,
                    receiverID: newMessage.receiverID,
                    message: newMessage.message,
                    messageFileContentUrl: newMessage.messageFileContentUrl,
                    send_at: newMessage.send_at,
                    senderNickname: senderDataResult.recordset[0]?.senderNickname || 'Unknown',
                    senderAvatarURL: senderDataResult.recordset[0]?.senderAvatarURL || null,
                    receiverNickname: receiverDataResult.recordset[0]?.receiverNickname || 'Unknown',
                    receiverAvatarURL: receiverDataResult.recordset[0]?.receiverAvatarURL || null
                };
            }
            else {
                await transaction.rollback();
                console.warn(`[messageModel][${timestamp}] Message insertion did not return an inserted record. Rolled back.`);
                return null;
            }
        }
        catch (innerError) {
            await transaction.rollback();
            console.error(`[messageModel][${timestamp}] Error during message insertion transaction, rolled back:`, innerError);
            throw innerError; // Перекидаємо помилку далі
        }
    }
    catch (error) {
        console.error(`[messageModel][${timestamp}] ❌ Error adding message:`, error);
        throw new Error(`Database error while adding message: ${error.message}`);
    }
};
exports.addMessage = addMessage;
const deleteMessageFromDB = async (messageID, currentUserId) => {
    if (!messageID || !currentUserId) {
        throw new Error("❌ Missing required field: messageID or currentUserId");
    }
    const pool = await (0, db_1.connectDB)();
    const request = pool.request()
        .input('messageID', mssql_1.default.Int, messageID)
        .input('currentUserId', mssql_1.default.Int, currentUserId);
    try {
        // Дозволяємо видаляти тільки власні повідомлення
        const result = await request.query(`
        DELETE FROM messages 
        WHERE message_id = @messageID AND sender_id = @currentUserId; 
    `);
        if (result.rowsAffected[0] === 0) {
            const checkRequest = pool.request().input('checkMessageID', mssql_1.default.Int, messageID);
            const checkResult = await checkRequest.query('SELECT sender_id FROM messages WHERE message_id = @checkMessageID');
            if (checkResult.recordset.length === 0) {
                throw new Error("Message not found");
            }
            else {
                throw new Error("Forbidden: You can only delete your own messages.");
            }
        }
        return true;
    }
    catch (error) {
        console.error("❌ Error deleting message:", error);
        if (error instanceof Error && (error.message.includes("Message not found") || error.message.includes("Forbidden"))) {
            throw error;
        }
        throw new Error("Database error while deleting message");
    }
};
exports.deleteMessageFromDB = deleteMessageFromDB;
const getChatsForUser = async (userId) => {
    if (!userId) {
        throw new Error("❌ Missing required field: userId");
    }
    try {
        const pool = await (0, db_1.connectDB)();
        const request = pool.request().input('userId', mssql_1.default.Int, userId);
        const result = await request.query(`
        WITH UserMessages AS (
            SELECT message_id, sender_id, receiver_id, message, message_file_content_url, created_at
            FROM messages
            WHERE sender_id = @userId OR receiver_id = @userId
        ),
        Partners AS (
            SELECT
                message_id, created_at, message, message_file_content_url,
                CASE WHEN sender_id = @userId THEN receiver_id ELSE sender_id END AS partner_id
            FROM UserMessages
        ),
        RankedMessages AS (
            SELECT
                partner_id, message_id, message, message_file_content_url, created_at,
                ROW_NUMBER() OVER(PARTITION BY partner_id ORDER BY created_at DESC) as rn
            FROM Partners
        )
        SELECT
            rm.partner_id AS partnerId,
            u.username AS partnerUsername,
            u.display_name AS partnerName,
            u.user_avatar_url AS partnerAvatarUrl,
            rm.message AS lastMessage,
            rm.message_file_content_url AS lastMessageFileUrl, -- Додано для відображення, чи є файл в останньому повідомленні
            rm.created_at AS lastMessageCreatedAt
        FROM RankedMessages rm
        JOIN users u ON rm.partner_id = u.user_id
        WHERE rm.rn = 1
        ORDER BY rm.created_at DESC;
    `);
        return result.recordset;
    }
    catch (error) {
        console.error("❌ Error fetching chats for user:", error);
        throw new Error("Database error while fetching user chats");
    }
};
exports.getChatsForUser = getChatsForUser;
const updateMessageInDB = async (messageID, currentUserId, newText, newMessageFilename // undefined - не чіпати, null - видалити, string - нове
) => {
    const pool = await (0, db_1.connectDB)();
    const transaction = pool.transaction();
    let transactionBegun = false;
    let oldFilename = null;
    try {
        await transaction.begin();
        transactionBegun = true;
        const request = transaction.request().input("messageID", mssql_1.default.Int, messageID);
        const checkResult = await request.query(`SELECT sender_id, message_file_content_url FROM messages WHERE message_id = @messageID`);
        if (checkResult.recordset.length === 0) {
            throw new Error("Message not found");
        }
        if (checkResult.recordset[0].sender_id !== currentUserId) {
            // Додатково: адмін може редагувати? Якщо ні, то тільки автор.
            throw new Error("Forbidden: You can only edit your own messages.");
        }
        oldFilename = checkResult.recordset[0].message_file_content_url;
        const updateFields = [];
        const updateRequest = transaction.request().input("messageIdForUpdate", mssql_1.default.Int, messageID);
        if (newText !== undefined) {
            updateFields.push("message = @newText");
            updateRequest.input("newText", mssql_1.default.NVarChar, newText);
        }
        if (newMessageFilename !== undefined) {
            updateFields.push("message_file_content_url = @newMessageFilename");
            updateRequest.input("newMessageFilename", mssql_1.default.NVarChar, newMessageFilename); // newMessageFilename може бути null
        }
        if (updateFields.length === 0) {
            console.warn(`[messageModel] No fields provided to update for message ${messageID}.`);
            await transaction.commit(); // Все одно комітимо, бо перевірки пройшли
            // Повертаємо поточне повідомлення, якщо нічого не змінилося
            const currentMessage = await getSingleMessageById(messageID); // Потрібна нова функція
            return { oldFilename: null, updatedMessage: currentMessage };
        }
        // Можна додати оновлення updated_at, якщо є таке поле в таблиці messages
        // updateFields.push("updated_at = GETDATE()"); 
        const updateQuerySql = `UPDATE messages SET ${updateFields.join(", ")} WHERE message_id = @messageIdForUpdate`;
        const updateResult = await updateRequest.query(updateQuerySql);
        if (updateResult.rowsAffected[0] === 0) {
            throw new Error(`Failed to update message ID ${messageID}.`);
        }
        await transaction.commit();
        // Отримуємо оновлене повідомлення з даними користувачів
        const updatedMessage = await getSingleMessageById(messageID); // Потрібна нова функція
        console.log(`[messageModel] Message ${messageID} updated. Old filename (if changed): ${oldFilename}`);
        // Повертаємо старе ім'я файлу, тільки якщо воно дійсно змінювалося/видалялося
        return { oldFilename: (newMessageFilename !== undefined) ? oldFilename : null, updatedMessage };
    }
    catch (error) {
        if (transactionBegun && transaction) {
            try {
                await transaction.rollback();
            }
            catch (rbErr) {
                console.error("Rollback error in updateMessageInDB:", rbErr);
            }
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error in updateMessageInDB for message ${messageID}: ${errorMessage}`);
        if (error instanceof Error && (error.message.includes("not found") || error.message.includes("Forbidden"))) {
            throw error;
        }
        throw new Error(`Database error while updating message ${messageID}: ${errorMessage}`);
    }
};
exports.updateMessageInDB = updateMessageInDB;
// Допоміжна функція для отримання одного повідомлення (потрібна для повернення оновленого)
const getSingleMessageById = async (messageID) => {
    try {
        const pool = await (0, db_1.connectDB)();
        const result = await pool.request()
            .input('messageID', mssql_1.default.Int, messageID)
            .query(`
                SELECT
                    m.message_id AS messageID, m.sender_id AS senderID, m.receiver_id AS receiverID,
                    m.message, m.message_file_content_url AS messageFileContentUrl, m.created_at AS send_at,
                    s.username AS senderNickname, s.user_avatar_url AS senderAvatarURL,
                    r.username AS receiverNickname, r.user_avatar_url AS receiverAvatarURL
                FROM messages m
                JOIN users s ON m.sender_id = s.user_id
                JOIN users r ON m.receiver_id = r.user_id
                WHERE m.message_id = @messageID;
            `);
        if (result.recordset.length > 0) {
            return result.recordset[0];
        }
        return null;
    }
    catch (error) {
        console.error(`❌ Error fetching single message by ID ${messageID}:`, error);
        throw new Error("Database error while fetching single message");
    }
};
exports.getSingleMessageById = getSingleMessageById;
