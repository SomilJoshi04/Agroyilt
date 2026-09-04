const mongoose = require('mongoose');
const uri = "mongodb+srv://agroyilt_db_user:agroyilt_db_user@cluster0.zbhhozr.mongodb.net/groo";

async function run() {
    try {
        console.log("Starting script...");
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log("Connected to MongoDB");
        
        const Vendor = mongoose.model('Vendor', new mongoose.Schema({}, { strict: false }), 'vendors');

        const vendor = await Vendor.findOne({ phone: '9301988718' });
        if (vendor) {
            console.log("Vendor Found: " + vendor.name);
            console.log("isActive: " + vendor.isActive);
            console.log("approvalStatus: " + vendor.approvalStatus);
            console.log("service: " + JSON.stringify(vendor.service));
            console.log("categories: " + JSON.stringify(vendor.categories));
            console.log("fcmTokens: " + JSON.stringify(vendor.fcmTokens));
            console.log("fcmTokenMobile: " + JSON.stringify(vendor.fcmTokenMobile));
            console.log("isOnline: " + (vendor.geoLocation?.isOnline ?? vendor.isOnline));
            console.log("availability: " + (vendor.geoLocation?.availability ?? vendor.availability));
        } else {
            console.log("Vendor not found with phone: 9301988718");
        }
        
        const totalVendors = await Vendor.countDocuments({});
        console.log("Total Vendors in DB: " + totalVendors);

        const soilTestingVendors = await Vendor.find({
            isActive: true,
            approvalStatus: 'approved',
            service: 'soil_testing'
        }).select('name phone');
        
        console.log("Total Eligible Soil Testing Vendors: " + soilTestingVendors.length);
        soilTestingVendors.forEach(v => console.log(`- ${v.name} (${v.phone})`));

    } catch (err) {
        console.log("Error logic: " + err.message);
    } finally {
        await mongoose.connection.close();
        console.log("Connection closed");
    }
}

run();
