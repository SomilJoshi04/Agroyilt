const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

console.log('--- SCRIPT START ---');

const envPath = path.join(__dirname, '../.env');
console.log('Checking .env at:', envPath);
if (fs.existsSync(envPath)) {
    console.log('.env file found.');
    require('dotenv').config({ path: envPath });
} else {
    console.log('.env file NOT found. Using default URI.');
}

const dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/agroyilt';
console.log('Connecting to URI:', dbUri.replace(/:([^:@]+)@/, ':****@')); // Hide password

const Booking = require('../models/Booking');
const Category = require('../models/Category');

const fixMissingOtps = async () => {
    try {
        console.log('Attempting DB connection...');
        await mongoose.connect(dbUri);
        console.log('Connected to MongoDB successfully!');

        const BOOKING_STATUS = {
            CONFIRMED: 'CONFIRMED',
            ACCEPTED: 'ACCEPTED',
            ASSIGNED: 'ASSIGNED'
        };

        const bookings = await Booking.find({
            status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.ASSIGNED] },
            driver_start_otp: { $exists: false }
        });

        console.log(`Scanning ${bookings.length} bookings for standalone machinery...`);

        let count = 0;
        for (const booking of bookings) {
            const cat = await Category.findById(booking.categoryId);
            
            let shouldFix = false;
            if (cat) {
                const title = (cat.title || '').toLowerCase();
                const serviceCat = (booking.serviceCategory || '').toLowerCase();
                
                if (cat.requiresDriver === false || 
                    title.includes('machinery') || title.includes('equipment') || 
                    serviceCat.includes('agriculture')) {
                    shouldFix = true;
                }
            } else {
                const serviceCat = (booking.serviceCategory || '').toLowerCase();
                if (serviceCat.includes('agriculture') || serviceCat.includes('machinery')) {
                    shouldFix = true;
                }
            }

            if (shouldFix) {
                const otp = Math.floor(1000 + Math.random() * 9000).toString();
                booking.driver_start_otp = otp;
                await booking.save();
                console.log(`Fixed Booking ${booking.bookingNumber || booking._id} -> OTP: ${otp}`);
                count++;
            }
        }

        console.log(`\nDONE: Fixed ${count} bookings.`);
        process.exit(0);
    } catch (error) {
        console.error('CRITICAL ERROR:', error);
        process.exit(1);
    }
};

fixMissingOtps();
