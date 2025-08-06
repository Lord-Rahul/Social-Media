import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscriptions.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = req.user?._id; // Get from authenticated user instead of params

  // Using aggregation pipeline for better performance
  const stats = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "owner",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalViews: { $sum: "$views" },
        totalLikes: { $sum: { $size: "$likes" } },
        totalSubscribers: { $first: { $size: "$subscribers" } },
      },
    },
    {
      $project: {
        _id: 0,
        totalVideos: 1,
        totalViews: 1,
        totalLikes: 1,
        totalSubscribers: 1,
      },
    },
  ]);

  const channelStats = stats[0] || {
    totalVideos: 0,
    totalViews: 0,
    totalLikes: 0,
    totalSubscribers: 0,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, channelStats, "Channel stats fetched successfully")
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const channelId = req.user?._id; // Get from authenticated user
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  const aggregateQuery = Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
      },
    },
    {
      $project: {
        title: 1,
        description: 1,
        thumbnail: 1,
        videoFile: 1,
        duration: 1,
        views: 1,
        likesCount: 1,
        isPublished: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
    {
      $sort: {
        [sortBy]: sortType === "desc" ? -1 : 1,
      },
    },
  ]);

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const videos = await Video.aggregatePaginate(aggregateQuery, options);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

const getChannelAnalytics = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;
  const { days = 30 } = req.query; // Default to last 30 days

  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - parseInt(days));

  const analytics = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
        createdAt: { $gte: dateLimit },
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        videosPublished: { $sum: 1 },
        totalViews: { $sum: "$views" },
        totalLikes: { $sum: { $size: "$likes" } },
        totalComments: { $sum: { $size: "$comments" } },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, analytics, "Channel analytics fetched successfully")
    );
});

const getTopPerformingVideos = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;
  const { limit = 5, sortBy = "views" } = req.query;

  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
        isPublished: true,
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        commentsCount: { $size: "$comments" },
        engagementScore: {
          $add: [
            { $multiply: ["$views", 1] },
            { $multiply: [{ $size: "$likes" }, 5] },
            { $multiply: [{ $size: "$comments" }, 10] },
          ],
        },
      },
    },
    {
      $sort: {
        [sortBy === "engagement" ? "engagementScore" : sortBy]: -1,
      },
    },
    {
      $limit: parseInt(limit),
    },
    {
      $project: {
        title: 1,
        thumbnail: 1,
        views: 1,
        likesCount: 1,
        commentsCount: 1,
        engagementScore: 1,
        createdAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, videos, "Top performing videos fetched successfully")
    );
});

const getRecentActivity = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;
  const { limit = 20 } = req.query;

  // Get recent comments on channel's videos
  const recentComments = await Comment.aggregate([
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoInfo",
      },
    },
    {
      $match: {
        "videoInfo.owner": new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "commenter",
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        videoTitle: { $first: "$videoInfo.title" },
        commenterName: { $first: "$commenter.username" },
        type: { $literal: "comment" },
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  // Get recent subscribers
  const recentSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberInfo",
      },
    },
    {
      $project: {
        createdAt: 1,
        subscriberName: { $first: "$subscriberInfo.username" },
        subscriberAvatar: { $first: "$subscriberInfo.avatar" },
        type: { $literal: "subscription" },
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  const activity = {
    recentComments,
    recentSubscribers,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, activity, "Recent activity fetched successfully")
    );
});

export {
  getChannelStats,
  getChannelVideos,
  getChannelAnalytics,
  getTopPerformingVideos,
  getRecentActivity,
};
