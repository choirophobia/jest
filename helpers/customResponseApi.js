const { apiClient } = require('./apiClient');

const customResponseApi = {
  create: (json, method) => apiClient.post('/c/generate', { json, method }),
  // Generated URLs are absolute (https://dummyjson.com/c/...), so axios uses
  // them as-is instead of resolving against apiClient's baseURL.
  call: (url, method = 'get') => apiClient.request({ url, method }),
};

module.exports = { customResponseApi };
