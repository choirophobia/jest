const axios = require('axios');

const BASE_URL = 'https://dummyjson.com';

const apiClient = axios.create({
  baseURL: BASE_URL,
  // DummyJSON returns error bodies (e.g. 400/401/404) that we want to assert on
  // directly, rather than have axios throw and force try/catch everywhere.
  validateStatus: () => true,
});

// Stamps every response with `response.duration` (ms) so any test can assert
// on latency without each service object having to track timing itself.
apiClient.interceptors.request.use((config) => {
  config.metadata = { startTime: Date.now() };
  return config;
});

apiClient.interceptors.response.use((response) => {
  response.duration = Date.now() - response.config.metadata.startTime;
  return response;
});

module.exports = { apiClient, BASE_URL };
