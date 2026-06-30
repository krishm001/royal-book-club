import api from '../api/apiClient';

export const getBlockedContents = async () => {
  const response = await api.get('/api/v1/admin/moderation/blocked');
  return response.data;
};

export const clearBlockedContents = async () => {
  const response = await api.delete('/api/v1/admin/moderation/blocked');
  return response.data;
};

export const getPendingReviews = async () => {
  const response = await api.get('/api/v1/admin/moderation/reviews');
  return response.data;
};

export const approveReview = async (collection, id) => {
  const response = await api.put(`/api/v1/admin/moderation/reviews/${collection}/${id}/approve`);
  return response.data;
};

export const rejectReview = async (collection, id) => {
  const response = await api.delete(`/api/v1/admin/moderation/reviews/${collection}/${id}/reject`);
  return response.data;
};
