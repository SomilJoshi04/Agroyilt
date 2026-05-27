require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const newRotavatorImagePath = "C:\\Users\\Abhishek\\.gemini\\antigravity\\brain\\8aed1461-d183-43c2-9133-9d9c3c14cd83\\rotavator_equipment_1779866506818.png";
const badRotavatorUrl = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1775285448/categories/z9ynsuhhk3e8te8pb3er.jpg';

const HomeContent = require('./models/HomeContent');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('MongoDB Connected');

    console.log('Uploading New Rotavator Image to Cloudinary...');
    const rotavatorRes = await cloudinary.uploader.upload(newRotavatorImagePath, { folder: 'categories' });
    const newRotavatorUrl = rotavatorRes.secure_url;
    console.log('New Rotavator uploaded:', newRotavatorUrl);

    let content = await HomeContent.findOne({ cityId: null });
    if (!content) {
      console.log('No default home content found.');
      process.exit(1);
    }

    // Function to replace bad URL with new URL in arrays
    const replaceUrl = (items) => {
      if (!items) return;
      items.forEach(item => {
        if (item.imageUrl === badRotavatorUrl) item.imageUrl = newRotavatorUrl;
        if (item.gifUrl === badRotavatorUrl) item.gifUrl = newRotavatorUrl;
        
        // Handle nested cards in categorySections
        if (item.cards && Array.isArray(item.cards)) {
            item.cards.forEach(card => {
                if (card.imageUrl === badRotavatorUrl) card.imageUrl = newRotavatorUrl;
            });
        }
      });
    };

    replaceUrl(content.banners);
    replaceUrl(content.promos);
    replaceUrl(content.curated);
    replaceUrl(content.noteworthy);
    replaceUrl(content.booked);
    replaceUrl(content.categorySections);

    content.markModified('banners');
    content.markModified('promos');
    content.markModified('curated');
    content.markModified('noteworthy');
    content.markModified('booked');
    content.markModified('categorySections');

    await content.save();
    console.log('Successfully replaced bad rotavator images with new relevant image!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
