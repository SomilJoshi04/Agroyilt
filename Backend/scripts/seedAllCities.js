const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import Models
const City = require('../models/City');
const Category = require('../models/Category');
const Service = require('../models/Service');
const HomeContent = require('../models/HomeContent');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/appzeto';
    await mongoose.connect(uri);
    console.log('✅ MongoDB Connected...');
  } catch (err) {
    console.error('❌ Error connecting to MongoDB:', err.message);
    process.exit(1);
  }
};

const run = async () => {
  await connectDB();

  try {
    console.log('\n🌟 Starting Multi-City Seed Migration...');

    // 1. Fetch all cities
    const cities = await City.find({ isActive: true });
    console.log(`📌 Found ${cities.length} active cities in the database.`);

    if (cities.length === 0) {
      console.log('No active cities found. Exiting.');
      process.exit(0);
    }

    const cityIds = cities.map(city => city._id);

    // 2. Update Categories
    console.log('\n🔄 Syncing Categories across all cities...');
    // We add all active city IDs to every category
    const categoryResult = await Category.updateMany(
      {},
      { $addToSet: { cityIds: { $each: cityIds } } }
    );
    console.log(`✅ Updated ${categoryResult.modifiedCount} categories.`);

    // 3. Update Services
    console.log('\n🔄 Syncing Services across all cities...');
    const serviceResult = await Service.updateMany(
      {},
      { $addToSet: { cityIds: { $each: cityIds } } }
    );
    console.log(`✅ Updated ${serviceResult.modifiedCount} services.`);

    // 4. Clone HomeContent
    console.log('\n🔄 Syncing HomeContent...');
    
    // Attempt to find default or Indore city as source
    let sourceHomeContent = await HomeContent.findOne({ cityId: null }); // legacy default
    
    if (!sourceHomeContent) {
      // Find Indore or fallback to the first available content
      const indoreCity = await City.findOne({ slug: 'indore' });
      if (indoreCity) {
        sourceHomeContent = await HomeContent.findOne({ cityId: indoreCity._id });
      }
      if (!sourceHomeContent) {
        sourceHomeContent = await HomeContent.findOne();
      }
    }

    if (!sourceHomeContent) {
      console.log('❌ No source HomeContent found to clone! Please run default seed script first.');
    } else {
      console.log(`📌 Found source HomeContent (id: ${sourceHomeContent._id}). Cloning for other cities...`);
      
      let clonedCount = 0;
      for (const city of cities) {
        // Skip if source is already this city
        if (sourceHomeContent.cityId && sourceHomeContent.cityId.toString() === city._id.toString()) continue;

        const existingContent = await HomeContent.findOne({ cityId: city._id });
        if (!existingContent) {
          const contentData = sourceHomeContent.toObject();
          delete contentData._id;
          delete contentData.createdAt;
          delete contentData.updatedAt;
          contentData.cityId = city._id;

          await HomeContent.create(contentData);
          clonedCount++;
          console.log(`   ✔️ Cloned HomeContent for city: ${city.name}`);
        } else {
          console.log(`   ⏭️ City ${city.name} already has HomeContent. Skipping.`);
        }
      }
      console.log(`✅ Cloned HomeContent to ${clonedCount} new cities.`);
    }

    console.log('\n🎉 Multi-City Seed Migration Completed Successfully!');
  } catch (err) {
    console.error('❌ Migration Failed:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

run();
