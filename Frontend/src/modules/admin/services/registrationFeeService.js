import api from '../../../services/api';

/**
 * Service for Admin to fetch and manage Registration Fee transactions
 */
export const registrationFeeService = {
  /**
   * Get registration fee payments with filtering and pagination
   */
  getPayments: async (params = {}) => {
    const qp = new URLSearchParams();
    if (params.role) qp.append('role', params.role);
    if (params.status) qp.append('status', params.status);
    if (params.search) qp.append('search', params.search);
    if (params.page) qp.append('page', params.page);
    if (params.limit) qp.append('limit', params.limit);
    if (params.startDate) qp.append('startDate', params.startDate);
    if (params.endDate) qp.append('endDate', params.endDate);

    const response = await api.get(`/admin/registration-fees${qp.toString() ? `?${qp.toString()}` : ''}`);
    return response.data;
  },

  /**
   * Get all active registration fee configs
   */
  getConfigs: async () => {
    const response = await api.get('/admin/settings/fees');
    return response.data;
  }
};

export default registrationFeeService;
