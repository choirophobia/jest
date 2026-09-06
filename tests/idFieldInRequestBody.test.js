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
// response came with. Testing that path found a real, verified bug: most
// resources 404 when the body's `id` doesn't strictly match the URL's id AS
// A STRING — and a JSON body's id is a number, so it never can. See
// Understanding the ID-in-Body Bug.
describe('id Field in Request Body', () => {
  describe('most resources 404 on a numeric body id, even when it equals the URL id', () => {
    test.each([
      ['products', () => productsApi.update(1, { id: 1, title: 'x' }), "Product with id '1' not found"],
      [
        'carts',
        () => cartsApi.update(1, { id: 1, merge: false, products: [{ id: 1, quantity: 1 }] }),
        "Cart with id '1' not found",
      ],
      ['recipes', () => recipesApi.update(1, { id: 1, name: 'x' }), "Recipe with id '1' not found"],
      ['comments', () => commentsApi.update(1, { id: 1, body: 'x' }), "Comment with id '1' not found"],
      ['todos', () => todosApi.update(1, { id: 1, completed: true }), "Todo with id '1' not found"],
    ])('PUT /%s/1 with a matching numeric id in the body still 404s', async (_resource, makeRequest, expectedMessage) => {
      const res = await makeRequest();

      expect(res.status).toBe(404);
      expect(res.data.message).toBe(expectedMessage);
    });

    it('the exact same update succeeds when id is omitted from the body (the idiomatic call)', async () => {
      const res = await productsApi.update(1, { title: 'no-id-field' });

      expect(res.status).toBe(200);
      expect(res.data.title).toBe('no-id-field');
    });

    it('the exact same update also succeeds if id is sent as a matching STRING instead of a number', async () => {
      const res = await productsApi.update(1, { id: '1', title: 'string-id-matches' });

      expect(res.status).toBe(200);
      expect(res.data.title).toBe('string-id-matches');
    });

    it('a genuinely different numeric id in the body 404s too, unsurprisingly', async () => {
      const res = await productsApi.update(1, { id: 999999, title: 'x' });

      expect(res.status).toBe(404);
      expect(res.data.message).toBe("Product with id '999999' not found");
    });
  });

  describe('users and posts are the exception: the body id, not the URL id, decides which record is affected', () => {
    test.each([
      ['posts', () => postsApi.update(1, { id: 2, title: 'mismatch-test' })],
      ['users', () => usersApi.update(1, { id: 2, firstName: 'mismatch-test' })],
    ])('PUT /%s/1 with id:2 in the body returns record 2\'s data, not record 1\'s', async (_resource, makeRequest) => {
      const res = await makeRequest();

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(2);
    });

    test.each([
      ['posts', () => postsApi.update(1, { id: 999999, title: 'x' }), "Post with id '999999' not found"],
      ['users', () => usersApi.update(1, { id: 999999, firstName: 'x' }), "User with id '999999' not found"],
    ])('PUT /%s/1 with a non-existent id in the body 404s, even though the URL id is valid', async (_resource, makeRequest, expectedMessage) => {
      const res = await makeRequest();

      expect(res.status).toBe(404);
      expect(res.data.message).toBe(expectedMessage);
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
