const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');

const {
  getPendingPayouts,
  approvePayout,
  rejectPayout,
  getReconciliationReport
} = require('../../controllers/adminControllers/adminPayoutController');

router.use(authenticate, isAdmin);

router.get('/payout-requests', getPendingPayouts);
router.post('/payout-requests/:id/approve', approvePayout);
router.post('/payout-requests/:id/reject', rejectPayout);
router.get('/reconciliation/daily-report', getReconciliationReport);

module.exports = router;
