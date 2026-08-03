const { apiClient } = require('./apiClient');

const postsApi = {
  list: (params) => apiClient.get('/posts', { params }),
  getById: (id) => apiClient.get(`/posts/${id}`),
  search: (q) => apiClient.get('/posts/search', { params: { q } }),
  create: (payload) => apiClient.post('/posts/add', payload),
  update: (id, payload) => apiClient.put(`/posts/${id}`, payload),
  remove: (id) => apiClient.delete(`/posts/${id}`),
};

module.exports = { postsApi };
