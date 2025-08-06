import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    // Check if the user already liked the video
    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    });

    if (existingLike) {
        // Unlike the video
        await Like.findByIdAndDelete(existingLike._id);
        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Video unliked successfully"));
    } else {
        // Like the video
        const like = await Like.create({
            video: videoId,
            likedBy: req.user._id
        });
        
        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: true }, "Video liked successfully"));
    }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    // Check if the user already liked the comment
    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user._id
    });

    if (existingLike) {
        // Unlike the comment
        await Like.findByIdAndDelete(existingLike._id);
        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Comment unliked successfully"));
    } else {
        // Like the comment
        const like = await Like.create({
            comment: commentId,
            likedBy: req.user._id
        });
        
        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: true }, "Comment liked successfully"));
    }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;
    
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    // Check if the user already liked the tweet
    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user._id
    });

    if (existingLike) {
        // Unlike the tweet
        await Like.findByIdAndDelete(existingLike._id);
        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }, "Tweet unliked successfully"));
    } else {
        // Like the tweet
        const like = await Like.create({
            tweet: tweetId,
            likedBy: req.user._id
        });
        
        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: true }, "Tweet liked successfully"));
    }
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    
    const aggregateQuery = Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                video: { $exists: true }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails",
                pipeline: [
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
                            }
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                videoDetails: {
                    $first: "$videoDetails"
                }
            }
        },
        {
            $match: {
                "videoDetails.isPublished": true
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ]);

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    };

    const likedVideos = await Like.aggregatePaginate(aggregateQuery, options);

    return res
        .status(200)
        .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"));
});

const getLikedComments = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    
    const aggregateQuery = Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                comment: { $exists: true }
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "comment",
                foreignField: "_id",
                as: "commentDetails",
                pipeline: [
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
                            from: "videos",
                            localField: "video",
                            foreignField: "_id",
                            as: "video",
                            pipeline: [
                                {
                                    $project: {
                                        title: 1,
                                        thumbnail: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" },
                            video: { $first: "$video" }
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                commentDetails: { $first: "$commentDetails" }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ]);

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    };

    const likedComments = await Like.aggregatePaginate(aggregateQuery, options);

    return res
        .status(200)
        .json(new ApiResponse(200, likedComments, "Liked comments fetched successfully"));
});

const getLikedTweets = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    
    const aggregateQuery = Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                tweet: { $exists: true }
            }
        },
        {
            $lookup: {
                from: "tweets",
                localField: "tweet",
                foreignField: "_id",
                as: "tweetDetails",
                pipeline: [
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
                            owner: { $first: "$owner" }
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                tweetDetails: { $first: "$tweetDetails" }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ]);

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    };

    const likedTweets = await Like.aggregatePaginate(aggregateQuery, options);

    return res
        .status(200)
        .json(new ApiResponse(200, likedTweets, "Liked tweets fetched successfully"));
});

const getUserLikeStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const stats = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: null,
                totalLikes: { $sum: 1 },
                videosLiked: {
                    $sum: {
                        $cond: [{ $ifNull: ["$video", false] }, 1, 0]
                    }
                },
                commentsLiked: {
                    $sum: {
                        $cond: [{ $ifNull: ["$comment", false] }, 1, 0]
                    }
                },
                tweetsLiked: {
                    $sum: {
                        $cond: [{ $ifNull: ["$tweet", false] }, 1, 0]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                totalLikes: 1,
                videosLiked: 1,
                commentsLiked: 1,
                tweetsLiked: 1
            }
        }
    ]);

    const userStats = stats[0] || {
        totalLikes: 0,
        videosLiked: 0,
        commentsLiked: 0,
        tweetsLiked: 0
    };

    return res
        .status(200)
        .json(new ApiResponse(200, userStats, "User like stats fetched successfully"));
});

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos,
    getLikedComments,
    getLikedTweets,
    getUserLikeStats
}