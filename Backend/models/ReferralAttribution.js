const mongoose = require('mongoose');

const referralAttributionSchema = new mongoose.Schema({
  // Referred User (New Account)
  referredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'referredModel'
  },
  referredModel: {
    type: String,
    required: true,
    enum: ['User', 'Vendor', 'Worker']
  },
  referredRole: {
    type: String,
    required: true,
    enum: ['farmer', 'vendor', 'worker']
  },

  // Referrer (Existing User)
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'referrerModel',
    index: true
  },
  referrerModel: {
    type: String,
    required: true,
    enum: ['User', 'Vendor', 'Worker']
  },
  referralCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },

  // Attribution State
  status: {
    type: String,
    enum: ['pending_qualification', 'qualified', 'rejected', 'reversed'],
    default: 'pending_qualification',
    index: true
  },
  rewardStatus: {
    type: String,
    enum: ['unrewarded', 'rewarded', 'reversed'],
    default: 'unrewarded',
    index: true
  },

  // Immutable snapshot captured at qualification/reward time
  rewardAmountPaise: {
    type: Number,
    default: 0
  },
  rewardAmount: {
    type: Number, // in Rupees (e.g. 50)
    default: 0
  },
  rewardedRole: {
    type: String,
    enum: ['farmer', 'vendor', 'worker', null],
    default: null
  },
  rewardConfigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReferralRewardConfig',
    default: null
  },
  rewardConfigVersion: {
    type: Number,
    default: null
  },

  // Event & Audit Details
  qualificationEvent: {
    type: String,
    default: null
  },
  qualifiedAt: {
    type: Date,
    default: null
  },
  rewardedAt: {
    type: Date,
    default: null
  },

  // Reversal information if admin reverses
  reversalReason: {
    type: String,
    default: null
  },
  reversedAt: {
    type: Date,
    default: null
  },
  reversedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

// CRITICAL CONSTRAINT: Exactly one referrer per referred new account
// This prevents multiple referrers or re-attributing the same account
referralAttributionSchema.index({ referredUserId: 1 }, { unique: true });
referralAttributionSchema.index({ referrerId: 1, createdAt: -1 });
referralAttributionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ReferralAttribution', referralAttributionSchema);
