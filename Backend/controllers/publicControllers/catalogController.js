const Category = require('../../models/Category');
const Brand = require('../../models/Brand');
const Service = require('../../models/Service');
const HomeContent = require('../../models/HomeContent');

/**
 * Public Catalog Controllers
 * These endpoints are accessible without authentication for user app
 */

/**
 * Get all active categories for user app
 * GET /api/public/categories
 */
const getPublicCategories = async (req, res) => {
  try {
    const { cityId, type } = req.query;

    // Build query - Keep it simple to ensure all active categories load
    const query = { status: 'active' };
    if (cityId) {
      query.cityIds = cityId;
    }

    let categories = await Category.find(query)
      .select('title slug homeIconUrl homeBadge hasSaleBadge homeOrder showOnHome parentCategory parentCategories isAlwaysMain trackingType requiresDriver sectionType')
      .populate('parentCategories', 'title slug')
      .sort({ homeOrder: 1, createdAt: -1 })
      .lean();

    // FALLBACK: If a city was requested but has no categories assigned,
    // return all global categories (those with no cityIds or any city)
    // This mirrors the HomeContent fallback behaviour.
    if (cityId && categories.length === 0) {
      categories = await Category.find({ status: 'active' })
        .select('title slug homeIconUrl homeBadge hasSaleBadge homeOrder showOnHome parentCategory parentCategories isAlwaysMain trackingType requiresDriver sectionType')
        .populate('parentCategories', 'title slug')
        .sort({ homeOrder: 1, createdAt: -1 })
        .lean();
    }

    const initialCategories = categories.map(cat => ({
      id: cat._id?.toString() || '',
      title: cat.title || '',
      slug: cat.slug || '',
      icon: cat.homeIconUrl || '',
      badge: cat.homeBadge || '',
      hasSaleBadge: !!cat.hasSaleBadge,
      showOnHome: !!cat.showOnHome,
      homeOrder: cat.homeOrder || 0,
      parentCategory: cat.parentCategory || null,
      parentCategories: Array.isArray(cat.parentCategories)
        ? cat.parentCategories.map(p => ({
            id: p._id?.toString() || p.toString(),
            title: p.title || '',
            slug: p.slug || ''
          }))
        : [],
      isAlwaysMain: !!cat.isAlwaysMain,
      trackingType: cat.trackingType || 'none',
      requiresDriver: cat.requiresDriver || false,
      sectionType: cat.sectionType || 'General',
    }));

    // Fetch brands for these categories
    const categoryIds = categories.map(c => c._id).filter(id => id);

    const brandQuery = {
      categoryIds: { $in: categoryIds },
      status: 'active'
    };
    if (cityId) {
      brandQuery.cityIds = cityId;
    }

    const brands = await Brand.find(brandQuery).select('title categoryIds').lean();

    // Map brands to categories
    const categoriesWithBrands = initialCategories.map(cat => {
      const catBrands = brands.filter(b => 
        b.categoryIds && Array.isArray(b.categoryIds) && b.categoryIds.some(id => id.toString() === cat.id)
      ).map(b => b.title);
      return { ...cat, subBrands: catBrands };
    });

    res.status(200).json({
      success: true,
      categories: categoriesWithBrands
    });
  } catch (error) {
    console.error('Get public categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories. Please try again.'
    });
  }
};

/**
 * Get all active brands for user app (Formerly Services)
 * GET /api/public/brands
 */
const getPublicBrands = async (req, res) => {
  try {
    const { categoryId, categorySlug, search, cityId } = req.query;

    // Build query
    const query = { status: 'active' };
    if (categoryId) query.categoryIds = categoryId;
    if (cityId) query.cityIds = cityId;

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.title = { $regex: escapedSearch, $options: 'i' };
    }

    let brands = await Brand.find(query)
      .select('title slug iconUrl logo imageUrl badge categoryIds basePrice discountPrice sections')
      .sort({ createdAt: -1 })
      .lean();

    // If categorySlug is provided, filter by category
    if (categorySlug) {
      const catQuery = { slug: categorySlug, status: 'active' };
      if (cityId) {
        catQuery.cityIds = cityId;
      }

      let category = await Category.findOne(catQuery).lean();

      if (!category && cityId) {
        category = await Category.findOne({ slug: categorySlug, status: 'active' }).lean();
      }

      if (category) {
        brands = brands.filter(b =>
          Array.isArray(b.categoryIds) &&
          b.categoryIds.some(id => id.toString() === category._id.toString())
        );
      }
    }

    res.status(200).json({
      success: true,
      brands: brands.map(brand => ({
        id: brand._id.toString(),
        title: brand.title,
        slug: brand.slug,
        icon: brand.iconUrl || '',
        logo: brand.logo || brand.iconUrl || '',
        imageUrl: brand.imageUrl || brand.iconUrl || '',
        badge: brand.badge || '',
        price: brand.basePrice || 0, // Legacy support
        originalPrice: brand.discountPrice ? (brand.basePrice + brand.discountPrice) : (brand.basePrice || 0),
        categoryId: brand.categoryIds && brand.categoryIds.length > 0 ? brand.categoryIds[0].toString() : null,
        categoryIds: (brand.categoryIds || []).map(id => id.toString()),
        sections: brand.sections || []
      }))
    });
  } catch (error) {
    console.error('Get public brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brands. Please try again.'
    });
  }
};

