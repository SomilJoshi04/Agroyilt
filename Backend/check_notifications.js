const mongoose = require('mongoose');
const Notification = require('./models/Notification');
require('dotenv').config();

async function run() {
    try {
        console.log("Connecting to:", process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected!");
        
        const notifications = await Notification.find().sort({ createdAt: -1 }).limit(10);
        console.log("Latest 10 notifications:");
        console.log(JSON.stringify(notifications, null, 2));

        const total = await Notification.countDocuments();
        console.log("Total notifications count:", total);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

run();
