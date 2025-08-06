import { Router } from "express";
import {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos,
    getLikedComments,
    getLikedTweets,
    getUserLikeStats
} from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply verifyJWT middleware to all routes
router.use(verifyJWT);

// Toggle likes
router.route("/toggle/v/:videoId").post(toggleVideoLike);
router.route("/toggle/c/:commentId").post(toggleCommentLike);
router.route("/toggle/t/:tweetId").post(toggleTweetLike);

// Get liked content
router.route("/videos").get(getLikedVideos);
router.route("/comments").get(getLikedComments);
router.route("/tweets").get(getLikedTweets);

// Get user stats
router.route("/stats").get(getUserLikeStats);

export default router;
