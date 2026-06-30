const mongoose = require('mongoose');
require('dotenv').config();
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

mongoose.connect(MONGO_URI).then(async () => {
  const Vendor = require('./models/Vendor');
  const { generateAccessToken } = require('./utils/tokenService');
  const axios = require('axios');

  const vendor = await Vendor.findOne({ phone: '6268455485' });
  if (!vendor) {
    console.log('Vendor not found');
    mongoose.disconnect();
    return;
  }

  console.log('Vendor found:', vendor.name, 'ID:', vendor._id);
  const token = generateAccessToken({ userId: vendor._id, role: 'vendor' });
  console.log('Generated token for vendor:', token);

  const testFcmToken = 'c7j-TGntcNlUn0V4mS27Ps:APA91bHVmydMrem85cNzhC4tjVSt-qcUJebv_vlf2XnXlZ2yRSXTibaIauVS-vH3CvpBbk_Peii-bpLNricFtblHZ18LPKtIpfnPOggYhVYSx9QbQh3OrxM';
  
  try {
    const PORT = process.env.PORT || 5000;
    const url = `http://localhost:${PORT}/api/vendors/fcm-tokens/save`;
    console.log(`Sending POST to: ${url}`);
    
    const response = await axios.post(url, {
      token: testFcmToken,
      platform: 'web'
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('API Response Status:', response.status);
    console.log('API Response Data:', response.data);

    // Fetch vendor again to see if token is updated
    const updatedVendor = await Vendor.findById(vendor._id);
    console.log('Updated Vendor fcmTokens in DB:', updatedVendor.fcmTokens);

  } catch (err) {
    console.error('API Request Failed:', err.response ? {
      status: err.response.status,
      data: err.response.data
    } : err.message);
  }

  mongoose.disconnect();
}).catch(e => console.error(e));
