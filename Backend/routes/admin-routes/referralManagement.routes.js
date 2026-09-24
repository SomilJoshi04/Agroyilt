const express = require('express');
const router = express.Router();
const referralController = require('../../controllers/referralController');
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');

// Protect all admin referral routes
router.use(authenticate, isAdmin);

// Get referral settings & audit history
router.get('/settings', referralController.getAdminSettings);

// Update referral settings (system toggle, role reward amounts in paise)
router.put('/settings', referralController.updateAdminSettings);

// Get all attributions with filtering, search, pagination, and totals
router.get('/attributions', referralController.getAdminAttributions);

// Reverse a specific referral reward
router.post('/attributions/:id/reverse', referralController.reverseReward);

module.exports = router;
