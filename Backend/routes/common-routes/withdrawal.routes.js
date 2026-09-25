'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const withdrawalController = require('../../controllers/commonControllers/withdrawalController');

// Multer setup for payment proof (accepts image/pdf up to 10MB)
const storage = multer.memoryStorage();
const proofFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only JPEG, PNG, WEBP, and PDF files are allowed for payment proof.'), false);
  }
};

const uploadProof = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: proofFileFilter
});

// ==========================================
// USER / VENDOR / WORKER WITHDRAWAL ROUTES
// ==========================================

// Get available balance, reserved balance, and limits
router.get('/balance', authenticate, withdrawalController.getBalance);

// Banking details management
router.get('/bank-details', authenticate, withdrawalController.getBankDetails);
router.post('/bank-details', authenticate, withdrawalController.updateBankDetails);

// Submit a withdrawal request
router.post('/request', authenticate, withdrawalController.requestWithdrawal);

// History of own withdrawals
router.get('/history', authenticate, withdrawalController.getHistory);

// ==========================================
// ADMIN WITHDRAWAL MANAGEMENT ROUTES
// (Must be defined before parameterized /:id)
// ==========================================

// Global minimum withdrawal amount configuration
router.get('/admin/settings', authenticate, isAdmin, withdrawalController.adminGetSettings);
router.put('/admin/settings', authenticate, isAdmin, withdrawalController.adminUpdateSettings);

// List all requests with filters & pagination
router.get('/admin/all', authenticate, isAdmin, withdrawalController.adminListWithdrawals);

// Status actions & Single request detail
router.get('/admin/:id', authenticate, isAdmin, withdrawalController.adminGetWithdrawal);
router.post('/admin/:id/accept', authenticate, isAdmin, withdrawalController.adminAcceptWithdrawal);
router.post('/admin/:id/process', authenticate, isAdmin, withdrawalController.adminMarkProcessing);
router.post('/admin/:id/reject', authenticate, isAdmin, withdrawalController.adminRejectWithdrawal);

// Complete withdrawal (with payment proof upload)
router.post(
  '/admin/:id/complete',
  authenticate,
  isAdmin,
  (req, res, next) => {
    uploadProof.single('paymentProof')(req, res, (err) => {
      if (err) {
        console.error('[withdrawal.routes] Multer error:', err);
        return res.status(400).json({
          success: false,
          message: err.message || 'Payment proof upload failed'
        });
      }
      next();
    });
  },
  withdrawalController.adminCompleteWithdrawal
);

// ==========================================
// USER / VENDOR / WORKER DETAIL & PROOF
// ==========================================

// Single withdrawal detail (IDOR protected)
router.get('/detail/:id', authenticate, withdrawalController.getDetail);
router.get('/:id/payment-proof', authenticate, withdrawalController.getPaymentProof);
router.get('/:id', authenticate, withdrawalController.getDetail);

module.exports = router;
