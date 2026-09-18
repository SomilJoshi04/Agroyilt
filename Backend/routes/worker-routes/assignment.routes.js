'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const wac = require('../../controllers/workerControllers/workerAssignmentController');

// Worker Assignment Lifecycle Routes
router.get('/my-assignments',             authenticate, wac.getMyAssignments);
router.get('/:id',                        authenticate, wac.getAssignmentDetails);
router.post('/:id/start-journey',         authenticate, wac.startJourney);
router.post('/:id/arrived',               authenticate, wac.markArrived);
router.post('/:id/verify-visit-otp',      authenticate, wac.verifyVisitOtp);
router.post('/:id/submit-proof',          authenticate, wac.submitProof);
router.post('/:id/verify-completion-otp', authenticate, wac.verifyCompletionOtp);
router.patch('/:id/location',             authenticate, wac.updateLocation);

module.exports = router;
