const { productsApi } = require('../helpers/productsApi');
const { usersApi } = require('../helpers/usersApi');
const { todosApi } = require('../helpers/todosApi');

// A sequel to the expiresInMins: 0 bug in Understanding Auth Token Edge
// Cases: does a falsy value sent on purpose (null, "") behave like an
// explicit "set it to this," the way a naive reading would expect? See
// Understanding Falsy Value Handling on Updates — this file previously
// documented todos as an inconsistent exception (applying null where
// products/users ignored it); DummyJSON has since unified null handling
// across every resource checked. What's left is a real, more precise
// distinction: null means "don't touch this field," but an explicit
// empty string is treated as a genuine value to set — not the same thing.
describe('Falsy Value Handling on Updates', () => {
  describe('null is uniformly treated as "field not provided" and ignored', () => {
    it('PATCH /products/1 with title: null keeps the original title', async () => {
      const res = await productsApi.patch(1, { title: null });

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

    it('PATCH /todos/1 with completed: null also keeps the original value — no longer an exception', async () => {
      const res = await todosApi.patch(1, { completed: null });

      expect(res.status).toBe(200);
      expect(res.data.completed).toBe(false);
    });
  });

  describe('an explicit empty string is a real value, not "not provided" — unlike null', () => {
    it('PATCH /products/1 with title: "" actually sets the title to an empty string', async () => {
      const res = await productsApi.patch(1, { title: '' });

      expect(res.status).toBe(200);
      expect(res.data.title).toBe('');
    });
  });
});
