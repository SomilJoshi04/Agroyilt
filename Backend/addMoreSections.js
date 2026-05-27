require('dotenv').config();
const mongoose = require('mongoose');

const HomeContent = require('./models/HomeContent');

const tractorUrl = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1779866157/categories/c3yuv8ib70htqis5jdi5.jpg';
const droneUrl = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1779866201/categories/vn7egawqjnoltfwzmzbk.jpg';
const rotavatorUrl = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1779866633/categories/zdf9zrntjaiamybj3234.jpg';
const jcbUrl = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1779096342/categories/rwiby1x4nq8y4nc1whsk.jpg';
const harvesterUrl = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1775211866/categories/ieepa6x7hkbtuxsyi4q7.jpg';
const oldTractorUrl = 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1778237602/categories/nblp3wdyjiatepfhpnmc.jpg';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('MongoDB Connected');

    let content = await HomeContent.findOne({ cityId: null });
    if (!content) {
      console.log('No default home content found.');
      process.exit(1);
    }

    // Keep existing sections (Popular Tractors & Drones, Harvesters & Thrashers)
    // Add new sections:

    const newSections = [
      {
        title: 'Soil Preparation & Tillage',
        order: 3,
        cards: [
          { title: 'Heavy Duty Rotavator 9ft', imageUrl: rotavatorUrl, price: '₹400', originalPrice: '₹500', discount: '20% OFF', rating: '4.8', reviews: '1.2k+' },
          { title: 'Cultivator 11 Tine', imageUrl: oldTractorUrl, price: '₹350', originalPrice: '₹400', discount: '12% OFF', rating: '4.5', reviews: '800+' },
          { title: 'Hydraulic Reversible Plough', imageUrl: rotavatorUrl, price: '₹500', originalPrice: '₹600', discount: '16% OFF', rating: '4.9', reviews: '400+' }
        ]
      },
      {
        title: 'Heavy Earth Moving',
        order: 4,
        cards: [
          { title: 'JCB 3DX Super', imageUrl: jcbUrl, price: '₹900', originalPrice: '₹1200', discount: '25% OFF', rating: '4.9', reviews: '2k+' },
          { title: 'Excavator 14 Ton', imageUrl: jcbUrl, price: '₹1500', originalPrice: '₹1800', discount: '16% OFF', rating: '4.8', reviews: '900+' }
        ]
      },
      {
        title: 'Spraying & Crop Protection',
        order: 5,
        cards: [
          { title: 'Agras T40 Drone', imageUrl: droneUrl, price: '₹1500', originalPrice: '₹2000', discount: '25% OFF', rating: '5.0', reviews: '3k+' },
          { title: 'Tractor Mounted Sprayer', imageUrl: tractorUrl, price: '₹600', originalPrice: '₹750', discount: '20% OFF', rating: '4.6', reviews: '600+' }
        ]
      },
      {
        title: 'Smart Farming Bundles',
        order: 6,
        cards: [
          { title: 'Tractor + Rotavator', imageUrl: rotavatorUrl, price: '₹1100', originalPrice: '₹1400', discount: '21% OFF', rating: '4.8', reviews: '5k+' },
          { title: 'Harvester + Trolley', imageUrl: harvesterUrl, price: '₹2300', originalPrice: '₹2800', discount: '18% OFF', rating: '4.7', reviews: '2.5k+' }
        ]
      }
    ];

    // Filter out duplicates if they already exist
    const existingTitles = content.categorySections.map(s => s.title);
    newSections.forEach(ns => {
        if (!existingTitles.includes(ns.title)) {
            content.categorySections.push(ns);
        }
    });

    content.markModified('categorySections');
    await content.save();
    
    console.log('Successfully added more category sections!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
