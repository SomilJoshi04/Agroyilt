const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isVendor } = require('../../middleware/roleMiddleware');

const {
  getOpenRequirements,
  submitBid,
  getMyBids
} = require('../../controllers/vendorControllers/vendorBidController');

router.use(authenticate, isVendor);

router.get('/requirements', getOpenRequirements);
router.post('/requirements/:id/bid', submitBid);
router.get('/', getMyBids);

module.exports = router;
