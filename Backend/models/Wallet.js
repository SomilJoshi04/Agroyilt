const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
    refPath: 'userModel'
  },
  userModel: {
    type: String,
    required: true,
    enum: ['User', 'Vendor', 'Worker', 'Admin']
  },
  balance: {
    type: Number, // Stored as integer (paise) to avoid float issues
    default: 0
  },
  reservedBalance: {
    type: Number, // Stored as integer (paise) reserved for pending withdrawals
    default: 0
  },
  currency: {
    type: String,
    default: 'INR'
  }
}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);
