const { apiClient } = require('./apiClient');

const totpApi = {
  generate: (key) => apiClient.get('/2fa', { params: { key } }),
  generateViaPost: (key) => apiClient.post('/2fa', { key }),
};

module.exports = { totpApi };
