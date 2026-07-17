const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const {
    getApprovedProducts,
    getProductDetails,
    placeOrder,
    createPaymentOrder,
    payPlatformFee,
    getMyOrders,
    getOrderById,
    cancelOrder,
    generateInvoice
} = require('../../controllers/userControllers/productController');

// ✅ PUBLIC routes — No auth required (browsing marketplace)
router.get('/marketplace', getApprovedProducts);
router.get('/products/:id', getProductDetails);

// 🔒 PROTECTED routes — Auth required (ordering & tracking)
router.post('/orders', authenticate, placeOrder);
router.get('/orders/:id', authenticate, getOrderById);
router.get('/orders/:id/invoice', authenticate, generateInvoice);
router.post('/orders/:id/create-payment-order', authenticate, createPaymentOrder);
router.post('/orders/:id/pay-platform-fee', authenticate, payPlatformFee);
router.post('/orders/:id/cancel', authenticate, cancelOrder);
router.get('/my-orders', authenticate, getMyOrders);

module.exports = router;
