const { apiClient } = require('./apiClient');

const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  me: (token) => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    return apiClient.get('/auth/me', config);
  },
  // Bypasses the automatic "Bearer " prefix — for testing malformed
  // Authorization header values (wrong scheme, missing scheme, etc.).
  meWithAuthorizationHeader: (rawHeaderValue) =>
    apiClient.get('/auth/me', { headers: { Authorization: rawHeaderValue } }),
  refresh: (refreshToken) =>
    apiClient.post('/auth/refresh', refreshToken ? { refreshToken } : {}),
};

module.exports = { authApi };
