const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Vendor = require('./models/Vendor');
  
  const vendors = await Vendor.find({ 'address.lat': { $ne: null }, 'address.lng': { $ne: null } });
  let count = 0;
  for (const v of vendors) {
    v.geoLocation = {
      type: 'Point',
      coordinates: [v.address.lng, v.address.lat]
    };
    await v.save();
    count++;
  }
  
  console.log(`Synced geoLocation for ${count} vendors.`);
  mongoose.disconnect();
}
run();
