const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB!");
        
        const vendorId = '6a43970c605fe37d2b26cd9e';
        const txns = await Transaction.find({ vendorId }).sort({ createdAt: -1 });
        console.log(`Found ${txns.length} transactions for vendor ${vendorId}:`);
        txns.forEach(t => {
            console.log(`Type: ${t.type}, Amount: ${t.amount}, Status: ${t.status}, Description: ${t.description}, Date: ${t.createdAt}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

run();
