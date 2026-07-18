const dotenv = require('dotenv');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const connectDB = require('../config/db');
const City = require('../models/City');
const Category = require('../models/Category');
const HomeContent = require('../models/HomeContent');
const { uploadFile } = require('../services/fileStorageService');

dotenv.config();

const uploadLocalImages = async () => {
  const imagesToUpload = [
    { key: 'rotavator', path: '../../Frontend/public/landing_images/rotavator.png' },
    { key: 'harvester', path: '../../Frontend/public/landing_images/harvester.jpg' },
    { key: 'borewell', path: '../../Frontend/public/landing_images/borewell.jpg' },
    { key: 'fertilizer_seeds', path: '../../Frontend/public/landing_images/fertilizer_seeds.jpg' },
    { key: 'soil_testing2', path: '../../Frontend/public/landing_images/soil_testing2.jpg' },
    { key: 'tracter', path: '../../Frontend/public/landing_images/tracter.jpg' },
    { key: 'dron_spraying', path: '../../Frontend/public/landing_images/dron_spraying.jpg' }
  ];

  const urls = {};

  console.log('📤 Uploading local assets to Cloudinary...');
  for (const img of imagesToUpload) {
    const absolutePath = path.join(__dirname, img.path);
    if (!fs.existsSync(absolutePath)) {
      console.error(`❌ Local image file not found: ${absolutePath}`);
      continue;
    }

    try {
      console.log(`    Uploading ${img.key}...`);
      const fileBuffer = fs.readFileSync(absolutePath);
      const result = await uploadFile(fileBuffer, {
        folder: 'Homster/HomeContent/premium-offerings',
        public_id: img.key
      });

      if (result.success) {
        urls[img.key] = result.url;
        console.log(`    ✅ Uploaded: ${result.url}`);
      } else {
        console.error(`    ❌ Failed to upload ${img.key}:`, result.error);
      }
    } catch (err) {
      console.error(`    ❌ Error uploading ${img.key}:`, err.message);
    }
  }

  return urls;
};

const seedPremiumOfferings = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // NOTE: Category sectionTypes are now set correctly during category seeding
    // (seedAgricultureMarketplace.js sets sectionType per category directly).
    // No hardcoded slug overrides needed here.

    // 2. Upload images to get their Cloudinary URLs
    const imageUrls = await uploadLocalImages();

    // Secure persistent Cloudinary URLs already uploaded in task-337 as defaults
    const rotavatorUrl = imageUrls.rotavator || 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278224/Homster/HomeContent/premium-offerings/rotavator.jpg';
    const harvesterUrl = imageUrls.harvester || 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278226/Homster/HomeContent/premium-offerings/harvester.jpg';
    const borewellUrl = imageUrls.borewell || 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278227/Homster/HomeContent/premium-offerings/borewell.jpg';
    const fertilizerSeedsUrl = imageUrls.fertilizer_seeds || 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278228/Homster/HomeContent/premium-offerings/fertilizer-seeds.jpg';
    const soilTestingUrl = imageUrls.soil_testing2 || 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278229/Homster/HomeContent/premium-offerings/soil-testing2.jpg';
    const tracterUrl = imageUrls.tracter || 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278230/Homster/HomeContent/premium-offerings/tracter.jpg';
    const dronSprayingUrl = imageUrls.dron_spraying || 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278638/Homster/HomeContent/premium-offerings/dron-spraying.jpg';

    // Define the premium offerings (tabs) requested by the user
    // Action types:
    // - Rental/Booking tabs use 'setActiveSectionTab' to open the bottom sheet categories/services dropdown
    // - Marketplace/Soil Testing use 'navigate' to route to dedicated pages
    const offerings = [
      {
        title: 'Farming Equipment',
        subtitle: 'Rotavator, Cultivator',
        imageUrl: rotavatorUrl,
        colorCode: '#2E7D32', // Green
        route: '',
        actionType: 'setActiveSectionTab',
        actionPayload: 'Farming Equipment',
        order: 1
      },
      {
        title: 'Heavy Machinery',
        subtitle: 'JCB, Harvester',
        imageUrl: harvesterUrl,
        colorCode: '#1565C0', // Blue
        route: '',
        actionType: 'setActiveSectionTab',
        actionPayload: 'Heavy Machinery',
        order: 2
      },
      {
        title: 'Borewell',
        subtitle: 'Hourly Machine',
        imageUrl: borewellUrl,
        colorCode: '#D84315', // Rust Orange
        route: '',
        actionType: 'setActiveSectionTab',
        actionPayload: 'Borewell',
        order: 3
      },
      {
        title: 'Market',
        subtitle: 'Agri Store',
        imageUrl: fertilizerSeedsUrl,
        colorCode: '#AD1457', // Pink/Rose
        route: '/user/agri-marketplace',
        actionType: 'navigate',
        actionPayload: '/user/agri-marketplace',
        order: 4
      },
      {
        title: 'Soil Testing',
        subtitle: 'Lab Reports',
        imageUrl: soilTestingUrl,
        colorCode: '#00838F', // Cyan/Teal
        route: '/user/soil-testing',
        actionType: 'navigate',
        actionPayload: '/user/soil-testing',
        order: 5
      },
      {
        title: 'Farming Machinery',
        subtitle: 'Tractor with Cultivator & Rotavator',
        imageUrl: tracterUrl,
        colorCode: '#6A1B9A', // Purple
        route: '',
        actionType: 'setActiveSectionTab',
        actionPayload: 'Farming Machinery',
        order: 6
      },
      {
        title: 'Drone Spraying',
        subtitle: 'Crop Spraying',
        imageUrl: dronSprayingUrl,
        colorCode: '#0288D1', // Sky Blue/Light Blue
        route: '',
        actionType: 'setActiveSectionTab',
        actionPayload: 'Drone Spraying',
        order: 7
      }
    ];

    // Get all cities in the database (active and inactive)
    const cities = await City.find();
    console.log(`🌍 Found ${cities.length} cities in the database.`);

    // 1. Seed for default/fallback (cityId = null)
    let defaultHomeContent = await HomeContent.findOne({ cityId: null });
    if (!defaultHomeContent) {
      defaultHomeContent = new HomeContent({ cityId: null });
    }
    defaultHomeContent.premiumOfferings = offerings;
    await defaultHomeContent.save();
    console.log('✅ Seeded premium offerings for default fallback (cityId = null).');

    // 2. Seed for each individual city
    for (const city of cities) {
      let homeContent = await HomeContent.findOne({ cityId: city._id });
      if (!homeContent) {
        homeContent = new HomeContent({ cityId: city._id });
      }
      homeContent.premiumOfferings = offerings;
      await homeContent.save();
      console.log(`✅ Seeded premium offerings for city: ${city.name} (${city._id})`);
    }

    console.log('\n🌟 All premium offerings seeded successfully for all cities with correct modal/navigation actions!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

seedPremiumOfferings();
