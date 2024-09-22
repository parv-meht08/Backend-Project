import mongoose, { isValidObjectId } from "mongoose"; // Mongoose for database interactions, isValidObjectId to validate IDs
import { Like } from "../models/like.model.js"; // Like model for managing likes on videos, comments, tweets
import ApiResponse from "../utils/ApiResponse.js"; // Custom API response format utility
import ApiError from "../utils/apiError.js"; // Custom error handling utility
import asyncHandler from "../utils/asyncHandler.js"; // Wrapper to simplify error handling in async functions

/**
 * Helper function to check if an ObjectId is valid.
 * @param {string} id - The ID to validate.
 * @param {string} type - The type of entity (for error messages).
 */
const validateObjectId = (id, type) => {
  if (!isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${type} ID`);
  }
};

/**
 * Toggle like on a video.
 */
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // Validate videoId
  validateObjectId(videoId, "video");

  // Check if the user has already liked this video
  const likedAlready = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id, // Ensure the user is logged in
  });

  // If already liked, remove the like (unlike)
  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready._id);
    return res.status(200).json(new ApiResponse(200, { isLiked: false }));
  }

  // Otherwise, create a new like entry
  await Like.create({
    video: videoId,
    likedBy: req.user?._id,
  });

  // Return success response with isLiked = true
  return res.status(200).json(new ApiResponse(200, { isLiked: true }));
});

/**
 * Toggle like on a comment.
 */
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  // Validate commentId
  validateObjectId(commentId, "comment");

  // Check if the user has already liked this comment
  const likedAlready = await Like.findOne({
    comment: commentId,
    commentedBy: req.user?._id, // Ensure the user is logged in
  });

  // If already liked, remove the like (unlike)
  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready._id);
    return res.status(200).json(new ApiResponse(200, { isCommented: false }));
  }

  // Otherwise, create a new like entry for the comment
  await Like.create({
    comment: commentId,
    commentedBy: req.user?._id,
  });

  // Return success response with isCommented = true
  return res.status(200).json(new ApiResponse(200, { isCommented: true }));
});

/**
 * Toggle like on a tweet.
 */
const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  // Validate tweetId
  validateObjectId(tweetId, "tweet");

  // Check if the user has already liked this tweet
  const likedAlready = await Like.findOne({
    tweet: tweetId,
    tweetedBy: req.user?._id, // Ensure the user is logged in
  });

  // If already liked, remove the like (unlike)
  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready._id);
    return res.status(200).json(new ApiResponse(200, { tweetId, isTweeted: false }));
  }

  // Otherwise, create a new like entry for the tweet
  await Like.create({
    tweet: tweetId,
    tweetedBy: req.user?._id,
  });

  // Return success response with isTweeted = true
  return res.status(200).json(new ApiResponse(200, { isTweeted: true }));
});

/**
 * Fetch all videos liked by the user.
 */
const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideosAggregate = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id), // Match likes by the current user
      },
    },
    {
      $lookup: {
        from: "videos", // Join with the videos collection to get video details
        localField: "video", // Local field in the like document
        foreignField: "_id", // Foreign field in the videos collection
        as: "likedVideo",
        pipeline: [
          {
            $lookup: {
              from: "users", // Join with the users collection to get the owner details
              localField: "owner", // Owner field in the video document
              foreignField: "_id",
              as: "ownerDetails",
            },
          },
          {
            $unwind: "$ownerDetails", // Decompose the owner details array
          },
        ],
      },
    },
    {
      $unwind: "$likedVideo", // Decompose the likedVideo array
    },
    {
      $sort: {
        createdAt: -1, // Sort the liked videos by creation date in descending order
      },
    },
    {
      $project: {
        _id: 0,
        likedVideo: {
          _id: 1, // Include the video ID
          "videoFile.url": 1, // Include the video URL
          "thumbnail.url": 1, // Include the thumbnail URL
          owner: 1, // Include the video owner ID
          title: 1, // Include the video title
          description: 1, // Include the video description
          views: 1, // Include the view count
          duration: 1, // Include the video duration
          createdAt: 1, // Include the video creation date
          isPublished: 1, // Include the published status
          ownerDetails: {
            username: 1, // Include the owner's username
            fullName: 1, // Include the owner's full name
            "avatar.url": 1, // Include the owner's avatar URL
          },
        },
      },
    },
  ]);

  // Return success response with the liked videos
  return res.status(200).json(new ApiResponse(200, likedVideosAggregate, "Liked videos fetched successfully"));
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
