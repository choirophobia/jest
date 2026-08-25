const { authApi } = require('../helpers/authApi');
const { usersApi } = require('../helpers/usersApi');
const { cartsApi } = require('../helpers/cartsApi');

const CREDENTIALS = { username: 'emilys', password: 'emilyspass' };

// Every other file in this suite tests one resource's endpoints in
// isolation, and each `it` is independent of the others. This file is the
// deliberate exception: it's a single realistic user session — log in,
// confirm identity, look at your cart, add an item, check out — where each
// step's assertions consume data produced by the step before it via the
// `session` object below. That means these `it` blocks are NOT
// order-independent; they rely on running top-to-bottom within this
// `describe`, which is how Jest executes a single file by default.
//
// Reads here hit DummyJSON's real seed data (the user's actual first cart),
// so this only works because the account used (`emilys`, id 1) is known to
// have at least one real cart. Like every write in this suite, the
// PATCH/DELETE calls don't persist — this proves the *flow* wires the right
// data through each step, not that the cart is durably changed server-side.
describe('Scenario: authenticated user views, updates, and checks out a cart', () => {
  const session = {};

  it('step 1 — logs in and receives an access token for the seed user', async () => {
    const res = await authApi.login(CREDENTIALS);

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('accessToken');
    session.accessToken = res.data.accessToken;
    session.userId = res.data.id;
    session.email = res.data.email;
  });

  it('step 2 — the access token authenticates as the same user on the protected route', async () => {
    const res = await authApi.me(session.accessToken);

    expect(res.status).toBe(200);
    expect(res.data.id).toBe(session.userId);
    expect(res.data.email).toBe(session.email);
  });

  it('step 3 — looks up the full profile for that user id and cross-checks it against auth', async () => {
    const res = await usersApi.getById(session.userId);

    expect(res.status).toBe(200);
    expect(res.data.id).toBe(session.userId);
    // Same person, two different resources (/auth/me vs /users/{id}) — their
    // email should agree, confirming the id threaded through step 1 and 2
    // really does identify this user elsewhere in the API too.
    expect(res.data.email).toBe(session.email);
  });

  it('step 4 — views the cart already on file for that user', async () => {
    const res = await cartsApi.byUser(session.userId);

    expect(res.status).toBe(200);
    expect(res.data.carts.length).toBeGreaterThan(0);
    const [cart] = res.data.carts;
    expect(cart.userId).toBe(session.userId);

    session.cartId = cart.id;
    session.originalProductIds = cart.products.map((p) => p.id);
    session.originalProductCount = cart.products.length;
  });

  it('step 5 — adds a new item to that cart', async () => {
    const newProductId = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find(
      (id) => !session.originalProductIds.includes(id),
    );
    const res = await cartsApi.patch(session.cartId, {
      merge: true,
      products: [{ id: newProductId, quantity: 2 }],
    });

    expect(res.status).toBe(200);
    expect(res.data.id).toBe(session.cartId);
    // merge: true appends to the cart's existing product list from step 4
    // rather than replacing it — confirming this session's cart carried
    // forward, not a fresh empty one.
    expect(res.data.products).toHaveLength(session.originalProductCount + 1);
    expect(res.data.products).toContainEqual(
      expect.objectContaining({ id: newProductId, quantity: 2 }),
    );
    expect(res.data.totalProducts).toBe(res.data.products.length);
  });

  it('step 6 — checks out by deleting the cart, still tied to the logged-in user', async () => {
    const res = await cartsApi.remove(session.cartId);

    expect(res.status).toBe(200);
    expect(res.data.id).toBe(session.cartId);
    expect(res.data.isDeleted).toBe(true);
    // The userId on the deleted cart should still match the id we've been
    // threading since step 1 — the same session, start to finish.
    expect(res.data.userId).toBe(session.userId);
  });
});
