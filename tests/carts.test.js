const { cartsApi } = require('../helpers/cartsApi');

describe('Carts API', () => {
  describe('Create', () => {
    it('creates a new cart for a user and echoes cart products', async () => {
      const payload = {
        userId: 1,
        products: [
          { id: 1, quantity: 2 },
          { id: 2, quantity: 1 },
        ],
      };
      const res = await cartsApi.create(payload);

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data.userId).toBe(payload.userId);
      expect(res.data.products).toHaveLength(payload.products.length);
      expect(res.data).toHaveProperty('total');
    });
  });

  describe('Read', () => {
    it('lists carts with default pagination', async () => {
      const res = await cartsApi.list();

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.carts)).toBe(true);
      expect(res.data).toHaveProperty('total');
    });

    it('gets a single cart by id', async () => {
      const res = await cartsApi.getById(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data).toHaveProperty('products');
      expect(res.data).toHaveProperty('userId');
    });

    it('lists carts belonging to a specific user', async () => {
      const res = await cartsApi.byUser(1);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.carts)).toBe(true);
      res.data.carts.forEach((cart) => {
        expect(cart.userId).toBe(1);
      });
    });
  });

  describe('Update', () => {
    it('fully updates a cart with PUT and echoes new products', async () => {
      const payload = { merge: false, products: [{ id: 1, quantity: 5 }] };
      const res = await cartsApi.update(1, payload);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data).toHaveProperty('products');
    });

    it('partially updates a cart with PATCH and merges products', async () => {
      const payload = { merge: true, products: [{ id: 3, quantity: 1 }] };
      const res = await cartsApi.patch(1, payload);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data).toHaveProperty('products');
    });
  });

  describe('Delete', () => {
    it('deletes a cart and marks it as deleted', async () => {
      const res = await cartsApi.remove(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.isDeleted).toBe(true);
      expect(res.data).toHaveProperty('deletedOn');
    });
  });

  describe('negative cases', () => {
    it('returns 404 (or 429 if rate-limited) for an out-of-range cart id', async () => {
      const res = await cartsApi.getById(999999);

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });

    it('returns 404 (or 429 if rate-limited) when updating a non-existent cart', async () => {
      const res = await cartsApi.update(999999, { products: [] });

      expect([404, 429]).toContain(res.status);
    });

    it('returns 404 (or 429 if rate-limited) when deleting a non-existent cart', async () => {
      const res = await cartsApi.remove(999999);

      expect([404, 429]).toContain(res.status);
    });

    it('returns 404 (or 429 if rate-limited) for a user id with no carts', async () => {
      const res = await cartsApi.byUser(999999);

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });
  });
});
