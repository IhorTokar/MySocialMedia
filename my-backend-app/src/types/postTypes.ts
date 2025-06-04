// my-backend-app/src/types/postTypes.ts
export interface FullPostData {
  postId: number;
  userId: number;
  title: string | null; // 'label' в БД
  content: string;      // 'text' в БД
  contentImgURL: string | null; // 'media_url' в БД
  createdAt: Date;      // 'created_date' в БД
  userNickname: string; // 'username' з таблиці users
  userAvatarURL: string | null; // 'user_avatar_url' з таблиці users
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLikedByCurrentUser: boolean;
  isSavedByCurrentUser: boolean;
}

export interface CommentWithAuthorData {
  comment_id: number;
  post_id: number;
  user_id: number;
  text: string;
  created_date: Date;
  parent_comment_id: number | null;
  username: string; // з таблиці users
  user_avatar_url: string | null; // з таблиці users
}

// PopularPostData тут не потрібен, можете його видалити або закоментувати
// export interface PopularPostData { ... }

export interface PopularPostData {
  postId: number;
  title: string | null; // label
  userId: number;
  userNickname: string; // username з таблиці users
  likesCount: number;
}