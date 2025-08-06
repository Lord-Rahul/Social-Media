import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body;

    if (!name?.trim()) {
        throw new ApiError(400, "Playlist name is required");
    }

    if (!description?.trim()) {
        throw new ApiError(400, "Playlist description is required");
    }

    const playlist = await Playlist.create({
        name: name.trim(),
        description: description.trim(),
        owner: req.user._id,
        videos: []
    });

    if (!playlist) {
        throw new ApiError(500, "Failed to create playlist");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const aggregateQuery = Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $match: {
                            isPublished: true
                        }
                    },
                    {
                        $project: {
                            title: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                },
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        },
        {
            $sort: {
                updatedAt: -1
            }
        }
    ]);

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    };

    const playlists = await Playlist.aggregatePaginate(aggregateQuery, options);

    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "User playlists fetched successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $match: {
                            isPublished: true
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "videoOwner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullname: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            videoOwner: {
                                $first: "$videoOwner"
                            }
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                },
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                },
                totalDuration: {
                    $sum: "$videos.duration"
                }
            }
        }
    ]);

    if (!playlist?.length) {
        throw new ApiError(404, "Playlist not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist[0], "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Check if user owns the playlist
    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only add videos to your own playlists");
    }

    // Check if video is already in playlist
    if (playlist.videos.includes(videoId)) {
        throw new ApiError(400, "Video is already in the playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: {
                videos: videoId
            }
        },
        { new: true }
    ).populate("videos", "title thumbnail duration views");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Check if user owns the playlist
    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only remove videos from your own playlists");
    }

    // Check if video exists in playlist
    if (!playlist.videos.includes(videoId)) {
        throw new ApiError(400, "Video is not in the playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: videoId
            }
        },
        { new: true }
    ).populate("videos", "title thumbnail duration views");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Check if user owns the playlist
    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only delete your own playlists");
    }

    await Playlist.findByIdAndDelete(playlistId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params;
    const {name, description} = req.body;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }

    if (!name?.trim() && !description?.trim()) {
        throw new ApiError(400, "At least one field (name or description) is required to update");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Check if user owns the playlist
    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only update your own playlists");
    }

    const updateFields = {};
    if (name?.trim()) {
        updateFields.name = name.trim();
    }
    if (description?.trim()) {
        updateFields.description = description.trim();
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: updateFields
        },
        { new: true }
    ).populate([
        {
            path: "videos",
            select: "title thumbnail duration views"
        },
        {
            path: "owner",
            select: "username fullname avatar"
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"));
});

const getMyPlaylists = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const aggregateQuery = Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $match: {
                            isPublished: true
                        }
                    },
                    {
                        $project: {
                            title: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                },
                firstVideoThumbnail: {
                    $first: "$videos.thumbnail"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                firstVideoThumbnail: 1,
                createdAt: 1,
                updatedAt: 1
            }
        },
        {
            $sort: {
                updatedAt: -1
            }
        }
    ]);

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    };

    const playlists = await Playlist.aggregatePaginate(aggregateQuery, options);

    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "My playlists fetched successfully"));
});

const getPublicPlaylists = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = "" } = req.query;

    const matchStage = {};
    if (search.trim()) {
        matchStage.$or = [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
        ];
    }

    const aggregateQuery = Playlist.aggregate([
        {
            $match: matchStage
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $match: {
                            isPublished: true
                        }
                    }
                ]
            }
        },
        {
            $match: {
                "videos.0": { $exists: true } // Only playlists with at least one video
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                },
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                },
                firstVideoThumbnail: {
                    $first: "$videos.thumbnail"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                owner: 1,
                totalVideos: 1,
                totalViews: 1,
                firstVideoThumbnail: 1,
                createdAt: 1
            }
        },
        {
            $sort: {
                totalViews: -1,
                createdAt: -1
            }
        }
    ]);

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    };

    const playlists = await Playlist.aggregatePaginate(aggregateQuery, options);

    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "Public playlists fetched successfully"));
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
    getMyPlaylists,
    getPublicPlaylists
}