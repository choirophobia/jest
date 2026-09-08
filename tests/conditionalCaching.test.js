const { productsApi } = require('../helpers/productsApi');
const { usersApi } = require('../helpers/usersApi');

// No other file in this suite tests HTTP caching semantics — every read is
// treated as a fresh request. DummyJSON stamps every response with an ETag
// (see Understanding Response Header Assertions), which exists specifically
// to support conditional requests: send it back as `If-None-Match`, and a
// server that actually implements caching should skip re-sending a body
// that hasn't changed. This file confirms it does. See Understanding HTTP
// Conditional Caching.
describe('HTTP Conditional Caching (ETag / If-None-Match)', () => {
  const RESOURCES = [
    ['products', productsApi],
    ['users', usersApi],
  ];

  describe('a matching If-None-Match returns 304 with an empty body', () => {
    test.each(RESOURCES)('GET /%s/1 returns 304, not 200, when the ETag matches', async (_resource, api) => {
      const first = await api.getById(1);
      const etag = first.headers.etag;
      expect(etag).toBeDefined();

      const second = await api.getById(1, { headers: { 'If-None-Match': etag } });

      expect(second.status).toBe(304);
      expect(second.data).toBe('');
      // The point of a 304 is "here's the same ETag, don't bother
      // re-fetching" — the client needs it repeated to keep caching.
      expect(second.headers.etag).toBe(etag);
    });
  });

  describe('a stale or wrong If-None-Match returns 200 with the full body', () => {
    it('returns the real product when the ETag does not match', async () => {
      const res = await productsApi.getById(1, { headers: { 'If-None-Match': 'W/"deliberately-wrong-etag"' } });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('title');
    });
  });

  describe('the same resource produces the same ETag across repeated fetches', () => {
    // The mechanism above only works at all if the ETag is a stable
    // fingerprint of unchanged content, not something regenerated on every
    // response — confirmed directly rather than assumed.
    it('GET /products/1 returns an identical ETag on a second, independent fetch', async () => {
      const first = await productsApi.getById(1);
      const second = await productsApi.getById(1);

      expect(first.headers.etag).toBe(second.headers.etag);
    });
  });

  describe('a wildcard If-None-Match matches any current representation', () => {
    it('GET /products/1 with If-None-Match: * returns 304', async () => {
      const res = await productsApi.getById(1, { headers: { 'If-None-Match': '*' } });

      expect(res.status).toBe(304);
    });
  });
});
