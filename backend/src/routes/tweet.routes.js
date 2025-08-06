import { Router } from "express";
import {
    createTweet,
    deleteTweet,
    getAllTweets,
    getMyTweets,
    getTweetById,
    getTweetStats,
    getUserTweets,
    updateTweet,
} from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.route("/").get(getAllTweets);
router.route("/:tweetId").get(getTweetById);
router.route("/user/:userId").get(getUserTweets);
router.route("/:tweetId/stats").get(getTweetStats);

// Protected routes
router.use(verifyJWT); // Apply verifyJWT middleware to all routes below

router.route("/").post(createTweet);
router.route("/my-tweets").get(getMyTweets);

router
    .route("/:tweetId")
    .patch(updateTweet)
    .delete(deleteTweet);

export default router;
