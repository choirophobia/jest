const { productsApi } = require('../helpers/productsApi');
const { usersApi } = require('../helpers/usersApi');
const { cartsApi } = require('../helpers/cartsApi');
const { postsApi } = require('../helpers/postsApi');
const { productSchema } = require('../schemas/productSchema');
const { userSchema } = require('../schemas/userSchema');
const { cartSchema } = require('../schemas/cartSchema');
const { postSchema } = require('../schemas/postSchema');

// Every other schema-validated test in this suite uses these same schemas in
// their default ("strip unknown keys") mode — see Schema Validation with Zod.
// That catches a field going missing or changing type, but not a field being
// *added*: an unrecognized key is silently dropped, not flagged. `.strict()`
// turns the same schema into a drift detector by rejecting any key it wasn't
// told to expect, without maintaining a second, separate schema.
describe('Contract drift detection', () => {
  it('GET /products/{id} has no fields the schema does not account for', async () => {
    const res = await productsApi.getById(1);

    expect(res.data).toMatchSchema(productSchema.strict());
  });

  it('GET /users/{id} has no fields the schema does not account for', async () => {
    const res = await usersApi.getById(1);

    expect(res.data).toMatchSchema(userSchema.strict());
  });

  it('GET /carts/{id} has no fields the schema does not account for', async () => {
    const res = await cartsApi.getById(1);

    expect(res.data).toMatchSchema(cartSchema.strict());
  });

  it('GET /posts/{id} has no fields the schema does not account for', async () => {
    const res = await postsApi.getById(1);

    expect(res.data).toMatchSchema(postSchema.strict());
  });
});
