import api from '../api/apiClient';

export const getCheckoutSettings = async () => {
  const response = await api.get('/api/v1/public/checkout-settings');
  return response.data;
};

export const updateCheckoutSettings = async (settings) => {
  const response = await api.put('/api/v1/admin/checkout-settings', settings);
  return response.data;
};
