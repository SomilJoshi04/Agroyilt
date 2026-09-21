const express = require('express');
const router = express.Router();
const { getPublicSettings, getPublicLogo, getPublicFavicon } = require('../../controllers/adminControllers/settingsController');

router.get('/config', getPublicSettings);
router.get('/logo', getPublicLogo);
router.get('/favicon', getPublicFavicon);

module.exports = router;

