import api from '../../../services/api';

/**
 * Service for Admin to manage Workers and Team Leaders
 */
export const workerService = {
  /**
   * Get all workers/team leaders with pagination and filters
   */
  getAllWorkers: async (params = {}) => {
    const qp = new URLSearchParams();
    if (params.page) qp.append('page', params.page);
    if (params.limit) qp.append('limit', params.limit);
    if (params.search) qp.append('search', params.search);
    if (params.approvalStatus) qp.append('approvalStatus', params.approvalStatus);
    if (params.isActive !== undefined) qp.append('isActive', params.isActive);
    
    const response = await api.get(`/admin/workers${qp.toString() ? `?${qp.toString()}` : ''}`);
    return response.data;
  },

  /**
   * Get specific worker details
   */
  getWorkerDetails: async (id) => {
    const response = await api.get(`/admin/workers/${id}`);
    return response.data;
  },

  /**
   * Approve a pending worker
   */
  approveWorker: async (id) => {
    const response = await api.post(`/admin/workers/${id}/approve`);
    return response.data;
  },

  /**
   * Reject a pending worker
   */
  rejectWorker: async (id, reason = '') => {
    const response = await api.post(`/admin/workers/${id}/reject`, { reason });
    return response.data;
  },

  /**
   * Suspend an active worker
   */
  suspendWorker: async (id) => {
    const response = await api.post(`/admin/workers/${id}/suspend`);
    return response.data;
  },

  /**
   * Toggle worker active status
   */
  toggleWorkerStatus: async (id, isActive) => {
    const response = await api.patch(`/admin/workers/${id}/status`, { isActive });
    return response.data;
  },

  /**
   * Get all worker jobs globally (for admin view)
   */
  getAllWorkerJobs: async (params = {}) => {
    const qp = new URLSearchParams();
    if (params.page) qp.append('page', params.page);
    if (params.limit) qp.append('limit', params.limit);
    if (params.status) qp.append('status', params.status);
    
    const response = await api.get(`/admin/workers/jobs${qp.toString() ? `?${qp.toString()}` : ''}`);
    return response.data;
  },

  /**
   * Get jobs for a specific worker
   */
  getWorkerJobs: async (id, params = {}) => {
    const qp = new URLSearchParams();
    if (params.page) qp.append('page', params.page);
    if (params.limit) qp.append('limit', params.limit);
    
    const response = await api.get(`/admin/workers/${id}/jobs${qp.toString() ? `?${qp.toString()}` : ''}`);
    return response.data;
  },

  /**
   * Get worker payments summary
   */
  getWorkerPaymentsSummary: async () => {
    const response = await api.get(`/admin/workers/payments`);
    return response.data;
  },

  /**
   * Get earnings for a specific worker
   */
  getWorkerEarnings: async (id) => {
    const response = await api.get(`/admin/workers/${id}/earnings`);
    return response.data;
  }
};

export default workerService;
