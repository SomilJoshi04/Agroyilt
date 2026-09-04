const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true // Allows multiple null values
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
    unique: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    select: false
  },
  // MPIN Login
  mpin: {
    type: String,
    select: false // Never returned in normal queries
  },
  isMpinSet: {
    type: Boolean,
    default: false
  },
  mpinAttempts: {
    type: Number,
    default: 0
  },
  mpinLockedUntil: {
    type: Date,
    default: null
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  profilePhoto: {
    type: String,
    default: null
  },
  // ENFORCED POLICY: Only 1 address allowed. If user changes it, we replace.
  addresses: [{
    type: {
      type: String, // home, work, other
      default: 'home'
    },
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String,
    isDefault: {
      type: Boolean,
      default: false
    },
    lat: Number,
    lng: Number
  }],
  // Farms / Khet Details
  farms: [{
    name: {
      type: String,
      trim: true,
      default: 'My Farm'
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
    sizeInAcres: {
      type: Number,
      default: 0
    },
    cropType: [{
      type: String
    }],
    khasraNumber: {
      type: String,
      trim: true,
      default: null
    }
  }],
  wallet: {
    balance: {
      type: Number,
      default: 0
    },
    penalty: {
      type: Number,
      default: 0
    }
  },
  plans: {
    isActive: {
      type: Boolean,
      default: false
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      default: null
    },
    name: {
      type: String,
      default: null
    },
    expiry: {
      type: Date,
      default: null
    },
    price: {
      type: Number,
      default: 0
    },
    rentalDiscountPercentage: {
      type: Number,
      default: 0
    },
    marketplaceDiscountPercentage: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Equipment Owner KYC Properties
  kyc_status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  kyc_documents: [{
    type: String
  }],
  // Settings
  settings: {
    notifications: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  // Statistics
  totalBookings: {
    type: Number,
    default: 0
  },
  completedBookings: {
    type: Number,
    default: 0
  },
  cancelledBookings: {
    type: Number,
    default: 0
  },

  // FCM Push Notification Tokens
  fcmTokens: {
    type: [String],
    default: []
  },
  fcmTokenMobile: {
    type: [String],
    default: []
  },

}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Indexes
userSchema.index({ 'farms.location': '2dsphere' });

module.exports = mongoose.model('User', userSchema);

