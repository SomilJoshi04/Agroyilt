const express = require('express');
const router = express.Router();
const contentController = require('../controllers/adminControllers/contentController');
const { authenticate } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// Public routes
router.get('/faq', contentController.getFAQs);
router.get('/about', contentController.getAbout);
router.get('/app-guide', contentController.getAppGuide);

// Admin routes
router.post('/faq', authenticate, isAdmin, contentController.createFAQ);
router.put('/faq/:id', authenticate, isAdmin, contentController.updateFAQ);
router.delete('/faq/:id', authenticate, isAdmin, contentController.deleteFAQ);

router.put('/about', authenticate, isAdmin, contentController.updateAbout);
router.put('/app-guide', authenticate, isAdmin, contentController.updateAppGuide);

module.exports = router;
