const mongoose = require('mongoose');

const paymentWebhookLogSchema = new mongoose.Schema({
  provider: {
    type: String,
    default: 'razorpay'
  },
  eventType: {
    type: String,
    required: true
  },
  rawPayload: {
    type: mongoose.Schema.Types.Mixed, // Raw JSON object
    required: true
  },
  signatureValid: {
    type: Boolean,
    required: true
  },
  processedStatus: {
    type: String,
    enum: ['received', 'processed', 'ignored_duplicate', 'failed'],
    default: 'received'
  },
  errorDetails: {
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('PaymentWebhookLog', paymentWebhookLogSchema);
