const { cartsApi } = require('../helpers/cartsApi');
const { cartSchema } = require('../schemas/cartSchema');

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
      expect(typeof res.data.id).toBe('number');
      expect(res.data.userId).toBe(payload.userId);
      expect(res.data.products).toHaveLength(payload.products.length);
      res.data.products.forEach((product, i) => {
        expect(product.id).toBe(payload.products[i].id);
        expect(product.quantity).toBe(payload.products[i].quantity);
        expect(typeof product.price).toBe('number');
        expect(typeof product.total).toBe('number');
      });
      expect(res.data).toHaveProperty('total');
      expect(res.data.totalProducts).toBe(payload.products.length);
      expect(res.data.totalQuantity).toBe(3);
    });
  });

  describe('Read', () => {
    it('lists carts with default pagination', async () => {
      const res = await cartsApi.list();

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.carts)).toBe(true);
      expect(res.data).toHaveProperty('total');
      expect(res.data).toHaveProperty('limit');
      expect(res.data).toHaveProperty('skip');
      expect(res.data.limit).toBe(30);
      expect(res.data.carts).toHaveLength(res.data.limit);
      expect(res.data.total).toBeGreaterThan(res.data.carts.length);
      res.data.carts.forEach((cart) => {
        expect(cart).toMatchSchema(cartSchema);
      });
    });

    it('gets a single cart by id @smoke', async () => {
      const res = await cartsApi.getById(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data).toMatchSchema(cartSchema);
      expect(res.data.products.length).toBeGreaterThan(0);
      expect(res.data.totalProducts).toBe(res.data.products.length);
    });

    it('lists carts belonging to a specific user', async () => {
      const res = await cartsApi.byUser(1);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.carts)).toBe(true);
      expect(res.data.carts.length).toBeGreaterThan(0);
      res.data.carts.forEach((cart) => {
        expect(cart).toMatchSchema(cartSchema);
        expect(cart.userId).toBe(1);
        expect(cart.totalProducts).toBe(cart.products.length);
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
      // merge: false replaces the cart's products outright, so only the
      // requested product should remain.
      expect(res.data.products).toHaveLength(1);
      expect(res.data.products[0].id).toBe(1);
      expect(res.data.products[0].quantity).toBe(5);
      expect(res.data.totalProducts).toBe(1);
    });

    it('partially updates a cart with PATCH and merges products', async () => {
      const payload = { merge: true, products: [{ id: 3, quantity: 1 }] };
      const res = await cartsApi.patch(1, payload);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data).toHaveProperty('products');
      // merge: true adds to the original seed cart's products rather than
      // replacing them, so the result should contain more than just the payload.
      expect(res.data.products.length).toBeGreaterThan(payload.products.length);
      expect(res.data.products).toContainEqual(
        expect.objectContaining({ id: 3, quantity: 1 }),
      );
      expect(res.data.totalProducts).toBe(res.data.products.length);
    });
  });

  describe('Delete', () => {
    it('deletes a cart and marks it as deleted', async () => {
      const res = await cartsApi.remove(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.isDeleted).toBe(true);
      expect(res.data).toHaveProperty('deletedOn');
      expect(typeof res.data.deletedOn).toBe('string');
      expect(res.data.userId).toBe(1);
    });
  });

  describe('negative cases', () => {
    const NON_EXISTENT_ID = 999999;

    test.each([
      ['getting', () => cartsApi.getById(NON_EXISTENT_ID)],
      ['updating', () => cartsApi.update(NON_EXISTENT_ID, { products: [] })],
      ['deleting', () => cartsApi.remove(NON_EXISTENT_ID)],
    ])('returns 404 (or 429 if rate-limited) when %s a non-existent cart', async (_action, makeRequest) => {
      const res = await makeRequest();

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });

    it('returns 404 (or 429 if rate-limited) for a user id with no carts', async () => {
      const res = await cartsApi.byUser(999999);

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });
  });
});
