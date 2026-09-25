import api from './api';

/**
 * Unified Withdrawal Service
 * Handles user, vendor, worker, and admin withdrawal operations
 */
const withdrawalService = {
  // ==========================================
  // USER / VENDOR / WORKER OPERATIONS
  // ==========================================

  /**
   * Get withdrawable balance, reserved balance, and active minimum limit
   */
  getBalance: async () => {
    const response = await api.get('/withdrawals/balance');
    return response.data;
  },

  /**
   * Get user/vendor/worker saved banking details
   */
  getBankDetails: async () => {
    const response = await api.get('/withdrawals/bank-details');
    return response.data;
  },

  /**
   * Add or update banking details
   * @param {Object} details { accountHolderName, accountNumber, ifsc, bankName, branchName, upiId }
   */
  updateBankDetails: async (details) => {
    const response = await api.post('/withdrawals/bank-details', details);
    return response.data;
  },

  /**
   * Submit a new withdrawal request
   * @param {Object} data { amount, notes }
   */
  requestWithdrawal: async (data) => {
    const response = await api.post('/withdrawals/request', data);
    return response.data;
  },

  /**
   * Get own withdrawal history
   * @param {Object} params { page, limit, status }
   */
  getHistory: async (params = {}) => {
    const response = await api.get('/withdrawals/history', { params });
    return response.data;
  },

  /**
   * Get single withdrawal detail
   * @param {string} id
   */
  getDetail: async (id) => {
    const response = await api.get(`/withdrawals/detail/${id}`);
    return response.data;
  },

  /**
   * Get protected payment proof
   * @param {string} id
   */
  getPaymentProof: async (id) => {
    const response = await api.get(`/withdrawals/${id}/payment-proof`);
    return response.data;
  },

  // ==========================================
  // ADMIN OPERATIONS
  // ==========================================

  /**
   * Get admin global withdrawal settings (minimum withdrawal amount)
   */
  adminGetSettings: async () => {
    const response = await api.get('/withdrawals/admin/settings');
    return response.data;
  },

  /**
   * Update admin global withdrawal settings
   * @param {Object} data { minWithdrawalAmountINR }
   */
  adminUpdateSettings: async (data) => {
    const response = await api.put('/withdrawals/admin/settings', data);
    return response.data;
  },

  /**
   * List all withdrawal requests across Farmer, Vendor, and Worker
   * @param {Object} params { page, limit, status, role, search }
   */
  adminListWithdrawals: async (params = {}) => {
    const response = await api.get('/withdrawals/admin/all', { params });
    return response.data;
  },

  /**
   * Get single withdrawal request with unmasked banking info for payout
   * @param {string} id
   */
  adminGetWithdrawal: async (id) => {
    const response = await api.get(`/withdrawals/admin/${id}`);
    return response.data;
  },
  adminGetDetail: async (id) => {
    const response = await api.get(`/withdrawals/admin/${id}`);
    return response.data;
  },

  /**
   * Admin approves a withdrawal request (status -> ADMIN_ACCEPTED)
   * Note: This does NOT finalize balance or complete payout!
   * @param {string} id
   * @param {string} adminNotes
   */
  adminAccept: async (id, adminNotes = '') => {
    const response = await api.post(`/withdrawals/admin/${id}/accept`, { adminNotes });
    return response.data;
  },

  /**
   * Admin marks an accepted withdrawal as PROCESSING
   * @param {string} id
   * @param {string} adminNotes
   */
  adminMarkProcessing: async (id, adminNotes = '') => {
    const response = await api.post(`/withdrawals/admin/${id}/process`, { adminNotes });
    return response.data;
  },

  /**
   * Admin rejects a withdrawal request with mandatory reason (refunds reserved balance)
   * @param {string} id
   * @param {string} rejectionReason
   * @param {string} adminNotes
   */
  adminReject: async (id, rejectionReason, adminNotes = '') => {
    const response = await api.post(`/withdrawals/admin/${id}/reject`, {
      rejectionReason,
      adminNotes
    });
    return response.data;
  },

  /**
   * Admin completes manual payout with mandatory payment proof upload & reference
   * @param {string} id
   * @param {FormData} formData Must contain 'paymentProof' (file), optional 'paymentReference', optional 'adminNotes'
   */
  adminComplete: async (id, formData) => {
    const response = await api.post(`/withdrawals/admin/${id}/complete`, formData);
    return response.data;
  }
};

export default withdrawalService;
