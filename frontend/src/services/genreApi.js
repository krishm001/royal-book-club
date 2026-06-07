import api from '../api/apiClient';

export const fetchBookHouses = async () => {
  const response = await api.get('/api/v1/genres/books');
  return response.data;
};

export const fetchBlogHouses = async () => {
  const response = await api.get('/api/v1/genres/blogs');
  return response.data;
};

export const createBookHouse = async (house) => {
  const response = await api.post('/api/v1/admin/genres/books', house);
  return response.data;
};

export const deleteBookHouse = async (id) => {
  const response = await api.delete(`/api/v1/admin/genres/books/${id}`);
  return response.data;
};

export const createBlogHouse = async (house) => {
  const response = await api.post('/api/v1/admin/genres/blogs', house);
  return response.data;
};

export const deleteBlogHouse = async (id) => {
  const response = await api.delete(`/api/v1/admin/genres/blogs/${id}`);
  return response.data;
};