/**
 * Get brand by slug for user app
 * GET /api/public/brands/slug/:slug
 */
const getPublicBrandBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const brand = await Brand.findOne({ slug, status: 'active' })
      .populate('categoryIds', 'title slug')
      .lean();

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Remove _id from nested objects
    const cleanBrand = JSON.parse(JSON.stringify(brand));
    const removeIds = (obj) => {
      if (Array.isArray(obj)) {
        return obj.map(item => {
          if (item && typeof item === 'object') {
            const { _id, ...rest } = item;
            return removeIds(rest);
          }
          return item;
        });
      } else if (obj && typeof obj === 'object') {
        const { _id, ...rest } = obj;
        return Object.keys(rest).reduce((acc, key) => {
          acc[key] = removeIds(rest[key]);
          return acc;
        }, {});
      }
      return obj;
    };

    // Fetch services associated with this brand
    const brandServices = await Service.find({ brandId: brand._id, status: 'active' }).lean();

    // Map services to a default section structure for the frontend
    const servicesSection = {
      title: brand.title,
      subtitle: 'Available Services',
      cards: brandServices.map(svc => ({
        id: svc._id.toString(),
        title: svc.title,
        subtitle: svc.description || '',
        price: svc.basePrice,
        hourly_price: svc.hourly_price || svc.basePrice || 0,
        land_price: svc.land_price || 0,
        land_unit: svc.land_unit || 'acre',
        daily_price: svc.daily_price || 0,
        rating: "4.8", // Default rating
        reviews: "1k+", // Default reviews
        imageUrl: svc.iconUrl || brand.iconUrl || '',
        features: svc.description ? [svc.description] : [],
        duration: "60 min" // Default duration
      }))
    };

    const formattedBrand = {
      id: brand._id.toString(),
      title: brand.title,
      slug: brand.slug,
      icon: brand.iconUrl || '',
      logo: brand.logo || '',
      badge: brand.badge || '',
      basePrice: brand.basePrice, // Legacy
      category: brand.categoryIds && brand.categoryIds[0] ? {
        id: brand.categoryIds[0]._id.toString(),
        title: brand.categoryIds[0].title,
        slug: brand.categoryIds[0].slug
      } : null,
      categories: (brand.categoryIds || []).map(cat => ({
        id: cat._id.toString(),
        title: cat.title,
        slug: cat.slug
      })),
      page: brand.page ? removeIds(brand.page) : {
        banners: brand.iconUrl ? [{ imageUrl: brand.iconUrl, text: brand.title }] : [],
        paymentOffers: [],
        paymentOffersEnabled: false
      },
      sections: brandServices.length > 0 ? [servicesSection] : []
    };

    res.status(200).json({
      success: true,
      brand: formattedBrand
    });
  } catch (error) {
    console.error('Get public brand by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brand. Please try again.'
    });
  }
};

/**
 * Get services based on brand
 * GET /api/public/services
 */
const getPublicServices = async (req, res) => {
  try {
    const { brandId, brandSlug, categoryId, parentSourceId, pricing_context } = req.query;

    const query = { status: 'active' };

    if (brandId) {
      query.brandId = brandId;
    } else if (brandSlug) {
      const brand = await Brand.findOne({ slug: brandSlug });
      if (brand) {
        query.brandId = brand._id;
      } else {
        return res.status(200).json({ success: true, services: [] });
      }
    }

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (parentSourceId) {
      query.parentSourceId = parentSourceId;
    }

    if (pricing_context) {
      // Include services tagged with the specific context OR 'any' (which means valid for all contexts)
      query.pricing_context = { $in: [pricing_context, 'any'] };
    }

    const services = await Service.find(query).sort({ createdAt: 1 }).lean();

    res.status(200).json({
      success: true,
      services: services.map(svc => ({
        id: svc._id.toString(),
        title: svc.title,
        slug: svc.slug,
        icon: svc.iconUrl,
        basePrice: svc.basePrice,
        hourly_price: svc.hourly_price || svc.basePrice || 0,
        land_price: svc.land_price || 0,
        land_unit: svc.land_unit || 'acre',
        daily_price: svc.daily_price || 0,
        pricing_context: svc.pricing_context || 'any',
        parentSourceId: svc.parentSourceId ? svc.parentSourceId.toString() : null,
        gstPercentage: svc.gstPercentage,
        description: svc.description
      }))
    });
  } catch (error) {
    console.error('Get public services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services'
    });
  }
};

