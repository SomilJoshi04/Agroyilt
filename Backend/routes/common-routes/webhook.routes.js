const express = require('express');
const router = express.Router();
const { razorpayWebhook } = require('../../controllers/commonControllers/webhookController');

router.post('/payment/razorpay', razorpayWebhook);

module.exports = router;
