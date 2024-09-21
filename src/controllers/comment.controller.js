import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

// Get comments for a specific video with pagination
const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Check if the video exists
  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  // Aggregate query to fetch comments and join related data (users, likes)
  const commentsAggregate = Comment.aggregate([
    { $match: { video: mongoose.Types.ObjectId(videoId) } }, // Filter comments by videoId
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    }, // Join user details
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    }, // Join likes
    {
      $addFields: {
        likesCount: { $size: "$likes" }, // Count the number of likes
        owner: { $first: "$owner" }, // Get the first (and only) owner from the array
        isLiked: { $in: [req.user?._id, "$likes.likedBy"] }, // Check if the user liked the comment
      },
    },
    { $sort: { createdAt: -1 } }, // Sort by newest comments
    {
      $project: {
        // Select fields to return
        content: 1,
        createdAt: 1,
        likesCount: 1,
        owner: { username: 1, fullName: 1, "avatar.url": 1 },
        isLiked: 1,
      },
    },
  ]);

  // Pagination options
  const options = { page: parseInt(page, 10), limit: parseInt(limit, 10) };

  // Apply pagination to the comments
  const comments = await Comment.aggregatePaginate(commentsAggregate, options);

  // Return the fetched comments
  res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

// Add a comment to a video
const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  if (!content) throw new ApiError(400, "Content is required");

  // Check if the video exists
  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  // Create a new comment
  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user._id,
  });

  // Return the created comment
  res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

// Update a comment
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!content) throw new ApiError(400, "Content is required");

  // Find the comment
  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  // Check if the user is the owner of the comment
  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the comment owner can update this comment");
  }

  // Update the comment's content
  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    { content },
    { new: true }
  );

  // Return the updated comment
  res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

// Delete a comment
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  // Find the comment
  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  // Check if the user is the owner of the comment
  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the comment owner can delete this comment");
  }

  // Delete the comment and related likes
  await Comment.findByIdAndDelete(commentId);
  await Comment.deleteMany({ comment: commentId, likedBy: req.user._id });

  // Return success response
  res
    .status(200)
    .json(new ApiResponse(200, { commentId }, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
