const mongoose = require('mongoose');

const requirementSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false
  },
  details: {
    type: String,
    required: true
  },
  location: {
    cityId: { type: String, required: true },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    address: { type: String }
  },
  requiredDate: {
    type: Date,
    required: true
  },
  budgetMin: {
    type: Number,
    default: null
  },
  budgetMax: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['open', 'fulfilled', 'cancelled', 'expired'],
    default: 'open',
    index: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, { timestamps: true });

// TTL index for auto-expiration
requirementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
requirementSchema.index({ 'location.cityId': 1, status: 1 });

module.exports = mongoose.model('Requirement', requirementSchema);
