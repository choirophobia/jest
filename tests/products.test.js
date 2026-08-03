const { productsApi } = require('../helpers/productsApi');

describe('Products API', () => {
  describe('Create', () => {
    it('creates a new product and echoes payload fields', async () => {
      const payload = { title: 'Test Product', price: 99, category: 'test-category' };
      const res = await productsApi.create(payload);

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data.title).toBe(payload.title);
      expect(res.data.price).toBe(payload.price);
      // console.log(res.data);
    });
  });

  describe('Read', () => {
    it('lists products with default pagination', async () => {
      const res = await productsApi.list();

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.products)).toBe(true);
      expect(res.data).toHaveProperty('total');
      expect(res.data).toHaveProperty('limit');
      expect(res.data).toHaveProperty('skip');
    });

    it('gets a single product by id', async () => {
      const res = await productsApi.getById(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data).toHaveProperty('title');
    });

    it('searches products by query', async () => {
      const res = await productsApi.search('phone');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.products)).toBe(true);
      res.data.products.forEach((product) => {
        const haystack = `${product.title} ${product.description}`.toLowerCase();
        expect(haystack).toEqual(expect.stringContaining('phone'));
      });
    });

    it('lists products by category', async () => {
      const res = await productsApi.byCategory('smartphones');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.products)).toBe(true);
      res.data.products.forEach((product) => {
        expect(product.category).toBe('smartphones');
      });
    });

    it('lists all available categories', async () => {
      const res = await productsApi.categories();

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
    });
  });

  describe('Update', () => {
    it('fully updates a product with PUT and echoes new fields', async () => {
      const payload = { title: 'Updated Product Title' };
      const res = await productsApi.update(1, payload);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.title).toBe(payload.title);
    });

    it('partially updates a product with PATCH and echoes new fields', async () => {
      const payload = { price: 555 };
      const res = await productsApi.patch(1, payload);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.price).toBe(payload.price);
    });
  });

  describe('Delete', () => {
    it('deletes a product and marks it as deleted', async () => {
      const res = await productsApi.remove(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.isDeleted).toBe(true);
      expect(res.data).toHaveProperty('deletedOn');
    });
  });

  describe('negative cases', () => {
    it('returns 404 (or 429 if rate-limited) for an out-of-range product id', async () => {
      const res = await productsApi.getById(999999);

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });

    it('returns 404 (or 429 if rate-limited) when updating a non-existent product', async () => {
      const res = await productsApi.update(999999, { title: 'nope' });

      expect([404, 429]).toContain(res.status);
    });

    it('returns 404 (or 429 if rate-limited) when deleting a non-existent product', async () => {
      const res = await productsApi.remove(999999);

      expect([404, 429]).toContain(res.status);
    });

    it('returns an empty list for a non-existent category', async () => {
      const res = await productsApi.byCategory('not-a-real-category');

      expect(res.status).toBe(200);
      expect(res.data.products).toEqual([]);
    });
  });
});
