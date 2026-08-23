const { apiClient } = require('./apiClient');

const quotesApi = {
  list: (params) => apiClient.get('/quotes', { params }),
  getById: (id) => apiClient.get(`/quotes/${id}`),
  random: () => apiClient.get('/quotes/random'),
};

module.exports = { quotesApi };
