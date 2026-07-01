import api from '../api/apiClient';

/**
 * Translates a map of fields to target languages.
 * 
 * @param {Object} texts - e.g., { title: "Spirited Panel", desc: "An elegant evening" }
 * @param {Array<string>} targetLanguages - e.g., ["hi", "kn"]
 * @returns {Promise<Object>} API response with translations map
 */
export const translateFields = async (texts, targetLanguages = ['hi', 'kn']) => {
  const response = await api.post('/api/v1/admin/translate', {
    texts,
    targetLanguages
  });
  return response.data;
};
