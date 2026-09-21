/**
 * User FCM Token Routes
 * Manages FCM tokens for push notifications
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isUser } = require('../../middleware/roleMiddleware');
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
router.post('/save', authenticate, isUser, async (req, res) => {
  try {
    const { token, platform = 'web' } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const validPlatform = ['web', 'android', 'ios', 'mobile'].includes(platform) ? platform : 'web';

    await User.findByIdAndUpdate(userId, {
      $pull: { fcmTokens: { token: token } }
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          fcmTokens: {
            $each: [{
              token,
              platform: validPlatform,
              createdAt: new Date(),
              updatedAt: new Date()
            }],
            $position: 0,
            $slice: MAX_TOKENS
          }
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'FCM token saved successfully',
      role: req.user?.role || 'user'
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to save FCM token' });
  }
});

/**
 * @route   DELETE /api/users/fcm-tokens/remove
 * @desc    Remove FCM token for user
 * @access  Private
 */
router.delete('/remove', authenticate, isUser, async (req, res) => {
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
router.delete('/remove-all', authenticate, isUser, async (req, res) => {
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


