import api from '../api/apiClient';

export const registerUser = async (uid, email, displayName) => {
  const response = await api.post('/api/v1/auth/register', {
    uid,
    email,
    displayName
  });
  return response.data;
};
