const { productsApi } = require('../helpers/productsApi');
const { productSchema } = require('../schemas/productSchema');

describe('Products API', () => {
  describe('Create', () => {
    it('creates a new product and echoes payload fields', async () => {
      const payload = { title: 'Test Product', price: 99, category: 'test-category' };
      const res = await productsApi.create(payload);

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(typeof res.data.id).toBe('number');
      expect(res.data.title).toBe(payload.title);
      expect(res.data.price).toBe(payload.price);
      expect(res.data.category).toBe(payload.category);
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
      expect(res.data.limit).toBe(30);
      expect(res.data.products).toHaveLength(res.data.limit);
      expect(res.data.total).toBeGreaterThan(res.data.products.length);
      // One schema check per item replaces what used to be three separate
      // typeof assertions — and validates every field, not just three of them.
      res.data.products.forEach((product) => {
        expect(product).toMatchSchema(productSchema);
      });
    });

    it('gets a single product by id', async () => {
      const res = await productsApi.getById(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data).toMatchSchema(productSchema);
    });

    it('searches products by query', async () => {
      const res = await productsApi.search('phone');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.products)).toBe(true);
      expect(res.data.products.length).toBeGreaterThan(0);
      res.data.products.forEach((product) => {
        expect(product).toMatchSchema(productSchema);
        const haystack = `${product.title} ${product.description}`.toLowerCase();
        expect(haystack).toEqual(expect.stringContaining('phone'));
      });
    });

    it('lists products by category', async () => {
      const res = await productsApi.byCategory('smartphones');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.products)).toBe(true);
      expect(res.data.products.length).toBeGreaterThan(0);
      res.data.products.forEach((product) => {
        expect(product).toMatchSchema(productSchema);
        expect(product.category).toBe('smartphones');
      });
    });

    it('lists all available categories', async () => {
      const res = await productsApi.categories();

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
      res.data.forEach((category) => {
        expect(typeof category.slug).toBe('string');
        expect(typeof category.name).toBe('string');
        expect(category.url).toEqual(expect.stringContaining(`/products/category/${category.slug}`));
      });
    });
  });

  describe('Update', () => {
    it('fully updates a product with PUT and echoes new fields', async () => {
      const payload = { title: 'Updated Product Title' };
      const res = await productsApi.update(1, payload);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.title).toBe(payload.title);
      // Unmodified fields should still reflect the original seed product, confirming
      // the API merges the payload onto the existing record rather than replacing it.
      expect(res.data.category).toBe('beauty');
      expect(res.data.brand).toBe('Essence');
    });

    it('partially updates a product with PATCH and echoes new fields', async () => {
      const payload = { price: 555 };
      const res = await productsApi.patch(1, payload);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.price).toBe(payload.price);
      expect(res.data.title).toBe('Essence Mascara Lash Princess');
    });
  });

  describe('Delete', () => {
    it('deletes a product and marks it as deleted', async () => {
      const res = await productsApi.remove(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.isDeleted).toBe(true);
      expect(res.data).toHaveProperty('deletedOn');
      expect(typeof res.data.deletedOn).toBe('string');
      expect(res.data.title).toBe('Essence Mascara Lash Princess');
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
      expect(res.data).toHaveProperty('message');
    });

    it('returns 404 (or 429 if rate-limited) when deleting a non-existent product', async () => {
      const res = await productsApi.remove(999999);

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });

    it('returns an empty list for a non-existent category', async () => {
      const res = await productsApi.byCategory('not-a-real-category');

      expect(res.status).toBe(200);
      expect(res.data.products).toEqual([]);
    });
  });
});
