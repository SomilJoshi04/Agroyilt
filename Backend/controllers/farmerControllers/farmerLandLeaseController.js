const LandLease = require('../../models/LandLease');
const mongoose = require('mongoose');

const farmerLandLeaseController = {
  // List Land
  listLand: async (req, res) => {
    try {
      const { title, description, sizeInAcres, khasraNumber, location, leaseType, pricePerAcre, sharePercentage, availableFrom, availableTo, documents } = req.body;
      const ownerId = req.user.id;

      const landLease = new LandLease({
        ownerId,
        title,
        description,
        sizeInAcres,
        khasraNumber,
        location,
        leaseType,
        pricePerAcre: leaseType === 'fixed-rent' ? pricePerAcre : null,
        sharePercentage: leaseType === 'crop-share' ? sharePercentage : null,
        availableFrom,
        availableTo,
        documents: documents || [],
        status: 'pending_verification',
        verificationStatus: 'pending'
      });

      await landLease.save();
      res.status(201).json({ success: true, message: 'Land listed successfully. Pending admin verification.', data: landLease });
    } catch (error) {
      console.error('Error listing land:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // Browse Land Leases
  browseLandLeases: async (req, res) => {
    try {
      const { type, lat, lng, radius = 50, page = 1, limit = 20 } = req.query;
      
      let query = { status: 'active', verificationStatus: 'approved' };
      if (type) query.leaseType = type;

      const aggregatePipeline = [];

      // Geo-indexed search
      if (lat && lng) {
        aggregatePipeline.push({
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [Number(lng), Number(lat)]
            },
            distanceField: 'distance',
            maxDistance: Number(radius) * 1000,
            spherical: true,
            query: query
          }
        });
      } else {
        aggregatePipeline.push({ $match: query });
      }

      // Populate owner
      aggregatePipeline.push({
        $lookup: {
          from: 'users',
          localField: 'ownerId',
          foreignField: '_id',
          as: 'owner'
        }
      });
      aggregatePipeline.push({ $unwind: '$owner' });

      // Project non-sensitive fields
      aggregatePipeline.push({
        $project: {
          title: 1,
          description: 1,
          sizeInAcres: 1,
          location: 1,
          leaseType: 1,
          pricePerAcre: 1,
          sharePercentage: 1,
          availableFrom: 1,
          availableTo: 1,
          distance: 1,
          owner: {
            name: '$owner.name'
            // Exclude phone to prevent platform bypass before agreement
          }
        }
      });

      const skip = (Number(page) - 1) * Number(limit);
      aggregatePipeline.push({ $skip: skip });
      aggregatePipeline.push({ $limit: Number(limit) });

      const results = await LandLease.aggregate(aggregatePipeline);

      res.status(200).json({ success: true, data: results });
    } catch (error) {
      console.error('Error browsing land leases:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // Negotiate / Request Lease (simplified mock endpoint)
  negotiateLease: async (req, res) => {
    try {
      const { id } = req.params;
      const { proposedPrice } = req.body; // mock data for negotiation
      
      const lease = await LandLease.findById(id);
      if (!lease) return res.status(404).json({ success: false, message: 'Lease not found' });
      
      if (lease.status !== 'active') {
        return res.status(400).json({ success: false, message: 'Lease is not available' });
      }

      // In reality, this would create an 'Offer' document.
      res.status(200).json({ success: true, message: 'Offer sent to owner' });
    } catch (error) {
      console.error('Error negotiating lease:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // Accept Lease Terms
  acceptLeaseTerms: async (req, res) => {
    try {
      const { id } = req.params;
      
      const lease = await LandLease.findOne({ _id: id, ownerId: req.user.id });
      if (!lease) return res.status(404).json({ success: false, message: 'Lease not found or you are not the owner' });
      
      // Assume tenantId is passed in body after an offer is accepted
      const { tenantId } = req.body;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID required' });

      lease.status = 'leased';
      lease.currentTenantId = tenantId;
      await lease.save();

      res.status(200).json({ success: true, message: 'Lease terms accepted. Agreement generated.', data: lease });
    } catch (error) {
      console.error('Error accepting lease terms:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
};

module.exports = farmerLandLeaseController;
