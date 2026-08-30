const { productsApi } = require('../helpers/productsApi');
const { usersApi } = require('../helpers/usersApi');
const { authApi } = require('../helpers/authApi');
const { postsApi } = require('../helpers/postsApi');

// DummyJSON is a shared public demo API with no published SLA, so this
// threshold is deliberately generous — it exists to catch a real regression
// or outage, not to enforce sub-second latency against a best-effort service.
const MAX_RESPONSE_MS = 3000;

describe('Performance', () => {
  describe('response time', () => {
    test.each([
      ['GET /products', () => productsApi.list()],
      ['GET /products/{id}', () => productsApi.getById(1)],
      ['GET /products/search', () => productsApi.search('phone')],
      ['GET /users', () => usersApi.list()],
      ['GET /users/{id}', () => usersApi.getById(1)],
      ['POST /auth/login', () => authApi.login({ username: 'emilys', password: 'emilyspass' })],
      ['GET /posts', () => postsApi.list()],
    ])(`%s responds within ${MAX_RESPONSE_MS}ms`, async (_label, makeRequest) => {
      const res = await makeRequest();

      expect(res.status).toBeLessThan(500);
      expect(res).toRespondWithin(MAX_RESPONSE_MS);
    });
  });
});
