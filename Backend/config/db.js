const mongoose = require('mongoose');

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Drop problematic email_1 index to fix duplicate null key error
    try {
      await conn.connection.db.collection('vendors').dropIndex('email_1');
      console.log('Successfully dropped email_1 index from vendors collection.');
    } catch (err) {
      // It's okay if it fails (e.g. index doesn't exist)
    }

  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

