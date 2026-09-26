import api from '../../../services/api';

// ── Admin CRUD ────────────────────────────────────────────────────────────

export const getAllAdmins = async (params = {}) => {
  const response = await api.get('/admin/admins', { params });
  return response.data;
};

export const getAdminById = async (id) => {
  const response = await api.get(`/admin/admins/${id}`);
  return response.data;
};

export const createAdmin = async (data) => {
  const response = await api.post('/admin/admins', data);
  return response.data;
};

export const updateAdmin = async (id, data) => {
  const response = await api.put(`/admin/admins/${id}`, data);
  return response.data;
};

export const deleteAdmin = async (id) => {
  const response = await api.delete(`/admin/admins/${id}`);
  return response.data;
};

export const toggleAdminStatus = async (id) => {
  const response = await api.patch(`/admin/admins/${id}/status`);
  return response.data;
};

export const updatePermissions = async (id, permissions) => {
  const response = await api.patch(`/admin/admins/${id}/permissions`, { permissions });
  return response.data;
};

export const getPermissionKeys = async () => {
  const response = await api.get('/admin/admins/permission-keys');
  return response.data;
};

// ── Audit Logs ────────────────────────────────────────────────────────────

export const getAuditLogs = async (params = {}) => {
  const response = await api.get('/admin/admins/audit-logs', { params });
  return response.data;
};

// ── Geography ─────────────────────────────────────────────────────────────

export const getDistricts = async (cityId) => {
  const response = await api.get('/admin/admins/geo/districts', { params: { cityId } });
  return response.data;
};

export const createDistrict = async (data) => {
  const response = await api.post('/admin/admins/geo/districts', data);
  return response.data;
};

export const updateDistrict = async (id, data) => {
  const response = await api.put(`/admin/admins/geo/districts/${id}`, data);
  return response.data;
};

export const deleteDistrict = async (id) => {
  const response = await api.delete(`/admin/admins/geo/districts/${id}`);
  return response.data;
};

export const getSubDistricts = async (districtId) => {
  const response = await api.get('/admin/admins/geo/sub-districts', { params: { districtId } });
  return response.data;
};

export const createSubDistrict = async (data) => {
  const response = await api.post('/admin/admins/geo/sub-districts', data);
  return response.data;
};

export const updateSubDistrict = async (id, data) => {
  const response = await api.put(`/admin/admins/geo/sub-districts/${id}`, data);
  return response.data;
};

export const deleteSubDistrict = async (id) => {
  const response = await api.delete(`/admin/admins/geo/sub-districts/${id}`);
  return response.data;
};

// ── Admin Registrations & Compensation ─────────────────────────────────────

export const getAdminRegistrations = async (id, params = {}) => {
  const response = await api.get(`/admin/admins/${id}/registrations`, { params });
  return response.data;
};

export const updateAdminSalary = async (id, salaryData) => {
  const response = await api.put(`/admin/admins/${id}/salary`, salaryData);
  return response.data;
};

// ── People Attribution & Traceability ─────────────────────────────────────

export const getAttributionSummary = async (params = {}) => {
  const response = await api.get('/admin/admins/attribution/summary', { params });
  return response.data;
};

export const exportAttributionData = async (params = {}) => {
  const response = await api.get('/admin/admins/attribution/export', {
    params,
    responseType: 'blob'
  });
  return response.data;
};

