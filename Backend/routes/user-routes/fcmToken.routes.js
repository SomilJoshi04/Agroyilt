/**
 * User FCM Token Routes
 * Manages FCM tokens for push notifications
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { sendPushNotification } = require('../../services/firebaseAdmin');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const Worker = require('../../models/Worker');

const MAX_TOKENS = 10; // Maximum tokens per platform

/**
 * @route   POST /api/users/fcm-tokens/save
 * @desc    Save FCM token for user
 * @access  Private
 */
router.post('/save', authenticate, async (req, res) => {
  try {
    const { token, platform = 'web', deviceId = null, browser = null, appVersion = null } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!Array.isArray(user.fcmTokens)) user.fcmTokens = [];
    // Filter out old token if it exists anywhere
    user.fcmTokens = user.fcmTokens || [];
    user.fcmTokens = user.fcmTokens.filter(t => t.token !== token);

    // Filter out old device if same deviceId exists (to replace token on same device)
    if (deviceId) {
      user.fcmTokens = user.fcmTokens.filter(t => t.deviceId !== deviceId);
    }

    // Add new token object to front
    user.fcmTokens.unshift({
      token,
      platform,
      deviceId,
      browser,
      appVersion,
      updatedAt: new Date()
    });

    // Enforce max tokens
    if (user.fcmTokens.length > MAX_TOKENS) {
      user.fcmTokens = user.fcmTokens.slice(0, MAX_TOKENS);
    }

    await user.save();

    res.json({
      success: true,
      message: 'FCM token saved successfully',
      role: req.user?.role || 'user'
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ success: false, error: 'Failed to save FCM token' });
  }
});

/**
 * @route   DELETE /api/users/fcm-tokens/remove
 * @desc    Remove FCM token for user
 * @access  Private
 */
router.delete('/remove', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { fcmTokens: { token: token } } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, message: 'FCM token removed successfully' });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({ success: false, error: 'Failed to remove FCM token' });
  }
});

/**
 * @route   DELETE /api/users/fcm-tokens/remove-all
 * @desc    Remove ALL FCM tokens for a specific platform (called during logout)
 * @access  Private
 */
router.delete('/remove-all', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { platform = 'web' } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { fcmTokens: { platform: platform } } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    console.log(`[FCM] âœ… All ${platform} tokens removed for user: ${userId}`);
    res.json({ success: true, message: `All ${platform} FCM tokens removed successfully` });
  } catch (error) {
    console.error('Error removing FCM tokens:', error);
    res.status(500).json({ success: false, error: 'Failed to remove FCM tokens' });
  }
});

/**
 * @route   POST /api/users/fcm-tokens/test
 * @desc    Send test notification to user (development only)
 * @access  Private
 */
router.post('/test', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const tokens = [...(user.fcmTokens || []), ...(user.fcmTokenMobile || [])];
    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length === 0) {
      return res.json({ success: false, error: 'No FCM tokens found for user' });
    }

    const response = await sendPushNotification(uniqueTokens, {
      title: 'ðŸ”” Test Notification',
      body: 'This is a test notification from Appzeto!',
      data: {
        type: 'test',
        link: '/'
      }
    });

    res.json({
      success: true,
      message: 'Test notification sent',
      successCount: response.successCount,
      failureCount: response.failureCount
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;


