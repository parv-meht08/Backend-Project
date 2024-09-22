import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import mongoose, { isValidObjectId } from "mongoose";

// Create a new playlist
const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    // Validate input
    if (!name || !description) {
        throw new ApiError(400, "Name and description are required");
    }

    // Create the playlist
    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id, // Assign the current user as the owner
    });

    // Handle case where playlist creation fails
    if (!playlist) {
        throw new ApiError(500, "Failed to create playlist");
    }

    // Return success response
    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist created successfully"));
});

// Update an existing playlist
const updatePlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const { playlistId } = req.params;

    // Validate input
    if (!name || !description) {
        throw new ApiError(400, "Name and description are required");
    }

    // Check if playlistId is valid
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid PlaylistId");
    }

    // Find the playlist by ID
    const playlist = await Playlist.findById(playlistId);

    // Handle playlist not found
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Ensure only the owner can update the playlist
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only the owner can edit the playlist");
    }

    // Update the playlist with new values
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        { $set: { name, description } },
        { new: true } // Return the updated document
    );

    // Return success response
    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"));
});

// Delete an existing playlist
const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    // Validate playlistId
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid PlaylistId");
    }

    // Find the playlist by ID
    const playlist = await Playlist.findById(playlistId);

    // Handle playlist not found
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Ensure only the owner can delete the playlist
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only the owner can delete the playlist");
    }

    // Delete the playlist
    await Playlist.findByIdAndDelete(playlist?._id);

    // Return success response
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

// Add a video to a playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    // Validate playlistId and videoId
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid PlaylistId or VideoId");
    }

    // Find the playlist and video by their IDs
    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    // Handle playlist or video not found
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Ensure only the owner can add videos to the playlist
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only the owner can add videos to their playlist");
    }

    // Add the video to the playlist
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        { $addToSet: { videos: videoId } }, // Prevent duplicate videos
        { new: true } // Return the updated document
    );

    // Return success response
    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"));
});

// Remove a video from a playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    // Validate playlistId and videoId
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid PlaylistId or VideoId");
    }

    // Find the playlist and video by their IDs
    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    // Handle playlist or video not found
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Ensure only the owner can remove videos from the playlist
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only the owner can remove videos from their playlist");
    }

    // Remove the video from the playlist
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $pull: { videos: videoId } }, // Remove the video
        { new: true } // Return the updated document
    );

    // Return success response
    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully"));
});

// Fetch playlist by ID along with its videos
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    // Validate playlistId
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid PlaylistId");
    }

    // Find playlist with aggregated videos
    const playlistVideos = await Playlist.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(playlistId) }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            }
        },
        {
            $match: { "videos.isPublished": true } // Only published videos
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            }
        },
        {
            $addFields: {
                totalVideos: { $size: "$videos" }, // Count total videos
                totalViews: { $sum: "$videos.views" }, // Sum video views
                owner: { $first: "$owner" }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    views: 1
                },
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                }
            }
        }
    ]);

    // Return playlist with videos
    return res
        .status(200)
        .json(new ApiResponse(200, playlistVideos[0], "Playlist fetched successfully"));
});

// Fetch all playlists by a user
const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Validate userId
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid UserId");
    }

    // Fetch playlists owned by the user
    const playlists = await Playlist.aggregate([
        {
            $match: { owner: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $addFields: {
                totalVideos: { $size: "$videos" }, // Count total videos
                totalViews: { $sum: "$videos.views" } // Sum video views
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                createdAt: 1
            }
        }
    ]);

    // Return user's playlists
    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "User playlists fetched successfully"));
});

export {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getPlaylistById,
    getUserPlaylists
};
