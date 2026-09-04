const mongoose = require('mongoose');

const qrVerificationSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },
  workerAssignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkerAssignment',
    default: null
  },
  type: {
    type: String,
    enum: ['worker_arrival', 'work_start', 'work_completion'],
    required: true
  },
  qrToken: {
    type: String,
    required: true,
    unique: true
  },
  scannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Could be Farmer (User) or Contractor (Vendor)
    default: null
  },
  scannedAt: {
    type: Date,
    default: null
  },
  geoLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  status: {
    type: String,
    enum: ['generated', 'scanned', 'expired'],
    default: 'generated'
  }
}, { timestamps: true });

module.exports = mongoose.model('QRVerification', qrVerificationSchema);
