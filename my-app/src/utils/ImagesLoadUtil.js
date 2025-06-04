export const avatarImgUrl = (filename) => {
  return  filename ? `http://localhost:5000/api/uploads/avatars/${filename}` : "/default_avatar.png";
}
export const postImgUrl = (filename) => {
    return filename ? `http://localhost:5000/api/uploads/posts/${filename}` : null; // Краще null, якщо немає дефолтного
}

// Перейменовуємо функцію тут
export const generateMessageFileRemoteUrl = (filename) => { 
  return filename ? `http://localhost:5000/api/uploads/message-files/${filename}` : null;
}