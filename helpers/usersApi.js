const { apiClient } = require('./apiClient');

const usersApi = {
  list: (params) => apiClient.get('/users', { params }),
  getById: (id, config) => apiClient.get(`/users/${id}`, config),
  search: (q) => apiClient.get('/users/search', { params: { q } }),
  filter: (key, value) => apiClient.get('/users/filter', { params: { key, value } }),
  create: (payload, config) => apiClient.post('/users/add', payload, config),
  update: (id, payload) => apiClient.put(`/users/${id}`, payload),
  patch: (id, payload) => apiClient.patch(`/users/${id}`, payload),
  remove: (id, config) => apiClient.delete(`/users/${id}`, config),
};

module.exports = { usersApi };
