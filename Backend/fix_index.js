require('dotenv').config({ path: 'd:\\companyfolder\\Agroyilt\\Backend\\.env' });
const mongoose = require('mongoose');

async function fixIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    const Vendor = require('d:\\companyfolder\\Agroyilt\\Backend\\models\\Vendor');
    
    console.log('Dropping email_1 index...');
    try {
      await Vendor.collection.dropIndex('email_1');
      console.log('Successfully dropped email_1 index.');
    } catch (err) {
      console.log('Index might not exist or already dropped:', err.message);
    }
    
    console.log('Re-syncing indexes...');
    await Vendor.syncIndexes();
    console.log('Indexes synced successfully.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixIndex();
