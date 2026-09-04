const Requirement = require('../../models/Requirement');
const Bid = require('../../models/Bid');
const Vendor = require('../../models/Vendor');

exports.getOpenRequirements = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const cityId = vendor.cityId || vendor.address?.cityId;

    const query = { status: 'open' };
    if (cityId) {
      query['location.cityId'] = cityId;
    }

    const requirements = await Requirement.find(query)
      .populate('categoryId', 'title slug')
      .populate('userId', 'name profilePhoto')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: requirements });
  } catch (error) {
    console.error('Get open requirements error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch requirements' });
  }
};

exports.submitBid = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { id } = req.params; // Requirement ID
    const { bidAmount, message, equipmentId } = req.body;

    if (!bidAmount || bidAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid bid amount' });
    }

    const requirement = await Requirement.findById(id);
    if (!requirement || requirement.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Requirement not open or not found' });
    }

    // Rate-card validation with Price Inheritance
    let minAllowed = null;
    let maxAllowed = null;
    const Category = require('../../models/Category');

    let targetCategory = null;
    let isInherited = false;

    // 1. Try granular sub-category first
    if (requirement.subCategoryId) {
      const subCategory = await Category.findById(requirement.subCategoryId);
      if (subCategory && subCategory.priceRangeMin != null && subCategory.priceRangeMax != null) {
        targetCategory = subCategory;
      } else {
        // Fallback to parent category
        isInherited = true;
        console.warn(`[WARNING] SubCategory ${requirement.subCategoryId} missing price range, falling back to parent Category ${requirement.categoryId}`);
      }
    }

    // 2. Fallback to broad parent category if sub-category didn't have pricing
    if (!targetCategory && requirement.categoryId) {
      targetCategory = await Category.findById(requirement.categoryId);
    }

    if (targetCategory && targetCategory.priceRangeMin != null && targetCategory.priceRangeMax != null) {
      minAllowed = targetCategory.priceRangeMin;
      maxAllowed = targetCategory.priceRangeMax;
    }

    if (minAllowed !== null && maxAllowed !== null) {
      if (bidAmount < minAllowed || bidAmount > maxAllowed) {
        return res.status(400).json({ 
          success: false, 
          message: `Bid amount must be between ₹${minAllowed} and ₹${maxAllowed} for this requirement.` 
        });
      }
    }

    // DB index on (requirementId, vendorId) handles the unique constraint
    const bid = await Bid.create({
      requirementId: id,
      vendorId,
      equipmentId: equipmentId || null,
      bidAmount,
      message
    });

    res.status(201).json({ success: true, message: 'Bid submitted successfully', data: bid });
  } catch (error) {
    console.error('Submit bid error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already submitted a bid for this requirement' });
    }
    res.status(500).json({ success: false, message: 'Failed to submit bid' });
  }
};

exports.getMyBids = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const bids = await Bid.find({ vendorId })
      .populate({
        path: 'requirementId',
        select: 'details location requiredDate status',
        populate: { path: 'categoryId', select: 'title' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: bids });
  } catch (error) {
    console.error('Get my bids error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bids' });
  }
};
