const mongoose = require('mongoose');

const payoutRequestSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  amount: {
    type: Number, // paise
    required: true
  },
  bankDetailsSnapshot: {
    type: Object,
    required: true // Store bank details at time of request
  },
  status: {
    type: String,
    enum: ['requested', 'admin_approved', 'admin_rejected', 'processing', 'completed', 'failed'],
    default: 'requested'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  gatewayPayoutId: {
    type: String,
    default: null
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('PayoutRequest', payoutRequestSchema);
