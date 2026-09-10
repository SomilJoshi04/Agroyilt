const VendorEquipment = require('../../models/VendorEquipment');
const Vendor = require('../../models/Vendor');

/**
 * Public Equipment Controllers (For Farmers)
 * Handles browsing and viewing details of equipment without needing login.
 */

// GET /api/public/equipment
exports.getPublicEquipment = async (req, res) => {
  try {
    const { cityId, categoryId, implementId, search, isFeatured } = req.query;

    const query = { status: { $in: ['active', 'approved'] } }; // Only show active/approved equipment

    if (cityId) query.cityIds = cityId;
    if (categoryId) query.categoryId = categoryId;
    if (isFeatured) query.isFeatured = true;

    if (implementId) {
      query.$or = [
        { 'implements.subCategoryId': implementId },
        { subCategoryIds: implementId } // For backward compatibility
      ];
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');

      const matchingVendors = await Vendor.find({ name: searchRegex }).select('_id');
      const vendorIds = matchingVendors.map(v => v._id);

      const searchCondition = {
        $or: [
          { name: searchRegex },
          { vendorId: { $in: vendorIds } }
        ]
      };

      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          searchCondition
        ];
        delete query.$or;
      } else {
        query.$or = searchCondition.$or;
      }
    }

    const equipment = await VendorEquipment.find(query)
      .populate('categoryId', 'title slug homeIconUrl')
      .populate('subCategoryIds', 'title slug')
      .populate('implements.subCategoryId', 'title slug')
      .populate('vendorId', 'name phone rating avatar')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: equipment.length,
      data: equipment
    });
  } catch (error) {
    console.error('Get public equipment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch machinery catalog'
    });
  }
};

// GET /api/public/equipment/:id
exports.getPublicEquipmentById = async (req, res) => {
  try {
    const equipment = await VendorEquipment.findOne({
      _id: req.params.id,
      status: { $in: ['active', 'approved'] }
    })
      .populate('categoryId', 'title slug homeIconUrl')
      .populate('subCategoryIds', 'title slug')
      .populate('implements.subCategoryId', 'title slug')
      .populate('vendorId', 'name phone rating avatar')
      .lean();

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Machinery not found or not yet approved'
      });
    }

    res.status(200).json({
      success: true,
      data: equipment
    });
  } catch (error) {
    console.error('Get public equipment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch machinery details'
    });
  }
};

// GET /api/public/equipment/:id/availability
exports.checkAvailability = async (req, res) => {
  try {
    const { date, timeSlot } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    // Logic for checking existing bookings will go here later
    // For now, return available: true
    res.status(200).json({
      success: true,
      available: true,
      message: 'Slot is available'
    });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check availability'
    });
  }
};
