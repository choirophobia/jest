const { productsApi } = require('../helpers/productsApi');
const { usersApi } = require('../helpers/usersApi');
const { postsApi } = require('../helpers/postsApi');
const { commentsApi } = require('../helpers/commentsApi');
const { cartsApi } = require('../helpers/cartsApi');

// Fetches every list once, with limit=0 ("no limit" — see Understanding
// Pagination Boundary Testing), instead of paging through or fetching
// per-item. That keeps this whole file at 6 HTTP calls total no matter how
// large the seed dataset is, rather than one call per product/post/etc. —
// important against an API this project has repeatedly hit 429s against.
describe('Cross-Resource Referential Integrity', () => {
  let products;
  let categorySlugs;
  let userIds;
  let posts;
  let postIds;
  let comments;
  let carts;
  let productIds;

  beforeAll(async () => {
    const [productsRes, categoriesRes, usersRes, postsRes, commentsRes, cartsRes] = await Promise.all([
      productsApi.list({ limit: 0 }),
      productsApi.categories(),
      usersApi.list({ limit: 0 }),
      postsApi.list({ limit: 0 }),
      commentsApi.list({ limit: 0 }),
      cartsApi.list({ limit: 0 }),
    ]);

    products = productsRes.data.products;
    categorySlugs = new Set(categoriesRes.data.map((c) => c.slug));
    userIds = new Set(usersRes.data.users.map((u) => u.id));
    posts = postsRes.data.posts;
    postIds = new Set(posts.map((p) => p.id));
    comments = commentsRes.data.comments;
    carts = cartsRes.data.carts;
    productIds = new Set(products.map((p) => p.id));
  });

  it('every product.category exists in /products/categories', () => {
    const orphaned = products.filter((p) => !categorySlugs.has(p.category)).map((p) => p.id);

    expect(orphaned).toEqual([]);
  });

  it('every post.userId resolves to a real user', () => {
    const orphaned = posts.filter((p) => !userIds.has(p.userId)).map((p) => p.id);

    expect(orphaned).toEqual([]);
  });

  it('every comment.postId resolves to a real post', () => {
    const orphaned = comments.filter((c) => !postIds.has(c.postId)).map((c) => c.id);

    expect(orphaned).toEqual([]);
  });

  it('every comment.user.id resolves to a real user', () => {
    const orphaned = comments.filter((c) => !userIds.has(c.user.id)).map((c) => c.id);

    expect(orphaned).toEqual([]);
  });

  it('every cart.userId resolves to a real user', () => {
    const orphaned = carts.filter((c) => !userIds.has(c.userId)).map((c) => c.id);

    expect(orphaned).toEqual([]);
  });

  it('every product id referenced inside a cart resolves to a real product', () => {
    const orphaned = carts.flatMap((cart) =>
      cart.products.filter((p) => !productIds.has(p.id)).map((p) => ({ cartId: cart.id, productId: p.id }))
    );

    expect(orphaned).toEqual([]);
  });
});
