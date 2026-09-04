const mongoose = require('mongoose');
const URI = 'mongodb+srv://agroyilt_db_user:agroyilt_db_user@cluster0.zbhhozr.mongodb.net/groo';

async function checkBooking() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(URI);
        console.log('Connected!');

        // Define schemas inline to avoid path issues
        const CategorySchema = new mongoose.Schema({
            title: String,
            requiresDriver: Boolean,
            slug: String
        }, { strict: false });
        const Category = mongoose.model('Category', CategorySchema);

        const BookingSchema = new mongoose.Schema({
            bookingNumber: String,
            status: String,
            serviceCategory: String,
            driver_start_otp: String,
            requiresDriver: Boolean,
            categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }
        }, { strict: false });
        const Booking = mongoose.model('Booking', BookingSchema);

        const bookingNumber = 'BK177556444034T7Y6D';
        const booking = await Booking.findOne({ bookingNumber }).populate('categoryId');

        if (!booking) {
            console.log('Booking NOT found:', bookingNumber);
            // Search all bookings briefly
            const latest = await Booking.find().sort({createdAt: -1}).limit(5);
            console.log('Latest 5 bookings in DB:', latest.map(b => b.bookingNumber));
            return;
        }

        console.log('\n--- DATA FOR', bookingNumber, '---');
        console.log('Status:', booking.status);
        console.log('ServiceCategory:', booking.serviceCategory);
        console.log('DriverStartOTP:', booking.driver_start_otp || 'NULL/EMPTY');
        
        if (booking.categoryId) {
            console.log('Category Title:', booking.categoryId.title);
            console.log('Category RequiresDriver:', booking.categoryId.requiresDriver);
        } else {
            console.log('Category object missing.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkBooking();
