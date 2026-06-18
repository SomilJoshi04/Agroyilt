const mongoose = require('mongoose');
require('dotenv').config();
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

mongoose.connect(MONGO_URI).then(async () => {
  const { findNearbyVendors } = require('./services/locationService');
  const Category = require('./models/Category');
  const Booking = require('./models/Booking');
  const Vendor = require('./models/Vendor');

  // Let\'s test findNearbyVendors using the real booking\'s data
  const booking = await Booking.findById('6a22b6874f0f4e5546e3c8e6').populate('categoryId');
  const vendor = await Vendor.findOne({ phone: '7033857798' });

  console.log('--- Current Vendor Status ---');
  console.log({
    name: vendor.name,
    isOnline: vendor.isOnline,
    availability: vendor.availability,
    geoLocation: vendor.geoLocation,
    categories: vendor.categories,
    service: vendor.service
  });

  const centerLocation = {
    lat: booking.address.lat,
    lng: booking.address.lng
  };

  console.log('\n--- Running findNearbyVendors ---');
  const categoryTitle = booking.categoryId ? booking.categoryId.title : booking.serviceCategory;
  console.log('Searching for Category:', categoryTitle);
  console.log('Center Location:', centerLocation);

  const filters = {
    service: categoryTitle
  };

  const nearby = await findNearbyVendors(centerLocation, 30, filters);
  console.log('\n--- Results ---');
  console.log(`Found ${nearby.length} matching vendors within 30km:`);
  nearby.forEach(v => {
    console.log(`- Vendor Name: ${v.name}, Distance: ${v.distance?.toFixed(2)} km, Phone: ${v.phone}`);
  });

  mongoose.disconnect();
}).catch(e => console.error('Error:', e));
