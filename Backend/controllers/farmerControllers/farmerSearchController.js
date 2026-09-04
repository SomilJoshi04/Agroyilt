const VendorEquipment = require('../../models/VendorEquipment');
const Vendor = require('../../models/Vendor');
const mongoose = require('mongoose');

const farmerSearchController = {
  // Search Machinery (Geo-indexed, filtered)
  searchMachinery: async (req, res) => {
    try {
      const { 
        category, 
        lat, 
        lng, 
        radius = 50, // default 50km
        priceMin, 
        priceMax, 
        ratingMin,
        page = 1,
        limit = 20
      } = req.query;

      // Ensure we only query equipment from VERIFIED and ACTIVE vendors
      let activeVerifiedVendors = [];
      let distanceMap = {};

      if (lat && lng) {
        // Query vendors using their 2dsphere index (geoLocation)
        activeVerifiedVendors = await Vendor.aggregate([
          {
            $geoNear: {
              near: {
                type: 'Point',
                coordinates: [Number(lng), Number(lat)]
              },
              distanceField: 'distance',
              maxDistance: Number(radius) * 1000,
              spherical: true,
              query: {
                'approvalStatus': { $in: ['approved', 'verified'] },
                'isActive': true
              }
            }
          },
          {
            $project: { _id: 1, distance: 1 }
          }
        ]);
        
        // Map vendorId to distance for later
        activeVerifiedVendors.forEach(v => {
          distanceMap[v._id.toString()] = v.distance;
        });
      } else {
        activeVerifiedVendors = await Vendor.find({
          'approvalStatus': { $in: ['approved', 'verified'] },
          'isActive': true
        }).select('_id');
      }
      
      const vendorIds = activeVerifiedVendors.map(v => v._id);

      let matchQuery = {
        vendorId: { $in: vendorIds },
        status: { $in: ['active', 'approved'] }
      };

      if (category) {
        matchQuery.categoryId = new mongoose.Types.ObjectId(category);
      }
      
      // Price filters based on basePrice or hourly pricing if we want. 
      if (priceMin || priceMax) {
        matchQuery['pricing.hourly.price'] = {};
        if (priceMin) matchQuery['pricing.hourly.price'].$gte = Number(priceMin);
        if (priceMax) matchQuery['pricing.hourly.price'].$lte = Number(priceMax);
      }

      const aggregatePipeline = [];
      aggregatePipeline.push({ $match: matchQuery });

      // 2. Lookup Vendor info (to get rating)
      aggregatePipeline.push({
        $lookup: {
          from: 'vendors',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendorInfo'
        }
      });
      aggregatePipeline.push({ $unwind: '$vendorInfo' });

      // 3. Filter by Vendor Rating if provided
      if (ratingMin) {
        aggregatePipeline.push({
          $match: {
            'vendorInfo.rating': { $gte: Number(ratingMin) }
          }
        });
      }

      // 4. Project required fields (DO NOT expose raw phone number)
      aggregatePipeline.push({
        $project: {
          _id: 1,
          name: 1,
          images: 1,
          brand: 1,
          model: 1,
          pricing: 1,
          distance: 1,
          specifications: 1,
          vendor: {
            _id: '$vendorInfo._id',
            name: '$vendorInfo.name',
            businessName: '$vendorInfo.businessName',
            rating: '$vendorInfo.rating',
            totalJobs: '$vendorInfo.totalJobs'
          },
          implements: 1
        }
      });

      // 4.5. Populate sub-category titles for implements
      aggregatePipeline.push({
        $lookup: {
          from: 'categories',
          localField: 'implements.subCategoryId',
          foreignField: '_id',
          as: 'implementDetails'
        }
      });

      // Map implementDetails into implements array
      aggregatePipeline.push({
        $addFields: {
          implements: {
            $map: {
              input: '$implements',
              as: 'impl',
              in: {
                $mergeObjects: [
                  '$$impl',
                  {
                    subCategory: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$implementDetails',
                            as: 'detail',
                            cond: { $eq: ['$$detail._id', '$$impl.subCategoryId'] }
                          }
                        },
                        0
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      });
      // Remove the raw lookup array
      aggregatePipeline.push({
        $project: {
          implementDetails: 0
        }
      });

      // 5. Pagination
      const skip = (Number(page) - 1) * Number(limit);
      aggregatePipeline.push({ $skip: skip });
      aggregatePipeline.push({ $limit: Number(limit) });

      let results = await VendorEquipment.aggregate(aggregatePipeline);
      
      // Attach computed distances from the vendor lookup map
      if (lat && lng) {
        results = results.map(eq => ({
          ...eq,
          distance: distanceMap[eq.vendor._id.toString()] || 0
        }));
        // Sort by distance ascending
        results.sort((a, b) => a.distance - b.distance);
      }
      
      // Count total (simplified, you might want a separate aggregation for count without skip/limit)
      const totalCount = await VendorEquipment.countDocuments(matchQuery); // Note: ignores geo/rating filters for count for simplicity, in prod use facet

      res.status(200).json({
        success: true,
        data: results,
        pagination: {
          total: totalCount,
          page: Number(page),
          pages: Math.ceil(totalCount / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error searching machinery:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // Get Machinery Details
  getMachineryDetails: async (req, res) => {
    try {
      const equipmentId = req.params.id;
      
      const equipment = await VendorEquipment.findById(equipmentId)
        .populate({
          path: 'vendorId',
          select: 'name businessName rating totalJobs profilePhoto location' // NO phone/email
        })
        .populate('categoryId', 'name icon');

      if (!equipment) {
        return res.status(404).json({ success: false, message: 'Equipment not found' });
      }

      if (equipment.vendorId.approvalStatus !== 'verified') {
        return res.status(403).json({ success: false, message: 'Equipment unavailable' });
      }

      res.status(200).json({ success: true, data: equipment });
    } catch (error) {
      console.error('Error fetching machinery details:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
};

module.exports = farmerSearchController;
