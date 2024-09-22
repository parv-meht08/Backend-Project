import mongoose from "mongoose"; // Mongoose for MongoDB interactions
import { Video } from "../models/video.model.js"; // Video model for interacting with the videos collection
import { Subscription } from "../models/subscription.model.js"; // Subscription model for interacting with channel subscriptions
import { Like } from "../models/like.model.js"; // Like model for tracking video likes
import { ApiError } from "../utils/ApiError.js"; // Custom error handling utility
import { ApiResponse } from "../utils/ApiResponse.js"; // Custom API response formatting
import { asyncHandler } from "../utils/asyncHandler.js"; // Wrapper to handle errors in async functions

/**
 * Helper function to get the logged-in user's ID.
 * If the user is not logged in, it throws an API error.
 */
const getUserId = (req) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "User not authenticated");
  return new mongoose.Types.ObjectId(userId);
};

/**
 * Get the total number of subscribers for a user's channel.
 * @param {ObjectId} userId - The ID of the channel owner.
 * @returns {Promise<Number>} - Total number of subscribers.
 */
const getTotalSubscribers = async (userId) => {
  const result = await Subscription.aggregate([
    { $match: { channel: userId } }, // Find subscriptions for the channel
    { $group: { _id: null, subscribersCount: { $sum: 1 } } }, // Count total subscribers
  ]);
  return result[0]?.subscribersCount || 0; // Return 0 if no result
};

/**
 * Get the total likes, views, and number of videos for a user's channel.
 * @param {ObjectId} userId - The ID of the channel owner.
 * @returns {Promise<Object>} - Object containing totalLikes, totalViews, totalVideos.
 */
const getVideoStats = async (userId) => {
  const result = await Video.aggregate([
    { $match: { owner: userId } }, // Find videos owned by the user
    {
      $lookup: {
        from: "likes", // Join with the likes collection
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $project: {
        totalLikes: { $size: "$likes" }, // Count likes per video
        totalViews: "$views", // Get total views per video
      },
    },
    {
      $group: {
        _id: null,
        totalLikes: { $sum: "$totalLikes" }, // Sum all likes across videos
        totalViews: { $sum: "$totalViews" }, // Sum all views across videos
        totalVideos: { $sum: 1 }, // Count total number of videos
      },
    },
  ]);

  return {
    totalLikes: result[0]?.totalLikes || 0,
    totalViews: result[0]?.totalViews || 0,
    totalVideos: result[0]?.totalVideos || 0,
  };
};

/**
 * Controller to fetch channel statistics like total views, subscribers, likes, and videos.
 */
const getChannelStats = asyncHandler(async (req, res) => {
  const userId = getUserId(req); // Get user ID or throw error if not authenticated

  // Fetch statistics using the helper functions
  const totalSubscribers = await getTotalSubscribers(userId);
  const videoStats = await getVideoStats(userId);

  // Combine statistics into one object
  const channelStats = {
    totalSubscribers,
    ...videoStats, // Spread the video stats into the response
  };

  // Send success response
  return res.status(200).json(new ApiResponse(200, channelStats, "Channel stats fetched successfully"));
});

/**
 * Controller to fetch all videos for a user's channel along with metadata like likes and creation date.
 */
const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = getUserId(req); // Get user ID or throw error if not authenticated

  // Aggregate query to fetch videos with metadata like likes and creation date
  const videos = await Video.aggregate([
    { $match: { owner: userId } }, // Find videos owned by the user
    {
      $lookup: {
        from: "likes", // Join with likes collection to get likes data
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        createdAt: { $dateToParts: { date: "$createdAt" } }, // Break createdAt into year, month, day
        likesCount: { $size: "$likes" }, // Count likes for each video
      },
    },
    { $sort: { createdAt: -1 } }, // Sort videos by newest first
    {
      $project: {
        _id: 1,
        "videoFile.url": 1, // Include video file URL
        "thumbnail.url": 1, // Include thumbnail URL
        title: 1,
        description: 1,
        createdAt: { year: 1, month: 1, day: 1 }, // Only include year, month, day of creation
        isPublished: 1, // Include published status
        likesCount: 1, // Include likes count
      },
    },
  ]);

  // Send success response with video data
  return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
