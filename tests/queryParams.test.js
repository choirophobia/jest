const { productsApi } = require('../helpers/productsApi');
const { usersApi } = require('../helpers/usersApi');

describe('List Query Parameters', () => {
  describe('sortBy / order', () => {
    it('sorts ascending by default when only sortBy is given', async () => {
      const res = await productsApi.list({ sortBy: 'price', limit: 10 });
      const prices = res.data.products.map((p) => p.price);

      expect(res.status).toBe(200);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    it('sorts descending when order=desc is given', async () => {
      const res = await productsApi.list({ sortBy: 'price', order: 'desc', limit: 10 });
      const prices = res.data.products.map((p) => p.price);

      expect(res.status).toBe(200);
      expect(prices).toEqual([...prices].sort((a, b) => b - a));
    });

    it('sorts a different resource (users) by a different field, confirming this is platform-wide', async () => {
      const res = await usersApi.list({ sortBy: 'age', order: 'desc', limit: 10 });
      const ages = res.data.users.map((u) => u.age);

      expect(res.status).toBe(200);
      expect(ages).toEqual([...ages].sort((a, b) => b - a));
    });

    // Neither of these is documented in CLAUDE.md's endpoint reference — both
    // were found by curling the live API before writing the assertion.
    it('silently ignores an unrecognized sortBy field instead of erroring', async () => {
      const res = await productsApi.list({ sortBy: 'notARealField', limit: 5 });

      expect(res.status).toBe(200);
      expect(res.data.products).toHaveLength(5);
    });

    it('accepts an invalid order value when sortBy is absent — order alone is a no-op', async () => {
      const res = await productsApi.list({ order: 'sideways' });

      expect(res.status).toBe(200);
    });

    it('rejects an invalid order value once sortBy is present', async () => {
      const res = await productsApi.list({ sortBy: 'price', order: 'sideways' });

      expect(res.status).toBe(400);
      expect(res.data.message).toMatch(/order/i);
    });
  });

  describe('select', () => {
    it('returns only the requested fields, plus id, which is always included', async () => {
      const res = await productsApi.list({ select: 'title,price', limit: 3 });

      expect(res.status).toBe(200);
      res.data.products.forEach((product) => {
        expect(Object.keys(product).sort()).toEqual(['id', 'price', 'title']);
      });
    });

    it('silently ignores an unrecognized field, returning just id', async () => {
      const res = await productsApi.list({ select: 'notARealField', limit: 3 });

      expect(res.status).toBe(200);
      res.data.products.forEach((product) => {
        expect(Object.keys(product)).toEqual(['id']);
      });
    });

    it('composes with sortBy/order — the trimmed shape is still sorted correctly', async () => {
      const res = await productsApi.list({ select: 'title,price', sortBy: 'price', order: 'desc', limit: 5 });
      const prices = res.data.products.map((p) => p.price);

      expect(res.status).toBe(200);
      expect(prices).toEqual([...prices].sort((a, b) => b - a));
      res.data.products.forEach((product) => {
        expect(Object.keys(product).sort()).toEqual(['id', 'price', 'title']);
      });
    });
  });
});
