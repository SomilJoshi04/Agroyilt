'use strict';

/**
 * Unified Common FCM Token Routes
 * Single, secure route for Flutter Mobile App & Web to register/unregister FCM tokens.
 * Automatically resolves whether the caller is a User (Farmer), Vendor (Equipment Owner), or Worker.
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const {
  saveToken,
  removeToken,
  removeAllTokens,
  getTokenStatus,
  sendTestNotification
} = require('../../controllers/commonControllers/fcmTokenController');

// All routes require valid JWT authentication
router.use(authenticate);

// Main endpoints for Flutter & Web
router.post('/save', saveToken);
router.post('/', saveToken); // Support direct POST /api/fcm-tokens

router.delete('/remove', removeToken);
router.delete('/remove-all', removeAllTokens);

router.get('/status', getTokenStatus);
router.post('/test', sendTestNotification);

module.exports = router;
