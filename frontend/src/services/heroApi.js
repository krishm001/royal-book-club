import api from '../api/apiClient';

export const fetchHeroConfig = async () => {
  const response = await api.get('/api/v1/public/hero');
  return response.data;
};

export const updateHeroConfig = async (config) => {
  const response = await api.post('/api/v1/admin/hero', config);
  return response.data;
};

export const deleteHeroConfig = async () => {
  const response = await api.delete('/api/v1/admin/hero');
  return response.data;
};
