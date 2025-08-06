import { Router } from "express";
import {
  getChannelAnalytics,
  getChannelStats,
  getChannelVideos,
  getRecentActivity,
  getTopPerformingVideos,
} from "../controllers/dashboard.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply verifyJWT middleware to all routes in this file
router.use(verifyJWT);

router.route("/stats").get(getChannelStats);
router.route("/videos").get(getChannelVideos);
router.route("/analytics").get(getChannelAnalytics);
router.route("/top-videos").get(getTopPerformingVideos);
router.route("/activity").get(getRecentActivity);

export default router;
