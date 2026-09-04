const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isVendor } = require('../../middleware/roleMiddleware');

const {
  getWalletBalance,
  getTransactions,
  requestPayout,
  getPayoutRequests
} = require('../../controllers/vendorControllers/vendorLedgerController');

router.use(authenticate, isVendor);

router.get('/wallet-balance', getWalletBalance);
router.get('/ledger-transactions', getTransactions);
router.post('/payout-request', requestPayout);
router.get('/payout-requests', getPayoutRequests);

module.exports = router;
