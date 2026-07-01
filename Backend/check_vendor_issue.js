const mongoose = require('mongoose');
require('dotenv').config();
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

mongoose.connect(MONGO_URI).then(async () => {
  const Vendor = require('./models/Vendor');
  const Booking = require('./models/Booking');
  const Category = require('./models/Category');

  // Get the specific booking
  const booking = await Booking.findById('6a22b6874f0f4e5546e3c8e6').populate('categoryId');
  console.log('Booking service:', booking?.serviceName);
  console.log('Booking serviceCategory:', booking?.serviceCategory);
  console.log('Booking categoryId:', booking?.categoryId?.title, '| _id:', booking?.categoryId?._id);
  console.log('Booking address:', booking?.address);
  console.log('Booking notifiedVendors count:', booking?.notifiedVendors?.length);
  console.log('---');

  // Find vendor
  const vendor = await Vendor.findOne({ phone: '9301988718' });
  
  // Now simulate what findNearbyVendors does:
  // Filter 1: categories field (vendor.categories)
  // Filter 2: isOnline === true
  // Filter 3: availability === 'AVAILABLE'
  
  console.log('=== VENDOR MATCH ANALYSIS ===');
  console.log('Booking looks for category (serviceCategory):', booking?.serviceCategory);
  console.log('Vendor.categories array:', vendor?.categories); // ← EMPTY!
  console.log('Vendor.service array:', vendor?.service);
  console.log('Vendor fcmTokens:', vendor?.fcmTokens);
  console.log('Vendor fcmTokenMobile:', vendor?.fcmTokenMobile);
  console.log('Vendor geoLocation:', JSON.stringify(vendor?.geoLocation));
  console.log('---');
  console.log('FILTER 1 FAIL? categories is EMPTY []:', vendor?.categories?.length === 0 ? 'YES - No categories set!' : 'NO');
  console.log('FILTER 2 FAIL? isOnline:', vendor?.isOnline, '→ Must be true');
  console.log('FILTER 3 FAIL? availability:', vendor?.availability, '→ Must be AVAILABLE');
  console.log('---');
  
  // What the query looks for:
  // baseQuery.categories = { $in: [/^Tractor$/i] }
  // But vendor.categories = []
  // So it NEVER MATCHES!
  
  console.log('=== ROOT CAUSE ===');
  console.log('The booking uses serviceCategory = "Tractor"');
  console.log('locationService.js filters: vendor.categories must contain "Tractor"');
  console.log('But vendor.categories = [] (EMPTY!)');
  console.log('The vendor only has data in vendor.service = ["Tractor yuvo", "Rotavator11", "Cultivator"]');
  console.log('These are DIFFERENT fields!');
  console.log('---');
  console.log('Also: vendor.geoLocation.coordinates = [0,0] → Not set properly!');
  console.log('And: vendor.isOnline = false, availability = OFFLINE → Cannot receive bookings!');

  mongoose.disconnect();
}).catch(e => console.error('DB Error:', e.message));
