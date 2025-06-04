"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNewMessageNotificationsForUser = exports.getNewPostNotificationsForUser = exports.getNewFollowerNotificationsForUser = void 0;
// my-backend-app/src/models/notificationModel.ts
const mssql_1 = __importDefault(require("mssql"));
const db_1 = require("../config/db");
const DEFAULT_NOTIFICATION_TIMESPAN_DAYS = 7; // Якщо last_logout немає, показувати за останній тиждень
/**
 * Отримує сповіщення про нових підписників.
 */
const getNewFollowerNotificationsForUser = async (userId, sinceDate) => {
    try {
        const pool = await (0, db_1.connectDB)();
        const result = await pool.request()
            .input('recipientUserId', mssql_1.default.Int, userId)
            .input('sinceDate', mssql_1.default.DateTime, sinceDate)
            .query(`
        SELECT 
            f.follower_id as actor_user_id,
            u.username as actor_username,
            u.user_avatar_url as actor_avatar_url,
            f.created_at as notification_timestamp,
            'new_follower' as event_type
        FROM followers f
        JOIN users u ON f.follower_id = u.user_id
        WHERE f.following_id = @recipientUserId AND f.created_at > @sinceDate
        ORDER BY f.created_at DESC;
      `);
        return result.recordset;
    }
    catch (error) {
        console.error('❌ Error fetching new follower notifications:', error);
        throw error;
    }
};
exports.getNewFollowerNotificationsForUser = getNewFollowerNotificationsForUser;
/**
 * Отримує сповіщення про нові пости від тих, на кого підписаний користувач.
 */
const getNewPostNotificationsForUser = async (userId, sinceDate) => {
    try {
        const pool = await (0, db_1.connectDB)();
        const result = await pool.request()
            .input('currentUserId', mssql_1.default.Int, userId)
            .input('sinceDate', mssql_1.default.DateTime, sinceDate)
            .query(`
        SELECT 
            p.post_id as target_entity_id,
            p.user_id as actor_user_id,
            u.username as actor_username,
            u.user_avatar_url as actor_avatar_url,
            LEFT(p.label, 50) as post_title_preview, -- Або LEFT(p.text, 50)
            p.created_date as notification_timestamp,
            'new_post_from_followed' as event_type
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        JOIN followers f ON p.user_id = f.following_id
        WHERE f.follower_id = @currentUserId AND p.created_date > @sinceDate
        ORDER BY p.created_date DESC;
      `);
        return result.recordset;
    }
    catch (error) {
        console.error('❌ Error fetching new post notifications:', error);
        throw error;
    }
};
exports.getNewPostNotificationsForUser = getNewPostNotificationsForUser;
/**
 * Отримує сповіщення про нові повідомлення.
 */
const getNewMessageNotificationsForUser = async (userId, sinceDate) => {
    try {
        const pool = await (0, db_1.connectDB)();
        const result = await pool.request()
            .input('recipientUserId', mssql_1.default.Int, userId)
            .input('sinceDate', mssql_1.default.DateTime, sinceDate)
            .query(`
        SELECT 
            m.sender_id as actor_user_id,
            u.username as actor_username,
            u.user_avatar_url as actor_avatar_url,
            MAX(m.created_at) as notification_timestamp, -- Останнє повідомлення від цього користувача
            COUNT(DISTINCT m.message_id) as new_messages_count, -- Кількість нових повідомлень від цього відправника
            'new_message' as event_type
        FROM messages m
        JOIN users u ON m.sender_id = u.user_id
        WHERE m.receiver_id = @recipientUserId AND m.created_at > @sinceDate
        GROUP BY m.sender_id, u.username, u.user_avatar_url
        ORDER BY MAX(m.created_at) DESC;
      `);
        // Примітка: цей запит групує повідомлення від одного відправника.
        // Фронтенд має обробити `new_messages_count`.
        return result.recordset;
    }
    catch (error) {
        console.error('❌ Error fetching new message notifications:', error);
        throw error;
    }
};
exports.getNewMessageNotificationsForUser = getNewMessageNotificationsForUser;
