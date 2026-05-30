import api from '../api/apiClient';

export const fetchBooks = async () => {
  const response = await api.get('/api/v1/books');
  return response.data;
};

export const fetchBookByIsbn = async (isbn) => {
  const response = await api.get(`/api/v1/books/${encodeURIComponent(isbn)}`);
  return response.data;
};

export const lookupBookByIsbn = async (isbn) => {
  const response = await api.get(`/api/v1/books/lookup/${encodeURIComponent(isbn)}`);
  return response.data;
};

export const checkoutBook = async (bookId, memberId) => {
  const response = await api.post('/api/v1/checkout', {
    bookId,
    memberId,
  });
  return response.data;
};

export const createBook = async (bookDto) => {
  const response = await api.post('/api/v1/admin/books', bookDto);
  return response.data;
};
