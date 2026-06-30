const mongoose = require('mongoose');
require('dotenv').config();
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

mongoose.connect(MONGO_URI).then(async () => {
  const Vendor = require('./models/Vendor');
  
  const vendor = await Vendor.findOne({ phone: '6268455485' });
  if (!vendor) {
    console.log('Vendor not found');
    mongoose.disconnect();
    return;
  }

  console.log('Vendor ID:', vendor._id);
  console.log('Current fcmTokens in DB:', vendor.fcmTokens);

  const testFcmToken = 'c7j-TGntcNlUn0V4mS27Ps:APA91bHVmydMrem85cNzhC4tjVSt-qcUJebv_vlf2XnXlZ2yRSXTibaIauVS-vH3CvpBbk_Peii-bpLNricFtblHZ18LPKtIpfnPOggYhVYSx9QbQh3OrxM';
  
  try {
    console.log('Simulating fcmToken save query...');
    
    // Step 1: Pull token (to prevent duplicates)
    await Vendor.findByIdAndUpdate(vendor._id, { $pull: { fcmTokens: testFcmToken } });
    
    // Step 2: Push token with slice limit
    const updated = await Vendor.findByIdAndUpdate(vendor._id, {
      $push: {
        fcmTokens: {
          $each: [testFcmToken],
          $position: 0,
          $slice: 10
        }
      }
    }, { new: true });

    console.log('Update result successful!');
    console.log('Updated fcmTokens:', updated.fcmTokens);

  } catch (err) {
    console.error('Update Failed:', err.message, err);
  }

  mongoose.disconnect();
}).catch(e => console.error(e));
