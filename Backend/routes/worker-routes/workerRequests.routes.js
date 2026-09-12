const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');

const wb  = require('../../controllers/workerControllers/workerBookingController');
const gb  = require('../../controllers/workerControllers/groupBookingController');
const fwr = require('../../controllers/workerControllers/farmerWorkerRequestController');

// ── Worker-side single booking request routes ──────────────────────────────
router.get('/booking-requests',              authenticate, wb.getWorkerIncomingRequests);
router.patch('/booking-request/:id/respond', authenticate, wb.workerRespondToRequest);

// ── Worker-side: respond to farmer broadcast request (NEW) ─────────────────
router.get('/farmer-requests/pending',       authenticate, fwr.getWorkerPendingFarmerRequests);
router.patch('/farmer-request/:id/respond',  authenticate, fwr.workerRespondToFarmerRequest);

// ── Team Leader group booking routes ──────────────────────────────────────
router.get('/group-requests',                         authenticate, gb.getLeaderGroupRequests);
router.patch('/group-request/:id/respond',            authenticate, gb.leaderRespondToRequest);
router.post('/group-request/:id/dispatch-members',   authenticate, gb.dispatchToMembers);
router.get('/group-request/:id/members',              authenticate, gb.getMemberResponses);
router.patch('/group-request/:id/select-workers',     authenticate, gb.leaderSelectWorkers);
router.patch('/group-request/:id/member-respond',     authenticate, gb.memberRespondToRequest);

module.exports = router;
