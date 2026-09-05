const { productsApi } = require('../helpers/productsApi');
const { usersApi } = require('../helpers/usersApi');

// Every other file in this suite tests malformed *responses*. This one
// tests malformed *requests* — specifically, what happens when the client
// gets the request itself wrong, not just the payload inside it. See
// Understanding HTTP Request Semantics for what curling this up found.
describe('HTTP Request Semantics', () => {
  describe('a wrong Content-Type silently drops the request body, without erroring', () => {
    // A plain JS object as the payload would be auto-stringified by axios
    // with a `Content-Type: application/json` header attached, which would
    // just retest the happy path. Passing an already-stringified body lets
    // the explicit header override actually reach the server unchanged —
    // exactly what a client that forgot to set the header would send.
    const wrongContentType = { headers: { 'Content-Type': 'text/plain' } };

    it('POST /products/add returns 201 with a bare record — the payload never arrives', async () => {
      const res = await productsApi.create(
        JSON.stringify({ title: 'should-be-dropped' }),
        wrongContentType
      );

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data).not.toHaveProperty('title');
    });

    it('POST /users/add returns 201 with a fully-shaped but blank user — not the values sent', async () => {
      const res = await usersApi.create(
        JSON.stringify({ firstName: 'ShouldNotAppear' }),
        wrongContentType
      );

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data.firstName).toBe('');
    });

    it('PUT /products/{id} returns 200 with the original record completely unchanged', async () => {
      const res = await productsApi.update(
        1,
        JSON.stringify({ title: 'should-not-apply' }),
        wrongContentType
      );

      expect(res.status).toBe(200);
      expect(res.data.title).toBe('Essence Mascara Lash Princess');
    });
  });

  describe('a duplicate query parameter breaks validation entirely', () => {
    it('GET /products?limit=5&limit=50 returns 400, not "first wins" or "last wins"', async () => {
      const res = await productsApi.listWithRawQuery('limit=5&limit=50');

      expect(res.status).toBe(400);
      expect(res.data.message).toMatch(/limit/i);
    });
  });
});
