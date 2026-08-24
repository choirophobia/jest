const { apiClient } = require('./apiClient');

const webhookApi = {
  create: () => apiClient.post('/webhook/create'),
  send: (identifier, payload, method = 'post') =>
    apiClient.request({ url: `/webhook/${identifier}`, method, data: payload }),
  listRequests: (identifier) => apiClient.get(`/webhook/${identifier}/requests`),
  deleteRequest: (identifier, requestId) =>
    apiClient.delete(`/webhook/${identifier}/requests/${requestId}`),
};

module.exports = { webhookApi };
