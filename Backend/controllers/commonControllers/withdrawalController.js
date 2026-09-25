'use strict';

const withdrawalService = require('../../services/withdrawalService');
const cloudinaryService = require('../../services/cloudinaryService');
const cloudinary = require('../../config/cloudinary');
const { Readable } = require('stream');

/**
 * Helper to determine user role from req.user
 */
const extractRole = (req) => {
  // authMiddleware sets req.user.role (e.g. 'user', 'farmer', 'vendor', 'worker', 'admin')
  const role = req.user?.role || req.user?.userType || 'user';
  return role.toLowerCase();
};

/**
 * Get Withdrawable Balance and Limits
 * GET /api/withdrawals/balance
 */
exports.getBalance = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const role = extractRole(req);

    const result = await withdrawalService.getWithdrawableBalance(userId, role);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[withdrawalController.getBalance]', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch withdrawable balance'
    });
  }
};

/**
 * Get Banking Details (Masked)
 * GET /api/withdrawals/bank-details
 */
exports.getBankDetails = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const role = extractRole(req);

    const result = await withdrawalService.getBankDetails(userId, role);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[withdrawalController.getBankDetails]', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch banking details'
    });
  }
};

/**
 * Save or Update Banking Details
 * POST /api/withdrawals/bank-details
 */
exports.updateBankDetails = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const role = extractRole(req);

    const result = await withdrawalService.updateBankDetails(userId, role, req.body);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[withdrawalController.updateBankDetails]', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to save banking details'
    });
  }
};

/**
 * Submit Withdrawal Request
 * POST /api/withdrawals/request
 */
exports.requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const role = extractRole(req);
    const { amount, notes } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid withdrawal amount'
      });
    }

    const result = await withdrawalService.createWithdrawalRequest(userId, role, amount, notes);
    return res.status(201).json(result);
  } catch (error) {
    console.error('[withdrawalController.requestWithdrawal]', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create withdrawal request'
    });
  }
};

/**
 * Get Own Withdrawal History
 * GET /api/withdrawals/history
 */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const role = extractRole(req);

    const result = await withdrawalService.getWithdrawalHistory(userId, role, req.query);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[withdrawalController.getHistory]', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch withdrawal history'
    });
  }
};

/**
 * Get Single Withdrawal Detail (IDOR Protected)
 * GET /api/withdrawals/:id
 */
exports.getDetail = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const role = extractRole(req);
    const isAdmin = role === 'admin' || role === 'super_admin';

    const result = await withdrawalService.getWithdrawalDetail(req.params.id, userId, role, isAdmin);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[withdrawalController.getDetail]', error);
    const status = error.message.includes('Unauthorized') ? 403 : 404;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to fetch withdrawal details'
    });
  }
};

/**
 * Protected Payment Proof Access (IDOR Protected)
 * GET /api/withdrawals/:id/payment-proof
 */
exports.getPaymentProof = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const role = extractRole(req);
    const isAdmin = role === 'admin' || role === 'super_admin';

    const result = await withdrawalService.getWithdrawalDetail(req.params.id, userId, role, isAdmin);
    const proofUrl = result.data?.paymentProof;

    if (!proofUrl) {
      return res.status(404).json({
        success: false,
        message: 'No payment proof available for this withdrawal'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        paymentProof: proofUrl,
        paymentReference: result.data?.paymentReference || result.data?.transactionReference
      }
    });
  } catch (error) {
    const status = error.message.includes('Unauthorized') ? 403 : 404;
    return res.status(status).json({
      success: false,
      message: error.message || 'Access to payment proof denied'
    });
  }
};

// ==============================================================
// ADMIN CONTROLLER METHODS
// ==============================================================

/**
 * Admin: List All Withdrawals
 * GET /api/admin/withdrawals
 */
exports.adminListWithdrawals = async (req, res) => {
  try {
    const result = await withdrawalService.getAdminWithdrawals(req.query);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[withdrawalController.adminListWithdrawals]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to list withdrawal requests'
    });
  }
};

/**
 * Admin: Get Single Withdrawal Detail
 * GET /api/admin/withdrawals/:id
 */
exports.adminGetWithdrawal = async (req, res) => {
  try {
    const adminId = req.user._id || req.user.id;
    const result = await withdrawalService.getWithdrawalDetail(req.params.id, adminId, 'admin', true);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[withdrawalController.adminGetWithdrawal]', error);
    return res.status(404).json({
      success: false,
      message: error.message || 'Withdrawal not found'
    });
  }
};

/**
 * Admin: Accept Withdrawal (PENDING -> ADMIN_ACCEPTED)
 * POST /api/admin/withdrawals/:id/accept
 */
exports.adminAcceptWithdrawal = async (req, res) => {
  try {
    const adminId = req.user._id || req.user.id;
    const { adminNotes } = req.body;

    const result = await withdrawalService.acceptWithdrawal(req.params.id, adminId, adminNotes);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[withdrawalController.adminAcceptWithdrawal]', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to accept withdrawal'
    });
  }
};

/**
 * Admin: Mark Processing (ADMIN_ACCEPTED -> PROCESSING)
 * POST /api/admin/withdrawals/:id/process
 */
