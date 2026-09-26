import api from '../../../services/api';

// ── Super Admin Payroll Management ──────────────────────────────────────────

export const getAdminSalaryList = async (params = {}) => {
  const response = await api.get('/admin/payroll/admin-salary-list', { params });
  return response.data;
};

export const getPayrolls = async (params = {}) => {
  const response = await api.get('/admin/payroll', { params });
  return response.data;
};

export const generatePayroll = async (data = {}) => {
  const response = await api.post('/admin/payroll/generate', data);
  return response.data;
};

export const getPayrollById = async (id) => {
  const response = await api.get(`/admin/payroll/${id}`);
  return response.data;
};

export const updatePayrollStatus = async (id, status, notes = '') => {
  const response = await api.patch(`/admin/payroll/${id}/status`, { status, notes });
  return response.data;
};

export const addPayrollAdjustment = async (id, data) => {
  const response = await api.post(`/admin/payroll/${id}/adjustment`, data);
  return response.data;
};

export const recordPayment = async (id, paymentData) => {
  const response = await api.post(`/admin/payroll/${id}/payment`, paymentData);
  return response.data;
};

export const reversePayment = async (id, paymentId, reason) => {
  const response = await api.post(`/admin/payroll/${id}/reverse-payment`, { paymentId, reason });
  return response.data;
};

export const exportPayrollReconciliation = async (params = {}) => {
  const response = await api.get('/admin/payroll/export/csv', {
    params,
    responseType: 'blob'
  });
  return response.data;
};

// ── Payment Proof ───────────────────────────────────────────────────────────

export const getPaymentProof = async (id, paymentId) => {
  const response = await api.get(`/admin/payroll/${id}/proof/${paymentId}`);
  return response.data;
};

export const uploadPaymentProofFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/admin/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// ── Field Admin Personal History ────────────────────────────────────────────

export const getMyPayrollHistory = async () => {
  const response = await api.get('/admin/payroll/my-history');
  return response.data;
};
