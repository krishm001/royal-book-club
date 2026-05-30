import api from '../api/apiClient';

export const getAllUsers = async () => {
  const response = await api.get('/api/v1/users');
  return response.data;
};
