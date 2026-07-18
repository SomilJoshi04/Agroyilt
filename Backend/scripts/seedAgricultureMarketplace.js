const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const City = require('../models/City');
const Category = require('../models/Category');
const Service = require('../models/Service');
const Product = require('../models/Product');

dotenv.config();

const seedData = [
  {
    sectionType: 'Farming Machinery',
    subcategories: [
      {
        name: 'Tractor with Cultivator',
        homeIconUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278224/Homster/HomeContent/premium-offerings/rotavator.jpg',
        services: [
          { name: 'Tractor with Cultivator', unit: 'hour', shortDescription: 'Tractor with cultivator implement for soil loosening', basePrice: 500 }
        ]
      },
      {
        name: 'Tractor with Rotavator',
        homeIconUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278224/Homster/HomeContent/premium-offerings/rotavator.jpg',
        services: [
          { name: 'Tractor with Rotavator', unit: 'hour', shortDescription: 'Tractor with rotavator implement for seedbed preparation', basePrice: 600 }
        ]
      },
      {
        name: 'Tractor with Trolley',
        homeIconUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278224/Homster/HomeContent/premium-offerings/rotavator.jpg',
        services: [
          { name: 'Tractor with Trolley', unit: 'trip', shortDescription: 'Tractor with trolley for crop and soil transport', basePrice: 1200 }
        ]
      },
      {
        name: 'Tractor with MB Plough',
        homeIconUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278224/Homster/HomeContent/premium-offerings/rotavator.jpg',
        services: [
          { name: 'Tractor with MB Plough', unit: 'hour', shortDescription: 'Tractor with mouldboard plough for deep tillage', basePrice: 700 }
        ]
      },
      {
        name: 'Tractor with Disc Harrow',
        homeIconUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278224/Homster/HomeContent/premium-offerings/rotavator.jpg',
        services: [
          { name: 'Tractor with Disc Harrow', unit: 'hour', shortDescription: 'Tractor with disc harrow for pulverizing soil clods', basePrice: 550 }
        ]
      },
      {
        name: 'Tractor with Seed Drill',
        homeIconUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278224/Homster/HomeContent/premium-offerings/rotavator.jpg',
        services: [
          { name: 'Tractor with Seed Drill', unit: 'acre', shortDescription: 'Tractor with seed drill for precision sowing', basePrice: 800 }
        ]
      }
    ]
  },
  {
    sectionType: 'Farming Equipment',
    subcategories: [
      {
        name: 'Harvesting',
        homeIconUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278226/Homster/HomeContent/premium-offerings/harvester.jpg',
        services: [
          { name: 'Combine Harvester', unit: 'acre', shortDescription: 'Multi-crop combine harvester for crop harvesting', basePrice: 2000 },
          { name: 'Paddy Thresher', unit: 'hour', shortDescription: 'Stationary paddy thresher machine', basePrice: 400 },
          { name: 'Maize Thresher', unit: 'hour', shortDescription: 'Stationary maize thresher machine', basePrice: 450 }
        ]
      }
    ]
  },
  {
    sectionType: 'Heavy Machinery',
    subcategories: [
      {
        name: 'Earth Moving Equipment',
        homeIconUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278226/Homster/HomeContent/premium-offerings/harvester.jpg',
        services: [
          { name: 'JCB', unit: 'hour', shortDescription: 'JCB backhoe loader for agricultural excavation', basePrice: 900 },
          { name: 'Loader', unit: 'hour', shortDescription: 'Front loader machine for material handling', basePrice: 800 },
          { name: 'Bulldozer', unit: 'hour', shortDescription: 'Bulldozer for farm levelling and clearing', basePrice: 1500 }
        ]
      },
      {
        name: 'Lifting Equipment',
        homeIconUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278226/Homster/HomeContent/premium-offerings/harvester.jpg',
        services: [
          { name: 'Crane', unit: 'hour', shortDescription: 'Mobile hydraulic crane service', basePrice: 1200 }
        ]
      },
      {
        name: 'Transport Vehicles',
        homeIconUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278230/Homster/HomeContent/premium-offerings/tracter.jpg',
        services: [
          { name: 'Dumper', unit: 'trip', shortDescription: 'Dumper truck for agricultural materials', basePrice: 1500 },
          { name: 'Pickup Vehicle', unit: 'trip', shortDescription: 'Pickup van transport service', basePrice: 800 },
          { name: 'Truck', unit: 'trip', shortDescription: 'Heavy truck transport', basePrice: 2500 }
        ]
      },
      {
        name: 'Construction Equipment',
        homeIconUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278224/Homster/HomeContent/premium-offerings/rotavator.jpg',
        services: [
          { name: 'Road Roller', unit: 'day', shortDescription: 'Road roller rental for path building', basePrice: 3500 },
          { name: 'Concrete Mixer', unit: 'day', shortDescription: 'Concrete mixer machine rental', basePrice: 1000 }
        ]
      },
      {
        name: 'Water Supply',
        homeIconUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278227/Homster/HomeContent/premium-offerings/borewell.jpg',
        services: [
          { name: 'Water Tanker', unit: 'trip', shortDescription: 'Clean water tanker supply', basePrice: 600 }
        ]
      }
    ]
  },
  {
    sectionType: 'Borewell',
    subcategories: [
      {
        name: 'Drilling',
        homeIconUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278227/Homster/HomeContent/premium-offerings/borewell.jpg',
        services: [
          { name: 'Borewell Drilling', unit: 'foot', shortDescription: 'Borewell drilling per foot service', basePrice: 80 }
        ]
      }
    ]
  },
  {
    sectionType: 'Drone Spraying',
    subcategories: [
      {
        name: 'Crop Spraying',
        homeIconUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278638/Homster/HomeContent/premium-offerings/dron-spraying.jpg',
        services: [
          { name: 'Fertilizer Spraying', unit: 'acre', shortDescription: 'Urea/DAP spraying via agricultural drones', basePrice: 350 },
          { name: 'Nano Urea Spraying', unit: 'acre', shortDescription: 'Liquid nano urea drone spraying', basePrice: 300 },
          { name: 'Pesticide Spraying', unit: 'acre', shortDescription: 'Pesticide drone spraying for crop protection', basePrice: 400 }
        ]
      }
    ]
  },
  {
    sectionType: 'Soil Testing',
    subcategories: [
      {
        name: 'Soil Analysis',
        homeIconUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278229/Homster/HomeContent/premium-offerings/soil-testing2.jpg',
        services: [
          { name: 'NPK Test', unit: 'sample', shortDescription: 'Nitrogen, Phosphorus, and Potassium soil test', basePrice: 150 },
          { name: '12 Mineral Soil Test', unit: 'sample', shortDescription: 'Government-standard 12-parameter soil testing', basePrice: 500 }
        ]
      }
    ]
  },
  {
    sectionType: 'Market',
    subcategories: [
      {
        name: 'Seeds',
        homeIconUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278228/Homster/HomeContent/premium-offerings/fertilizer-seeds.jpg',
        services: [
          { name: 'Paddy Seed', unit: 'kg', shortDescription: 'High yield paddy seeds', basePrice: 40 },
          { name: 'Wheat Seed', unit: 'kg', shortDescription: 'Premium wheat seeds', basePrice: 45 },
          { name: 'Hybrid Maize Seed', unit: 'kg', shortDescription: 'High performance hybrid maize seeds', basePrice: 120 },
          { name: 'Mustard Seed', unit: 'kg', shortDescription: 'Quality mustard seeds', basePrice: 80 },
          { name: 'Pulse Seed', unit: 'kg', shortDescription: 'Organic pulse seeds', basePrice: 90 },
          { name: 'Vegetable Seed Pack', unit: 'pack', shortDescription: 'Assorted kitchen garden vegetable seeds', basePrice: 150 }
        ]
      },
      {
        name: 'Fertilizers',
        homeIconUrl: 'https://res.cloudinary.com/dzb3z1pt1/image/upload/v1784278228/Homster/HomeContent/premium-offerings/fertilizer-seeds.jpg',
        services: [
          { name: 'Urea', unit: 'bag', shortDescription: 'Standard nitrogen fertilizer bag', basePrice: 300 },
          { name: 'DAP', unit: 'bag', shortDescription: 'Diammonium Phosphate fertilizer bag', basePrice: 1350 },
          { name: 'Potash', unit: 'bag', shortDescription: 'Muriate of Potash fertilizer bag', basePrice: 850 },
          { name: 'NPK 10:26:26', unit: 'bag', shortDescription: 'NPK complex fertilizer bag', basePrice: 1400 },
          { name: 'NPK 12:32:16', unit: 'bag', shortDescription: 'Balanced NPK fertilizer bag', basePrice: 1450 },
          { name: 'NPK 19:19:19', unit: 'bag', shortDescription: 'Water soluble NPK complex bag', basePrice: 150 },
          { name: 'Nano Urea', unit: 'bottle', shortDescription: 'Iffco Nano Urea Liquid Bottle', basePrice: 240 },
          { name: 'Nano DAP', unit: 'bottle', shortDescription: 'Iffco Nano DAP Liquid Bottle', basePrice: 600 }
        ]
      }
    ]
  }
];

