const mongoose = require('mongoose');
require('dotenv').config();
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

mongoose.connect(MONGO_URI).then(async () => {
  const { findNearbyVendors } = require('./services/locationService');
  const Vendor = require('./models/Vendor');

  // 1. Fetch vendor tanu maan (9301988718)
  let vendor = await Vendor.findOne({ phone: '9301988718' });
  if (!vendor) {
    console.log('Vendor 9301988718 not found!');
    mongoose.disconnect();
    return;
  }

  console.log('--- Before Update ---');
  console.log('Name:', vendor.name);
  console.log('geoLocation:', JSON.stringify(vendor.geoLocation));
  console.log('availability:', vendor.availability);

  // 2. Simulate location update REST API behavior (updating geoLocation)
  // Let's set the coords to Indore: lat = 22.7173826, lng = 75.8716714
  vendor.geoLocation = {
    type: 'Point',
    coordinates: [75.8716714, 22.7173826] // [lng, lat]
  };
  vendor.location = {
    lat: 22.7173826,
    lng: 75.8716714,
    updatedAt: new Date()
  };
  // Ensure availability is OFFLINE to test if filter now correctly allows offline
  vendor.availability = 'OFFLINE';
  vendor.isOnline = false;

  await vendor.save();
  console.log('\n--- Updated Vendor Coordinates to Indore (and status to OFFLINE) ---');

  // 3. Test findNearbyVendors
  // Search center: Indore coordinates (say, 22.7180, 75.8720) - which is ~0.1km from vendor
  const centerLocation = {
    lat: 22.7180,
    lng: 75.8720
  };

  console.log('\n--- Running findNearbyVendors (center around Indore) ---');
  const filters = {
    service: 'Tractor'
  };

  const nearby = await findNearbyVendors(centerLocation, 30, filters);
  console.log(`Found ${nearby.length} matching vendors within 30km:`);
  
  let foundTarget = false;
  nearby.forEach(v => {
    console.log(`- Name: ${v.name}, Distance: ${v.distance?.toFixed(2)} km, Phone: ${v.phone}, Availability: ${v.availability}`);
    if (v.phone === '9301988718') {
      foundTarget = true;
    }
  });

  // Verify filter matching
  let filteredNearby = nearby.filter(v => v.availability === 'AVAILABLE' || v.availability === 'OFFLINE');
  console.log(`\nFiltered nearby (AVAILABLE or OFFLINE): ${filteredNearby.length} vendors`);
  let foundInFiltered = filteredNearby.some(v => v.phone === '9301988718');
  
  if (foundTarget && foundInFiltered) {
    console.log('\n✅ VERIFICATION SUCCESSFUL: Vendor tanu maan matches geographically and passes the updated availability filter!');
  } else {
    console.log('\n❌ VERIFICATION FAILED!');
  }

  mongoose.disconnect();
}).catch(e => console.error('Error:', e));
