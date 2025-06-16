// my-backend-app/src/models/userModel.ts
import sql from "mssql";
import bcrypt from "bcrypt";
import { connectDB } from "../config/db";
// Імпортуємо типи (переконайтесь, що шлях правильний)
import { PaginatedUserListResponse, UserListItem, UserPrivate, UserPublic } from "../types/userTypes";
import { RequestError } from "mssql";

interface UserDetailsToUpdate {
  display_name?: string;
  about_me?: string;
  gender?: string;
  phone?: string;
  // Додайте інші поля, якщо потрібно, наприклад, date_of_birth
}

// Отримання всіх публічних даних користувачів
 const getUsersFromDB = async (
  limit: number = 10,
  offset: number = 0,
  currentAuthUserId?: number 
): Promise<{ users: Array<UserPublic & { isFollowedByCurrentUser: boolean, created_at?: Date }>, totalCount: number }> => {
  try {
    const pool = await connectDB();
    let countWhereClause = "";
    const countRequest = pool.request();
    if (currentAuthUserId) {
      countWhereClause = ` WHERE user_id != @currentAuthUserId_count`;
      countRequest.input("currentAuthUserId_count", sql.Int, currentAuthUserId);
    }
    const countResult = await countRequest.query(`SELECT COUNT_BIG(*) as totalCount FROM users ${countWhereClause}`);
    const totalCount = Number(countResult.recordset[0].totalCount);

    const request = pool.request()
      .input("limitParam", sql.Int, limit)
      .input("offsetParam", sql.Int, offset);

    let query = `
      SELECT
        u.user_id, u.username, u.display_name, u.uid, u.profile_picture_url,
        u.gender, u.user_avatar_url, u.about_me, u.created_at 
    `; // Додано u.created_at
    let fromAndJoins = `FROM users u`;
    let mainWhereClause = "";

    if (currentAuthUserId) {
      query += `, CAST(CASE WHEN f.follower_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isFollowedByCurrentUser`;
      fromAndJoins += ` LEFT JOIN followers f ON u.user_id = f.following_id AND f.follower_id = @currentAuthUserIdParam`;
      mainWhereClause = ` WHERE u.user_id != @currentAuthUserIdParam`;
      request.input("currentAuthUserIdParam", sql.Int, currentAuthUserId);
    } else {
      query += `, CAST(0 AS BIT) AS isFollowedByCurrentUser`;
    }
    
    query += ` ${fromAndJoins} ${mainWhereClause}
      ORDER BY u.user_id DESC 
      OFFSET @offsetParam ROWS
      FETCH NEXT @limitParam ROWS ONLY;
    `;
    
    const result = await request.query(query);
    const users = result.recordset.map((user: any): UserPublic & { isFollowedByCurrentUser: boolean, created_at?: Date } => ({
      user_id: user.user_id,
      userName: user.username,
      displayName: user.display_name,
      uid: user.uid,
      profile_picture_url: user.profile_picture_url,
      gender: user.gender,
      user_avatar_url: user.user_avatar_url,
      about_me: user.about_me,
      created_at: user.created_at,
      isFollowedByCurrentUser: !!user.isFollowedByCurrentUser
    }));

    return { users, totalCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error fetching paginated users from DB:", errorMessage, error);
    throw new Error(`Database error while fetching paginated users: ${errorMessage}`);
  }
};

// Отримання публічних даних користувача за UID
const getUserByUIDFromDB = async (uid: string): Promise<UserPublic | null> => {
  // Додано тип повернення
  try {
    const pool = await connectDB();
    const result = await pool.request().input("uid", sql.NVarChar, uid) // Змінено тип на NVarChar для uid
      .query(`
        SELECT user_id, username, display_name, uid, profile_picture_url, gender, user_avatar_url, about_me
        FROM users
        WHERE uid = @uid
      `);

    return result.recordset.length > 0 ? result.recordset[0] : null; // Повертаємо null, якщо не знайдено
  } catch (error) {
    console.error("Error fetching user by UID:", error);
    throw error; // Кидаємо помилку далі
  }
};

const getUserByIdFromDB = async (
  targetUserId: number,
  currentAuthUserId?: number 
): Promise<(UserPublic & { isFollowedByCurrentUser?: boolean }) | null> => {
  try {
    const pool = await connectDB();
    const request = pool
      .request()
      .input("targetUserIdParam", sql.Int, targetUserId);
    let selectFields = `
        u.user_id, u.username, u.display_name, u.uid, u.profile_picture_url,
        u.gender, u.user_avatar_url, u.about_me
    `;
    let joins = "";
    let whereClause = "WHERE u.user_id = @targetUserIdParam";
    if (currentAuthUserId) {
      selectFields += `,
        CASE
          WHEN f.follower_id IS NOT NULL THEN CAST(1 AS BIT)
          ELSE CAST(0 AS BIT)
        END AS isFollowedByCurrentUser
      `;
      joins = `
        LEFT JOIN followers f ON u.user_id = f.following_id AND f.follower_id = @currentAuthUserIdParam
      `;
      request.input("currentAuthUserIdParam", sql.Int, currentAuthUserId);
    }
    const query = `
        SELECT ${selectFields}
        FROM users u
        ${joins}
        ${whereClause};
    `;
    const result = await request.query(query);
    if (result.recordset.length > 0) {
      const userRecord = result.recordset[0];
      // Переконуємося, що поле isFollowedByCurrentUser є boolean, якщо воно існує
      if (userRecord.isFollowedByCurrentUser !== undefined) {
        userRecord.isFollowedByCurrentUser =
          !!userRecord.isFollowedByCurrentUser;
      }
      // Зіставлення імен полів, якщо ваші типи UserPublic використовують camelCase
      // а БД - snake_case
      return {
        user_id: userRecord.user_id,
        userName: userRecord.username, // Приклад зіставлення
        displayName: userRecord.display_name, // Приклад зіставлення
        uid: userRecord.uid,
        profile_picture_url: userRecord.profile_picture_url,
        gender: userRecord.gender,
        user_avatar_url: userRecord.user_avatar_url,
        about_me: userRecord.about_me,
        isFollowedByCurrentUser: userRecord.isFollowedByCurrentUser,
      } as UserPublic & { isFollowedByCurrentUser?: boolean };
    }
    return null;
  } catch (error) {
    console.error("❌ Error fetching user by id (with follow status):", error);
    throw new Error(
      "Database query error while fetching user by ID (with follow status)"
    );
  }
};

/**
 * Отримує список користувачів з позначкою, чи стежить за ними поточний користувач.
 * @param currentUserId - ID поточного залогіненого користувача.
 * @returns Масив користувачів з полем 'isFollowedByCurrentUser'.
 */
const getUsersWithFollowStatus = async (
  currentUserId: number,
  limit: number = 10,
  offset: number = 0
): Promise<{ users: Array<UserPublic & { isFollowedByCurrentUser: boolean, created_at?: Date }>, totalCount: number }> => {
  try {
    const pool = await connectDB();
    const countRequest = pool.request().input("currentUserIdCount", sql.Int, currentUserId);
    const countResult = await countRequest.query(
      `SELECT COUNT_BIG(*) as totalCount FROM users WHERE user_id != @currentUserIdCount`
    );
    const totalCount = Number(countResult.recordset[0].totalCount);

    const request = pool.request()
      .input("currentUserIdParam", sql.Int, currentUserId)
      .input("limitParam", sql.Int, limit)
      .input("offsetParam", sql.Int, offset);

    const query = `
      SELECT
        u.user_id, u.username, u.display_name, u.uid, u.profile_picture_url,
        u.gender, u.user_avatar_url, u.about_me, u.created_at,
        CAST(CASE WHEN f.follower_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isFollowedByCurrentUser
      FROM users u
      LEFT JOIN followers f ON u.user_id = f.following_id AND f.follower_id = @currentUserIdParam
      WHERE u.user_id != @currentUserIdParam
      ORDER BY u.username 
      OFFSET @offsetParam ROWS
      FETCH NEXT @limitParam ROWS ONLY;
    `;
    
    const result = await request.query(query);
    const users = result.recordset.map((user: any): UserPublic & { isFollowedByCurrentUser: boolean, created_at?: Date } => ({
      user_id: user.user_id, userName: user.username, displayName: user.display_name, uid: user.uid,
      profile_picture_url: user.profile_picture_url, gender: user.gender, user_avatar_url: user.user_avatar_url,
      about_me: user.about_me, created_at: user.created_at,
      isFollowedByCurrentUser: !!user.isFollowedByCurrentUser
    }));
    return { users, totalCount };
  } catch (error) {
    console.error("❌ Error fetching paginated users with follow status:", error);
    throw new Error("Database error while fetching paginated users with follow status");
  }
};

/**
 * Створює запис про стеження одного користувача за іншим.
 * @param followerId - ID того, хто стежить.
 * @param followingId - ID того, за ким стежать.
 */
const followUserInDB = async (
  followerId: number,
  followingId: number
): Promise<void> => {
  if (followerId === followingId) {
    throw new Error("Cannot follow yourself.");
  }
  try {
    const pool = await connectDB();
    const request = pool
      .request()
      .input("followerId", sql.Int, followerId)
      .input("followingId", sql.Int, followingId);

    await request.query(`
        INSERT INTO followers (follower_id, following_id)
        VALUES (@followerId, @followingId);
    `);
  } catch (error) {
    // --- ВИПРАВЛЕНО catch блок ---
    // Перевіряємо, чи це помилка від mssql і чи це помилка дублікату
    if (error instanceof RequestError && error.number === 2627) {
      console.warn(`User ${followerId} already follows ${followingId}.`);
      return; // Ігноруємо помилку дублікату
    }
    // Логуємо інші помилки
    if (error instanceof Error) {
      console.error("❌ Error following user:", error.message, error); // Логуємо і сам об'єкт помилки
    } else {
      console.error("❌ Error following user (unknown type):", error);
    }
    // --- КІНЕЦЬ ВИПРАВЛЕННЯ ---
    throw new Error("Database error while following user");
  }
};

/**
 * Видаляє запис про стеження одного користувача за іншим.
 * @param followerId - ID того, хто стежить.
 * @param followingId - ID того, за ким стежать.
 */
const unfollowUserInDB = async (
  followerId: number,
  followingId: number
): Promise<void> => {
  try {
    const pool = await connectDB();
    const request = pool
      .request()
      .input("followerId", sql.Int, followerId)
      .input("followingId", sql.Int, followingId);

    const result = await request.query(`
        DELETE FROM followers
        WHERE follower_id = @followerId AND following_id = @followingId;
    `);

    if (result.rowsAffected[0] === 0) {
      console.warn(
        `User ${followerId} was not following ${followingId}. No rows deleted.`
      );
    }
  } catch (error) {
    // Додаємо перевірку типу для error
    if (error instanceof Error) {
      console.error("❌ Error unfollowing user:", error.message);
    } else {
      console.error("❌ Error unfollowing user:", error);
    }
    throw new Error("Database error while unfollowing user");
  }
};

// --- НОВА ФУНКЦІЯ ---
// Отримання приватних даних користувача (включаючи хеш пароля) за User ID
const getPrivateUserDataByUserId = async (
  userId: number
): Promise<UserPrivate | null> => {
  try {
    const pool = await connectDB();
    const request = pool.request().input("userId", sql.Int, userId);
    const result = await request.query(`
      SELECT user_id, email, password_hash, phone, role, date_ofBirht -- Перевірте назву поля date_ofBirht у БД
      FROM user_private
      WHERE user_id = @userId
    `);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  } catch (error) {
    console.error("❌ Error fetching private user data by ID:", error);
    throw new Error("Database query error while fetching private data");
  }
};
// --- КІНЕЦЬ НОВОЇ ФУНКЦІЇ ---

// Додавання нового користувача
const addUserToDB = async (
  username: string,
  displayName: string,
  gender: string,
  email: string,
  passwordHash: string, // Змінено назву параметра для ясності
  phone: string = "",
  profilePictureUrl: string = " ",
  userAvatar: string = "default_avatar.png",
  date_of_birth?: string // Зроблено необов'язковим, якщо може бути NULL у БД
): Promise<{ userId: number; message: string }> => {
  // Додано тип повернення
  const pool = await connectDB();
  const transaction = pool.transaction(); // Використовуємо transaction() з пулу

  try {
    await transaction.begin();
    // Створюємо запит В МЕЖАХ транзакції
    const request = transaction.request();

    console.log("DEBUG: Значення user_Avatar, що передається в БД:", userAvatar);
    // Додаємо користувача в `users`
    const result =
      await // Додайте .input('uid', sql.NVarChar, generateSomeUid()) якщо uid генерується тут
      request
        .input("username", sql.NVarChar, username)
        .input("display_name", sql.NVarChar, displayName)
        .input("gender", sql.NVarChar, gender)
        .input("user_Avatar", sql.NVarChar, userAvatar)
        .input("profile_picture_url", sql.NVarChar, profilePictureUrl || null) // Дозволяємо NULL
        .query(`
        INSERT INTO users (username, display_name, profile_picture_url, user_avatar_url, gender /*, uid */)
        OUTPUT INSERTED.user_id
        VALUES (@username, @display_name, @profile_picture_url, @user_Avatar, @gender /*, @uid */)
      `);

    const userId = result.recordset[0].user_id;

    // Додаємо дані в `user_private`
    // Важливо: використовуємо той самий request об'єкт
    await // .input('role', sql.NVarChar, 'user') // Можна встановити дефолтну роль
    request
      .input("user_id", sql.Int, userId)
      .input("email", sql.NVarChar, email)
      // Перевірте тип даних для дати народження у вашій БД (Date, DateTime, NVarChar?)
      // Якщо NVarChar або TEXT:
      .input("date_of_birth", sql.NVarChar, date_of_birth || null) // Дозволяємо NULL
      // Якщо DATE або DATETIME:
      // .input("date_of_birth", sql.Date, date_of_birth ? new Date(date_of_birth) : null)
      .input("password_hash", sql.NVarChar, passwordHash) // Використовуємо переданий хеш
      .input("phone", sql.NVarChar, phone || null) // Дозволяємо NULL
      .query(`
        INSERT INTO user_private (user_id, email, password_hash, phone, date_of_birth /*, role */)
        VALUES (@user_id, @email, @password_hash, @phone, @date_of_birth /*, @role */)
      `);

    await transaction.commit();
    return { userId, message: "✅ User created successfully" };
  } catch (error) {
    await transaction.rollback(); // Робимо відкат при помилці
    console.error("❌ Error adding user:", error);
    // Перевірка на конкретні помилки БД (наприклад, дублікат email), якщо потрібно
    // if (error.number === 2627) { // Приклад для SQL Server unique constraint violation
    //   throw new Error("Email already exists.");
    // }
    throw new Error("Database error while adding user");
  }
};

// Видалення користувача
const deleteUserFromDB = async (userId: number): Promise<void> => {
  const pool = await connectDB();
  const transaction = pool.transaction(); // Початок транзакції

  try {
    await transaction.begin(); // Починаємо транзакцію

    const request = transaction.request().input("userId", sql.Int, userId);

    // --- КРОКИ ВИДАЛЕННЯ ПОВ'ЯЗАНИХ ДАНИХ (ПЕРЕД ОСНОВНИМИ ТАБЛИЦЯМИ) ---
    // 1. Видалення повідомлень, де користувач є відправником або отримувачем
    await request.query(`
      DELETE FROM messages
      WHERE sender_id = @userId OR recipient_id = @userId;
    `);

    // 2. Видалення записів про підписки/підписників
    // Припустимо, у вас є таблиця follows (followers, following)
    // ALTER TABLE follows ADD CONSTRAINT FK_Follows_Follower FOREIGN KEY (follower_id) REFERENCES users(user_id) ON DELETE CASCADE;
    // ALTER TABLE follows ADD CONSTRAINT FK_Follows_Following FOREIGN KEY (following_id) REFERENCES users(user_id) ON DELETE CASCADE;
    // Якщо ви не використовуєте CASCADE, видаляємо вручну:
    await request.query(`
      DELETE FROM follows -- Замініть на назву вашої таблиці підписок
      WHERE follower_id = @userId OR following_id = @userId;
    `);

    // 3. Видалення постів, коментарів, лайків тощо
    // Якщо posts.user_id посилається на users.user_id:
    await request.query(`
      DELETE FROM posts -- Замініть на назву вашої таблиці постів
      WHERE user_id = @userId;
    `);
    // Якщо коментарі пов'язані з user_id:
    await request.query(`
      DELETE FROM comments -- Замініть на назву вашої таблиці коментарів
      WHERE user_id = @userId;
    `);
    // Якщо лайки пов'язані з user_id:
    await request.query(`
      DELETE FROM likes -- Замініть на назву вашої таблиці лайків
      WHERE user_id = @userId;
    `);
    // ... і так для всіх інших таблиць, які мають зовнішні ключі, що посилаються на users.user_id

    // 4. Видалення з залежної таблиці (user_private)
    // Цей запит вже був у вас
    await request.query(`DELETE FROM user_private WHERE user_id = @userId`);

    // 5. Видалення з основної таблиці (users)
    // Цей запит вже був у вас
    const userResult = await request.query(
      `DELETE FROM users WHERE user_id = @userId`
    );

    // Завершуємо транзакцію, якщо всі операції були успішними
    await transaction.commit();

    if (userResult.rowsAffected[0] === 0) {
      console.warn(`Attempted to delete non-existent user with ID: ${userId}`);
      throw new Error("⚠ User not found");
    }
  } catch (error) {
    // Відкочуємо транзакцію при будь-якій помилці
    await transaction.rollback(); 
    console.error("❌ Error deleting user:", error);
    if (error instanceof Error && error.message.includes("User not found")) {
      throw error;
    }
    throw new Error("Database error while deleting user");
  }
};

// Отримання користувача за email (включаючи приватні дані)
// Тип повернення комбінує поля з обох таблиць
const getUserByEmailFromDB = async (
  email: string
): Promise<(UserPublic & UserPrivate) | null> => {
  try {
    const pool = await connectDB();
    const request = pool.request().input("email", sql.NVarChar, email);

    const result = await request.query(`
      SELECT
        u.user_id, u.username, u.display_name, u.uid, u.profile_picture_url, u.gender, u.user_avatar_url, u.about_me,
        p.email, p.password_hash, p.phone, p.role, p.date_of_birth
      FROM users AS u
      INNER JOIN user_private AS p
        ON u.user_id = p.user_id
      WHERE p.email = @email
    `);

    return result.recordset.length > 0 ? result.recordset[0] : null;
  } catch (error) {
    console.error("❌ Error fetching user by email:", error);
    throw new Error("Database query error");
  }
};

export const getFullUserByID = async (
  userId: number
): Promise<(UserPublic & UserPrivate) | null> => {
  try {
    const pool = await connectDB();
    const request = pool.request().input("userId", sql.Int, userId); // Використовуємо @userId

    const result = await request.query(`
      SELECT
        u.user_id, u.username, u.display_name, u.uid, u.profile_picture_url, u.gender, u.user_avatar_url, u.about_me,
        p.email, p.password_hash, p.phone, p.role, p.date_of_birth
      FROM users AS u
      INNER JOIN user_private AS p
        ON u.user_id = p.user_id
      WHERE u.user_id = @userId; -- Змінено умову на u.user_id
    `);

    return result.recordset.length > 0 ? result.recordset[0] as (UserPublic & UserPrivate) : null;
  } catch (error) {
    console.error(`❌ Error fetching full user by ID ${userId}:`, error);
    throw new Error("Database query error for getFullUserByID");
  }
};

// Перевірка, чи існує email
const checkEmailExistsInDB = async (email: string): Promise<boolean> => {
  // Додано тип повернення
  try {
    const pool = await connectDB();
    const request = pool.request().input("email", sql.NVarChar, email);

    const result = await request.query(`
      SELECT TOP 1 1 -- Оптимізація: вибираємо 1 замість email
      FROM user_private WHERE email = @email
    `);

    return result.recordset.length > 0;
  } catch (error) {
    console.error("❌ Error checking email existence:", error);
    throw new Error("Database query error");
  }
};

// Оновлення пароля користувача
const updatePasswordInDB = async (
  userId: number,
  newPasswordHash: string
): Promise<void> => {
  try {
    const pool = await connectDB();
    const request = pool
      .request()
      .input("user_id", sql.Int, userId)
      .input("password_hash", sql.NVarChar, newPasswordHash); // Використовуємо новий хеш

    const result = await request.query(`
      UPDATE user_private SET password_hash = @password_hash WHERE user_id = @user_id
    `);

    // Додаткова перевірка, чи було оновлення успішним
    if (result.rowsAffected[0] === 0) {
      throw new Error("⚠ User not found or password was not updated");
    }
  } catch (error) {
    console.error("❌ Error updating password:", error);
    // Перекидаємо помилку, щоб контролер міг її обробити
    if (error instanceof Error && error.message.includes("User not found")) {
      throw error;
    }
    throw new Error("Database error while updating password");
  }
};

// Оновлення ролі користувача
const updateUserRole = async (
  userId: number,
  newRole: string
): Promise<void> => {
  // Додано тип повернення
  // Додатково: можна додати валідацію ролі (наприклад, чи існує така роль)
  const validRoles = ["user", "admin", "moderator"]; // Приклад
  if (!validRoles.includes(newRole)) {
    throw new Error(`Invalid role specified: ${newRole}`);
  }

  try {
    const pool = await connectDB();
    const request = pool
      .request()
      .input("user_id", sql.Int, userId)
      .input("role", sql.NVarChar, newRole);

    const result = await request.query(`
      UPDATE user_private SET role = @role WHERE user_id = @user_id
    `);

    if (result.rowsAffected[0] === 0) {
      throw new Error("⚠ User not found or role was not updated");
    }
  } catch (error) {
    console.error("❌ Error updating user role:", error);
    if (
      error instanceof Error &&
      (error.message.includes("User not found") ||
        error.message.includes("Invalid role"))
    ) {
      throw error;
    }
    throw new Error("Database error while updating user role");
  }
};

/**
 * Шукає користувачів за ім'ям користувача (username), відображуваним ім'ям (display_name) або UID.
 * @param searchQuery - Рядок пошуку.
 * @returns Масив об'єктів публічних даних користувачів або null.
 */
const searchUsersInDB = async (
  searchQuery: string,
  limit: number = 10,
  offset: number = 0,
  currentAuthUserId?: number
): Promise<{ users: Array<UserPublic & { isFollowedByCurrentUser?: boolean, created_at?: Date }>, totalCount: number }> => {
  if (!searchQuery || searchQuery.trim() === "") { return { users: [], totalCount: 0 }; }
  try {
    const pool = await connectDB();
    const countRequest = pool.request().input("queryParamCount", sql.NVarChar, `%${searchQuery}%`);
    let countWhere = `WHERE (username LIKE @queryParamCount OR display_name LIKE @queryParamCount OR uid LIKE @queryParamCount)`;
    if(currentAuthUserId){
        countRequest.input("currentUserIdCount", sql.Int, currentAuthUserId);
        countWhere += ` AND user_id != @currentUserIdCount`;
    }
    const countResult = await countRequest.query(
      `SELECT COUNT_BIG(*) as totalCount FROM users ${countWhere}`
    );
    const totalCount = Number(countResult.recordset[0].totalCount);

    const request = pool.request();
    request.input("queryParam", sql.NVarChar, `%${searchQuery}%`);
    request.input("limitParam", sql.Int, limit);
    request.input("offsetParam", sql.Int, offset);

    let query = `
      SELECT u.user_id, u.username, u.display_name, u.uid, u.profile_picture_url, u.gender, u.user_avatar_url, u.about_me, u.created_at
    `;
    let fromAndJoins = `FROM users u`;
    let whereClauseSearch = `WHERE (u.username LIKE @queryParam OR u.display_name LIKE @queryParam OR u.uid LIKE @queryParam)`;

    if (currentAuthUserId) {
      query += `, CAST(CASE WHEN f.follower_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isFollowedByCurrentUser`;
      fromAndJoins += ` LEFT JOIN followers f ON u.user_id = f.following_id AND f.follower_id = @currentAuthUserIdParam`;
      whereClauseSearch += ` AND u.user_id != @currentAuthUserIdParam`;
      request.input("currentAuthUserIdParam", sql.Int, currentAuthUserId);
    } else {
       query += `, CAST(0 AS BIT) AS isFollowedByCurrentUser`;
    }
    
    query += ` ${fromAndJoins} ${whereClauseSearch} 
      ORDER BY u.username
      OFFSET @offsetParam ROWS
      FETCH NEXT @limitParam ROWS ONLY;
    `;

    const result = await request.query(query);
    const users = result.recordset.map((user: any): UserPublic & {isFollowedByCurrentUser?: boolean, created_at?: Date} => ({
        user_id: user.user_id, userName: user.username, displayName: user.display_name, uid: user.uid,
        profile_picture_url: user.profile_picture_url, gender: user.gender, user_avatar_url: user.user_avatar_url,
        about_me: user.about_me, created_at: user.created_at,
        isFollowedByCurrentUser: !!user.isFollowedByCurrentUser
    }));
    return { users, totalCount };
  } catch (error) {
    console.error("❌ Error searching users in DB (paginated):", error);
    throw new Error("Database error while searching users (paginated)");
  }
};


// Оновлення URL аватара користувача
const updateUserAvatarInDB = async (
  userId: number,
  newAvatarFilename: string | null
): Promise<string | null> => {
  let oldAvatarFilename: string | null = null;
  const pool = await connectDB();
  // Ініціалізуємо транзакцію тут, щоб вона була доступна в catch
  const transaction: sql.Transaction = pool.transaction();
  let transactionBegun = false; // Прапорець, що транзакція була розпочата

  try {
    await transaction.begin();
    transactionBegun = true; // Позначаємо, що транзакція розпочата

    // Використовуємо той самий об'єкт request для обох запитів в межах транзакції
    const request = transaction.request(); // Створюємо request після begin()

    // 1. Отримуємо поточне (старе) ім'я файлу user_avatar_url
    // Важливо використовувати різні імена для input параметрів, якщо вони в одному request scope,
    // але тут ми можемо перевикористати request, очищаючи параметри, або краще - окремі запити
    // або передавати параметри напряму в .query(), якщо вони прості.
    // Для безпеки, краще використовувати .input()
    const selectRequest = transaction.request().input("user_id_select", sql.Int, userId);
    const resultSelect = await selectRequest.query(
      `SELECT user_avatar_url FROM users WHERE user_id = @user_id_select`
    );

    if (resultSelect.recordset.length > 0) {
      oldAvatarFilename = resultSelect.recordset[0].user_avatar_url;
    }

    // 2. Оновлюємо на нове ім'я файлу user_avatar_url
    const updateRequest = transaction.request()
        .input("user_id_update", sql.Int, userId)
        .input("new_avatar_filename_update", sql.NVarChar, newAvatarFilename);

    const resultUpdate = await updateRequest.query(
      `UPDATE users SET user_avatar_url = @new_avatar_filename_update WHERE user_id = @user_id_update`
    );

    if (resultUpdate.rowsAffected[0] === 0) {
      // Якщо користувача не знайдено для оновлення, це помилка, яка призведе до відкату в catch
      throw new Error(`User with ID ${userId} not found or avatar was not updated in DB.`);
    }

    await transaction.commit();
    console.log(`[userModel] Avatar filename for user ${userId} updated in DB and transaction committed. Old filename: ${oldAvatarFilename}, New filename: ${newAvatarFilename}`);
    return oldAvatarFilename;

  } catch (error) {
    // Якщо транзакція була розпочата і сталася помилка, спробувати відкат
    if (transactionBegun && transaction) { // Перевіряємо transactionBegun
        try {
            console.warn(`[userModel] Error occurred during avatar update for user ${userId}, attempting to rollback transaction...`);
            await transaction.rollback();
            console.log(`[userModel] Transaction for user ${userId} avatar update rolled back due to error.`);
        } catch (rollbackError) {
            console.error(`❌ CRITICAL: Error during transaction rollback for user ${userId} avatar update:`, rollbackError);
        }
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error in updateUserAvatarInDB for user ${userId} (main operation): ${errorMessage}`);
    
    // Перекидаємо помилку далі, щоб контролер міг її обробити
    throw new Error(`Database error while updating user avatar for user ${userId}: ${errorMessage}`);
  }
};

/**
 * Оновлює час останнього виходу для користувача.
 * @param userId - ID користувача.
 */
const updateUserLastLogoutTime = async (userId: number): Promise<void> => {
  try {
    const pool = await connectDB();
    await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(
        "UPDATE users SET last_logout = GETDATE() WHERE user_id = @userId"
      );
    console.log(`Updated last_logout for user ${userId}`);
  } catch (error) {
    console.error(`❌ Error updating last_logout for user ${userId}:`, error);
    // Не кидаємо помилку далі, щоб не переривати процес виходу, але логуємо її
  }
};

/**
 * Отримує час останнього виходу користувача.
 * @param userId - ID користувача.
 * @returns Дата останнього виходу або null.
 */
const getUserLastLogout = async (userId: number): Promise<Date | null> => {
  try {
    const pool = await connectDB();
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query("SELECT last_logout FROM users WHERE user_id = @userId");
    if (result.recordset.length > 0 && result.recordset[0].last_logout) {
      return new Date(result.recordset[0].last_logout);
    }
    return null;
  } catch (error) {
    console.error(`❌ Error fetching last_logout for user ${userId}:`, error);
    throw new Error("Database error while fetching user last logout time");
  }
};

/**
 * Оновлює деталі профілю користувача в таблицях users та user_private.
 * @param userId - ID користувача, чиї дані оновлюються.
 * @param details - Об'єкт з полями для оновлення.
 * @returns Повертає true, якщо оновлення пройшло успішно, інакше false або кидає помилку.
 */
const updateUserDetailsInDB = async (
  userId: number,
  details: UserDetailsToUpdate
): Promise<boolean> => {
  const pool = await connectDB();
  const transaction = pool.transaction(); // Використовуємо транзакцію для атомарності
  let updated = false;

  try {
    await transaction.begin();
    const request = transaction.request().input("userId", sql.Int, userId);

    // Формуємо запит для оновлення таблиці 'users'
    const userFieldsToUpdate: string[] = [];
    if (details.display_name !== undefined) {
      userFieldsToUpdate.push("display_name = @displayName");
      request.input("displayName", sql.NVarChar, details.display_name);
    }
    if (details.about_me !== undefined) {
      userFieldsToUpdate.push("about_me = @aboutMe");
      request.input("aboutMe", sql.NVarChar, details.about_me);
    }
    if (details.gender !== undefined) {
      userFieldsToUpdate.push("gender = @gender");
      request.input("gender", sql.NVarChar, details.gender);
    }

    if (userFieldsToUpdate.length > 0) {
      const userUpdateQuery = `UPDATE users SET ${userFieldsToUpdate.join(", ")} WHERE user_id = @userId`;
      const userResult = await request.query(userUpdateQuery);
      if (userResult.rowsAffected[0] > 0) updated = true;
    }

    // Формуємо запит для оновлення таблиці 'user_private'
    const userPrivateFieldsToUpdate: string[] = [];
    if (details.phone !== undefined) {
      userPrivateFieldsToUpdate.push("phone = @phone");
      request.input("phone", sql.NVarChar, details.phone);
    }
    // Сюди можна додати оновлення date_of_birth, якщо воно буде у формі

    if (userPrivateFieldsToUpdate.length > 0) {
      const userPrivateUpdateQuery = `UPDATE user_private SET ${userPrivateFieldsToUpdate.join(", ")} WHERE user_id = @userId`;
      const privateResult = await request.query(userPrivateUpdateQuery);
      // Навіть якщо в users нічого не оновилось, але в private оновилось, вважаємо успіхом
      if (privateResult.rowsAffected[0] > 0) updated = true;
    }

    await transaction.commit();
    return updated; // Повертає true, якщо хоча б одне поле було оновлено в будь-якій таблиці
  } catch (error) {
    await transaction.rollback();
    console.error(
      `❌ Error updating user details for userId ${userId}:`,
      error
    );
    throw new Error("Database error while updating user details");
  }
};

const getFullUserProfileByIdForAdmin = async (
  userId: number
): Promise<
  (UserPublic & UserPrivate & { created_at?: Date; last_logout?: Date }) | null
> => {
  // Трохи розширив тип для повернення
  try {
    const pool = await connectDB();
    const result = await pool.request().input("userIdToView", sql.Int, userId)
      .query(`
        SELECT
          u.user_id, u.username, u.display_name, u.uid, u.profile_picture_url, 
          u.gender, u.user_avatar_url, u.about_me, u.created_at, u.last_logout, -- Поля з таблиці users
          p.email, p.phone, p.role, p.date_of_birth -- Поля з таблиці user_private
        FROM users AS u
        LEFT JOIN user_private AS p ON u.user_id = p.user_id
        WHERE u.user_id = @userIdToView;
      `);

    if (result.recordset.length > 0) {
      const userRecord = result.recordset[0];
      return {
        // Поля з UserPublic (зіставлення імен)
        user_id: userRecord.user_id,
        userName: userRecord.username, // <--- ВИПРАВЛЕНО
        displayName: userRecord.display_name, // <--- ВИПРАВЛЕНО
        uid: userRecord.uid,
        profile_picture_url: userRecord.profile_picture_url,
        gender: userRecord.gender,
        user_avatar_url: userRecord.user_avatar_url,
        about_me: userRecord.about_me,

        // Додаткові поля, які можуть бути в UserPublic або просто корисні
        created_at: userRecord.created_at,
        last_logout: userRecord.last_logout,

        // Поля з UserPrivate
        email: userRecord.email,
        password_hash: "", // Явно не повертаємо, але тип UserPrivate може його вимагати. Краще створити окремий тип для відповіді.
        phone: userRecord.phone,
        role: userRecord.role,
        date_of_birth: userRecord.date_of_birth,
      } as UserPublic & UserPrivate & { created_at?: Date; last_logout?: Date }; // Або створіть більш точний тип для відповіді
    }
    return null;
  } catch (error) {
    console.error(
      `❌ Error fetching full user profile by ID ${userId} for admin:`,
      error
    );
    throw new Error(
      "Database error while fetching full user profile for admin"
    );
  }
};

interface AuthenticatedUserProfileData {
  user_id: number;
  userName: string; // Зіставлено з users.username
  displayName: string; // Зіставлено з users.display_name
  uid: string;
  profile_picture_url: string | null;
  gender: string;
  user_avatar_url: string | null;
  about_me: string;
  created_at?: Date;
  last_logout?: Date;
  email?: string;
  phone?: string;
  role?: string;
  date_of_birth?: string; // Або Date
  // НЕ включаємо password_hash
}

const getAuthenticatedUserProfileData = async (
  userId: number
): Promise<AuthenticatedUserProfileData | null> => {
  try {
    const pool = await connectDB();
    const result = await pool.request().input("userIdParam", sql.Int, userId)
      .query(`
        SELECT
          u.user_id, u.username, u.display_name, u.uid, u.profile_picture_url, 
          u.gender, u.user_avatar_url, u.about_me, u.created_at, u.last_logout,
          p.email, p.phone, p.role, p.date_of_birth -- Припускаємо, що колонка в БД user_private називається date_of_birth
        FROM users AS u
        LEFT JOIN user_private AS p ON u.user_id = p.user_id
        WHERE u.user_id = @userIdParam;
      `);

    if (result.recordset.length > 0) {
      const userRecord = result.recordset[0];
      return {
        user_id: userRecord.user_id,
        userName: userRecord.username, // Зіставляємо username з БД на userName
        displayName: userRecord.display_name, // Зіставляємо display_name з БД на displayName
        uid: userRecord.uid,
        profile_picture_url: userRecord.profile_picture_url,
        gender: userRecord.gender,
        user_avatar_url: userRecord.user_avatar_url,
        about_me: userRecord.about_me,
        created_at: userRecord.created_at,
        last_logout: userRecord.last_logout,
        email: userRecord.email,
        phone: userRecord.phone,
        role: userRecord.role,
        date_of_birth: userRecord.date_of_birth,
      };
    }
    return null;
  } catch (error) {
    console.error(
      `❌ Error fetching authenticated user profile data for userId ${userId}:`,
      error
    );
    throw new Error(
      "Database error while fetching authenticated user profile data"
    );
  }
};

interface AdminUserDetailsUpdate {
  username?: string;
  display_name?: string;
  about_me?: string;
  gender?: string;
  email?: string;
  phone?: string;
  // Не додаємо сюди роль, для ролі є окрема логіка/ендпоінт
}

/**
 * [АДМІН] Оновлює основні деталі користувача (включаючи username, email, phone).
 * Має включати перевірку на унікальність username та email, якщо вони змінюються.
 * @param userId - ID користувача, чиї дані оновлюються.
 * @param details - Об'єкт з полями для оновлення.
 * @returns Повертає true, якщо оновлення пройшло успішно.
 */
 const adminUpdateUserCoreDetails = async (
  userId: number,
  details: AdminUserDetailsUpdate
): Promise<boolean> => {
  const pool = await connectDB();
  const transaction = pool.transaction();
  let updatedRecords = 0;

  try {
    await transaction.begin();
    // Важливо: для кожної операції (SELECT для перевірки, UPDATE) в межах однієї транзакції
    // з тим самим об'єктом request, краще використовувати унікальні імена для .input(),
    // або очищати request.parameters, або створювати новий request.
    // Тут ми будемо використовувати унікальні імена для параметрів.

    const checkRequest = transaction.request(); // Окремий request для перевірок або той самий, але з різними іменами параметрів
    checkRequest.input("userIdToCheck", sql.Int, userId);

    // Перевірка на унікальність username, якщо він наданий
    if (details.username !== undefined) {
      checkRequest.input("checkUsername", sql.NVarChar, details.username);
      const existingUserByNewUsername = await checkRequest.query(
        "SELECT user_id FROM users WHERE username = @checkUsername AND user_id != @userIdToCheck"
      );
      if (existingUserByNewUsername.recordset.length > 0) {
        await transaction.rollback();
        throw new Error(
          `Нікнейм (username) '${details.username}' вже використовується іншим користувачем.`
        );
      }
    }

    // Перевірка на унікальність email, якщо він наданий
    if (details.email !== undefined) {
      checkRequest.input("checkEmail", sql.NVarChar, details.email); // Додаємо новий інпут до того ж request
      const existingUserByNewEmail = await checkRequest.query(
        "SELECT user_id FROM user_private WHERE email = @checkEmail AND user_id != @userIdToCheck"
      );
      if (existingUserByNewEmail.recordset.length > 0) {
        await transaction.rollback();
        throw new Error(
          `Email '${details.email}' вже використовується іншим користувачем.`
        );
      }
    }

    // Створюємо новий request для операцій UPDATE або використовуємо той самий,
    // але параметри для UPDATE матимуть інші імена.
    // Для простоти, використаємо той самий об'єкт transaction.request(),
    // який вже має userIdToUpdate (якщо воно було userIdToCheck),
    // але додамо нові параметри з унікальними іменами для значень, що оновлюються.
    const updateRequest = transaction
      .request()
      .input("userIdToUpdateForSet", sql.Int, userId);

    // Оновлення таблиці 'users'
    const userFieldsToUpdate: string[] = [];
    if (details.username !== undefined) {
      userFieldsToUpdate.push("username = @updateUsernameVal");
      updateRequest.input("updateUsernameVal", sql.NVarChar, details.username);
    }
    if (details.display_name !== undefined) {
      userFieldsToUpdate.push("display_name = @updateDisplayNameVal");
      updateRequest.input(
        "updateDisplayNameVal",
        sql.NVarChar,
        details.display_name
      );
    }
    if (details.about_me !== undefined) {
      userFieldsToUpdate.push("about_me = @updateAboutMeVal");
      updateRequest.input("updateAboutMeVal", sql.NVarChar, details.about_me);
    }
    if (details.gender !== undefined) {
      userFieldsToUpdate.push("gender = @updateGenderVal");
      updateRequest.input("updateGenderVal", sql.NVarChar, details.gender);
    }

    if (userFieldsToUpdate.length > 0) {
      const userUpdateQuery = `UPDATE users SET ${userFieldsToUpdate.join(", ")} WHERE user_id = @userIdToUpdateForSet`;
      const userResult = await updateRequest.query(userUpdateQuery);
      updatedRecords += userResult.rowsAffected[0];
    }

    // Оновлення таблиці 'user_private'
    const userPrivateFieldsToUpdate: string[] = [];
    if (details.email !== undefined) {
      userPrivateFieldsToUpdate.push("email = @updateEmailVal");
      updateRequest.input("updateEmailVal", sql.NVarChar, details.email);
    }
    if (details.phone !== undefined) {
      userPrivateFieldsToUpdate.push("phone = @updatePhoneVal");
      updateRequest.input("updatePhoneVal", sql.NVarChar, details.phone);
    }

    if (userPrivateFieldsToUpdate.length > 0) {
      const userPrivateUpdateQuery = `UPDATE user_private SET ${userPrivateFieldsToUpdate.join(", ")} WHERE user_id = @userIdToUpdateForSet`;
      const privateResult = await updateRequest.query(userPrivateUpdateQuery);
      updatedRecords += privateResult.rowsAffected[0];
    }

    await transaction.commit();
    return updatedRecords > 0;
  } catch (error) {
    await transaction.rollback();
    console.error(
      `❌ Error [Admin] updating user details for userId ${userId}:`,
      error
    );
    if (
      error instanceof Error &&
      error.message.includes("вже використовується")
    ) {
      throw error;
    }
    throw new Error("Database error while [Admin] updating user details");
  }
};

/**
 * Отримує список користувачів, на яких підписаний вказаний користувач.
 * Також включає інформацію, чи підписаний поточний залогінений користувач (currentAuthUserId) на кожного з цих користувачів.
 * @param targetUserId - ID користувача, чиї підписки ми хочемо отримати.
 * @param currentAuthUserId - ID поточного авторизованого користувача (для визначення статусу 'followed').
 * @returns Масив об'єктів UserPublic з доданим полем 'followed' (або ваш розширений тип).
 */
const getFollowingListForUser = async (
  targetUserId: number,
  limit: number = 10,
  offset: number = 0,
  currentAuthUserId?: number
): Promise<{ users: Array<UserPublic & { isFollowedByCurrentUser?: boolean, created_at?: Date }>, totalCount: number }> => {
  try {
    const pool = await connectDB();
    const countRequest = pool.request().input("targetUserIdCount", sql.Int, targetUserId);
    const countResult = await countRequest.query(
        `SELECT COUNT_BIG(*) as totalCount FROM followers WHERE follower_id = @targetUserIdCount`
    );
    const totalCount = Number(countResult.recordset[0].totalCount);

    const request = pool.request()
        .input("targetUserId", sql.Int, targetUserId)
        .input("limitParam", sql.Int, limit)
        .input("offsetParam", sql.Int, offset);

    let query = `
      SELECT
        u.user_id, u.username, u.display_name, u.uid, 
        u.profile_picture_url, u.gender, u.user_avatar_url, u.about_me, u.created_at
    `;
    let joins = `INNER JOIN followers f1 ON u.user_id = f1.following_id`;

    if (currentAuthUserId) {
      query += `, CAST(CASE WHEN f2.follower_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isFollowedByCurrentUser`;
      joins += ` LEFT JOIN followers f2 ON u.user_id = f2.following_id AND f2.follower_id = @currentAuthUserIdParam`;
      request.input("currentAuthUserIdParam", sql.Int, currentAuthUserId);
    } else {
      query += `, CAST(0 AS BIT) AS isFollowedByCurrentUser`;
    }

    query += `
      FROM users u
      ${joins}
      WHERE f1.follower_id = @targetUserId
      ORDER BY u.username
      OFFSET @offsetParam ROWS
      FETCH NEXT @limitParam ROWS ONLY;
    `;

    const result = await request.query(query);
    const users = result.recordset.map((user : any): UserPublic & { isFollowedByCurrentUser?: boolean, created_at?: Date } => ({
        user_id: user.user_id, userName: user.username, displayName: user.display_name, uid: user.uid,
        profile_picture_url: user.profile_picture_url, gender: user.gender, user_avatar_url: user.user_avatar_url,
        about_me: user.about_me, created_at: user.created_at,
        isFollowedByCurrentUser: !!user.isFollowedByCurrentUser
    }));
    return { users, totalCount };
  } catch (error) {
    console.error(`❌ Error fetching following list for user ${targetUserId} (paginated):`, error);
    throw new Error("Database error while fetching following list (paginated)");
  }
};

/**
 * Отримує список користувачів, які підписані на вказаного користувача (його підписники).
 * Також включає інформацію, чи підписаний поточний залогінений користувач (currentAuthUserId)
 * на кожного з цих підписників (тобто, чи є взаємна підписка).
 * @param targetUserId - ID користувача, чиїх підписників ми хочемо отримати.
 * @param currentAuthUserId - ID поточного авторизованого користувача.
 * @returns Масив об'єктів UserPublic з доданим полем 'followed' (чи відстежує currentAuthUserId цього підписника).
 */
const getFollowersListForUser = async (
  targetUserId: number,
  limit: number = 10,
  offset: number = 0,
  currentAuthUserId?: number
): Promise<{ users: Array<UserPublic & { isFollowedByCurrentUser?: boolean, created_at?: Date }>, totalCount: number }> => {
  try {
    const pool = await connectDB();
    const countRequest = pool.request().input("targetUserIdCount", sql.Int, targetUserId);
    const countResult = await countRequest.query(
        `SELECT COUNT_BIG(*) as totalCount FROM followers WHERE following_id = @targetUserIdCount`
    );
    const totalCount = Number(countResult.recordset[0].totalCount);

    const request = pool.request()
        .input("targetUserId", sql.Int, targetUserId)
        .input("limitParam", sql.Int, limit)
        .input("offsetParam", sql.Int, offset);

    let selectFields = `u.user_id, u.username, u.display_name, u.uid, u.profile_picture_url, u.gender, u.user_avatar_url, u.about_me, u.created_at`;
    let joins = `INNER JOIN followers f1 ON u.user_id = f1.follower_id`;

    if (currentAuthUserId) {
      selectFields += `, CAST(CASE WHEN f2.follower_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isFollowedByCurrentUser`;
      joins += ` LEFT JOIN followers f2 ON u.user_id = f2.following_id AND f2.follower_id = @currentAuthUserIdParam`;
      request.input("currentAuthUserIdParam", sql.Int, currentAuthUserId);
    } else {
      selectFields += `, CAST(0 AS BIT) AS isFollowedByCurrentUser`;
    }

    const query = `
      SELECT ${selectFields}
      FROM users u
      ${joins}
      WHERE f1.following_id = @targetUserId
      ORDER BY u.username
      OFFSET @offsetParam ROWS
      FETCH NEXT @limitParam ROWS ONLY;
    `;

    const result = await request.query(query);
    const users = result.recordset.map((user: any): UserPublic & { isFollowedByCurrentUser?: boolean, created_at?: Date } => ({
        user_id: user.user_id, userName: user.username, displayName: user.display_name, uid: user.uid,
        profile_picture_url: user.profile_picture_url, gender: user.gender, user_avatar_url: user.user_avatar_url,
        about_me: user.about_me, created_at: user.created_at,
        isFollowedByCurrentUser: !!user.isFollowedByCurrentUser
    }));
    return { users, totalCount };
  } catch (error) {
    console.error(`❌ Error fetching followers list for user ${targetUserId} (paginated):`, error);
    throw new Error("Database error while fetching followers list (paginated)");
  }
};

/**
 * Отримує список останніх зареєстрованих користувачів.
 * @param limit Кількість користувачів для повернення.
 * @param currentAuthUserId ID поточного авторизованого користувача, щоб виключити його зі списку 
 * та визначити статус підписки на інших.
 * @returns Масив об'єктів UserPublic з доданим полем 'isFollowedByCurrentUser'.
 */
const getLatestUsersFromDB = async (
    limit: number = 3, 
    offset: number = 0,
    currentAuthUserId?: number
): Promise<PaginatedUserListResponse> => { // Використовуємо оголошений тип
  try {
    const pool = await connectDB();
    
    let countWhereClause = "";
    const countRequest = pool.request();
    if (currentAuthUserId !== undefined) {
      countWhereClause = ` WHERE u.user_id != @currentAuthUserId_count`;
      countRequest.input('currentAuthUserId_count', sql.Int, currentAuthUserId);
    }
    const countResult = await countRequest.query(`SELECT COUNT_BIG(*) as totalCount FROM users u ${countWhereClause}`);
    const totalCount = Number(countResult.recordset[0].totalCount);

    const request = pool.request()
        .input('limitParam', sql.Int, limit)
        .input('offsetParam', sql.Int, offset);

    let query = `
      SELECT 
        u.user_id, u.username, u.display_name, u.uid, 
        u.profile_picture_url, u.gender, u.user_avatar_url, u.about_me, u.created_at
    `;
    let fromAndJoins = `FROM users u`;
    let whereClauseUsers = "";

    if (currentAuthUserId !== undefined) {
      query += `, CAST(CASE WHEN f.follower_id IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isFollowedByCurrentUser`;
      fromAndJoins += ` LEFT JOIN followers f ON u.user_id = f.following_id AND f.follower_id = @currentAuthUserIdParam_select`;
      whereClauseUsers = ` WHERE u.user_id != @currentAuthUserIdParam_select `;
      request.input('currentAuthUserIdParam_select', sql.Int, currentAuthUserId);
    } else {
      query += `, CAST(0 AS BIT) AS isFollowedByCurrentUser `; // Завжди повертаємо boolean
    }
    
    query += ` ${fromAndJoins} ${whereClauseUsers} 
      ORDER BY u.created_at DESC, u.user_id DESC 
      OFFSET @offsetParam ROWS
      FETCH NEXT @limitParam ROWS ONLY;
    `;
        
    const result = await request.query(query);
    // Мапінг тепер відповідає UserListItem
    const users = result.recordset.map((user : any): UserListItem => ({
      user_id: user.user_id,
      userName: user.username,
      displayName: user.display_name,
      uid: user.uid,
      profile_picture_url: user.profile_picture_url,
      gender: user.gender,
      user_avatar_url: user.user_avatar_url,
      about_me: user.about_me,
      created_at: user.created_at,
      isFollowedByCurrentUser: !!user.isFollowedByCurrentUser // Гарантуємо boolean
    }));
    return { users, totalCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error fetching latest users (paginated):", errorMessage, error);
    throw new Error(`Database error while fetching latest users (paginated): ${errorMessage}`);
  }
};

/**
 * Оновлює пароль користувача (для використання адміністратором).
 * @param userId - ID користувача, чий пароль потрібно змінити.
 * @param newHashedPassword - Новий хешований пароль.
 */
export const updateUserPasswordAsAdmin = async (
  userId: number,
  newHashedPassword: string
): Promise<void> => {
  const pool = await connectDB();
  try {
    const request = pool.request();
    await request
      .input("userId", sql.Int, userId)
      .input("newPasswordHash", sql.NVarChar, newHashedPassword)
      .query(`
        UPDATE user_private
        SET password_hash = @newPasswordHash
        WHERE user_id = @userId;
      `);
    console.log(`✅ Адміністратор оновив пароль для user_id: ${userId}`);
  } catch (error) {
    console.error(`❌ Помилка при оновленні пароля користувача ${userId} адміністратором:`, error);
    throw new Error("Помилка бази даних при оновленні пароля користувача.");
  }
};

export {
  getUsersFromDB,
  addUserToDB,
  deleteUserFromDB,
  getUserByEmailFromDB,
  checkEmailExistsInDB,
  updatePasswordInDB,
  updateUserAvatarInDB,
  updateUserRole,
  getUserByUIDFromDB,
  getUserByIdFromDB,
  getUsersWithFollowStatus,
  followUserInDB,
  unfollowUserInDB,
  getPrivateUserDataByUserId,
  searchUsersInDB,
  updateUserLastLogoutTime,
  getUserLastLogout,
  updateUserDetailsInDB,
  getFullUserProfileByIdForAdmin,
  getAuthenticatedUserProfileData,
  getFollowingListForUser,
  getFollowersListForUser,
  getLatestUsersFromDB,
  adminUpdateUserCoreDetails
};
