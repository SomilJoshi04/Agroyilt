/**
 * Vendor FCM Token Routes
 * Manages FCM tokens for push notifications
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isVendor } = require('../../middleware/roleMiddleware');
const { sendPushNotification } = require('../../services/firebaseAdmin');
const Vendor = require('../../models/Vendor');
const User = require('../../models/User');
const Worker = require('../../models/Worker');

const MAX_TOKENS = 10; // Maximum tokens per platform

/**
 * @route   POST /api/vendors/fcm-tokens/save
 * @desc    Save FCM token for vendor
 * @access  Private (Vendor)
 */
router.post('/save', authenticate, isVendor, async (req, res) => {
  try {
    const { token, platform = 'web' } = req.body;
    const vendorId = req.user._id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const validPlatform = ['web', 'android', 'ios', 'mobile'].includes(platform) ? platform : 'web';

    await Vendor.findByIdAndUpdate(vendorId, {
      $pull: { fcmTokens: { token: token } }
    });

    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
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

    if (!updatedVendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    res.json({
      success: true,
      message: 'FCM token saved successfully',
      role: req.user?.role || 'vendor'
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to save FCM token' });
  }
});

/**
 * @route   DELETE /api/vendors/fcm-tokens/remove
 * @desc    Remove FCM token for vendor
 * @access  Private (Vendor)
 */
router.delete('/remove', authenticate, isVendor, async (req, res) => {
  try {
    const { token } = req.body;
    const vendorId = req.user._id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { $pull: { fcmTokens: { token: token } } },
      { new: true }
    );

    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    res.json({ success: true, message: 'FCM token removed successfully' });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({ success: false, error: 'Failed to remove FCM token' });
  }
});

/**
 * @route   DELETE /api/vendors/fcm-tokens/remove-all
 * @desc    Remove ALL FCM tokens for a specific platform (called during logout)
 * @access  Private (Vendor)
 */
router.delete('/remove-all', authenticate, isVendor, async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { platform = 'web' } = req.body;

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { $pull: { fcmTokens: { platform: platform } } },
      { new: true }
    );

    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    console.log(`[FCM] âœ… All ${platform} tokens removed for vendor: ${vendorId}`);
    res.json({ success: true, message: `All ${platform} FCM tokens removed successfully` });
  } catch (error) {
    console.error('Error removing FCM tokens:', error);
    res.status(500).json({ success: false, error: 'Failed to remove FCM tokens' });
  }
});

/**
 * @route   POST /api/vendors/fcm-tokens/test
 * @desc    Send test notification to vendor (development only)
 * @access  Private (Vendor)
 */
router.post('/test', authenticate, async (req, res) => {
  try {
    const vendorId = req.user._id;
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const tokens = [...(vendor.fcmTokens || []), ...(vendor.fcmTokenMobile || [])];
    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length === 0) {
      return res.json({ success: false, error: 'No FCM tokens found for vendor' });
    }

    const response = await sendPushNotification(uniqueTokens, {
      title: 'ðŸ”” Test Notification',
      body: 'This is a test notification for vendor!',
      data: {
        type: 'test',
        link: '/vendor/dashboard'
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


