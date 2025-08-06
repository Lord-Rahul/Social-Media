import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloud} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query;

    const matchStage = {
        isPublished: true
    };

    // Add search functionality
    if (query) {
        matchStage.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ];
    }

    // Filter by specific user
    if (userId && isValidObjectId(userId)) {
        matchStage.owner = new mongoose.Types.ObjectId(userId);
    }

    const aggregateQuery = Video.aggregate([
        {
            $match: matchStage
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                },
                likesCount: {
                    $size: "$likes"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1,
                createdAt: 1
            }
        },
        {
            $sort: {
                [sortBy]: sortType === "desc" ? -1 : 1
            }
        }
    ]);

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    };

    const videos = await Video.aggregatePaginate(aggregateQuery, options);

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title?.trim()) {
        throw new ApiError(400, "Video title is required");
    }

    if (!description?.trim()) {
        throw new ApiError(400, "Video description is required");
    }

    // Check for video file
    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is required");
    }

    // Check for thumbnail
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required");
    }

    // Upload video to cloudinary
    const videoFile = await uploadOnCloud(videoLocalPath);
    if (!videoFile) {
        throw new ApiError(400, "Error uploading video file");
    }

    // Upload thumbnail to cloudinary
    const thumbnail = await uploadOnCloud(thumbnailLocalPath);
    if (!thumbnail) {
        throw new ApiError(400, "Error uploading thumbnail");
    }

    // Create video document
    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title: title.trim(),
        description: description.trim(),
        duration: videoFile.duration || 0,
        owner: req.user._id,
        isPublished: true
    });

    const createdVideo = await Video.findById(video._id).populate(
        "owner",
        "username fullname avatar"
    );

    if (!createdVideo) {
        throw new ApiError(500, "Something went wrong while uploading video");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, createdVideo, "Video uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
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
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                },
                likesCount: {
                    $size: "$likes"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1,
                isPublished: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]);

    if (!video?.length) {
        throw new ApiError(404, "Video not found");
    }

    // Increment view count
    await Video.findByIdAndUpdate(videoId, {
        $inc: { views: 1 }
    });

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    if (!title?.trim() && !description?.trim() && !req.file) {
        throw new ApiError(400, "At least one field (title, description, or thumbnail) is required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Check if user owns the video
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only update your own videos");
    }

    const updateFields = {};

    if (title?.trim()) {
        updateFields.title = title.trim();
    }

    if (description?.trim()) {
        updateFields.description = description.trim();
    }

    // If new thumbnail is uploaded
    if (req.file) {
        const thumbnailLocalPath = req.file.path;
        const thumbnail = await uploadOnCloud(thumbnailLocalPath);
        
        if (!thumbnail) {
            throw new ApiError(400, "Error uploading thumbnail");
        }
        
        updateFields.thumbnail = thumbnail.url;
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: updateFields
        },
        { new: true }
    ).populate("owner", "username fullname avatar");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Check if user owns the video
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only delete your own videos");
    }

    await Video.findByIdAndDelete(videoId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Check if user owns the video
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only modify your own videos");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished
            }
        },
        { new: true }
    ).populate("owner", "username fullname avatar");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, `Video ${updatedVideo.isPublished ? 'published' : 'unpublished'} successfully`));
});

const getMyVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, sortBy = "createdAt", sortType = "desc" } = req.query;

    const aggregateQuery = Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                commentsCount: {
                    $size: "$comments"
                }
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                likesCount: 1,
                commentsCount: 1,
                isPublished: 1,
                createdAt: 1,
                updatedAt: 1
            }
        },
        {
            $sort: {
                [sortBy]: sortType === "desc" ? -1 : 1
            }
        }
    ]);

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    };

    const videos = await Video.aggregatePaginate(aggregateQuery, options);

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "My videos fetched successfully"));
});

const getVideoStats = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const stats = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments"
            }
        },
        {
            $project: {
                title: 1,
                views: 1,
                totalLikes: { $size: "$likes" },
                totalComments: { $size: "$comments" },
                createdAt: 1,
                isPublished: 1
            }
        }
    ]);

    if (!stats?.length) {
        throw new ApiError(404, "Video not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, stats[0], "Video stats fetched successfully"));
});

const getTrendingVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const aggregateQuery = Video.aggregate([
        {
            $match: {
                isPublished: true,
                createdAt: {
                    $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                }
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                },
                likesCount: {
                    $size: "$likes"
                },
                trendingScore: {
                    $add: [
                        { $multiply: ["$views", 1] },
                        { $multiply: [{ $size: "$likes" }, 5] }
                    ]
                }
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                owner: 1,
                likesCount: 1,
                trendingScore: 1,
                createdAt: 1
            }
        },
        {
            $sort: {
                trendingScore: -1
            }
        }
    ]);

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    };

    const trendingVideos = await Video.aggregatePaginate(aggregateQuery, options);

    return res
        .status(200)
        .json(new ApiResponse(200, trendingVideos, "Trending videos fetched successfully"));
});

const getRecommendedVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    // Simple recommendation based on user's liked videos and popular content
    const aggregateQuery = Video.aggregate([
        {
            $match: {
                isPublished: true,
                owner: { $ne: new mongoose.Types.ObjectId(req.user._id) } // Exclude own videos
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                },
                likesCount: {
                    $size: "$likes"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                },
                recommendationScore: {
                    $add: [
                        { $multiply: ["$views", 0.3] },
                        { $multiply: [{ $size: "$likes" }, 2] },
                        { $multiply: [{ $rand: {} }, 100] } // Add randomness
                    ]
                }
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1,
                createdAt: 1
            }
        },
        {
            $sort: {
                recommendationScore: -1
            }
        }
    ]);

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    };

    const recommendedVideos = await Video.aggregatePaginate(aggregateQuery, options);

    return res
        .status(200)
        .json(new ApiResponse(200, recommendedVideos, "Recommended videos fetched successfully"));
});

export {
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
}