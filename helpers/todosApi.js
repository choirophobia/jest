const { apiClient } = require('./apiClient');

const todosApi = {
  list: (params) => apiClient.get('/todos', { params }),
  getById: (id) => apiClient.get(`/todos/${id}`),
  random: () => apiClient.get('/todos/random'),
  create: (payload) => apiClient.post('/todos/add', payload),
  update: (id, payload) => apiClient.put(`/todos/${id}`, payload),
  remove: (id) => apiClient.delete(`/todos/${id}`),
};

module.exports = { todosApi };
