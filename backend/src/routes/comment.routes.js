import { Router } from "express";
import {
  addComment,
  deleteComment,
  getVideocomments,
  updateComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply verifyJWT middleware to all routes in this file
router.use(verifyJWT);

router.route("/:videoId").get(getVideocomments).post(addComment);
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);

export default router;
