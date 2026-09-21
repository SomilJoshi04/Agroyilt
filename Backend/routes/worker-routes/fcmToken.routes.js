/**
 * Worker FCM Token Routes
 * Manages FCM tokens for push notifications
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isWorker } = require('../../middleware/roleMiddleware');
const { sendPushNotification } = require('../../services/firebaseAdmin');
const Worker = require('../../models/Worker');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');

const MAX_TOKENS = 10; // Maximum tokens per platform

/**
 * @route   POST /api/workers/fcm-tokens/save
 * @desc    Save FCM token for worker
 * @access  Private (Worker)
 */
router.post('/save', authenticate, isWorker, async (req, res) => {
  try {
    const { token, platform = 'web' } = req.body;
    const workerId = req.user._id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const validPlatform = ['web', 'android', 'ios', 'mobile'].includes(platform) ? platform : 'web';

    // 1. Remove duplicate token atomically
    await Worker.findByIdAndUpdate(workerId, {
      $pull: { fcmTokens: { token: token } }
    });

    // 2. Add new token to beginning and cap at MAX_TOKENS atomically
    const updatedWorker = await Worker.findByIdAndUpdate(
      workerId,
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

    if (!updatedWorker) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    res.json({
      success: true,
      message: 'FCM token saved successfully',
      role: req.user?.role || 'worker'
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to save FCM token' });
  }
});

/**
 * @route   DELETE /api/workers/fcm-tokens/remove
 * @desc    Remove FCM token for worker
 * @access  Private (Worker)
 */
router.delete('/remove', authenticate, isWorker, async (req, res) => {
  try {
    const { token } = req.body;
    const workerId = req.user._id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const worker = await Worker.findByIdAndUpdate(
      workerId,
      { $pull: { fcmTokens: { token: token } } },
      { new: true }
    );

    if (!worker) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    res.json({ success: true, message: 'FCM token removed successfully' });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({ success: false, error: 'Failed to remove FCM token' });
  }
});

/**
 * @route   DELETE /api/workers/fcm-tokens/remove-all
 * @desc    Remove ALL FCM tokens for a specific platform (called during logout)
 * @access  Private (Worker)
 */
router.delete('/remove-all', authenticate, isWorker, async (req, res) => {
  try {
    const workerId = req.user._id;
    const { platform = 'web' } = req.body;

    const worker = await Worker.findByIdAndUpdate(
      workerId,
      { $pull: { fcmTokens: { platform: platform } } },
      { new: true }
    );

    if (!worker) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    console.log(`[FCM] ✅ All ${platform} tokens removed for worker: ${workerId}`);
    res.json({ success: true, message: `All ${platform} FCM tokens removed successfully` });
  } catch (error) {
    console.error('Error removing FCM tokens:', error);
    res.status(500).json({ success: false, error: 'Failed to remove FCM tokens' });
  }
});

/**
 * @route   POST /api/workers/fcm-tokens/test
 * @desc    Send test notification to worker (development only)
 * @access  Private (Worker)
 */
router.post('/test', authenticate, async (req, res) => {
  try {
    const workerId = req.user._id;
    const worker = await Worker.findById(workerId);

    if (!worker) {
      return res.status(404).json({ success: false, error: 'Worker not found' });
    }

    const tokens = [...(worker.fcmTokens || []), ...(worker.fcmTokenMobile || [])];
    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length === 0) {
      return res.json({ success: false, error: 'No FCM tokens found for worker' });
    }

    const response = await sendPushNotification(uniqueTokens, {
      title: '🔔 Test Notification',
      body: 'This is a test notification for worker!',
      data: {
        type: 'test',
        link: '/worker/dashboard'
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
