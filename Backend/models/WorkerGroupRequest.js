const mongoose = require('mongoose');

/**
 * WorkerGroupRequest
 * Tracks a farmer's group-worker hire request through a Team Leader,
 * including member dispatch, individual acceptance, leader selection,
 * and rate negotiation.
 */
const workerGroupRequestSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  teamLeaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true,
    index: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    index: true
  },

  // Work Details
  workCategory:    { type: String, default: '' },
  workTitle:       { type: String, default: '' },
  workDescription: { type: String, default: '' },
  requiredSkills:  [{ type: String }],
  additionalInstructions: { type: String, default: '' },

  // Schedule
  scheduledDate: { type: Date, required: true, index: true },
  startTime:     { type: String, required: true },
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

  // Worker Count
  requiredWorkers: { type: Number, required: true, min: 1 },

  // Rate Negotiation (per worker)
  leaderRate:              { type: Number, required: true }, // Snapshot of leader's daily rate
  farmerOfferedRatePerWorker: { type: Number, required: true },
  agreedRatePerWorker:     { type: Number, default: null },  // Set only after agreement

  negotiation: [{
    by:        { type: String, enum: ['farmer', 'leader'], required: true },
    rate:      { type: Number, required: true },
    message:   { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  }],

  // Overall request status (Farmer ↔ Leader negotiation + lifecycle)
  status: {
    type: String,
    enum: [
      'pending',          // Waiting for leader to respond
      'leader_accepted',  // Leader accepted, not yet dispatched to members
      'collecting_members', // Member requests sent out
      'selection_pending', // All members responded, leader yet to select
      'confirmed',        // Leader selected workers, booking created
      'rejected',         // Leader rejected
      'cancelled',        // Farmer cancelled
      'expired'           // Timed out
    ],
    default: 'pending',
    index: true
  },

  // Individual member requests sent by the leader
  memberRequests: [{
    workerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    status:      { type: String, enum: ['pending', 'accepted', 'rejected', 'withdrawn'], default: 'pending' },
    respondedAt: { type: Date, default: null }
  }],

  // Final workers selected by the leader (array of workerIds)
  selectedWorkers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  }],

  // Reference to Booking records created on confirmation
  finalBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },

  rejectionReason: { type: String, default: null },

  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
  }
}, { timestamps: true });

// Indexes
workerGroupRequestSchema.index({ farmerId: 1, status: 1 });
workerGroupRequestSchema.index({ teamLeaderId: 1, status: 1 });
workerGroupRequestSchema.index({ teamId: 1, scheduledDate: 1 });
workerGroupRequestSchema.index({ 'memberRequests.workerId': 1 });

module.exports = mongoose.model('WorkerGroupRequest', workerGroupRequestSchema);
