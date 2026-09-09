import api from './api';

/**
 * Public Equipment Service for Farmers
 * Handles browsing machinery and checking availability for rentals.
 */
export const publicEquipmentService = {
  // Get all approved machinery (with city filter)
  getAllEquipment: async (filters = {}) => {
    const { cityId, categoryId, implementId, search, isFeatured } = filters;
    const params = {};
    if (cityId) params.cityId = cityId;
    if (categoryId) params.categoryId = categoryId;
    if (implementId) params.implementId = implementId;
    if (search) params.search = search;
    if (isFeatured) params.isFeatured = true;

    const response = await api.get('/public/equipment', { params });
    return response.data;
  },

  // Get single equipment details by ID
  getEquipmentById: async (id) => {
    const response = await api.get(`/public/equipment/${id}`);
    return response.data;
  },

  // Check equipment availability for specific date/time
  checkAvailability: async (equipmentId, date, timeSlot) => {
    const response = await api.get(`/public/equipment/${equipmentId}/availability`, {
      params: { date, timeSlot }
    });
    return response.data;
  },

  // Get categories specifically for machinery (e.g. Tractor, Harvester)
  getMachineryCategories: async (cityId) => {
    const params = { type: 'service' }; // Machinery are services in this project
    if (cityId) params.cityId = cityId;
    
    const response = await api.get('/public/categories', { params });
    if (response.data.success && Array.isArray(response.data.categories)) {
      return {
        success: true,
        // Show main categories + filter out WORKER for machinery specific views
        data: response.data.categories.filter(c => (!c.parentCategory || c.isAlwaysMain) && c.bookingType !== 'WORKER' && !c.slug.includes('worker'))
      };
    }
    return { success: false, data: [] };
  },

  // Get implements (subcategories) for a specific main category
  getImplementsForCategory: async (categoryId) => {
    const response = await api.get('/public/categories');
    if (response.data.success && Array.isArray(response.data.categories)) {
      return {
        success: true,
        data: response.data.categories.filter(c => {
          // Check legacy single parent category
          const hasLegacyParent = c.parentCategory && (
            c.parentCategory === categoryId || 
            c.parentCategory.id === categoryId || 
            c.parentCategory._id === categoryId
          );
          
          // Check new multiple parent categories array
          const hasArrayParent = Array.isArray(c.parentCategories) && c.parentCategories.some(p => 
            p === categoryId || p.id === categoryId || p._id === categoryId
          );

          return hasLegacyParent || hasArrayParent;
        })
      };
    }
    return { success: false, data: [] };
  }
};

export default publicEquipmentService;