/**
 * Get home content
 */
const getPublicHomeContent = async (req, res) => {
  try {
    const { cityId } = req.query;
    let homeContent = await HomeContent.getHomeContent(cityId);

    // FALLBACK LOGIC: Check if the city-specific content is essentially empty
    if (cityId && homeContent) {
      const isEmpty = (!homeContent.banners || homeContent.banners.length === 0) &&
                      (!homeContent.promos || homeContent.promos.length === 0) &&
                      (!homeContent.curated || homeContent.curated.length === 0) &&
                      (!homeContent.noteworthy || homeContent.noteworthy.length === 0) &&
                      (!homeContent.booked || homeContent.booked.length === 0) &&
                      (!homeContent.categorySections || homeContent.categorySections.length === 0);
      
      // If empty, fallback to the default content (where cityId is null)
      if (isEmpty) {
        homeContent = await HomeContent.getHomeContent(null);
      }
    }

    if (!homeContent) {
      return res.status(200).json({
        success: true,
        homeContent: {
          banners: [],
          promos: [],
          curated: [],
          noteworthy: [],
          booked: [],
          categorySections: []
        }
      });
    }

    // Used for backwards compatibility, we might need to update this to refer to Brands?
    // For now keeping as is, but assuming targetServiceId will point to Brand ID essentially.

    const contentObj = homeContent.toObject();

    const formattedContent = {
      banners: (contentObj.banners || []).map(item => ({
        ...item,
        id: item._id ? item._id.toString() : item.id,
        targetCategoryId: item.targetCategoryId?.toString() || null,
        targetServiceId: item.targetServiceId?.toString() || null,
      })),
      promos: (contentObj.promos || []).map(item => ({
        ...item,
        id: item._id ? item._id.toString() : item.id,
        targetCategoryId: item.targetCategoryId?.toString() || null,
        targetServiceId: item.targetServiceId?.toString() || null,
      })),
      curated: (contentObj.curated || []).map(item => ({
        ...item,
        id: item._id ? item._id.toString() : item.id,
        targetCategoryId: item.targetCategoryId?.toString() || null,
        targetServiceId: item.targetServiceId?.toString() || null,
      })),
      noteworthy: (contentObj.noteworthy || []).map(item => ({
        ...item,
        id: item._id ? item._id.toString() : item.id,
        targetCategoryId: item.targetCategoryId?.toString() || null,
        targetServiceId: item.targetServiceId?.toString() || null,
      })),
      booked: (contentObj.booked || []).map(item => ({
        ...item,
        id: item._id ? item._id.toString() : item.id,
        targetCategoryId: item.targetCategoryId?.toString() || null,
        targetServiceId: item.targetServiceId?.toString() || null,
      })),
      categorySections: (contentObj.categorySections || []).map(section => ({
        ...section,
        id: section._id ? section._id.toString() : section.id,
        seeAllTargetCategoryId: section.seeAllTargetCategoryId?.toString() || null,
        seeAllTargetServiceId: section.seeAllTargetServiceId?.toString() || null,
        cards: (section.cards || []).map(card => ({
          ...card,
          id: card._id ? card._id.toString() : card.id,
          targetCategoryId: card.targetCategoryId?.toString() || null,
          targetServiceId: card.targetServiceId?.toString() || null,
        }))
      })),
      isBannersVisible: contentObj.isBannersVisible ?? true,
      isPromosVisible: contentObj.isPromosVisible ?? true,
      isCuratedVisible: contentObj.isCuratedVisible ?? true,
      isNoteworthyVisible: contentObj.isNoteworthyVisible ?? true,
      isBookedVisible: contentObj.isBookedVisible ?? true,
      isCategorySectionsVisible: contentObj.isCategorySectionsVisible ?? true,
      isCategoriesVisible: contentObj.isCategoriesVisible ?? true
    };

    res.status(200).json({
      success: true,
      homeContent: formattedContent
    });

  } catch (error) {
    console.error('Get public home content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch home content. Please try again.'
    });
  }
};

module.exports = {
  getPublicCategories,
  getPublicBrands,
  getPublicBrandBySlug,
  getPublicServices,
  getPublicHomeContent
};
