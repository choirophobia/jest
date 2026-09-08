const { productsApi } = require('../helpers/productsApi');
const { usersApi } = require('../helpers/usersApi');
const { todosApi } = require('../helpers/todosApi');

// A sequel to the expiresInMins: 0 bug in Understanding Auth Token Edge
// Cases: a falsy value passed on purpose (null, "") doesn't behave like an
// explicit "set it to this" the way a naive reading would expect — and,
// verified here, that behavior isn't even consistent across resources.
// See Understanding Falsy Value Handling on Updates.
describe('Falsy Value Handling on Updates', () => {
  describe('products and users silently ignore null/empty values instead of applying them', () => {
    it('PATCH /products/1 with title: null keeps the original title', async () => {
      const res = await productsApi.patch(1, { title: null });

      expect(res.status).toBe(200);
      expect(res.data.title).toBe('Essence Mascara Lash Princess');
    });

    it('PATCH /products/1 with title: "" keeps the original title too — not just null is ignored', async () => {
      const res = await productsApi.patch(1, { title: '' });

      expect(res.status).toBe(200);
      expect(res.data.title).toBe('Essence Mascara Lash Princess');
    });

    it('PATCH /products/1 with price: null keeps the original price', async () => {
      const res = await productsApi.patch(1, { price: null });

      expect(res.status).toBe(200);
      expect(res.data.price).toBe(9.99);
    });

    it('a nested null (address.city) is ignored too, while sibling nested fields still deep-merge correctly', async () => {
      const res = await usersApi.patch(1, { address: { city: null } });

      expect(res.status).toBe(200);
      expect(res.data.address.city).toBe('Phoenix');
      expect(res.data.address.postalCode).toBe('29112');
      expect(res.data.address.country).toBe('United States');
    });
  });

  describe('todos is the exception: null is actually applied, not silently ignored', () => {
    it('PATCH /todos/1 with completed: null actually sets the field to null', async () => {
      const res = await todosApi.patch(1, { completed: null });

      expect(res.status).toBe(200);
      expect(res.data.completed).toBeNull();
    });
  });
});
