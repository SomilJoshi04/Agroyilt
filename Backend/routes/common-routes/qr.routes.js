const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isVendor } = require('../../middleware/roleMiddleware');

const {
  generateQRToken,
  scanQRToken,
  getQRHistory
} = require('../../controllers/commonControllers/qrController');

// Farmer or Vendor can scan QR depending on step
router.post('/qr/scan', authenticate, scanQRToken);

// Only Vendor can generate and view QR history for their bookings
router.post('/vendor/bookings/:bookingId/qr/generate', authenticate, isVendor, generateQRToken);
router.get('/vendor/bookings/:bookingId/qr-history', authenticate, isVendor, getQRHistory);

module.exports = router;
