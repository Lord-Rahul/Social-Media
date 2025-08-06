import { Router } from "express";
import {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
    getMyPlaylists,
    getPublicPlaylists
} from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.route("/public").get(getPublicPlaylists);
router.route("/:playlistId").get(getPlaylistById);
router.route("/user/:userId").get(getUserPlaylists);

// Protected routes
router.use(verifyJWT); // Apply verifyJWT middleware to all routes below

router.route("/").post(createPlaylist);
router.route("/my").get(getMyPlaylists);

router
    .route("/:playlistId")
    .patch(updatePlaylist)
    .delete(deletePlaylist);

router
    .route("/add/:videoId/:playlistId")
    .patch(addVideoToPlaylist);

router
    .route("/remove/:videoId/:playlistId")
    .patch(removeVideoFromPlaylist);

export default router;
