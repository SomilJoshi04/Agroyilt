const express = require('express');
const router = express.Router();
const { uploadImage, uploadVideo, handleMulterError } = require('../../middleware/uploadMiddleware');
const { getSignature } = require('../../controllers/cloudinaryController');
const cloudinaryService = require('../../services/cloudinaryService');

// Get signature for direct signed upload
router.get('/upload/sign-signature', getSignature);

// Upload single file or base64 to Cloudinary
router.post('/upload', (req, res, next) => {
  // If JSON request with base64 image, skip multer middleware
  if (req.headers['content-type']?.includes('application/json')) {
    return next();
  }
  uploadImage(req, res, next);
}, handleMulterError, async (req, res) => {
  try {
    // 1. Multer file upload
    if (req.file) {
      return res.status(200).json({
        success: true,
        imageUrl: req.file.path || req.file.secure_url,
        message: 'File uploaded successfully'
      });
    }

    // 2. Base64 string upload
    const base64Data = req.body.image || req.body.file || req.body.base64;
    if (base64Data) {
      const uploadRes = await cloudinaryService.uploadFile(base64Data, { folder: 'appzeto' });
      if (uploadRes.success) {
        return res.status(200).json({
          success: true,
          imageUrl: uploadRes.url,
          message: 'Base64 image uploaded to Cloudinary successfully'
        });
      }
      return res.status(400).json({
        success: false,
        message: uploadRes.error || 'Failed to upload image to Cloudinary'
      });
    }

    return res.status(400).json({
      success: false,
      message: 'No file or image data provided'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
});

// Upload single video to Cloudinary
router.post('/upload-video', uploadVideo, handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video uploaded'
      });
    }

    res.status(200).json({
      success: true,
      videoUrl: req.file.path,
      message: 'Video uploaded successfully'
    });
  } catch (error) {
    console.error('Video Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload video',
      error: error.message
    });
  }
});

module.exports = router;
