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

export const fetchBookReviews = async (isbn) => {
  const response = await api.get(`/api/v1/books/${encodeURIComponent(isbn)}/reviews`);
  return response.data;
};

export const submitBookReview = async (isbn, review) => {
  const response = await api.post(`/api/v1/books/${encodeURIComponent(isbn)}/reviews`, review);
  return response.data;
};

export const updateBookReview = async (isbn, reviewId, payload) => {
  const response = await api.put(`/api/v1/books/${encodeURIComponent(isbn)}/reviews/${reviewId}`, payload);
  return response.data;
};

export const deleteBookReview = async (isbn, reviewId) => {
  const response = await api.delete(`/api/v1/books/${encodeURIComponent(isbn)}/reviews/${reviewId}`);
  return response.data;
};

/* Fallback request flows & Administrative Curation ledger */
export const fetchCheckouts = async () => {
  const response = await api.get('/api/v1/checkout');
  return response.data;
};

export const requestCheckout = async (checkoutRequest) => {
  const response = await api.post('/api/v1/checkout/request', checkoutRequest);
  return response.data;
};

export const approveCheckout = async (id, adminId) => {
  const response = await api.post(`/api/v1/checkout/approve/${id}?adminId=${encodeURIComponent(adminId || '')}`);
  return response.data;
};

export const rejectCheckout = async (id, adminId) => {
  const response = await api.post(`/api/v1/checkout/reject/${id}?adminId=${encodeURIComponent(adminId || '')}`);
  return response.data;
};

export const requestReturn = async (returnRequest) => {
  const response = await api.post('/api/v1/checkout/request-return', returnRequest);
  return response.data;
};

export const approveReturn = async (id, adminId) => {
  const response = await api.post(`/api/v1/checkout/approve-return/${id}?adminId=${encodeURIComponent(adminId || '')}`);
  return response.data;
};

/* Direct NFC Verified Transactions */
export const verifiedCheckout = async (checkoutRequest) => {
  const response = await api.post('/api/v1/checkout/verified', checkoutRequest);
  return response.data;
};

export const verifiedReturn = async (returnRequest) => {
  const response = await api.post('/api/v1/checkout/verified-return', returnRequest);
  return response.data;
};

export const fetchCheckoutsByMember = async (memberId) => {
  const response = await api.get(`/api/v1/checkout/member/${encodeURIComponent(memberId)}`);
  return response.data;
};


