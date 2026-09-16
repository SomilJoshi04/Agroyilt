const mongoose = require('mongoose');

const registrationFeeConfigSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['USER', 'VENDOR', 'WORKER'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  version: {
    type: Number,
    required: true,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, { timestamps: true });

// Ensure only one active config per role
registrationFeeConfigSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model('RegistrationFeeConfig', registrationFeeConfigSchema);
