const { productsApi } = require('../helpers/productsApi');
const { usersApi } = require('../helpers/usersApi');
const { cartsApi } = require('../helpers/cartsApi');
const { recipesApi } = require('../helpers/recipesApi');
const { commentsApi } = require('../helpers/commentsApi');
const { todosApi } = require('../helpers/todosApi');
const { postsApi } = require('../helpers/postsApi');

// Every other Update test in this suite sends a payload WITHOUT an `id`
// field, since the id is already in the URL — the obvious, idiomatic way to
// call these endpoints. But a very common real-world client pattern is
// "fetch the whole resource, mutate a field, PUT the whole object back" —
// which means the payload naturally still has the `id` field the GET
// response came with. Testing that path found that DummyJSON consistently
// lets the body's `id` — when present — decide which record is actually
// read and returned, overriding the URL's id entirely. See Understanding
// the ID-in-Body Bug for the full story, including an earlier version of
// this file that documented a since-fixed inconsistency: a handful of
// resources used to 404 on a body id that merely equalled the URL's id
// (a strict string-vs-number comparison bug). DummyJSON has since unified
// every resource onto the behavior this file now documents.
describe('id Field in Request Body', () => {
  describe('every resource lets the body id override the URL id when both are present', () => {
    test.each([
      ['products', () => productsApi.update(1, { id: 1, title: 'x' })],
      ['carts', () => cartsApi.update(1, { id: 1, merge: false, products: [{ id: 1, quantity: 1 }] })],
      ['recipes', () => recipesApi.update(1, { id: 1, name: 'x' })],
      ['comments', () => commentsApi.update(1, { id: 1, body: 'x' })],
      ['todos', () => todosApi.update(1, { id: 1, completed: true })],
      ['users', () => usersApi.update(1, { id: 1, firstName: 'x' })],
      ['posts', () => postsApi.update(1, { id: 1, title: 'x' })],
    ])('PUT /%s/1 succeeds when the body id matches the URL id', async (_resource, makeRequest) => {
      const res = await makeRequest();

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
    });

    test.each([
      ['products', () => productsApi.update(1, { id: 2, title: 'mismatch-test' })],
      ['carts', () => cartsApi.update(1, { id: 2, merge: false, products: [{ id: 1, quantity: 1 }] })],
      ['recipes', () => recipesApi.update(1, { id: 2, name: 'mismatch-test' })],
      ['comments', () => commentsApi.update(1, { id: 2, body: 'mismatch-test' })],
      ['todos', () => todosApi.update(1, { id: 2, completed: true })],
      ['users', () => usersApi.update(1, { id: 2, firstName: 'mismatch-test' })],
      ['posts', () => postsApi.update(1, { id: 2, title: 'mismatch-test' })],
    ])("PUT /%s/1 with id: 2 in the body returns record 2's data, not record 1's", async (_resource, makeRequest) => {
      const res = await makeRequest();

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(2);
    });

    test.each([
      ['products', () => productsApi.update(1, { id: 999999, title: 'x' }), "Product with id '999999' not found"],
      [
        'carts',
        () => cartsApi.update(1, { id: 999999, merge: false, products: [{ id: 1, quantity: 1 }] }),
        "Cart with id '999999' not found",
      ],
      ['recipes', () => recipesApi.update(1, { id: 999999, name: 'x' }), "Recipe with id '999999' not found"],
      ['comments', () => commentsApi.update(1, { id: 999999, body: 'x' }), "Comment with id '999999' not found"],
      ['todos', () => todosApi.update(1, { id: 999999, completed: true }), "Todo with id '999999' not found"],
      ['users', () => usersApi.update(1, { id: 999999, firstName: 'x' }), "User with id '999999' not found"],
      ['posts', () => postsApi.update(1, { id: 999999, title: 'x' }), "Post with id '999999' not found"],
    ])(
      'PUT /%s/1 with a non-existent id in the body 404s, even though the URL id is valid',
      async (_resource, makeRequest, expectedMessage) => {
        const res = await makeRequest();

        expect(res.status).toBe(404);
        expect(res.data.message).toBe(expectedMessage);
      }
    );
  });

  describe('the idiomatic call (no id in the body) still works exactly as every other Update test relies on', () => {
    it('succeeds when id is omitted from the body entirely', async () => {
      const res = await productsApi.update(1, { title: 'no-id-field' });

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.title).toBe('no-id-field');
    });

    it('succeeds if id is sent as a matching STRING instead of a number', async () => {
      const res = await productsApi.update(1, { id: '1', title: 'string-id-matches' });

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.title).toBe('string-id-matches');
    });
  });

  describe('DELETE ignores any id field in the body entirely', () => {
    it('DELETE /products/1 with a mismatched id in the body still deletes product 1', async () => {
      const res = await productsApi.remove(1, { data: { id: 999999 } });

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.isDeleted).toBe(true);
    });
  });
});
