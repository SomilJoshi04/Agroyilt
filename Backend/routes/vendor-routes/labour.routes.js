const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isVendor } = require('../../middleware/roleMiddleware');

const {
  addTeamMember,
  getTeamMembers,
  editTeamMember,
  removeTeamMember,
  assignWorkersToBooking,
  getBookingAssignments,
  unassignWorker,
  replaceWorker
} = require('../../controllers/vendorControllers/vendorLabourController');

router.use(authenticate, isVendor);

// Muster Roll
router.post('/labour-team', addTeamMember);
router.get('/labour-team', getTeamMembers);
router.put('/labour-team/:id', editTeamMember);
router.delete('/labour-team/:id', removeTeamMember);

// Assignments
router.post('/bookings/:bookingId/assign-worker', assignWorkersToBooking);
router.get('/bookings/:bookingId/assignments', getBookingAssignments);
router.delete('/assignments/:id', unassignWorker);
router.post('/assignments/:id/replace', replaceWorker);

module.exports = router;
