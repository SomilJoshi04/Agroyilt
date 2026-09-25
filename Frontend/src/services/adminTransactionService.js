import api from './api';

export const adminTransactionService = {
  getAllTransactions: async (params) => {
    try {
      const response = await api.get('/admin/transactions', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  },

  getTransactionStats: async (params) => {
    try {
      const response = await api.get('/admin/transactions/stats', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
      throw error;
    }
  },

  getReconciliationReport: async () => {
    try {
      const response = await api.get('/admin/transactions/reconciliation');
      return response.data;
    } catch (error) {
      console.error('Error fetching reconciliation report:', error);
      throw error;
    }
  },

  exportTransactionsCSV: async (params) => {
    try {
      const response = await api.get('/admin/transactions/export', {
        params,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting transactions CSV:', error);
      throw error;
    }
  },

  // Settlement / Vendor endpoints
  getVendorBalances: async (params) => {
    try {
      const response = await api.get('/admin/settlements/vendors', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching vendor balances:', error);
      throw error;
    }
  },

  getSettlementDashboard: async () => {
    try {
      const response = await api.get('/admin/settlements/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching settlement dashboard:', error);
      throw error;
    }
  },

  // Worker Payment endpoints
  getWorkerPaymentsSummary: async () => {
    try {
      const response = await api.get('/admin/workers/payments');
      return response.data;
    } catch (error) {
      console.error('Error fetching worker payments summary:', error);
      throw error;
    }
  },

  // Reports
  getPaymentReports: async (params) => {
    return adminTransactionService.getAllTransactions(params);
  }
};
