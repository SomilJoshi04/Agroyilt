'use strict';

/**
 * Unified Common FCM Token Controller
 * Handles FCM push notification tokens for User (Farmer), Vendor (Equipment Owner), and Worker.
 * Automatically resolves role and target MongoDB collection from authenticated JWT.
 */

const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const Worker = require('../../models/Worker');
const Admin = require('../../models/Admin');
const { sendPushNotification } = require('../../services/firebaseAdmin');

const MAX_TOKENS_PER_USER = 10;
const VALID_PLATFORMS = ['android', 'ios', 'web', 'mobile'];

/**
 * Helper: Resolve Mongoose model and normalized role name
 */
const resolveTargetModel = (req) => {
  const rawRole = (req.userRole || req.user?.role || req.user?.constructor?.modelName || 'user').toLowerCase();

  switch (rawRole) {
    case 'vendor':
    case 'owner':
      return { Model: Vendor, role: 'vendor', userId: req.user._id };

    case 'worker':
      return { Model: Worker, role: 'worker', userId: req.user._id };

    case 'admin':
    case 'super_admin':
      return { Model: Admin, role: 'admin', userId: req.user._id };

    case 'user':
    case 'farmer':
    default:
      return { Model: User, role: 'user', userId: req.user._id };
  }
};

/**
 * @desc    Save/Register FCM device token for authenticated user/vendor/worker
 * @route   POST /api/fcm-tokens/save or /api/common/fcm-tokens/save
 * @access  Private (Bearer JWT Token)
 */
const saveToken = async (req, res) => {
  try {
    const { token, fcmToken, platform = 'android', deviceInfo } = req.body;
    const targetToken = (fcmToken || token || '').trim();

    if (!targetToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    if (typeof targetToken !== 'string' || targetToken.length < 20 || targetToken.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Invalid FCM token format'
      });
    }

    // Normalize platform
    const normalizedPlatform = VALID_PLATFORMS.includes(platform.toLowerCase())
      ? platform.toLowerCase()
      : 'android';

    const { Model, role, userId } = resolveTargetModel(req);

    // ── SECURITY & DE-DUPLICATION: Cross-Role Cleanup ──
    // If this physical device was previously used by another account or another role,
    // remove this device token from all collections to prevent cross-account notification leaks.
    await Promise.all([
      User.updateMany({ 'fcmTokens.token': targetToken }, { $pull: { fcmTokens: { token: targetToken } } }),
      Vendor.updateMany({ 'fcmTokens.token': targetToken }, { $pull: { fcmTokens: { token: targetToken } } }),
      Worker.updateMany({ 'fcmTokens.token': targetToken }, { $pull: { fcmTokens: { token: targetToken } } })
    ]);

    // Also remove from current user if already present (to refresh timestamp and avoid duplicate in same array)
    await Model.findByIdAndUpdate(userId, {
      $pull: { fcmTokens: { token: targetToken } }
    });

    const tokenEntry = {
      token: targetToken,
      platform: normalizedPlatform,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (deviceInfo && typeof deviceInfo === 'object') {
      tokenEntry.deviceInfo = {
        model: deviceInfo.model || deviceInfo.deviceModel || '',
        os: deviceInfo.os || deviceInfo.osVersion || '',
        appVersion: deviceInfo.appVersion || ''
      };
    }

    // Push token to front of array and keep at most MAX_TOKENS_PER_USER
    const updatedEntity = await Model.findByIdAndUpdate(
      userId,
      {
        $push: {
          fcmTokens: {
            $each: [tokenEntry],
            $position: 0,
            $slice: MAX_TOKENS_PER_USER
          }
        }
      },
      { new: true }
    );

    if (!updatedEntity) {
      return res.status(404).json({
        success: false,
        message: `${role} account not found`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'FCM token registered successfully',
      data: {
        role,
        userId,
        platform: normalizedPlatform,
        totalTokens: updatedEntity.fcmTokens ? updatedEntity.fcmTokens.length : 1
      }
    });
  } catch (error) {
    console.error('[fcmTokenController.saveToken] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save FCM token',
      error: error.message
    });
  }
};

/**
 * @desc    Remove a specific FCM token (e.g., on logout of this device)
 * @route   DELETE /api/fcm-tokens/remove or /api/common/fcm-tokens/remove
 * @access  Private (Bearer JWT Token)
 */
