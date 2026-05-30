import api from '../api/apiClient';

export const createAdminRequest = async (reason) => {
  const response = await api.post('/api/v1/admin-requests', { reason });
  return response.data;
};

export const listAdminRequests = async (status) => {
  const params = {};
  if (status) params.status = status;
  const response = await api.get('/api/v1/admin-requests', { params });
  return response.data;
};

export const approveAdminRequest = async (id, note) => {
  const response = await api.post(`/api/v1/admin-requests/${encodeURIComponent(id)}/approve`, { reason: note });
  return response.data;
};

export const rejectAdminRequest = async (id, note) => {
  const response = await api.post(`/api/v1/admin-requests/${encodeURIComponent(id)}/reject`, { reason: note });
  return response.data;
};
