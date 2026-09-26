const mongoose = require('mongoose');

/**
 * District Model
 * Represents a district within a City (e.g. Tehsil / Taluka / Block).
 * Used for Admin geographic scoping.
 */
const districtSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'District name is required'],
    trim: true
  },
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    required: [true, 'City reference is required'],
    index: true
  },
  cityName: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, {
  timestamps: true
});

// Compound unique: district name is unique within a city
districtSchema.index({ cityId: 1, name: 1 }, { unique: true });
districtSchema.index({ cityId: 1, isActive: 1, displayOrder: 1 });

module.exports = mongoose.model('District', districtSchema);
