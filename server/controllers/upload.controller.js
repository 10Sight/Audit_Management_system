import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteImage } from "../config/cloudinary.config.js";

// Upload single image
export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No image file provided");
  }

  const imageData = {
    url: req.file.path,
    publicId: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    uploadedAt: new Date(),
  };

  return res.status(201).json(
    new ApiResponse(201, imageData, "Image uploaded successfully")
  );
});

// Upload multiple images
export const uploadMultipleImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "No image files provided");
  }

  const imagesData = req.files.map(file => ({
    secure_url: file.path,
    public_id: file.filename,
    url: file.path,
    publicId: file.filename,
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date(),
  }));

  return res.status(201).json(
    new ApiResponse(201, imagesData, "Images uploaded successfully")
  );
});

// Delete image from Cloudinary
export const deleteUploadedImage = asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  if (!publicId) {
    throw new ApiError(400, "Public ID is required");
  }

  try {
    const result = await deleteImage(publicId);
    
    if (result.result === 'ok') {
      return res.json(new ApiResponse(200, null, "Image deleted successfully"));
    } else {
      throw new ApiError(404, "Image not found or already deleted");
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    throw new ApiError(500, "Failed to delete image");
  }
});

// Get image info
export const getImageInfo = asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  if (!publicId) {
    throw new ApiError(400, "Public ID is required");
  }

  try {
    // This would typically fetch from your database
    // For now, we'll return basic info
    const imageInfo = {
      publicId,
      url: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`,
      thumbnailUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/w_200,h_200,c_fill,q_auto,f_auto/${publicId}`,
    };

    return res.json(new ApiResponse(200, imageInfo, "Image info retrieved"));
  } catch (error) {
    console.error("Error getting image info:", error);
    throw new ApiError(500, "Failed to get image info");
  }
});
