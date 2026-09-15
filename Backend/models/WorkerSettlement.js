const mongoose = require('mongoose');

const workerSettlementSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true,
    index: true
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkerBookingRequest',
    required: true
  },
  
  // Financials
  grossAmount: { type: Number, required: true },
  commissionRate: { type: Number, required: true },
  commissionAmount: { type: Number, required: true },
  netAmount: { type: Number, required: true }, // gross - commission

  // Payment Tracking
  paymentMethod: {
    type: String,
    enum: ['online', 'cash', 'wallet', 'plan_benefit'],
    required: true
  },
  
  // Action Tracking
  cashDuesRecorded: { type: Boolean, default: false },
  
  // Farmer Refund
  farmerUnusedAmount: { type: Number, default: 0 },
  farmerWalletCredited: { type: Boolean, default: false },

  // Idempotency (Unique string generated at time of settlement)
  idempotencyKey: {
    type: String,
    required: true,
    unique: true
  },

  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  }
}, { timestamps: true });

module.exports = mongoose.model('WorkerSettlement', workerSettlementSchema);
