// my-backend-app/src/routes/posts.ts
import express from "express";
import {
  getPosts, addPost, deletePost, updatePost,
  getPostsByUserId, searchPostsController,
  likePostController, unlikePostController,
  savePostController, unsavePostController,
  getCommentsForPostController, addCommentToPostController,
  getFollowingFeedController,
  getPopularPostsController,
  getSinglePostByIdController, // Якщо ви його використовуєте
  deleteCommentController
} from "../controllers/postsController";
import upload from "../utils/fileUpload";
import auth from "../middleware/auth";

const router = express.Router();

// Отримання постів
router.get("/", getPosts);
router.get("/user/:userId", auth, getPostsByUserId);
router.get("/search", auth, searchPostsController);
router.get("/feed/following", auth, getFollowingFeedController);
router.get("/popular" ,getPopularPostsController);

// Створення, оновлення, видалення постів
router.post("/", auth, upload.single("contentImg"), addPost);

router.route('/:postId')
  .get(auth, getSinglePostByIdController) // Для отримання одного поста
  .put(auth, upload.single('contentImg'), updatePost) // Для оновлення тексту/зображення
  .delete(auth, deletePost);

// Окремий маршрут для зміни тільки зображення більше не потрібен,
// оскільки це інтегровано в PUT /:postId
// router.put('/:postId/image', auth, upload.single('postImage'), updatePostImage); // ВИДАЛЕНО

// Лайки
router.post("/:postId/like", auth, likePostController);
router.delete("/:postId/like", auth, unlikePostController);

// Збереження постів
router.post("/:postId/save", auth, savePostController);
router.delete("/:postId/save", auth, unsavePostController);

// Коментарі до поста
router.get("/:postId/comments", getCommentsForPostController); // Можна додати auth, якщо потрібно
router.post("/:postId/comments", auth, addCommentToPostController);
router.delete("/:postId/comments/:commentId", auth, deleteCommentController);

export default router;