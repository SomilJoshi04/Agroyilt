const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Vendor = require('../models/Vendor');
const VendorEquipment = require('../models/VendorEquipment');
const City = require('../models/City');

const run = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/grooagri';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected.');

    // 1. Get all cities
    const cities = await City.find({ isActive: true });
    console.log(`Loaded ${cities.length} active cities from DB.`);

    // Helper to find a city matching by name or slug
    const findMatchingCity = (cityName) => {
      if (!cityName) return null;
      const cleanName = cityName.trim().toLowerCase();
      // Try exact name match
      let match = cities.find(c => c.name.toLowerCase() === cleanName);
      if (match) return match;
      // Try slug match
      const cleanSlug = cleanName.replace(/[^a-z0-9]/g, '');
      match = cities.find(c => c.slug.replace(/[^a-z0-9]/g, '') === cleanSlug);
      return match;
    };

    // 2. Fetch all vendors
    const vendors = await Vendor.find({});
    console.log(`Found ${vendors.length} vendors in DB. Migrating vendor cityIds...`);

    let vendorUpdateCount = 0;
    for (const vendor of vendors) {
      if (vendor.address && vendor.address.city) {
        const matchingCity = findMatchingCity(vendor.address.city);
        if (matchingCity) {
          vendor.address.cityId = matchingCity._id;
          vendor.cityId = matchingCity._id;
          await vendor.save();
          vendorUpdateCount++;
          console.log(`  Updated Vendor [${vendor.name}] -> City: ${matchingCity.name} (${matchingCity._id})`);
        } else {
          console.log(`  ⚠️ No matching city found in system for Vendor [${vendor.name}] with city name "${vendor.address.city}"`);
        }
      }
    }
    console.log(`✅ Migrated ${vendorUpdateCount} out of ${vendors.length} vendors.`);

    // 3. Fetch all equipment listings
    const listings = await VendorEquipment.find({});
    console.log(`Found ${listings.length} equipment listings in DB. Migrating equipment cityIds...`);

    let listingUpdateCount = 0;
    for (const listing of listings) {
      const vendor = vendors.find(v => v._id.toString() === listing.vendorId.toString());
      if (vendor && vendor.cityId) {
        listing.cityIds = [vendor.cityId];
        await listing.save();
        listingUpdateCount++;
        console.log(`  Updated Equipment [${listing.name}] -> cityIds: [${vendor.cityId}]`);
      } else {
        console.log(`  ⚠️ Could not migrate Equipment [${listing.name}] (Vendor not found or has no cityId).`);
      }
    }
    console.log(`✅ Migrated ${listingUpdateCount} out of ${listings.length} equipment listings.`);

  } catch (err) {
    console.error('❌ Error during migration:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed.');
  }
};

run();
