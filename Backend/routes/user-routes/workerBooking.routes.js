const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');

const wb  = require('../../controllers/workerControllers/workerBookingController');
const gb  = require('../../controllers/workerControllers/groupBookingController');
const fwr = require('../../controllers/workerControllers/farmerWorkerRequestController');

// ── Public / User-auth routes ──────────────────────────────────────────────

// ── FARMER-FIRST BROADCAST REQUEST ROUTES (NEW) ────────────────────────────
router.post('/farmer-worker-request',                        authenticate, fwr.createFarmerRequest);
router.get('/farmer-worker-requests',                        authenticate, fwr.getMyFarmerRequests);
router.get('/farmer-worker-request/:id',                     authenticate, fwr.getFarmerRequestById);
router.post('/farmer-worker-request/:id/confirm',            authenticate, fwr.farmerConfirmRequest);
router.delete('/farmer-worker-request/:id',                  authenticate, fwr.cancelFarmerRequest);

// ── Single worker discovery (kept for reference/profile browsing) ──────────
router.get('/workers',      authenticate, wb.listWorkers);

// ── Single worker request (legacy Farmer → specific Worker) ───────────────
router.post('/worker-request',                         authenticate, wb.createSingleRequest);
router.get('/worker-requests',                         authenticate, wb.getMyRequests);
router.get('/worker-request/:id',                      authenticate, wb.getRequestById);
router.patch('/worker-request/:id/respond',            authenticate, wb.farmerRespondToCounter);
router.delete('/worker-request/:id',                   authenticate, wb.cancelRequest);

// Group worker discovery
router.get('/team-leaders',           authenticate, gb.listTeamLeaders);
router.get('/team-leader/:leaderId',  authenticate, gb.getTeamLeaderDetail);

// Group request (Farmer → Team Leader)
router.post('/group-request',                          authenticate, gb.createGroupRequest);
router.get('/group-requests',                          authenticate, gb.getMyGroupRequests);
router.patch('/group-request/:id/respond',             authenticate, gb.farmerRespondToGroupCounter);
router.delete('/group-request/:id',                    authenticate, gb.cancelGroupRequest);

module.exports = router;
