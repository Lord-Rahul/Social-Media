import { Router } from "express";
import {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    getMyVideos,
    getVideoStats,
    getTrendingVideos,
    getRecommendedVideos
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Public routes
router.route("/").get(getAllVideos);
router.route("/trending").get(getTrendingVideos);
router.route("/:videoId").get(getVideoById);

// Protected routes
router.use(verifyJWT); // Apply authentication to all routes below

router.route("/publish").post(
    upload.fields([
        { name: "videoFile", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 }
    ]),
    publishAVideo
);

router.route("/my-videos").get(getMyVideos);
router.route("/recommended").get(getRecommendedVideos);

router
    .route("/:videoId")
    .patch(upload.single("thumbnail"), updateVideo)
    .delete(deleteVideo);

router.route("/:videoId/toggle-publish").patch(togglePublishStatus);
router.route("/:videoId/stats").get(getVideoStats);

export default router;