const run = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Find Indore city
    const indoreCity = await City.findOne({ name: /indore/i });
    if (!indoreCity) {
      console.error('❌ Indore city not found in the database. Please add Indore first.');
      process.exit(1);
    }
    const indoreId = indoreCity._id;
    console.log(`🌍 Found Indore City: ${indoreCity.name} (${indoreId})\n`);

    // Clean up previously created Main Categories (no parent) to clean the Category list
    const mainCategoryTitles = ['Farming Equipment', 'Farming Machinery', 'Heavy Machinery', 'Borewell', 'Drone Spraying', 'Soil Testing', 'Market'];
    const deleteResult = await Category.deleteMany({
      title: { $in: mainCategoryTitles },
      parentCategory: null
    });
    console.log(`🧹 Cleaned up ${deleteResult.deletedCount} duplicate Main Categories from DB.\n`);

    for (const group of seedData) {
      console.log(`📂 Processing group with sectionType: "${group.sectionType}"`);

      // Loop through subcategories
      for (const sub of group.subcategories) {
        console.log(`  ├── Seeding Category: "${sub.name}" (linked to sectionType "${group.sectionType}")`);

        // Find or create Category for Indore (parentCategory is null/none, sectionType links it to the homepage tab)
        let subCategory = await Category.findOne({ title: sub.name, parentCategory: null });
        if (!subCategory) {
          subCategory = new Category({
            title: sub.name,
            slug: sub.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            sectionType: group.sectionType,
            homeIconUrl: sub.homeIconUrl,
            imageUrl: sub.homeIconUrl,
            parentCategory: null,
            parentCategories: [],
            cityIds: [indoreId],
            status: 'active',
            type: group.sectionType === 'Market' ? 'product' : 'service'
          });
        } else {
          // Update properties
          subCategory.sectionType = group.sectionType;
          subCategory.homeIconUrl = sub.homeIconUrl;
          subCategory.imageUrl = sub.homeIconUrl;
          subCategory.parentCategory = null;
          subCategory.parentCategories = [];
          if (!subCategory.cityIds.includes(indoreId)) {
            subCategory.cityIds.push(indoreId);
          }
        }
        await subCategory.save();

        // Loop through services
        for (const s of sub.services) {
          console.log(`  │   └── Service/Product: "${s.name}"`);
          const slug = `${s.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-indore`;

          // 1. Seed as Service Document
          let serviceDoc = await Service.findOne({ slug });
          if (!serviceDoc) {
            serviceDoc = new Service({
              title: s.name,
              slug,
              categoryId: subCategory._id,
              description: s.shortDescription,
              basePrice: s.basePrice,
              status: 'active'
            });
          } else {
            serviceDoc.categoryId = subCategory._id;
          }

          // Populate pricing units/fields
          if (s.unit === 'hour') {
            serviceDoc.rental_type = 'hourly';
            serviceDoc.hourly_price = s.basePrice;
          } else if (s.unit === 'acre' || s.unit === 'bigha') {
            serviceDoc.rental_type = 'land_based';
            serviceDoc.land_price = s.basePrice;
            serviceDoc.land_unit = s.unit;
          } else {
            serviceDoc.rental_type = 'monthly';
            serviceDoc.daily_price = s.basePrice;
          }
          await serviceDoc.save();

          // 2. If under 'Market', ALSO seed as Product Document for e-commerce
          if (group.sectionType === 'Market') {
            let productDoc = await Product.findOne({ slug });
            if (!productDoc) {
              productDoc = new Product({
                title: s.name,
                slug,
                categoryId: subCategory._id,
                description: s.shortDescription,
                price: s.basePrice,
                unit: s.unit,
                status: 'active',
                approvalStatus: 'approved',
                stock: 100
              });
            } else {
              productDoc.categoryId = subCategory._id;
              productDoc.price = s.basePrice;
              productDoc.unit = s.unit;
              productDoc.status = 'active';
              productDoc.approvalStatus = 'approved';
            }
            await productDoc.save();
          }
        }
      }
      console.log('');
    }

    console.log('🌟 Agriculture Service Marketplace seed data successfully updated for Indore City with icons!');
  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 DB Connection closed.');
    process.exit(0);
  }
};

run();