const removeToken = async (req, res) => {
  try {
    const { token, fcmToken } = req.body;
    const targetToken = (fcmToken || token || '').trim();

    if (!targetToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required to remove'
      });
    }

    const { Model, role, userId } = resolveTargetModel(req);

    // Remove token from current user
    const updatedEntity = await Model.findByIdAndUpdate(
      userId,
      { $pull: { fcmTokens: { token: targetToken } } },
      { new: true }
    );

    // Cross-clean just in case
    await Promise.all([
      User.updateMany({ 'fcmTokens.token': targetToken }, { $pull: { fcmTokens: { token: targetToken } } }),
      Vendor.updateMany({ 'fcmTokens.token': targetToken }, { $pull: { fcmTokens: { token: targetToken } } }),
      Worker.updateMany({ 'fcmTokens.token': targetToken }, { $pull: { fcmTokens: { token: targetToken } } })
    ]);

    return res.status(200).json({
      success: true,
      message: 'FCM token removed successfully',
      data: {
        role,
        userId,
        remainingTokens: updatedEntity && updatedEntity.fcmTokens ? updatedEntity.fcmTokens.length : 0
      }
    });
  } catch (error) {
    console.error('[fcmTokenController.removeToken] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove FCM token',
      error: error.message
    });
  }
};

/**
 * @desc    Remove all tokens for a platform or device (e.g., complete logout)
 * @route   DELETE /api/fcm-tokens/remove-all or /api/common/fcm-tokens/remove-all
 * @access  Private (Bearer JWT Token)
 */
const removeAllTokens = async (req, res) => {
  try {
    const { platform } = req.body || {};
    const { Model, role, userId } = resolveTargetModel(req);

    let updateQuery;
    if (platform && VALID_PLATFORMS.includes(platform.toLowerCase())) {
      updateQuery = { $pull: { fcmTokens: { platform: platform.toLowerCase() } } };
    } else {
      updateQuery = { $set: { fcmTokens: [] } };
    }

    await Model.findByIdAndUpdate(userId, updateQuery);

    return res.status(200).json({
      success: true,
      message: platform
        ? `All ${platform} FCM tokens removed successfully`
        : 'All FCM tokens removed successfully',
      data: { role, userId }
    });
  } catch (error) {
    console.error('[fcmTokenController.removeAllTokens] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear FCM tokens',
      error: error.message
    });
  }
};

/**
 * @desc    Get FCM registration status for the logged-in user
 * @route   GET /api/fcm-tokens/status or /api/common/fcm-tokens/status
 * @access  Private (Bearer JWT Token)
 */
const getTokenStatus = async (req, res) => {
  try {
    const { Model, role, userId } = resolveTargetModel(req);
    const entity = await Model.findById(userId).select('fcmTokens name phone role');

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    const tokens = entity.fcmTokens || [];
    const platforms = [...new Set(tokens.map(t => t.platform))];

    return res.status(200).json({
      success: true,
      data: {
        role,
        userId,
        hasRegisteredToken: tokens.length > 0,
        tokenCount: tokens.length,
        platforms,
        lastUpdated: tokens.length > 0 ? tokens[0].updatedAt : null
      }
    });
  } catch (error) {
    console.error('[fcmTokenController.getTokenStatus] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch FCM token status',
      error: error.message
    });
  }
};

/**
 * @desc    Send test push notification to verify setup
 * @route   POST /api/fcm-tokens/test or /api/common/fcm-tokens/test
 * @access  Private (Bearer JWT Token)
 */
const sendTestNotification = async (req, res) => {
  try {
    const { Model, role, userId } = resolveTargetModel(req);
    const entity = await Model.findById(userId).select('fcmTokens name');

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    const tokens = (entity.fcmTokens || []).map(t => t.token);
    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No registered FCM tokens found for this account. Call /save first.'
      });
    }

    const response = await sendPushNotification(uniqueTokens, {
      title: '🌾 AgroYilt Test Notification',
      body: `Hello ${entity.name || role}! Push notifications are working perfectly on AgroYilt.`,
      data: {
        type: 'test_notification',
        role,
        timestamp: new Date().toISOString()
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Test notification sent successfully',
      data: {
        role,
        tokensSent: uniqueTokens.length,
        successCount: response.successCount || 0,
        failureCount: response.failureCount || 0
      }
    });
  } catch (error) {
    console.error('[fcmTokenController.sendTestNotification] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send test push notification',
      error: error.message
    });
  }
};

module.exports = {
  saveToken,
  removeToken,
  removeAllTokens,
  getTokenStatus,
  sendTestNotification
};
