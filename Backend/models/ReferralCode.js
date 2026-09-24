const mongoose = require('mongoose');

const referralCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'ownerModel',
    index: true
  },
  ownerModel: {
    type: String,
    required: true,
    enum: ['User', 'Vendor', 'Worker']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalReferred: {
    type: Number,
    default: 0
  },
  totalQualified: {
    type: Number,
    default: 0
  },
  totalEarnedPaise: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Ensure each owner can have only one referral code
referralCodeSchema.index({ ownerId: 1, ownerModel: 1 }, { unique: true });

module.exports = mongoose.model('ReferralCode', referralCodeSchema);
