import { Router } from "express";
import {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels,
    getMySubscriptions,
    getSubscriptionStatus,
    getChannelStats,
    getSubscriptionFeed
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.route("/c/:channelId/subscribers").get(getUserChannelSubscribers);
router.route("/u/:subscriberId/channels").get(getSubscribedChannels);
router.route("/c/:channelId/stats").get(getChannelStats);

// Protected routes
router.use(verifyJWT); // Apply verifyJWT middleware to all routes below

router.route("/c/:channelId").post(toggleSubscription);
router.route("/c/:channelId/status").get(getSubscriptionStatus);
router.route("/my-subscriptions").get(getMySubscriptions);
router.route("/feed").get(getSubscriptionFeed);

export default router;
