const { productsApi } = require('../helpers/productsApi');
const { usersApi } = require('../helpers/usersApi');
const { cartsApi } = require('../helpers/cartsApi');
const { postsApi } = require('../helpers/postsApi');
const { commentsApi } = require('../helpers/commentsApi');
const { recipesApi } = require('../helpers/recipesApi');
const { todosApi } = require('../helpers/todosApi');
const { quotesApi } = require('../helpers/quotesApi');

// Every existing negative case (see Coverage by Resource) uses a
// well-formed-but-out-of-range id (999999). None of them try a
// malformed-*format* id — a non-numeric string, a decimal, a negative
// number, a leading zero. This file does, across every resource, and found
// a genuine cross-resource inconsistency: some resources validate the id's
// format before looking it up; most don't and just treat any unmatched id
// the same way. See Understanding Malformed ID Path Parameters.
describe('Malformed ID Path Parameters', () => {
  describe('a non-numeric id — validated by some resources, not others', () => {
    test.each([
      ['users', () => usersApi.getById('abc'), 400, "Invalid user id 'abc'"],
      ['posts', () => postsApi.getById('abc'), 400, "Invalid post id 'abc'"],
      ['products', () => productsApi.getById('abc'), 404, "Product with id 'abc' not found"],
      ['carts', () => cartsApi.getById('abc'), 404, "Cart with id 'abc' not found"],
      ['comments', () => commentsApi.getById('abc'), 404, "Comment with id 'abc' not found"],
      ['recipes', () => recipesApi.getById('abc'), 404, "Recipe with id 'abc' not found"],
      ['todos', () => todosApi.getById('abc'), 404, "Todo with id 'abc' not found"],
      ['quotes', () => quotesApi.getById('abc'), 404, "Quote with id 'abc' not found"],
    ])('GET /%s/abc', async (_resource, makeRequest, expectedStatus, expectedMessage) => {
      const res = await makeRequest();

      expect(res.status).toBe(expectedStatus);
      expect(res.data.message).toBe(expectedMessage);
    });

    it('validates format consistently across GET/PUT/DELETE for a resource that validates (users)', async () => {
      const [getRes, putRes, deleteRes] = await Promise.all([
        usersApi.getById('abc'),
        usersApi.update('abc', { firstName: 'x' }),
        usersApi.remove('abc'),
      ]);

      [getRes, putRes, deleteRes].forEach((res) => {
        expect(res.status).toBe(400);
        expect(res.data.message).toBe("Invalid user id 'abc'");
      });
    });

    it('treats a non-numeric id the same as "not found" across GET/PUT/DELETE for a resource that does not validate (products)', async () => {
      const [getRes, putRes, deleteRes] = await Promise.all([
        productsApi.getById('abc'),
        productsApi.update('abc', { title: 'x' }),
        productsApi.remove('abc'),
      ]);

      [getRes, putRes, deleteRes].forEach((res) => {
        expect(res.status).toBe(404);
        expect(res.data.message).toBe("Product with id 'abc' not found");
      });
    });
  });

  describe('malformed-but-numeric-looking ids — treated as "not found", not rejected, on a non-validating resource', () => {
    test.each([
      ['a decimal', '1.5'],
      ['a negative number', '-1'],
      ['a leading zero', '01'],
      ['scientific notation', '1e5'],
      ['zero', '0'],
      ['an integer far beyond any real id', '99999999999999999999'],
    ])('GET /products/{id} returns 404 for %s (%s), safely echoing the id', async (_label, id) => {
      const res = await productsApi.getById(id);

      expect(res.status).toBe(404);
      expect(res.data.message).toBe(`Product with id '${id}' not found`);
    });
  });
});
