import api from '../api/apiClient';

export const startAudit = async (curatorId = '') => {
  const response = await api.post(`/api/v1/audit/start?curatorId=${encodeURIComponent(curatorId)}`);
  return response.data;
};

export const scanItem = async (auditId, identifier) => {
  const response = await api.post(`/api/v1/audit/${auditId}/scan?identifier=${encodeURIComponent(identifier)}`);
  return response.data;
};

export const completeAudit = async (auditId) => {
  const response = await api.post(`/api/v1/audit/${auditId}/complete`);
  return response.data;
};

export const getActiveAudit = async (curatorId = '') => {
  const response = await api.get(`/api/v1/audit/active?curatorId=${encodeURIComponent(curatorId)}`);
  return response.data;
};
