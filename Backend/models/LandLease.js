const mongoose = require('mongoose');

const landLeaseSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  sizeInAcres: {
    type: Number,
    required: true
  },
  khasraNumber: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    addressLine1: String,
    city: String,
    state: String,
    pincode: String,
    lat: Number,
    lng: Number,
    fullAddress: String
  },
  leaseType: {
    type: String,
    enum: ['fixed-rent', 'crop-share'],
    required: true
  },
  pricePerAcre: {
    type: Number, // Only applicable for fixed-rent
    default: null
  },
  sharePercentage: {
    type: Number, // Only applicable for crop-share
    default: null
  },
  availableFrom: {
    type: Date,
    required: true
  },
  availableTo: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending_verification', 'active', 'leased', 'inactive'],
    default: 'pending_verification',
    index: true
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  documents: [{
    type: String // Cloudinary URLs for proof of ownership
  }],
  currentTenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

landLeaseSchema.index({ 'location': '2dsphere' });

module.exports = mongoose.model('LandLease', landLeaseSchema);
