require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const tractorImagePath = "C:\\Users\\Abhishek\\.gemini\\antigravity\\brain\\8aed1461-d183-43c2-9133-9d9c3c14cd83\\tractor_farm_1779865964933.png";
const droneImagePath = "C:\\Users\\Abhishek\\.gemini\\antigravity\\brain\\8aed1461-d183-43c2-9133-9d9c3c14cd83\\drone_sprayer_1779866059566.png";

// Load the schema
const HomeContent = require('./models/HomeContent');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('MongoDB Connected');

    console.log('Uploading Tractor Image to Cloudinary...');
    const tractorRes = await cloudinary.uploader.upload(tractorImagePath, { folder: 'categories' });
    console.log('Tractor uploaded:', tractorRes.secure_url);

    console.log('Uploading Drone Image to Cloudinary...');
    const droneRes = await cloudinary.uploader.upload(droneImagePath, { folder: 'categories' });
    console.log('Drone uploaded:', droneRes.secure_url);

    const tractorUrl = tractorRes.secure_url;
    const droneUrl = droneRes.secure_url;

    // existing images
    const jcbUrl = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1779096342/categories/rwiby1x4nq8y4nc1whsk.jpg';
    const rotavatorUrl = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1775285448/categories/z9ynsuhhk3e8te8pb3er.jpg';
    const harvesterUrl = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1775211866/categories/ieepa6x7hkbtuxsyi4q7.jpg';
    const oldTractorUrl = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1778237602/categories/nblp3wdyjiatepfhpnmc.jpg';

    let content = await HomeContent.findOne({ cityId: null });
    if (!content) {
      content = new HomeContent({ cityId: null });
    }

    // EXPAND BANNERS
    content.banners = [
      { imageUrl: tractorUrl, text: 'Rent Modern Tractors Instantly', order: 1 },
      { imageUrl: droneUrl, text: 'High-Tech Agricultural Drones', order: 2 },
      { imageUrl: harvesterUrl, text: 'Top Quality Harvesters Available', order: 3 },
      { imageUrl: jcbUrl, text: 'Heavy Duty Equipment', order: 4 },
      { imageUrl: rotavatorUrl, text: 'Prepare Your Soil Faster', order: 5 }
    ];

    // EXPAND PROMOS
    content.promos = [
      { title: 'Special 10% Off', subtitle: 'On all John Deere Tractors this week!', buttonText: 'Book Now', gradientClass: 'from-blue-600 to-blue-800', imageUrl: tractorUrl, order: 1 },
      { title: 'Drone Spraying', subtitle: 'Save 20% on pesticide spraying', buttonText: 'Learn More', gradientClass: 'from-purple-600 to-purple-800', imageUrl: droneUrl, order: 2 },
      { title: 'Monsoon Offer', subtitle: 'Flat ₹500 discount on Seed Drills', buttonText: 'Explore', gradientClass: 'from-green-600 to-green-800', imageUrl: rotavatorUrl, order: 3 },
      { title: 'Combo Deals', subtitle: 'Tractor + Rotavator starting @ ₹1200/hr', buttonText: 'View Deals', gradientClass: 'from-orange-500 to-red-600', imageUrl: harvesterUrl, order: 4 },
      { title: 'Heavy Duty', subtitle: 'JCB Backhoe Loaders available now', buttonText: 'Rent Now', gradientClass: 'from-yellow-500 to-yellow-700', imageUrl: jcbUrl, order: 5 }
    ];

    // EXPAND CURATED
    content.curated = [
      { title: 'Tractors for Ploughing', gifUrl: tractorUrl, order: 1 },
      { title: 'Drone Spraying Services', gifUrl: droneUrl, order: 2 },
      { title: 'Harvesting Essentials', gifUrl: harvesterUrl, order: 3 },
      { title: 'Pesticide Sprayers', gifUrl: rotavatorUrl, order: 4 },
      { title: 'Irrigation Pumps', gifUrl: jcbUrl, order: 5 },
      { title: 'Post Harvest Tools', gifUrl: oldTractorUrl, order: 6 }
    ];

    // EXPAND NOTEWORTHY
    content.noteworthy = [
      { title: 'Mahindra Novo 605', imageUrl: tractorUrl, order: 1 },
      { title: 'Agri Drone V2', imageUrl: droneUrl, order: 2 },
      { title: 'JCB Backhoe Loader', imageUrl: jcbUrl, order: 3 },
      { title: 'Kubota Harvester', imageUrl: harvesterUrl, order: 4 },
      { title: 'Rotavator 9 ft', imageUrl: rotavatorUrl, order: 5 }
    ];

    // EXPAND BOOKED
    content.booked = [
      { title: 'Mahindra 475 DI', rating: '4.8', reviews: '2k+', price: '₹700', originalPrice: '₹800', discount: '12% OFF', imageUrl: tractorUrl, order: 1 },
      { title: 'DJI Agras Drone', rating: '4.9', reviews: '5k+', price: '₹1500', originalPrice: '₹2000', discount: '25% OFF', imageUrl: droneUrl, order: 2 },
      { title: 'Swaraj 744 FE', rating: '4.9', reviews: '1.5k+', price: '₹750', originalPrice: '₹900', discount: '16% OFF', imageUrl: oldTractorUrl, order: 3 },
      { title: 'Cultivator 9 Tine', rating: '4.7', reviews: '500+', price: '₹300', originalPrice: '₹400', discount: '25% OFF', imageUrl: harvesterUrl, order: 4 }
    ];

    // EXPAND CATEGORY SECTIONS
    content.categorySections = [
      {
        title: 'Popular Tractors & Drones',
        order: 1,
        cards: [
          { title: 'John Deere 5310', imageUrl: tractorUrl, price: '₹800', originalPrice: '₹1000', discount: '20% OFF', rating: '4.9', reviews: '800+' },
          { title: 'Agras Drone Sprayer', imageUrl: droneUrl, price: '₹1200', originalPrice: '₹1500', discount: '20% OFF', rating: '5.0', reviews: '200+' },
          { title: 'Eicher 380', imageUrl: oldTractorUrl, price: '₹600', originalPrice: '₹700', discount: '14% OFF', rating: '4.6', reviews: '300+' }
        ]
      },
      {
        title: 'Harvesters & Thrashers',
        order: 2,
        cards: [
          { title: 'Kartar 4000', imageUrl: harvesterUrl, price: '₹2000', originalPrice: '₹2500', discount: '20% OFF', rating: '4.8', reviews: '1k+' },
          { title: 'Preet 987', imageUrl: jcbUrl, price: '₹1800', originalPrice: '₹2200', discount: '18% OFF', rating: '4.7', reviews: '500+' }
        ]
      }
    ];

    await content.save();
    console.log('Successfully expanded Default HomeContent with AI generated images!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
