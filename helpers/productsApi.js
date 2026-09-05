const { apiClient } = require('./apiClient');

const productsApi = {
  list: (params) => apiClient.get('/products', { params }),
  // Sidesteps axios's `params` object (which can't represent a repeated
  // query key) — for a caller that needs to send a raw, possibly-malformed
  // query string as-is, e.g. `limit=5&limit=50`.
  listWithRawQuery: (queryString) => apiClient.get(`/products?${queryString}`),
  getById: (id, config) => apiClient.get(`/products/${id}`, config),
  search: (q) => apiClient.get('/products/search', { params: { q } }),
  byCategory: (category) => apiClient.get(`/products/category/${category}`),
  categories: () => apiClient.get('/products/categories'),
  create: (payload, config) => apiClient.post('/products/add', payload, config),
  update: (id, payload, config) => apiClient.put(`/products/${id}`, payload, config),
  patch: (id, payload) => apiClient.patch(`/products/${id}`, payload),
  remove: (id) => apiClient.delete(`/products/${id}`),
};

module.exports = { productsApi };
