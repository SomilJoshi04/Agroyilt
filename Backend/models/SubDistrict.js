const mongoose = require('mongoose');

/**
 * SubDistrict Model
 * Represents a sub-district / village / ward within a District.
 * Used for Admin geographic scoping at the finest granularity.
 */
const subDistrictSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Sub-district name is required'],
    trim: true
  },
  districtId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'District',
    required: [true, 'District reference is required'],
    index: true
  },
  districtName: {
    type: String,
    trim: true,
    default: ''
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

// Compound unique: sub-district name is unique within a district
subDistrictSchema.index({ districtId: 1, name: 1 }, { unique: true });
subDistrictSchema.index({ districtId: 1, isActive: 1, displayOrder: 1 });
subDistrictSchema.index({ cityId: 1, isActive: 1 });

module.exports = mongoose.model('SubDistrict', subDistrictSchema);
