const { z } = require('zod');

// Matches the shape returned by GET /posts/{id} and each item inside
// GET /posts' `posts[]` array.
const postSchema = z.object({
  id: z.number(),
  title: z.string(),
  body: z.string(),
  tags: z.array(z.string()),
  reactions: z.object({
    likes: z.number(),
    dislikes: z.number(),
  }),
  views: z.number(),
  userId: z.number(),
});

module.exports = { postSchema };
