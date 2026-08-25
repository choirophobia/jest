const { z } = require('zod');

const cartProductSchema = z.object({
  id: z.number(),
  title: z.string(),
  price: z.number(),
  quantity: z.number().positive(),
  total: z.number(),
  discountPercentage: z.number(),
  discountedTotal: z.number(),
  thumbnail: z.string(),
});

// Matches the shape returned by GET /carts/{id} and each item inside
// GET /carts' `carts[]` array.
const cartSchema = z.object({
  id: z.number(),
  products: z.array(cartProductSchema),
  total: z.number(),
  discountedTotal: z.number(),
  userId: z.number(),
  totalProducts: z.number(),
  totalQuantity: z.number(),
});

module.exports = { cartSchema };
