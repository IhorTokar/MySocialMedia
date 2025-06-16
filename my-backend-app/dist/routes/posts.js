"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// my-backend-app/src/routes/posts.ts
const express_1 = __importDefault(require("express"));
const postsController_1 = require("../controllers/postsController");
const fileUpload_1 = __importDefault(require("../utils/fileUpload"));
const auth_1 = __importDefault(require("../middleware/auth"));
const router = express_1.default.Router();
// Отримання постів
router.get("/", postsController_1.getPosts);
router.get("/user/:userId", auth_1.default, postsController_1.getPostsByUserId);
router.get("/search", auth_1.default, postsController_1.searchPostsController);
router.get("/feed/following", auth_1.default, postsController_1.getFollowingFeedController);
router.get("/popular", postsController_1.getPopularPostsController);
// Створення, оновлення, видалення постів
router.post("/", auth_1.default, fileUpload_1.default.single("contentImg"), postsController_1.addPost);
router.route('/:postId')
    .get(auth_1.default, postsController_1.getSinglePostByIdController) // Для отримання одного поста
    .put(auth_1.default, fileUpload_1.default.single('contentImg'), postsController_1.updatePost) // Для оновлення тексту/зображення
    .delete(auth_1.default, postsController_1.deletePost);
// Окремий маршрут для зміни тільки зображення більше не потрібен,
// оскільки це інтегровано в PUT /:postId
// router.put('/:postId/image', auth, upload.single('postImage'), updatePostImage); // ВИДАЛЕНО
// Лайки
router.post("/:postId/like", auth_1.default, postsController_1.likePostController);
router.delete("/:postId/like", auth_1.default, postsController_1.unlikePostController);
// Збереження постів
router.post("/:postId/save", auth_1.default, postsController_1.savePostController);
router.delete("/:postId/save", auth_1.default, postsController_1.unsavePostController);
// Коментарі до поста
router.get("/:postId/comments", postsController_1.getCommentsForPostController); // Можна додати auth, якщо потрібно
router.post("/:postId/comments", auth_1.default, postsController_1.addCommentToPostController);
router.delete("/:postId/comments/:commentId", auth_1.default, postsController_1.deleteCommentController);
exports.default = router;
