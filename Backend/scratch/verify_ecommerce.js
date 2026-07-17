const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function testModels() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grooagri');
        console.log('✅ DB Connected.');

        // Load models
        const Product = require('../models/Product');
        const EcommerceOrder = require('../models/EcommerceOrder');
        const EcommerceCart = require('../models/EcommerceCart');
        const Vendor = require('../models/Vendor');
        const User = require('../models/User');
        const Transaction = require('../models/Transaction');

        console.log('✅ All e-commerce models loaded successfully.');
        
        console.log('Checking collections counts...');
        const productsCount = await Product.countDocuments();
        const ordersCount = await EcommerceOrder.countDocuments();
        const cartsCount = await EcommerceCart.countDocuments();
        console.log(`Products: ${productsCount}, Orders: ${ordersCount}, Carts: ${cartsCount}`);

        await mongoose.connection.close();
        console.log('DB Connection closed.');
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

testModels();
