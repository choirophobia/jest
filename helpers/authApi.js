const { apiClient } = require('./apiClient');

const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  me: (token) => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    return apiClient.get('/auth/me', config);
  },
  refresh: (refreshToken) =>
    apiClient.post('/auth/refresh', refreshToken ? { refreshToken } : {}),
};

module.exports = { authApi };
