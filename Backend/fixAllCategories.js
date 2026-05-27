require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const newJcbImagePath = "C:\\Users\\Abhishek\\.gemini\\antigravity\\brain\\8aed1461-d183-43c2-9133-9d9c3c14cd83\\jcb_excavator_1779867241708.png";

const tractorUrl = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1779866157/categories/c3yuv8ib70htqis5jdi5.jpg';
const droneUrl = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1779866201/categories/vn7egawqjnoltfwzmzbk.jpg';
const rotavatorUrl = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1779866633/categories/zdf9zrntjaiamybj3234.jpg';
const harvesterUrl = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1775211866/categories/ieepa6x7hkbtuxsyi4q7.jpg';
const badJcbUrl = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1779096342/categories/rwiby1x4nq8y4nc1whsk.jpg';

const Category = require('./models/Category');
const HomeContent = require('./models/HomeContent');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('MongoDB Connected');

    console.log('Uploading New JCB Image to Cloudinary...');
    const jcbRes = await cloudinary.uploader.upload(newJcbImagePath, { folder: 'categories' });
    const newJcbUrl = jcbRes.secure_url;
    console.log('New JCB uploaded:', newJcbUrl);

    // FIX CATEGORY COLLECTION
    console.log('Fixing Categories...');
    await Category.updateMany({ title: { $in: ['Tractors', 'tractor', 'Tractor', 'tractormain'] } }, { homeIconUrl: tractorUrl });
    await Category.updateMany({ title: { $in: ['Harvestor', 'harvestor3', 'harvester service', 'harvestornew'] } }, { homeIconUrl: harvesterUrl });
    await Category.updateMany({ title: { $in: ['Rotavator11', 'rotavator', 'rotavator1'] } }, { homeIconUrl: rotavatorUrl });
    await Category.updateMany({ title: 'JCB' }, { homeIconUrl: newJcbUrl });
    
    // Check if there are missing image URLs as well in Category
    await Category.updateMany({ title: { $in: ['Tractors', 'tractor', 'Tractor', 'tractormain'] } }, { imageUrl: tractorUrl });
    await Category.updateMany({ title: { $in: ['Harvestor', 'harvestor3', 'harvester service', 'harvestornew'] } }, { imageUrl: harvesterUrl });
    await Category.updateMany({ title: { $in: ['Rotavator11', 'rotavator', 'rotavator1'] } }, { imageUrl: rotavatorUrl });
    await Category.updateMany({ title: 'JCB' }, { imageUrl: newJcbUrl });

    // FIX HOME CONTENT
    let content = await HomeContent.findOne({ cityId: null });
    if (content) {
      const replaceUrl = (items) => {
        if (!items) return;
        items.forEach(item => {
          if (item.imageUrl === badJcbUrl) item.imageUrl = newJcbUrl;
          if (item.gifUrl === badJcbUrl) item.gifUrl = newJcbUrl;
          
          if (item.cards && Array.isArray(item.cards)) {
              item.cards.forEach(card => {
                  if (card.imageUrl === badJcbUrl) card.imageUrl = newJcbUrl;
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
    }

    console.log('Successfully fixed all categories and HomeContent!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
