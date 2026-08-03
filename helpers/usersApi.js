const { apiClient } = require('./apiClient');

const usersApi = {
  list: (params) => apiClient.get('/users', { params }),
  getById: (id) => apiClient.get(`/users/${id}`),
  search: (q) => apiClient.get('/users/search', { params: { q } }),
  filter: (key, value) => apiClient.get('/users/filter', { params: { key, value } }),
  create: (payload) => apiClient.post('/users/add', payload),
  update: (id, payload) => apiClient.put(`/users/${id}`, payload),
  patch: (id, payload) => apiClient.patch(`/users/${id}`, payload),
  remove: (id) => apiClient.delete(`/users/${id}`),
};

module.exports = { usersApi };
