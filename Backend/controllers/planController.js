const Plan = require('../models/Plan');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Service = require('../models/Service');

// Create Plan
exports.createPlan = async (req, res) => {
  try {
    // Log operation safely without full payload dump
    console.log('[PLAN] Creating plan:', req.body?.name);
    const { name, price, highlights, validityDays, freeCategories, freeBrands, freeServices,
            marketplaceDiscountPercentage, rentalDiscountPercentage } = req.body;

    // Check if plan exists
    const existingPlan = await Plan.findOne({ name });
    if (existingPlan) {
      return res.status(400).json({ success: false, message: 'Plan with this name already exists' });
    }

    const plan = new Plan({
      name, price, highlights, validityDays,
      freeCategories, freeBrands, freeServices,
      marketplaceDiscountPercentage: marketplaceDiscountPercentage || 0,
      rentalDiscountPercentage: rentalDiscountPercentage || 0
    });
    await plan.save();
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    console.error('Create Plan Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

// Get All Plans (Public/User/Admin)
exports.getAllPlans = async (req, res) => {
  try {
    // Admin might want to see inactive ones too, but for now let's show all or filter by query
    const filter = {};
    if (req.query.activeOnly === 'true') {
      filter.isActive = true;
    }

    const plans = await Plan.find(filter)
      .populate('freeCategories', 'title')
      .populate('freeBrands', 'title')
      .populate('freeServices', 'title')
      .sort({ price: 1 });
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    console.error('Get All Plans Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

// Get Single Plan
exports.getPlanById = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id)
      .populate('freeCategories', 'title')
      .populate('freeBrands', 'title')
      .populate('freeServices', 'title');
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Plan
exports.updatePlan = async (req, res) => {
  try {
    console.log('[PLAN] Updating plan:', req.params.id);
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Plan (Soft delete preferred usually, but user might want hard delete for simple management. 
// Given 'isActive' field, I'll toggle it or delete. 
// Let's support hard delete for management panel if requested, but let's do soft delete by setting isActive=false usually.
// However, the user request asks to 'add cards', 'manage'. Usually 'delete' means remove.
// I will implement actual delete for now, or toggle active.
// Let's implement DELETE as delete, and PUT to toggle active.

exports.deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.status(200).json({ success: true, message: 'Plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
