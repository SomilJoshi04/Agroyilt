const mongoose = require('mongoose');

const groupBookingSchema = new mongoose.Schema({
  primaryFarmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  machineryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorEquipment',
    required: true,
    index: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  timeSlot: {
    start: String,
    end: String
  },
  totalArea: {
    type: Number, // In acres
    default: 0
  },
  totalEstimatedCost: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'locked', 'converted', 'cancelled'],
    default: 'pending',
    index: true
  },
  // Once all confirmed, it converts to a standard aggregate booking
  aggregateBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  participants: [{
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    area: {
      type: Number,
      required: true
    },
    shareAmount: {
      type: Number,
      required: true
    },
    isConfirmed: {
      type: Boolean,
      default: false
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending'
    },
    razorpayOrderId: {
      type: String,
      default: null
    }
  }],
  location: {
    lat: Number,
    lng: Number,
    address: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('GroupBooking', groupBookingSchema);
