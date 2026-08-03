const { apiClient } = require('./apiClient');

const cartsApi = {
  list: (params) => apiClient.get('/carts', { params }),
  getById: (id) => apiClient.get(`/carts/${id}`),
  byUser: (userId) => apiClient.get(`/carts/user/${userId}`),
  create: (payload) => apiClient.post('/carts/add', payload),
  update: (id, payload) => apiClient.put(`/carts/${id}`, payload),
  patch: (id, payload) => apiClient.patch(`/carts/${id}`, payload),
  remove: (id) => apiClient.delete(`/carts/${id}`),
};

module.exports = { cartsApi };
