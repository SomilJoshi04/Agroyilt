const mongoose = require('mongoose');

/**
 * WorkerBookingRequest
 *
 * Supports TWO modes:
 *  1. Legacy single-worker request (farmer selects specific worker) — workerId is set.
 *  2. Farmer-first broadcast request (backend auto-matches workers) — workerId is null,
 *     requiredWorkers > 1 is allowed, dispatchedTo array tracks worker responses.
 */
const workerBookingRequestSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // --- Legacy single-worker mode: specific worker chosen by farmer ---
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    default: null,
    index: true
  },

  // Work Details
  workCategory:          { type: String, default: '' },
  workTitle:             { type: String, default: '' },
  workDescription:       { type: String, default: '' },
  requiredSkills:        [{ type: String }],
  additionalInstructions:{ type: String, default: '' },

  // Schedule
  scheduledDate: { type: Date, required: true, index: true },
  startTime:     { type: String, required: true }, // HH:mm
  endTime:       { type: String, required: true },
  rateUnit:      { type: String, enum: ['hourly', 'daily'], default: 'daily' },

  // Location
  location: {
    addressLine1: String,
    city:         String,
    state:        String,
    pincode:      String,
    lat:          Number,
    lng:          Number
  },

  // Rate Negotiation (legacy / single-worker)
  workerRate:        { type: Number, default: null }, // Snapshot at request creation
  farmerOfferedRate: { type: Number, default: null }, // Farmer's opening offer
  agreedRate:        { type: Number, default: null }, // Set only after agreement

  negotiation: [{
    by:        { type: String, enum: ['farmer', 'worker'], required: true },
    rate:      { type: Number, required: true },
    message:   { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  }],

  // ── NEW: Farmer-First Broadcast Fields ────────────────────────────────────

  // How many workers the farmer needs (1 = legacy single, >1 = broadcast)
  requiredWorkers: { type: Number, default: 1, min: 1 },

  // How backend routed this request (set by backend, never trust frontend)
  requestType: {
    type: String,
    enum: ['single', 'independent_broadcast', 'team_leader'],
    default: 'single'
  },

  // Snapshot of Admin settings used at routing time (for audit history)
  routingSnapshot: {
    maxIndependentWorkerRequest: { type: Number, default: null },
    workerSearchRadiusKm:        { type: Number, default: null }
  },

  // Workers this request was dispatched to (broadcast mode)
  dispatchedTo: [{
    workerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    status:      { type: String, enum: ['pending', 'accepted', 'rejected', 'withdrawn'], default: 'pending' },
    respondedAt: { type: Date, default: null }
  }],

  // Aggregated counts (kept in sync by controller)
  eligibleWorkersCount:   { type: Number, default: 0 },
  dispatchedWorkersCount: { type: Number, default: 0 },
  acceptedWorkersCount:   { type: Number, default: 0 },
  rejectedWorkersCount:   { type: Number, default: 0 },

  // Workers who confirmed (populated at final booking creation)
  finalWorkers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  }],

  // Farmer accepted a partial count?
  farmerAcceptedPartial: { type: Boolean, default: false },

  // Budget range (used in broadcast mode)
  minRate: { type: Number, default: null },
  maxRate: { type: Number, default: null },

  // =============================================
  // WORKER OFFER RATES (new privacy-safe system)
  // =============================================
  // Each worker's submitted rate (stored server-side, NOT exposed to Farmer pre-payment)
  workerOffers: [{
    workerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    offeredRate: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
    status:      { type: String, enum: ['pending', 'selected', 'rejected', 'expired'], default: 'pending' }
  }],

  // Worker IDs explicitly selected by Farmer (before payment)
  selectedWorkerIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  }],

  // =============================================
  // PAYMENT TRACKING (for the initial max-budget payment)
  // =============================================
  paymentStatus: {
    type: String,
    enum: ['not_started', 'pending', 'success', 'failed', 'cash_pending'],
    default: 'not_started'
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'wallet', 'cash', null],
    default: null
  },
  razorpayOrderId:   { type: String, default: null },
  razorpayPaymentId: { type: String, default: null },

  // Immutable financial snapshot (locked at payment creation time)
  financialSnapshot: {
    maximumBudget:        { type: Number, default: null },
    selectedWorkerCount:  { type: Number, default: null },
    maximumWorkerAmount:  { type: Number, default: null },
    platformChargeRate:   { type: Number, default: null },
    platformChargeAmount: { type: Number, default: null },
    totalPayable:         { type: Number, default: null },
    commissionRate:       { type: Number, default: null },
    currency:             { type: String, default: 'INR' },
    createdAt:            { type: Date, default: null }
  },

  // ── Status ────────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: [
      'pending',                   // Waiting for worker(s) to respond
      'matching',                  // Backend is finding workers (brief interim state)
      'accepted',                  // Single-worker: worker accepted
      'rejected',                  // Single-worker: worker rejected
      'awaiting_farmer_confirmation', // Partial accepted — farmer must decide
      'confirmed',                 // All workers confirmed, booking created
      'cancelled',                 // Farmer cancelled
      'expired'                    // Timed out without completion
    ],
    default: 'pending',
    index: true
  },

  // Reference to final Booking record(s) (created after acceptance)
  finalBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },

  // Multiple bookings for broadcast mode
  finalBookingIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],

  // Auto-expiry
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  },

  rejectionReason: { type: String, default: null }
}, { timestamps: true });

// ── Indexes ───────────────────────────────────────────────────────────────────
workerBookingRequestSchema.index({ farmerId: 1, status: 1 });
workerBookingRequestSchema.index({ workerId: 1, status: 1 });
workerBookingRequestSchema.index({ 'dispatchedTo.workerId': 1 });
workerBookingRequestSchema.index({ workerId: 1, scheduledDate: 1, status: 1 });
workerBookingRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
// Prevent duplicate pending broadcast request from same farmer for same date+time
workerBookingRequestSchema.index(
  { farmerId: 1, scheduledDate: 1, startTime: 1, requestType: 1 },
  { partialFilterExpression: { status: 'pending', requestType: 'independent_broadcast' } }
);

module.exports = mongoose.model('WorkerBookingRequest', workerBookingRequestSchema);

