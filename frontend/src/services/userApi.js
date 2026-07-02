import api from '../api/apiClient';

export const getAllUsers = async () => {
  const response = await api.get('/api/v1/users');
  return response.data;
};

export const updateUserRole = async (userId, role) => {
  const response = await api.put(`/api/v1/admin/users/${userId}/role`, { role });
  return response.data;
};

export const getCurrentUserProfile = async () => {
  const response = await api.get('/api/v1/auth/me');
  return response.data;
};

export const updateUserProfile = async (profileUpdate) => {
  const response = await api.put('/api/v1/users/profile', profileUpdate);
  return response.data;
};

export const getActiveCheckoutsCount = async (userId) => {
  const response = await api.get(`/api/v1/admin/users/${userId}/active-checkouts-count`);
  return response.data;
};

export const deleteUserPermanently = async (userId, force = false) => {
  const response = await api.delete(`/api/v1/admin/users/${userId}?force=${force}`);
  return response.data;
};


