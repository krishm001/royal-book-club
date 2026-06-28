import api from '../api/apiClient';

/**
 * Fetch the currently active poll from the database.
 */
export const fetchActivePoll = async () => {
  const response = await api.get('/api/v1/public/polls/active');
  return response.data;
};

/**
 * Cast a vote on a specific option of an active poll.
 * @param {string} pollId - The ID of the active poll
 * @param {number} optionIndex - The 0-indexed option selected (0 to 3)
 */
export const castVote = async (pollId, optionIndex) => {
  const response = await api.put(`/api/v1/public/polls/${pollId}/vote`, null, {
    params: { optionIndex },
  });
  return response.data;
};

/**
 * Admin: Create a new community poll.
 * Automatically deactivates the current active poll.
 * @param {Object} pollData - { question, options, membersOnly }
 */
export const createPoll = async (pollData) => {
  const response = await api.post('/api/v1/admin/polls', pollData);
  return response.data;
};

/**
 * Admin: Fetch full poll history.
 */
export const fetchPollHistory = async () => {
  const response = await api.get('/api/v1/admin/polls/history');
  return response.data;
};

/**
 * Admin: Reactivate a past poll by setting active = true.
 * @param {string} pollId - The ID of the poll to reactivate
 */
export const activatePoll = async (pollId) => {
  const response = await api.put(`/api/v1/admin/polls/${pollId}/activate`);
  return response.data;
};
