const mongoose = require('mongoose');
require('dotenv').config();
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

mongoose.connect(MONGO_URI).then(async () => {
  const User = require('./models/User');
  const Vendor = require('./models/Vendor');
  const Worker = require('./models/Worker');

  console.log('=== USERS WITH FCM TOKENS ===');
  const users = await User.find({ fcmTokens: { $exists: true, $not: { $size: 0 } } });
  for (const u of users) {
    console.log(`User ID: ${u._id}, Name: ${u.name}, Phone: ${u.phone}`);
    console.log(`Tokens:`, u.fcmTokens);
    console.log('---');
  }

  console.log('\n=== VENDORS WITH FCM TOKENS ===');
  const vendors = await Vendor.find({ fcmTokens: { $exists: true, $not: { $size: 0 } } });
  for (const v of vendors) {
    console.log(`Vendor ID: ${v._id}, Name: ${v.name}, Phone: ${v.phone}`);
    console.log(`Tokens:`, v.fcmTokens);
    console.log('---');
  }

  console.log('\n=== WORKERS WITH FCM TOKENS ===');
  const workers = await Worker.find({ fcmTokens: { $exists: true, $not: { $size: 0 } } });
  for (const w of workers) {
    console.log(`Worker ID: ${w._id}, Name: ${w.name}, Phone: ${w.phone}`);
    console.log(`Tokens:`, w.fcmTokens);
    console.log('---');
  }

  mongoose.disconnect();
}).catch(e => console.error(e));
