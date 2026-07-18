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

export const clearCheckout = async (id, adminId) => {
  const response = await api.post(`/api/v1/checkout/clear/${id}?adminId=${encodeURIComponent(adminId || '')}`);
  return response.data;
};
export const fetchBookByNtagUid = async (uid) => {
  const response = await api.get(`/api/v1/books/ntag/${encodeURIComponent(uid)}`);
  return response.data;
};

export const pairNtagUid = async (isbn, ntagUid) => {
  const response = await api.post(`/api/v1/admin/books/pair?isbn=${encodeURIComponent(isbn)}&ntagUid=${encodeURIComponent(ntagUid)}`);
  return response.data;
};

export const fetchCheckoutById = async (id) => {
  const response = await api.get(`/api/v1/checkout/${encodeURIComponent(id)}`);
  return response.data;
};

export const searchBookMetadata = async (query) => {
  const response = await api.get(`/api/v1/books/search-metadata?q=${encodeURIComponent(query)}`);
  return response.data;
};

export const rateCheckout = async (id, rating) => {
  const response = await api.post(`/api/v1/checkout/${encodeURIComponent(id)}/rate?rating=${rating}`);
  return response.data;
};

/* Site Reviews & Admin Curation API */
export const fetchApprovedSiteReviews = async () => {
  const response = await api.get('/api/v1/site-reviews');
  return response.data;
};

export const submitSiteReview = async (reviewData) => {
  const response = await api.post('/api/v1/site-reviews', reviewData);
  return response.data;
};

export const fetchPendingSiteReviews = async () => {
  const response = await api.get('/api/v1/admin/site-reviews');
  return response.data;
};

export const approveSiteReview = async (id) => {
  const response = await api.post(`/api/v1/admin/site-reviews/${encodeURIComponent(id)}/approve`);
  return response.data;
};

export const rejectSiteReview = async (id) => {
  const response = await api.delete(`/api/v1/admin/site-reviews/${encodeURIComponent(id)}`);
  return response.data;
};

export const publishSiteReview = async (id) => {
  const response = await api.post(`/api/v1/admin/site-reviews/${encodeURIComponent(id)}/publish`);
  return response.data;
};

export const unpublishSiteReview = async (id) => {
  const response = await api.post(`/api/v1/admin/site-reviews/${encodeURIComponent(id)}/unpublish`);
  return response.data;
};

export const disapproveSiteReview = async (id) => {
  const response = await api.post(`/api/v1/admin/site-reviews/${encodeURIComponent(id)}/disapprove`);
  return response.data;
};

export const fetchRatingStatistics = async () => {
  const response = await api.get('/api/v1/admin/rating-statistics');
  return response.data;
};

