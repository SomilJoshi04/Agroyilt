const mongoose = require('mongoose');
require('dotenv').config();
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

mongoose.connect(MONGO_URI).then(async () => {
  const Category = require('./models/Category');
  const Vendor = require('./models/Vendor');
  const Booking = require('./models/Booking');
  const { findNearbyVendors } = require('./services/locationService');

  const bookingId = '6a42696754a759cd2bc30780';
  const booking = await Booking.findById(bookingId).populate('categoryId');
  if (!booking) {
    console.log(`Booking ${bookingId} not found!`);
    mongoose.disconnect();
    return;
  }

  console.log('=== BOOKING DETAILS ===');
  console.log('ID:', booking._id);
  console.log('Service Category:', booking.serviceCategory);
  console.log('Status:', booking.status);
  console.log('Address:', JSON.stringify(booking.address));

  console.log('\n=== VENDOR DETAILS ===');
  const vendor = await Vendor.findOne({ phone: '6268455485' });
  if (vendor) {
    console.log('ID:', vendor._id);
    console.log('isOnline:', vendor.isOnline);
    console.log('availability:', vendor.availability);
    console.log('approvalStatus:', vendor.approvalStatus);
    console.log('isActive:', vendor.isActive);
    console.log('categories:', vendor.categories);
    console.log('geoLocation:', JSON.stringify(vendor.geoLocation));
    console.log('fcmTokens:', vendor.fcmTokens);
  } else {
    console.log('Vendor 6268455485 not found!');
  }

  if (booking.address && booking.address.lat && booking.address.lng && vendor && vendor.geoLocation?.coordinates) {
    const bLat = booking.address.lat;
    const bLng = booking.address.lng;
    const vLng = vendor.geoLocation.coordinates[0];
    const vLat = vendor.geoLocation.coordinates[1];

    const deg2rad = (deg) => deg * (Math.PI/180);
    const getDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = deg2rad(lat2-lat1);
      const dLon = deg2rad(lon2-lon1);
      const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2)
        ;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    const distance = getDistance(bLat, bLng, vLat, vLng);
    console.log('\n=== DISTANCE ===');
    console.log(`Booking: lat=${bLat}, lng=${bLng}`);
    console.log(`Vendor: lat=${vLat}, lng=${vLng}`);
    console.log(`Calculated Distance: ${distance.toFixed(4)} km`);
  }

  console.log('\n=== SIMULATING findNearbyVendors ===');
  const centerLocation = {
    lat: booking.address?.lat,
    lng: booking.address?.lng
  };
  const categoryTitle = booking.categoryId ? booking.categoryId.title : booking.serviceCategory;
  const filters = {
    service: categoryTitle
  };
  
  const results = await findNearbyVendors(centerLocation, 30, filters);
  console.log(`Found ${results.length} vendors:`);
  for (const res of results) {
    console.log(` - ID: ${res._id}, Name: ${res.name}, Distance: ${res.distance} km`);
  }

  mongoose.disconnect();
}).catch(e => console.error(e));
