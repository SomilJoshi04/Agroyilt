const express = require('express');
const router = express.Router();
const { uploadImage, uploadVideo, handleMulterError } = require('../../middleware/uploadMiddleware');
const { getSignature } = require('../../controllers/cloudinaryController');

// Get signature for direct signed upload
router.get('/upload/sign-signature', getSignature);

// Upload single file to Cloudinary
router.post('/upload', uploadImage, handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // When using multer-storage-cloudinary, req.file.path is the secure_url
    res.status(200).json({
      success: true,
      imageUrl: req.file.path,
      message: 'File uploaded successfully'
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
