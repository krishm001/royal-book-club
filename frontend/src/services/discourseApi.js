import api from '../api/apiClient';

export const fetchDiscourses = async (type = 'CHRONICLE') => {
  const response = await api.get(`/api/v1/discourses?type=${type}`);
  return response.data;
};

export const fetchDiscourseById = async (id) => {
  const response = await api.get(`/api/v1/discourses/${id}`);
  return response.data;
};

export const publishDiscourse = async (discourse) => {
  const response = await api.post('/api/v1/discourses', discourse);
  return response.data;
};

export const commentOnChronicle = async (id, comment) => {
  const response = await api.post(`/api/v1/discourses/${id}/comment`, comment);
  return response.data;
};

export const replyToDebate = async (id, reply) => {
  const response = await api.post(`/api/v1/discourses/${id}/reply`, reply);
  return response.data;
};

export const updateDiscourse = async (id, payload) => {
  const response = await api.put(`/api/v1/discourses/${id}`, payload);
  return response.data;
};
