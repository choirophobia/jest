const { productsApi } = require('../helpers/productsApi');

// Distinct from Mass Assignment (which checks whether unrecognized *fields*
// get through) and Falsy Value Handling (which checks null/"" specifically)
// — this checks whether a *recognized* field's value is validated at all:
// wrong type, out-of-range, or just implausible. See Understanding No Value
// Validation on Write.
describe('No Value Validation on Write', () => {
  describe('scalar fields accept any value, of any type, with no range or type check', () => {
    it('accepts a negative price', async () => {
      const res = await productsApi.create({ title: 'negative-price-test', price: -500 });

      expect(res.status).toBe(201);
      expect(res.data.price).toBe(-500);
    });

    it('accepts a rating far outside the documented 0-5 range', async () => {
      const res = await productsApi.create({ title: 'out-of-range-rating-test', rating: 999 });

      expect(res.status).toBe(201);
      expect(res.data.rating).toBe(999);
    });

    it('accepts price as a string instead of a number, unconverted', async () => {
      const res = await productsApi.create({ title: 'price-as-string-test', price: '50' });

      expect(res.status).toBe(201);
      expect(res.data.price).toBe('50');
    });

    it('accepts price as an object instead of a number', async () => {
      const res = await productsApi.create({ title: 'price-as-object-test', price: { amount: 50 } });

      expect(res.status).toBe(201);
      expect(res.data.price).toEqual({ amount: 50 });
    });

    it('accepts a string thousands of characters long with no length limit', async () => {
      const longTitle = 'A'.repeat(5000);
      const res = await productsApi.create({ title: longTitle });

      expect(res.status).toBe(201);
      expect(res.data.title).toHaveLength(5000);
    });
  });

  describe('array-typed fields are the exception — a wrong type there is silently dropped, not accepted', () => {
    it('drops tags entirely when sent as a string instead of an array', async () => {
      const res = await productsApi.create({ title: 'wrong-type-tags-test', tags: 'not-an-array' });

      expect(res.status).toBe(201);
      expect(res.data).not.toHaveProperty('tags');
    });
  });
});
