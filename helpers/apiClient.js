const axios = require('axios');

const BASE_URL = 'https://dummyjson.com';

const apiClient = axios.create({
  baseURL: BASE_URL,
  // DummyJSON returns error bodies (e.g. 400/401/404) that we want to assert on
  // directly, rather than have axios throw and force try/catch everywhere.
  validateStatus: () => true,
});

module.exports = { apiClient, BASE_URL };