exports.adminMarkProcessing = async (req, res) => {
  try {
    const adminId = req.user._id || req.user.id;
    const { adminNotes } = req.body;

    const result = await withdrawalService.markProcessing(req.params.id, adminId, adminNotes);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[withdrawalController.adminMarkProcessing]', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to mark withdrawal as processing'
    });
  }
};

/**
 * Admin: Reject Withdrawal
 * POST /api/admin/withdrawals/:id/reject
 */
exports.adminRejectWithdrawal = async (req, res) => {
  try {
    const adminId = req.user._id || req.user.id;
    const { rejectionReason, reason } = req.body;
    const finalReason = rejectionReason || reason;

    if (!finalReason || typeof finalReason !== 'string' || finalReason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is mandatory'
      });
    }

    const result = await withdrawalService.rejectWithdrawal(req.params.id, adminId, finalReason);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[withdrawalController.adminRejectWithdrawal]', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to reject withdrawal'
    });
  }
};

/**
 * Admin: Complete Withdrawal with Payment Proof
 * POST /api/admin/withdrawals/:id/complete
 */
exports.adminCompleteWithdrawal = async (req, res) => {
  try {
    const adminId = req.user._id || req.user.id;
    const { paymentReference, adminNotes } = req.body;

    let paymentProofUrl = req.body.paymentProofUrl || req.body.paymentProof;
    let paymentProofPublicId = null;
    let paymentProofMimeType = null;

    // Handle file upload if multipart/form-data with file
    if (req.file) {
      paymentProofMimeType = req.file.mimetype || 'image/png';

      // 1. If multer-storage-cloudinary, req.file.path or secure_url is available
      if (req.file.path && (req.file.path.startsWith('http://') || req.file.path.startsWith('https://'))) {
        paymentProofUrl = req.file.path;
        paymentProofPublicId = req.file.filename;
      } else if (req.file.buffer) {
        // 2. Try fast Cloudinary stream upload with 5-second timeout
        try {
          const isPdf = req.file.mimetype === 'application/pdf';
          const uploadPromise = new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'agroyilt/payment_proofs',
                resource_type: isPdf ? 'raw' : 'auto'
              },
              (err, result) => {
                if (err) return reject(err);
                resolve(result);
              }
            );
            const stream = new Readable();
            stream._read = () => {};
            stream.push(req.file.buffer);
            stream.push(null);
            stream.pipe(uploadStream);
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Cloudinary upload timed out')), 5000)
          );

          const result = await Promise.race([uploadPromise, timeoutPromise]);
          if (result && (result.secure_url || result.url)) {
            paymentProofUrl = result.secure_url || result.url;
            paymentProofPublicId = result.public_id;
          }
        } catch (cErr) {
          console.warn('[adminCompleteWithdrawal] Cloudinary direct upload notice (using fallback):', cErr.message);
        }

        // 3. Fallback: If Cloudinary timed out or failed, store as base64 data URI
        // This guarantees the payout transaction is NEVER blocked or stuck!
        if (!paymentProofUrl) {
          const base64Data = req.file.buffer.toString('base64');
          paymentProofUrl = `data:${paymentProofMimeType};base64,${base64Data}`;
          paymentProofPublicId = `proof_${Date.now()}`;
        }
      }
    } else if (paymentProofUrl && paymentProofUrl.startsWith('data:')) {
      paymentProofMimeType = paymentProofUrl.split(';')[0]?.replace('data:', '') || 'image/png';
    }

    if (!paymentProofUrl) {
      return res.status(400).json({
        success: false,
        message: 'Payment proof document/image is mandatory to complete a withdrawal'
      });
    }

    const result = await withdrawalService.completeWithdrawal(req.params.id, adminId, {
      paymentProofUrl,
      paymentProofPublicId,
      paymentProofMimeType,
      paymentReference,
      adminNotes
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[withdrawalController.adminCompleteWithdrawal]', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to complete withdrawal'
    });
  }
};

/**
 * Admin: Get Minimum Withdrawal Settings
 * GET /api/admin/withdrawals/settings
 */
exports.adminGetSettings = async (req, res) => {
  try {
    const config = await withdrawalService.getGlobalMinimumWithdrawal();
    return res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('[withdrawalController.adminGetSettings]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch withdrawal settings'
    });
  }
};

/**
 * Admin: Update Minimum Withdrawal Settings
 * PUT /api/admin/withdrawals/settings
 */
exports.adminUpdateSettings = async (req, res) => {
  try {
    const { minWithdrawalAmount, minWithdrawalAmountINR } = req.body;
    const amount = minWithdrawalAmountINR || minWithdrawalAmount;

    if (!amount || Number(amount) < 1) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount must be at least ₹1'
      });
    }

    const config = await withdrawalService.updateGlobalMinimumWithdrawal(amount);
    return res.status(200).json({
      success: true,
      message: 'Minimum withdrawal amount updated successfully',
      data: config
    });
  } catch (error) {
    console.error('[withdrawalController.adminUpdateSettings]', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update withdrawal settings'
    });
  }
};
