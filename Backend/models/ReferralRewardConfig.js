const mongoose = require('mongoose');

const referralRewardConfigSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'global',
    unique: true
  },
  systemEnabled: {
    type: Boolean,
    default: true
  },
  registrationUrl: {
    type: String,
    default: 'https://agroyilt.com/app/register',
    trim: true
  },
  roles: {
    farmer: {
      enabled: { type: Boolean, default: true },
      rewardAmountPaise: { type: Number, default: 5000, min: 0 } // ₹50
    },
    vendor: {
      enabled: { type: Boolean, default: true },
      rewardAmountPaise: { type: Number, default: 4000, min: 0 } // ₹40
    },
    worker: {
      enabled: { type: Boolean, default: true },
      rewardAmountPaise: { type: Number, default: 5000, min: 0 } // ₹50
    }
  },
  qualificationEvent: {
    type: String,
    enum: ['on_approval', 'on_registration'],
    default: 'on_approval'
  },
  version: {
    type: Number,
    default: 1
  },
  auditHistory: [{
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    adminEmail: {
      type: String
    },
    role: {
      type: String,
      enum: ['farmer', 'vendor', 'worker', 'system']
    },
    field: {
      type: String
    },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('ReferralRewardConfig', referralRewardConfigSchema);
