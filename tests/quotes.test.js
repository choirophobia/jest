const { quotesApi } = require('../helpers/quotesApi');

// Quotes is a read-only resource on DummyJSON (docs list only "Get all",
// "Get a single quote", "Get a random quote", "Limit & Skip") — there is no
// add/update/delete endpoint, so this file has no Create/Update/Delete blocks.
describe('Quotes API', () => {
  describe('Read', () => {
    it('lists quotes with default pagination', async () => {
      const res = await quotesApi.list();

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.quotes)).toBe(true);
      expect(res.data).toHaveProperty('total');
      expect(res.data).toHaveProperty('limit');
      expect(res.data).toHaveProperty('skip');
      expect(res.data.limit).toBe(30);
      expect(res.data.quotes).toHaveLength(res.data.limit);
      expect(res.data.total).toBeGreaterThan(res.data.quotes.length);
      res.data.quotes.forEach((quote) => {
        expect(typeof quote.id).toBe('number');
        expect(typeof quote.quote).toBe('string');
        expect(typeof quote.author).toBe('string');
      });
    });

    it('gets a single quote by id @smoke', async () => {
      const res = await quotesApi.getById(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(typeof res.data.quote).toBe('string');
      expect(typeof res.data.author).toBe('string');
    });

    it('gets a random quote', async () => {
      const res = await quotesApi.random();

      expect(res.status).toBe(200);
      expect(typeof res.data.id).toBe('number');
      expect(typeof res.data.quote).toBe('string');
      expect(typeof res.data.author).toBe('string');
    });
  });

  describe('negative cases', () => {
    it('returns 404 (or 429 if rate-limited) for an out-of-range quote id', async () => {
      const res = await quotesApi.getById(999999);

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });
  });
});
