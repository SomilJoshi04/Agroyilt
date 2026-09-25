const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const {
  getAllTransactions,
  getTransactionStats,
  getReconciliationReport,
  exportTransactionsCSV
} = require('../../controllers/adminControllers/adminTransactionController');

// All routes are protected and admin only
router.use(authenticate, isAdmin);

router.get('/transactions/stats', getTransactionStats);
router.get('/transactions/reconciliation', getReconciliationReport);
router.get('/transactions/export', exportTransactionsCSV);
router.get('/transactions', getAllTransactions);

module.exports = router;
