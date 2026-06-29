import api from './api';

/**
 * Vendor Equipment Service
 * Handles machinery listings and dynamic category fetching for rentals.
 */
export const vendorEquipmentService = {
  // Get all machinery for the logged-in vendor
  getMyEquipment: async () => {
    const response = await api.get('/vendors/equipment');
    return response.data;
  },

  // Add new machinery
  add: async (data) => {
    const response = await api.post('/vendors/equipment', data);
    return response.data;
  },

  // Update machinery
  update: async (id, data) => {
    const response = await api.put(`/vendors/equipment/${id}`, data);
    return response.data;
  },

  // Remove machinery
  delete: async (id) => {
    const response = await api.delete(`/vendors/equipment/${id}`);
    return response.data;
  },

  // Fetch machinery types for the dropdown (Main Categories like Tractor)
  getMachineTypes: async (cityId = null) => {
    const response = await api.get('/public/categories', {
      params: cityId ? { cityId } : {}
    });
    if (response.data.success && Array.isArray(response.data.categories)) {
      const excludeSlugs = [
        'lab-soil-testing',
        'shops-seedfertilizer-etc',
        'soil-testing',
        'seed-selling',
        'labour-service',
        'others'
      ];
      return {
        success: true,
        data: response.data.categories
          .filter(c => {
            if (c.parentCategory) return false;
            const slug = (c.slug || '').trim().toLowerCase();
            return !excludeSlugs.includes(slug);
          })
          .map(c => ({
            ...c,
            id: c.id || (c._id?.$oid || c._id)?.toString() || ""
          }))
      };
    }
    return { success: false, data: [] };
  },

  getImplements: async (parentId) => {
    const response = await api.get('/public/categories');
    if (response.data.success && Array.isArray(response.data.categories)) {
      return {
        success: true,
        data: response.data.categories
          .filter(c => {
            const pid = c.parentCategory?._id || c.parentCategory?.id || c.parentCategory?.$oid || c.parentCategory;
            return pid?.toString() === parentId?.toString();
          })
          .map(c => ({
            ...c,
            id: c.id || (c._id?.$oid || c._id)?.toString() || ""
          }))
      };
    }
    return { success: false, data: [] };
  }
};

export default vendorEquipmentService;
