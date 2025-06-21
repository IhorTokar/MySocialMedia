import React, { useState, useRef } from "react";
import mypostStyles from "./Mypost.module.css"; // Використовуємо інший аліас для стилів MyPosts
import Post from "./Post/Post"; // Імпорт Post вже є вище
import { FaTimes } from "react-icons/fa";

// Компонент для відображення списку постів та форми створення
function MyPosts({ posts, status, error, addPost, canCreatePosts }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentImg, setContentImg] = useState(null); // Стан для обраного файлу
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleSubmit = () => {
    if (addPost && title.trim() && content.trim()) {
      addPost(title, content, contentImg); 
      // Очищаємо поля форми
      setTitle("");
      setContent("");
      setContentImg(null);
      // Очищаємо поле input type="file"
      const fileInput = document.getElementById("post-file-input");
      if (fileInput) fileInput.value = null;
    } else {
      alert("Будь ласка, заповніть заголовок та текст поста.");
    }
  };

  // Обробник вибору файлу
  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // Приклад обмеження в 5MB
        alert("Файл занадто великий. Максимальний розмір 5MB.");
        // Очищаємо інпут та стан
        if (fileInputRef.current) fileInputRef.current.value = "";
        setContentImg(null);
        setImagePreviewUrl(null);
        return;
      }
      setContentImg(file); // Встановлюємо вибраний файл у стан
      // Створюємо URL для попереднього перегляду
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setContentImg(null);
      setImagePreviewUrl(null);
    }
  };

  // НОВА ФУНКЦІЯ: для видалення вибраного зображення
  const removeSelectedImage = () => {
    setContentImg(null);
    setImagePreviewUrl(null);
    // Очищаємо значення інпуту файлу, щоб можна було вибрати той самий файл знову
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  return (
    // Використовуємо стилі з Mypost.module.css
    <div className={mypostStyles.postBlock}>
      {/* Форма створення поста (відображається умовно) */}
      {canCreatePosts && (
        <div className={mypostStyles.createPostForm}>
          <h3>Створити Пост</h3>
          {/* Повідомлення про помилку додавання (якщо реалізовано в Redux) */}
          {/* {addPostError && <p className={mypostStyles.error}>Помилка додавання: {addPostError}</p>} */}
          <input
            type="text"
            placeholder="Заголовок поста"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={mypostStyles.input} // Використовуємо стилі з Mypost.module.css
          />
          <textarea
            placeholder="Що у вас нового?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows="4"
            className={mypostStyles.textarea} // Використовуємо стилі з Mypost.module.css
          />
          {imagePreviewUrl && (
            <div className={mypostStyles.imagePreviewContainer}>
              <img src={imagePreviewUrl} alt="Попередній перегляд" className={mypostStyles.imagePreview} />
              <button 
                type="button" 
                onClick={removeSelectedImage} 
                className={mypostStyles.removeImageButton}
                aria-label="Видалити зображення"
              >
                <FaTimes /> {/* Іконка "X" для видалення */}
              </button>
            </div>
          )}
          <input
            id="post-file-input" // ID для очищення поля
            type="file"
            accept="image/*" // Дозволяємо тільки зображення
            onChange={handleFileChange} // Використовуємо обробник
            className={mypostStyles.fileInput} // Додаємо клас для стилізації, якщо потрібно
            style={{ marginBottom: "12px" }}
            ref = {fileInputRef}
          />
          {/* Кнопка блокується під час завантаження (якщо статус передається) */}
          <button
            onClick={handleSubmit}
            disabled={status === "loading"}
            className={mypostStyles.button}
          >
            Опублікувати
          </button>
        </div>
      )}

      {/* Список постів */}
      <div className={mypostStyles.posts}>
        <h3>{canCreatePosts ? "Мої пости" : "Пости користувача"}</h3>
        {/* Статус завантаження постів */}
        {status === "loading" && posts.length === 0 && (
          <p>Завантаження постів...</p>
        )}
        {/* Помилка завантаження постів */}
        {error && status === "failed" && (
          <p className={mypostStyles.error}>
            Помилка завантаження постів: {error}
          </p>
        )}

        {/* Відображення постів */}
        {posts.length > 0
          ? posts.map((post, index) => {
              // --- ДОДАНО CONSOLE.LOG ---
              console.log(
                `[MyPosts.jsx] Рендеринг Post #${index + 1}. Дані поста:`,
                JSON.stringify(post, null, 2)
              );
              if (post.postId === undefined) {
                console.error(
                  "[MyPosts.jsx] УВАГА: postId НЕ ВИЗНАЧЕНИЙ для поста:",
                  post
                );
              }
              // --- КІНЕЦЬ CONSOLE.LOG ---
              return (
                 <Post
                  key={post.postId || `some-fallback-key-${index}`}
                  postId={post.postId}
                  userId={post.userId}
                  title={post.title} // <--- ПЕРЕДАЄМО ЗАГОЛОВОК
                  user_name={post.userNickname}
                  user_avatar={post.userAvatarURL}
                  text={post.content}
                  image={post.contentImgURL}
                  date={post.createdAt}
                  likeCount={post.likesCount || 0}
                  commentsCount={post.commentsCount || 0}
                  sharesCount={post.sharesCount || 0}
                  isLikedByCurrentUser={!!post.isLikedByCurrentUser}
                  isSavedByCurrentUser={!!post.isSavedByCurrentUser}
                  // isInsideModal тут не потрібен, якщо це не модалка
                />
              );
            })
          : // Повідомлення, якщо постів немає (після успішного завантаження)
            status === "succeeded" && <p>Постів ще немає.</p>}
      </div>
    </div>
  );
}

export default MyPosts;
