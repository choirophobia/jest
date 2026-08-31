const { productsApi } = require('../helpers/productsApi');
const { usersApi } = require('../helpers/usersApi');
const { postsApi } = require('../helpers/postsApi');

// A representative subset of the list endpoints that accept `limit`/`skip` —
// enough to prove the pagination contract is shared platform behavior, not
// something specific to one resource, without hammering every resource.
const LIST_ENDPOINTS = [
  ['products', productsApi, 'products'],
  ['users', usersApi, 'users'],
  ['posts', postsApi, 'posts'],
];

describe('Pagination boundaries', () => {
  describe('limit=0 means "no limit", not "zero results"', () => {
    test.each(LIST_ENDPOINTS)('GET /%s?limit=0 returns every item', async (_name, api, dataKey) => {
      const res = await api.list({ limit: 0 });

      expect(res.status).toBe(200);
      expect(res.data[dataKey]).toHaveLength(res.data.total);
      expect(res.data.limit).toBe(res.data.total);
    });
  });

  describe('the echoed `limit` reflects the actual page size returned, not the requested one', () => {
    it('matches the requested limit when there is enough data left', async () => {
      const res = await productsApi.list({ limit: 5, skip: 0 });

      expect(res.data.products).toHaveLength(5);
      expect(res.data.limit).toBe(5);
    });

    it('shrinks to the remaining count on a partial last page', async () => {
      const { total } = (await productsApi.list({ limit: 0 })).data;
      const skip = total - 3; // exactly 3 items remain past this point

      const res = await productsApi.list({ limit: 10, skip });

      expect(res.status).toBe(200);
      expect(res.data.products).toHaveLength(3);
      expect(res.data.limit).toBe(3); // not 10 — it reports what was actually returned
    });

    it('drops to 0 once skip runs past the end of the collection', async () => {
      const res = await productsApi.list({ skip: 999999 });

      expect(res.status).toBe(200);
      expect(res.data.products).toEqual([]);
      expect(res.data.limit).toBe(0);
      expect(res.data.total).toBeGreaterThan(0); // total still reflects the real collection size
    });
  });

  describe('negative and non-numeric values are rejected, not silently clamped', () => {
    test.each(LIST_ENDPOINTS)('GET /%s?skip=-1 returns 400', async (_name, api) => {
      const res = await api.list({ skip: -1 });

      expect(res.status).toBe(400);
      expect(res.data.message).toMatch(/skip/i);
    });

    test.each(LIST_ENDPOINTS)('GET /%s?limit=-1 returns 400', async (_name, api) => {
      const res = await api.list({ limit: -1 });

      expect(res.status).toBe(400);
      expect(res.data.message).toMatch(/limit/i);
    });

    it('rejects a non-numeric limit', async () => {
      const res = await productsApi.list({ limit: 'abc' });

      expect(res.status).toBe(400);
      expect(res.data.message).toMatch(/limit/i);
    });

    it('rejects a non-numeric skip', async () => {
      const res = await productsApi.list({ skip: 'abc' });

      expect(res.status).toBe(400);
      expect(res.data.message).toMatch(/skip/i);
    });
  });
});
