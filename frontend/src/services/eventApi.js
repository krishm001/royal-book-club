import api from '../api/apiClient';

export const fetchEvents = async () => {
  const response = await api.get('/api/v1/events');
  return response.data;
};

export const fetchEventById = async (id) => {
  const response = await api.get(`/api/v1/events/${id}`);
  return response.data;
};

export const rsvpToEvent = async (id) => {
  const response = await api.post(`/api/v1/events/${id}/rsvp`);
  return response.data;
};

export const cancelRsvpToEvent = async (id) => {
  const response = await api.delete(`/api/v1/events/${id}/rsvp`);
  return response.data;
};

export const createOrUpdateEvent = async (event) => {
  const response = await api.post('/api/v1/admin/events', event);
  return response.data;
};

export const deleteEvent = async (id) => {
  const response = await api.delete(`/api/v1/admin/events/${id}`);
  return response.data;
};
