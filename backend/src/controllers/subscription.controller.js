import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscriptions.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    // Check if user is trying to subscribe to themselves
    if (channelId === req.user._id.toString()) {
        throw new ApiError(400, "You cannot subscribe to yourself");
    }

    // Check if channel exists
    const channel = await User.findById(channelId);
    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    // Check if subscription already exists
    const existingSubscription = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channelId
    });

    if (existingSubscription) {
        // Unsubscribe
        await Subscription.findByIdAndDelete(existingSubscription._id);
        return res
            .status(200)
            .json(new ApiResponse(200, { isSubscribed: false }, "Unsubscribed successfully"));
    } else {
        // Subscribe
        const subscription = await Subscription.create({
            subscriber: req.user._id,
            channel: channelId
        });

        return res
            .status(200)
            .json(new ApiResponse(200, { isSubscribed: true }, "Subscribed successfully"));
    }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const aggregateQuery = Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
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
                subscriber: {
                    $first: "$subscriber"
                }
            }
        },
        {
            $project: {
                subscriber: 1,
                createdAt: 1
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

    const subscribers = await Subscription.aggregatePaginate(aggregateQuery, options);

    return res
        .status(200)
        .json(new ApiResponse(200, subscribers, "Channel subscribers fetched successfully"));
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber ID");
    }

    const aggregateQuery = Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribersCount"
                        }
                    },
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "owner",
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
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribersCount"
                            },
                            videosCount: {
                                $size: "$videos"
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1,
                            coverImage: 1,
                            subscribersCount: 1,
                            videosCount: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                channel: {
                    $first: "$channel"
                }
            }
        },
        {
            $project: {
                channel: 1,
                createdAt: 1
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

    const subscribedChannels = await Subscription.aggregatePaginate(aggregateQuery, options);

    return res
        .status(200)
        .json(new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully"));
});

const getMySubscriptions = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const aggregateQuery = Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribersCount"
                        }
                    },
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "owner",
                            as: "latestVideo",
                            pipeline: [
                                {
                                    $match: {
                                        isPublished: true
                                    }
                                },
                                {
                                    $sort: {
                                        createdAt: -1
                                    }
                                },
                                {
                                    $limit: 1
                                },
                                {
                                    $project: {
                                        title: 1,
                                        thumbnail: 1,
                                        createdAt: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribersCount"
                            },
                            latestVideo: {
                                $first: "$latestVideo"
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            latestVideo: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                channel: {
                    $first: "$channel"
                }
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

    const mySubscriptions = await Subscription.aggregatePaginate(aggregateQuery, options);

    return res
        .status(200)
        .json(new ApiResponse(200, mySubscriptions, "My subscriptions fetched successfully"));
});

const getSubscriptionStatus = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const subscription = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channelId
    });

    const isSubscribed = !!subscription;

    return res
        .status(200)
        .json(new ApiResponse(200, { isSubscribed }, "Subscription status fetched successfully"));
});

const getChannelStats = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const stats = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group: {
                _id: null,
                totalSubscribers: { $sum: 1 }
            }
        }
    ]);

    const channelStats = stats[0] || { totalSubscribers: 0 };

    return res
        .status(200)
        .json(new ApiResponse(200, channelStats, "Channel subscription stats fetched successfully"));
});

const getSubscriptionFeed = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    // Get latest videos from subscribed channels
    const aggregateQuery = Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "channel",
                foreignField: "owner",
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
            $unwind: "$videos"
        },
        {
            $replaceRoot: {
                newRoot: "$videos"
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

    const feed = await Subscription.aggregatePaginate(aggregateQuery, options);

    return res
        .status(200)
        .json(new ApiResponse(200, feed, "Subscription feed fetched successfully"));
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels,
    getMySubscriptions,
    getSubscriptionStatus,
    getChannelStats,
    getSubscriptionFeed
}