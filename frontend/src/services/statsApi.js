import api from '../api/apiClient';

/**
 * Fetch aggregated metrics from the live database.
 */
export const fetchStatsSummary = async () => {
  const response = await api.get('/api/v1/public/stats/summary');
  return response.data;
};
