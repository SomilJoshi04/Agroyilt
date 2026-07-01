const mongoose = require('mongoose');
const { sendNotificationToVendor } = require('./services/firebaseAdmin');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const Vendor = require('./models/Vendor');
    const vendor = await Vendor.findOne({ phone: '6268455485' });

    if (!vendor) {
      console.log('Vendor 6268455485 not found');
      return;
    }

    console.log(`Sending test notification to ${vendor.name} (${vendor._id})...`);
    console.log('Tokens list before:', vendor.fcmTokenMobile);

    await sendNotificationToVendor(vendor._id, {
      title: '🔔 Test Notification',
      body: 'This is a test notification for vendor!',
      data: {
        type: 'test',
        link: '/vendor/dashboard'
      }
    });

    // Wait 3 seconds for background cleanup to finish
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Fetch vendor again to check if invalid token was removed
    const updatedVendor = await Vendor.findOne({ phone: '6268455485' });
    console.log('Tokens list after:', updatedVendor.fcmTokenMobile);

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

run();
