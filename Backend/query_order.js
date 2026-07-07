const mongoose = require('mongoose');
const EcommerceOrder = require('./models/EcommerceOrder');
const Notification = require('./models/Notification');
const Vendor = require('./models/Vendor');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB!");
        
        // Find order with ID ending in cc33b0 or matching
        const orders = await EcommerceOrder.find().sort({ createdAt: -1 }).limit(5);
        console.log("Latest Ecommerce Orders:");
        orders.forEach(o => {
            console.log(`Order ID: ${o._id}, Code: ${o._id.toString().slice(-8)}, Vendor: ${o.vendorId}, Total: ${o.totalAmount}, Status: ${o.deliveryStatus}, Payment: ${o.paymentStatus}`);
        });

        // Find notifications where type is ecommerce_order or related
        const notifs = await Notification.find({ 
            $or: [
                { type: /ecommerce/ },
                { title: /Store/ },
                { message: /Store/ }
            ]
        }).sort({ createdAt: -1 });
        console.log("\nEcommerce notifications found:", notifs.length);
        console.log(JSON.stringify(notifs, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

run();
