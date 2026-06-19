require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./models/Booking');

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI).then(async () => {
  const b = await Booking.findById('6a34ce6c9f5c948880552b13');
  if (!b) {
    console.log("Booking not found");
  } else {
    console.log("Booking ID:", b._id);
    console.log("Status:", b.status);
    console.log("Vendor ID:", b.vendorId);
    console.log("Notified Vendors:", b.notifiedVendors);
    console.log("Potential Vendors:", JSON.stringify(b.potentialVendors));
  }
  process.exit(0);
}).catch(console.error);
