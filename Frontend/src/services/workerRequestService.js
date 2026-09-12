import api from './api';

export const workerRequestService = {
  // ── Worker (Single Requests) ───────────────────────────────────────────
  getIncomingRequests: async (status = '') => {
    const response = await api.get(`/workers/booking-requests${status ? `?status=${status}` : ''}`);
    return response.data;
  },

  respondToRequest: async (id, action, rate, message = '') => {
    const response = await api.patch(`/workers/booking-request/${id}/respond`, { action, rate, message });
    return response.data;
  },

  // ── Team Leader (Group Requests) ─────────────────────────────────────────
  getGroupRequests: async (status = '') => {
    const response = await api.get(`/workers/group-requests${status ? `?status=${status}` : ''}`);
    return response.data;
  },

  leaderRespondToRequest: async (id, action, rate, message = '') => {
    const response = await api.patch(`/workers/group-request/${id}/respond`, { action, rate, message });
    return response.data;
  },

  dispatchToMembers: async (id) => {
    const response = await api.post(`/workers/group-request/${id}/dispatch-members`);
    return response.data;
  },

  getMemberResponses: async (id) => {
    const response = await api.get(`/workers/group-request/${id}/members`);
    return response.data;
  },

  leaderSelectWorkers: async (id, workerIds) => {
    const response = await api.patch(`/workers/group-request/${id}/select-workers`, { workerIds });
    return response.data;
  },

  // ── Team Member (Group Request Responses) ──────────────────────────────
  memberRespondToRequest: async (id, action) => {
    const response = await api.patch(`/workers/group-request/${id}/member-respond`, { action });
    return response.data;
  }
};

export default workerRequestService;
