const { apiClient } = require('./apiClient');

const path = (code, message) => (message ? `/http/${code}/${message}` : `/http/${code}`);

const mockHttpApi = {
  get: (code, message) => apiClient.get(path(code, message)),
  post: (code, message) => apiClient.post(path(code, message)),
  put: (code, message) => apiClient.put(path(code, message)),
  patch: (code, message) => apiClient.patch(path(code, message)),
  remove: (code, message) => apiClient.delete(path(code, message)),
};

module.exports = { mockHttpApi };
