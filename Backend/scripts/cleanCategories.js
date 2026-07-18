const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Category = require('../models/Category');

dotenv.config();

const clean = async () => {
  try {
    await connectDB();
    console.log('Connected to DB.');

    const subcategoryNames = [
      'Tractor with Implements',
      'Harvesting',
      'Earth Moving Equipment',
      'Lifting Equipment',
      'Transport Vehicles',
      'Construction Equipment',
      'Water Supply',
      'Drilling',
      'Crop Spraying',
      'Soil Analysis',
      'Seeds',
      'Fertilizers'
    ];

    // Find all duplicate categories with these names
    for (const name of subcategoryNames) {
      const docs = await Category.find({ title: name });
      if (docs.length > 1) {
        console.log(`Found ${docs.length} categories with title "${name}":`);
        for (const doc of docs) {
          const hasImage = doc.homeIconUrl && doc.homeIconUrl.startsWith('http');
          if (!hasImage) {
            console.log(`  🗑️ Deleting duplicate Category (ID: ${doc._id}, no image)`);
            await Category.findByIdAndDelete(doc._id);
          } else {
            console.log(`  ✅ Keeping Category (ID: ${doc._id}, with image: ${doc.homeIconUrl})`);
          }
        }
      } else if (docs.length === 1) {
        // If there is only one, ensure its homeIconUrl and imageUrl are set
        const doc = docs[0];
        const hasImage = doc.homeIconUrl && doc.homeIconUrl.startsWith('http');
        if (!hasImage) {
          console.log(`  ⚠️ Category "${name}" has no image. Setting default icon...`);
          // We can set default fallback image based on name
          let defaultIcon = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278224/Homster/HomeContent/premium-offerings/rotavator.jpg';
          if (name.includes('Harvester') || name.includes('Harvesting')) defaultIcon = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278226/Homster/HomeContent/premium-offerings/harvester.jpg';
          else if (name.includes('Drilling') || name.includes('Water')) defaultIcon = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278227/Homster/HomeContent/premium-offerings/borewell.jpg';
          else if (name.includes('Spraying')) defaultIcon = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278638/Homster/HomeContent/premium-offerings/dron-spraying.jpg';
          else if (name.includes('Soil')) defaultIcon = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278229/Homster/HomeContent/premium-offerings/soil-testing2.jpg';
          else if (name.includes('Seed') || name.includes('Fertilizer')) defaultIcon = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278228/Homster/HomeContent/premium-offerings/fertilizer-seeds.jpg';

          doc.homeIconUrl = defaultIcon;
          doc.imageUrl = defaultIcon;
          await doc.save();
          console.log(`    Updated Category "${name}" with default icon.`);
        }
      }
    }

    console.log('\n🌟 Categories cleaned up successfully!');
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

clean();
