const mongoose = require('mongoose');
const Vendor = require('./models/Vendor');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const vendor = await Vendor.findOne({ email: 'bhatiabhishek597@gmail.com' });
        if (vendor) {
            console.log("Found Vendor!");
            console.log("ID:", vendor._id.toString());
            console.log("Name:", vendor.name);
            console.log("Email:", vendor.email);
        } else {
            console.log("Vendor not found for email bhatiabhishek597@gmail.com");
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

run();
