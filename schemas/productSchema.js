const { z } = require('zod');

const productReviewSchema = z.object({
  rating: z.number().min(0).max(5),
  comment: z.string(),
  date: z.string(),
  reviewerName: z.string(),
  reviewerEmail: z.email(),
});

// Matches the shape returned by both GET /products/{id} and each item inside
// GET /products' `products[]` array — DummyJSON returns the full object in
// both places, not a trimmed-down list variant.
const productSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.number().positive(),
  discountPercentage: z.number(),
  rating: z.number().min(0).max(5),
  stock: z.number(),
  tags: z.array(z.string()),
  brand: z.string().optional(), // absent for some categories (e.g. groceries)
  sku: z.string(),
  weight: z.number(),
  dimensions: z.object({
    width: z.number(),
    height: z.number(),
    depth: z.number(),
  }),
  warrantyInformation: z.string(),
  shippingInformation: z.string(),
  availabilityStatus: z.string(),
  reviews: z.array(productReviewSchema),
  returnPolicy: z.string(),
  minimumOrderQuantity: z.number(),
  meta: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    barcode: z.string(),
    qrCode: z.string(),
  }),
  images: z.array(z.string()),
  thumbnail: z.string(),
});

module.exports = { productSchema };
