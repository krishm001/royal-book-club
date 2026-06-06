import api from '../api/apiClient';

export const getAllUsers = async () => {
  const response = await api.get('/api/v1/users');
  return response.data;
};

export const updateUserRole = async (userId, role) => {
  const response = await api.put(`/api/v1/admin/users/${userId}/role`, { role });
  return response.data;
};
