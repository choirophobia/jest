const { apiClient } = require('./apiClient');

const productsApi = {
  list: (params) => apiClient.get('/products', { params }),
  getById: (id, config) => apiClient.get(`/products/${id}`, config),
  search: (q) => apiClient.get('/products/search', { params: { q } }),
  byCategory: (category) => apiClient.get(`/products/category/${category}`),
  categories: () => apiClient.get('/products/categories'),
  create: (payload) => apiClient.post('/products/add', payload),
  update: (id, payload) => apiClient.put(`/products/${id}`, payload),
  patch: (id, payload) => apiClient.patch(`/products/${id}`, payload),
  remove: (id) => apiClient.delete(`/products/${id}`),
};

module.exports = { productsApi };
