const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');

const {
  createRequirement,
  getMyRequirements,
  getBidsForRequirement,
  acceptBid
} = require('../../controllers/userControllers/userRequirementController');

router.use(authenticate);

router.post('/', createRequirement);
router.get('/', getMyRequirements);
router.get('/:id/bids', getBidsForRequirement);
router.post('/:id/bids/:bidId/accept', acceptBid);

module.exports = router;
