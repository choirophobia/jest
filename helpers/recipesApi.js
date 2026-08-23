const { apiClient } = require('./apiClient');

const recipesApi = {
  list: (params) => apiClient.get('/recipes', { params }),
  getById: (id) => apiClient.get(`/recipes/${id}`),
  search: (q) => apiClient.get('/recipes/search', { params: { q } }),
  tags: () => apiClient.get('/recipes/tags'),
  byTag: (tag) => apiClient.get(`/recipes/tag/${tag}`),
  byMealType: (mealType) => apiClient.get(`/recipes/meal-type/${mealType}`),
  create: (payload) => apiClient.post('/recipes/add', payload),
  update: (id, payload) => apiClient.put(`/recipes/${id}`, payload),
  remove: (id) => apiClient.delete(`/recipes/${id}`),
};

module.exports = { recipesApi };
