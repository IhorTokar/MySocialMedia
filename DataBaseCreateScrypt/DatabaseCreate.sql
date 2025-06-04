-- Таблиця користувачів
CREATE TABLE [user] (
    user_id INT PRIMARY KEY,
    uid CHAR(10) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100), -- Замість BIGINT
    user_avatar_url VARCHAR(255),
    profile_picture_url VARCHAR(255),
    about_me VARCHAR(MAX),
    last_logout DATETIME,
    created_at DATETIME NOT NULL DEFAULT GETDATE()
);

-- Приватна інформація користувача
CREATE TABLE user_private (
    private_id INT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_num VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('admin', 'user', 'guest')),
    date_of_birth DATE,
    FOREIGN KEY (user_id) REFERENCES [user](user_id) ON DELETE CASCADE
);

-- Таблиця підписників
CREATE TABLE followers (
    follow_id INT PRIMARY KEY,
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (follower_id) REFERENCES [user](user_id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES [user](user_id) ON DELETE CASCADE,
    CONSTRAINT UQ_follow UNIQUE (follower_id, following_id)
);

-- Таблиця постів
CREATE TABLE posts (
    post_id INT PRIMARY KEY,
    user_id INT NOT NULL,
    label VARCHAR(255),
    text VARCHAR(MAX),
    media_url VARCHAR(255),
    created_date DATETIME NOT NULL DEFAULT GETDATE(),
    update_date DATETIME,
    FOREIGN KEY (user_id) REFERENCES [user](user_id) ON DELETE CASCADE
);

-- Таблиця тегів
CREATE TABLE tags (
    tag_id INT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Багато-до-багатьох постів і тегів
CREATE TABLE postTags (
    post_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
);

-- Повідомлення
CREATE TABLE messages (
    message_id INT PRIMARY KEY,
    sender_id INT,
    receiver_id INT,
    message VARCHAR(MAX),
    message_file_content VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (sender_id) REFERENCES [user](user_id) ON DELETE SET NULL,
    FOREIGN KEY (receiver_id) REFERENCES [user](user_id) ON DELETE SET NULL
);

-- Коментарі
CREATE TABLE comments (
    comment_id INT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    text VARCHAR(MAX) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    parent_comment_id INT,
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES [user](user_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES comments(comment_id) ON DELETE CASCADE
);

-- Лайки
CREATE TABLE post_likes (
    like_id INT PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    liked_at DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES [user](user_id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    CONSTRAINT UQ_like UNIQUE (user_id, post_id)
);

-- Збережені пости
CREATE TABLE saved_posts (
    save_id INT PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    saved_at DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES [user](user_id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    CONSTRAINT UQ_save UNIQUE (user_id, post_id)
);

-- Дані поста
CREATE TABLE post_data (
    post_data_id INT PRIMARY KEY,
    post_id INT UNIQUE NOT NULL,
    likes INT DEFAULT 0,
    shares INT DEFAULT 0,
    comments INT DEFAULT 0,
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE
);
