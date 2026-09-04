const express = require('express');
const router = express.Router();
const {
  getPublicCategories,
  getPublicBrands,
  getPublicBrandBySlug,
  getPublicServices,
  getPublicHomeContent,
  getPublicWorkers
} = require('../../controllers/publicControllers/catalogController');

// Public routes - no authentication required
router.get('/categories', getPublicCategories);
router.get('/brands', getPublicBrands); // Formerly services
router.get('/brands/slug/:slug', getPublicBrandBySlug);
router.get('/services', getPublicServices); // New services
router.get('/workers', getPublicWorkers); // Independent Workers
router.get('/home-content', getPublicHomeContent);

module.exports = router;
