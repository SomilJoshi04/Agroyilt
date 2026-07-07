const mongoose = require('mongoose');
const { createNotification } = require('./controllers/notificationControllers/notificationController');
const Notification = require('./models/Notification');
require('dotenv').config();

async function run() {
    try {
        console.log("Connecting to:", process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected!");

        const notif = await createNotification({
            recipientId: '6a43970c605fe37d2b26cd9e',
            recipientModel: 'Vendor',
            title: 'Test COD Store Order notification!',
            message: `You received a COD order for Leafy plant. Please pack it for shipping.`,
            type: 'ecommerce_order',
            metadata: { orderId: '6a4cbe4d1bd532e5f5cc33b0' }
        });

        console.log("Result of createNotification:", notif);

        // Fetch it from DB
        if (notif) {
            const found = await Notification.findById(notif._id);
            console.log("Verification from DB:", found);
        } else {
            console.log("FAILED to create notification");
        }

    } catch (err) {
        console.error("Error running test:", err);
    } finally {
        await mongoose.connection.close();
        console.log("Connection closed.");
    }
}

run();
