const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isVendor } = require('../../middleware/roleMiddleware');

const {
  markBatchAttendance,
  getAttendanceHistory,
  editAttendanceRecord
} = require('../../controllers/vendorControllers/vendorLabourController');

router.use(authenticate, isVendor);

router.post('/attendance/batch', markBatchAttendance);
router.get('/attendance', getAttendanceHistory);
router.patch('/attendance/:id', editAttendanceRecord);

module.exports = router;
