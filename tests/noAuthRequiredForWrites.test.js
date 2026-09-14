const { productsApi } = require('../helpers/productsApi');
const { usersApi } = require('../helpers/usersApi');
const { cartsApi } = require('../helpers/cartsApi');
const { authApi } = require('../helpers/authApi');

// Every write test in this suite has, from the very first one, called these
// endpoints without ever attaching a token — because apiClient never adds
// one by default (see helpers/apiClient.js) and every one of those tests
// still passes. That's been true implicitly the entire time; this file
// makes it an explicit, deliberate assertion instead of an accident of how
// the other tests happen to be written. See Understanding No Authentication
// Required for Writes.
const GARBAGE_AUTH = { headers: { Authorization: 'Bearer totally-invalid-garbage-token' } };

describe('No Authentication Required for Writes', () => {
  describe('every write succeeds with no Authorization header at all', () => {
    it('POST /products/add succeeds unauthenticated', async () => {
      const res = await productsApi.create({ title: 'no-auth-create' });

      expect(res.status).toBe(201);
    });

    it('PUT /products/1 succeeds unauthenticated', async () => {
      const res = await productsApi.update(1, { title: 'no-auth-update' });

      expect(res.status).toBe(200);
    });

    it('DELETE /products/1 succeeds unauthenticated', async () => {
      const res = await productsApi.remove(1);

      expect(res.status).toBe(200);
    });

    it('PATCH /carts/1 succeeds unauthenticated', async () => {
      const res = await cartsApi.patch(1, { merge: true, products: [{ id: 1, quantity: 1 }] });

      expect(res.status).toBe(200);
    });
  });

  describe('a garbage Authorization header is silently ignored on writes, not validated and rejected', () => {
    it('PUT /products/1 succeeds even with a garbage Bearer token', async () => {
      const res = await productsApi.update(1, { title: 'garbage-auth-test' }, GARBAGE_AUTH);

      expect(res.status).toBe(200);
    });

    it('DELETE /users/1 succeeds even with a garbage Bearer token', async () => {
      const res = await usersApi.remove(1, GARBAGE_AUTH);

      expect(res.status).toBe(200);
    });
  });

  describe('contrast: the one route that actually checks auth still correctly rejects a missing token', () => {
    it('GET /auth/me returns 401 with no token, unlike every write above', async () => {
      const res = await authApi.me();

      expect(res.status).toBe(401);
    });
  });
});
