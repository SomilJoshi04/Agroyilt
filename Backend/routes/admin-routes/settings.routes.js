const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/roleMiddleware');
const { getSettings, updateSettings } = require('../../controllers/adminControllers/settingsController');

// All routes are protected and for admin only
router.use(authenticate, isAdmin);

router.route('/settings')
  .get(getSettings)
  .put(updateSettings);

const { updateFeeConfig, getAllFeeConfigs, getRegistrationFeePayments } = require('../../controllers/shared/registrationFeeController');
router.get('/settings/fees', getAllFeeConfigs);
router.post('/settings/fees', updateFeeConfig);
router.get('/registration-fees', getRegistrationFeePayments);

module.exports = router;
