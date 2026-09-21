const Category = require('../../models/Category');
const { validationResult } = require('express-validator');
const { SERVICE_STATUS } = require('../../utils/constants');

const formatCategory = (cat) => ({
  id: cat._id,
  title: cat.title,
  slug: cat.slug,
  homeIconUrl: cat.homeIconUrl,
  homeBadge: cat.homeBadge,
  hasSaleBadge: cat.hasSaleBadge,
  showOnHome: cat.showOnHome,
  homeOrder: cat.homeOrder,
  description: cat.description,
  imageUrl: cat.imageUrl,
  status: cat.status,
  isPopular: cat.isPopular,
  parentCategory: cat.parentCategory
    ? {
        id: cat.parentCategory._id || cat.parentCategory.id || cat.parentCategory,
        title: cat.parentCategory.title || '',
        slug: cat.parentCategory.slug || ''
      }
    : null,
  parentCategories: Array.isArray(cat.parentCategories)
    ? cat.parentCategories.map((parent) => ({
        id: parent._id || parent.id || parent,
        title: parent.title || '',
        slug: parent.slug || ''
      }))
    : [],
  isAlwaysMain: cat.isAlwaysMain || false,
  scope: cat.scope || 'GLOBAL',
  city: cat.city || null,
  cityIds: cat.cityIds || [],
  trackingType: cat.trackingType || 'none',
  requiresDriver: cat.requiresDriver || false,
  sectionType: cat.sectionType || 'General',
  bookingType: cat.bookingType || 'VENDOR',
  metaTitle: cat.metaTitle,
  metaDescription: cat.metaDescription,
  createdAt: cat.createdAt,
  updatedAt: cat.updatedAt
});

/**
 * Get all categories
 * GET /api/admin/categories
 */
const getAllCategories = async (req, res) => {
  try {
    const { status, showOnHome, isPopular, cityId, search, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (showOnHome !== undefined) query.showOnHome = showOnHome === 'true';
    if (isPopular !== undefined) query.isPopular = isPopular === 'true';
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (cityId) {
      const mongoose = require('mongoose');
      let cityObjectId;
      try {
        cityObjectId = new mongoose.Types.ObjectId(cityId);
      } catch (e) {
        cityObjectId = cityId;
      }
      
      // Return categories that belong to the selected city OR are global
      // If there is already an $or from search, we must use $and to combine them
      const cityOr = [
        { scope: 'GLOBAL' },
        { scope: 'CITY_SPECIFIC', city: cityObjectId }
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: cityOr }];
        delete query.$or;
      } else {
        query.$or = cityOr;
      }
    }

    const totalCount = await Category.countDocuments(query);

    const categories = await Category.find(query)
      .populate('parentCategory', 'title slug')
      .populate('parentCategories', 'title slug')
      .select('-__v')
      .sort({ homeOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.status(200).json({
      success: true,
      count: categories.length,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum)
      },
      categories: categories.map(formatCategory)
    });
    console.log("SENDING TO FRONTEND:", categories.map(formatCategory)[0]);
  } catch (error) {
    console.error('Get all categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories. Please try again.'
    });
  }
};

/**
 * Get single category by ID
 * GET /api/admin/categories/:id
 */
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id)
      .populate('parentCategory', 'title slug')
      .populate('parentCategories', 'title slug')
      .select('-__v')
      .lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      category: formatCategory(category)
    });
  } catch (error) {
    console.error('Get category by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category. Please try again.'
    });
  }
};

/**
 * Create new category
 * POST /api/admin/categories
 */
const createCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Category Create Validation Errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      title,
      slug,
      homeIconUrl,
      homeBadge,
      hasSaleBadge,
      showOnHome,
      homeOrder,
      description,
      imageUrl,
      status,
      isPopular,
      metaTitle,
      metaDescription,
      cityIds,
      scope,
      city,
      parentCategory,
      parentCategories,
      isAlwaysMain,
      trackingType,
      requiresDriver,
      sectionType,
      bookingType
    } = req.body;

    console.log('[CATEGORY] Creating category:', title);

    const slugToCheck = slug?.trim().toLowerCase() || title.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const finalScope = scope || (cityIds && cityIds.length > 0 ? 'CITY_SPECIFIC' : 'GLOBAL');
    const finalCity = city || (cityIds && cityIds.length > 0 ? cityIds[0] : null);

    // Find ALL categories with same slug to properly check city/scope overlaps
    const existingCategories = await Category.find({ slug: slugToCheck });

    let isDuplicate = false;
    for (const existingCategory of existingCategories) {
      if (finalScope === 'GLOBAL') {
        if (existingCategory.scope === 'GLOBAL') { isDuplicate = true; break; }
      } else {
        if (existingCategory.scope === 'GLOBAL') { isDuplicate = true; break; }
        if (existingCategory.scope === 'CITY_SPECIFIC' && existingCategory.city?.toString() === finalCity?.toString()) { isDuplicate = true; break; }
      }
    }

    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message: 'Category with this title or slug already exists for this scope/city.'
      });
    }

    const category = await Category.create({
      title: title.trim(),
      slug: slug?.trim().toLowerCase() || undefined,
      homeIconUrl: homeIconUrl || null,
      homeBadge: homeBadge?.trim() || null,
      hasSaleBadge: Boolean(hasSaleBadge),
      showOnHome: showOnHome !== false,
      homeOrder: Number(homeOrder) || 0,
      description: description?.trim() || null,
      imageUrl: imageUrl || null,
      status: status || SERVICE_STATUS.ACTIVE,
      isPopular: Boolean(isPopular),
      metaTitle: metaTitle?.trim() || null,
      metaDescription: metaDescription?.trim() || null,
      parentCategory: Array.isArray(parentCategories) && parentCategories.length > 0 ? parentCategories[0] : (parentCategory || null),
      parentCategories: Array.isArray(parentCategories) ? parentCategories : (parentCategory ? [parentCategory] : []),
      isAlwaysMain: Boolean(isAlwaysMain),
      scope: finalScope,
      city: finalCity,
      cityIds: finalCity ? [finalCity] : [], // maintain backward compatibility
      trackingType: trackingType || 'none',
      requiresDriver: Boolean(requiresDriver),
      sectionType: sectionType || 'General',
      bookingType: bookingType || 'VENDOR',
      createdBy: req.user?._id || req.userId || null
    });

    const createdCategory = await Category.findById(category._id)
      .populate('parentCategory', 'title slug')
      .populate('parentCategories', 'title slug')
      .select('-__v')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: formatCategory(createdCategory)
    });
  } catch (error) {
    console.error('Create category error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with this title or slug already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create category. Please try again.'
    });
  }
};

/**
 * Update category
 * PUT /api/admin/categories/:id
 */
const updateCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const {
      title,
      slug,
      homeIconUrl,
      homeBadge,
      hasSaleBadge,
      showOnHome,
      homeOrder,
      description,
      imageUrl,
      status,
      isPopular,
      metaDescription,
      cityIds: updateCityIds,
      scope,
      city,
      parentCategory,
      parentCategories,
      isAlwaysMain,
      trackingType,
      requiresDriver,
      sectionType,
      bookingType
    } = req.body;

    console.log('[updateCategory] Request updating id:', id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    let finalScope = scope !== undefined ? scope : category.scope;
    let finalCity = city !== undefined ? city : category.city;
    
    // Handle legacy frontend still sending cityIds
    if (scope === undefined && updateCityIds !== undefined) {
      finalScope = updateCityIds.length > 0 ? 'CITY_SPECIFIC' : 'GLOBAL';
      finalCity = updateCityIds.length > 0 ? updateCityIds[0] : null;
    }

    if (title || slug || scope !== undefined || city !== undefined || updateCityIds !== undefined) {
      const slugToCheck = slug?.trim().toLowerCase() || (title ? title.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') : category.slug);

      // Find ALL other categories with same slug (exclude current one being updated)
      const existingCategories = await Category.find({ _id: { $ne: id }, slug: slugToCheck });

      let isDuplicate = false;

      for (const existingCategory of existingCategories) {
        if (finalScope === 'GLOBAL') {
          if (existingCategory.scope === 'GLOBAL') { isDuplicate = true; break; }
        } else {
          if (existingCategory.scope === 'GLOBAL') { isDuplicate = true; break; }
          if (existingCategory.scope === 'CITY_SPECIFIC' && existingCategory.city?.toString() === finalCity?.toString()) { isDuplicate = true; break; }
        }
      }

      if (isDuplicate) {
        return res.status(400).json({
          success: false,
          message: 'Category with this title or slug already exists for this scope/city.'
        });
      }
    }

    if (title !== undefined) category.title = title.trim();
    if (slug !== undefined) category.slug = slug.trim().toLowerCase();
    if (homeIconUrl !== undefined) category.homeIconUrl = homeIconUrl || null;
    if (homeBadge !== undefined) category.homeBadge = homeBadge?.trim() || null;
    if (hasSaleBadge !== undefined) category.hasSaleBadge = Boolean(hasSaleBadge);
    if (showOnHome !== undefined) category.showOnHome = showOnHome !== false;
    if (homeOrder !== undefined) category.homeOrder = Number(homeOrder) || 0;
    if (description !== undefined) category.description = description?.trim() || null;
    if (imageUrl !== undefined) category.imageUrl = imageUrl || null;
    if (status !== undefined) category.status = status;
    if (isPopular !== undefined) category.isPopular = Boolean(isPopular);
    
    // Parent logic - Let Mongoose auto-cast ObjectIds, markModified ensures array change is tracked
    if (parentCategories !== undefined) {
      const pCats = Array.isArray(parentCategories) ? parentCategories : (parentCategories ? [parentCategories] : []);
      category.parentCategories = pCats;
      category.parentCategory = pCats.length > 0 ? pCats[0] : null;
      category.markModified('parentCategories');
      category.markModified('parentCategory');
      console.log('[updateCategory] Setting parentCategories:', pCats, '| parentCategory:', category.parentCategory);
    } else if (parentCategory !== undefined) {
      if (parentCategory) {
        category.parentCategory = parentCategory;
        category.parentCategories = [parentCategory];
      } else {
        category.parentCategory = null;
        category.parentCategories = [];
      }
      category.markModified('parentCategories');
      category.markModified('parentCategory');
    }

    if (isAlwaysMain !== undefined) category.isAlwaysMain = Boolean(isAlwaysMain);
    if (trackingType !== undefined) category.trackingType = trackingType;
    if (requiresDriver !== undefined) category.requiresDriver = Boolean(requiresDriver);
    if (sectionType !== undefined) category.sectionType = sectionType;
    if (bookingType !== undefined) category.bookingType = bookingType;
    
    if (scope !== undefined || city !== undefined || updateCityIds !== undefined) {
      category.scope = finalScope;
      category.city = finalCity;
      category.cityIds = finalCity ? [finalCity] : [];
      category.markModified('cityIds');
    }

    await category.save();

    const updatedCategory = await Category.findById(category._id)
      .populate('parentCategory', 'title slug')
      .populate('parentCategories', 'title slug')
      .select('-__v')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      category: formatCategory(updatedCategory)
    });
  } catch (error) {
    console.error('Update category error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with this title or slug already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update category. Please try again.'
    });
  }
};

/**
 * Delete category
 * DELETE /api/admin/categories/:id
 */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Also delete all associated services (equipment models) for this category
    const Service = require('../../models/Service');
    await Service.deleteMany({ categoryId: id });

    res.status(200).json({
      success: true,
      message: 'Category and associated equipment deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  }
};

/**
 * Update category order
 * PATCH /api/admin/categories/:id/order
 */
const updateCategoryOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { homeOrder } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    category.homeOrder = homeOrder;
    await category.save();

    res.status(200).json({
      success: true,
      message: 'Order updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update order'
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryOrder
};
