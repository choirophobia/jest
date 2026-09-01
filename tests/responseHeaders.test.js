const { productsApi } = require('../helpers/productsApi');

describe('Response Headers', () => {
  describe('Content-Type', () => {
    test.each([
      ['a successful read', () => productsApi.getById(1)],
      ['a 404 error', () => productsApi.getById(999999)],
      ['a successful create', () => productsApi.create({ title: 'Header Check' })],
    ])('%s responds with application/json', async (_label, makeRequest) => {
      const res = await makeRequest();

      expect(res.headers['content-type']).toEqual(expect.stringContaining('application/json'));
    });
  });

  describe('CORS', () => {
    // DummyJSON reflects the caller's Origin back rather than allowing "*" —
    // confirmed by sending an explicit Origin header, since axios in Node
    // (unlike a browser) never adds one on its own.
    it('echoes the request Origin back in Access-Control-Allow-Origin', async () => {
      const origin = 'https://example.com';
      const res = await productsApi.getById(1, { headers: { Origin: origin } });

      expect(res.headers['access-control-allow-origin']).toBe(origin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('omits Access-Control-Allow-Origin when no Origin header is sent', async () => {
      const res = await productsApi.getById(1);

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('rate-limit visibility', () => {
    // These headers are the reason this project's negative-case assertions
    // already accept 429 alongside 404/400 (see Important Notes & Gotchas) —
    // DummyJSON documents no rate limit, but its own response headers do.
    it('exposes X-RateLimit-* headers on every response', async () => {
      const res = await productsApi.getById(1);

      expect(res.headers['x-ratelimit-limit']).toBeDefined();
      expect(Number(res.headers['x-ratelimit-remaining'])).toBeGreaterThanOrEqual(0);
    });
  });

  describe('baseline security headers', () => {
    it('sets X-Content-Type-Options: nosniff', async () => {
      const res = await productsApi.getById(1);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
