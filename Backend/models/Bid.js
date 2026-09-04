const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  requirementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Requirement',
    required: true,
    index: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  equipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorEquipment',
    default: null
  },
  bidAmount: {
    type: Number,
    required: true,
    min: 0
  },
  message: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending',
    index: true
  }
}, { timestamps: true });

// Prevent multiple bids from same vendor on same requirement
bidSchema.index({ requirementId: 1, vendorId: 1 }, { unique: true });

module.exports = mongoose.model('Bid', bidSchema);
