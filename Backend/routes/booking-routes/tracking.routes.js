'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const tc = require('../../controllers/bookingControllers/trackingController');

// Authoritative tracking snapshot for Farmer / Worker / Admin
router.get('/:id/tracking', authenticate, tc.getTrackingSnapshot);
router.get('/:id',          authenticate, tc.getTrackingSnapshot);

module.exports = router;
