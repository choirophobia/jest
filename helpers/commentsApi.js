const { apiClient } = require('./apiClient');

const commentsApi = {
  list: (params) => apiClient.get('/comments', { params }),
  getById: (id) => apiClient.get(`/comments/${id}`),
  byPost: (postId) => apiClient.get(`/comments/post/${postId}`),
  create: (payload) => apiClient.post('/comments/add', payload),
  update: (id, payload) => apiClient.put(`/comments/${id}`, payload),
  remove: (id) => apiClient.delete(`/comments/${id}`),
};

module.exports = { commentsApi };
