const { postsApi } = require('../helpers/postsApi');

describe('Posts API', () => {
  describe('Create', () => {
    it('creates a new post and echoes payload fields', async () => {
      const payload = { title: 'Test Post', body: 'Test body content', userId: 1 };
      const res = await postsApi.create(payload);

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(typeof res.data.id).toBe('number');
      expect(res.data.title).toBe(payload.title);
      expect(res.data.body).toBe(payload.body);
      expect(res.data.userId).toBe(payload.userId);
    });
  });

  describe('Read', () => {
    it('lists posts with default pagination', async () => {
      const res = await postsApi.list();

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.posts)).toBe(true);
      expect(res.data).toHaveProperty('total');
      expect(res.data).toHaveProperty('limit');
      expect(res.data).toHaveProperty('skip');
      expect(res.data.limit).toBe(30);
      expect(res.data.posts).toHaveLength(res.data.limit);
      expect(res.data.total).toBeGreaterThan(res.data.posts.length);
      res.data.posts.forEach((post) => {
        expect(typeof post.id).toBe('number');
        expect(typeof post.title).toBe('string');
        expect(typeof post.userId).toBe('number');
      });
    });

    it('gets a single post by id', async () => {
      const res = await postsApi.getById(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data).toHaveProperty('title');
      expect(typeof res.data.body).toBe('string');
      expect(Array.isArray(res.data.tags)).toBe(true);
      expect(typeof res.data.userId).toBe('number');
      expect(typeof res.data.views).toBe('number');
      expect(res.data).toHaveProperty('reactions');
      expect(typeof res.data.reactions.likes).toBe('number');
      expect(typeof res.data.reactions.dislikes).toBe('number');
    });

    it('searches posts by query', async () => {
      const res = await postsApi.search('love');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.posts)).toBe(true);
      expect(res.data.posts.length).toBeGreaterThan(0);
      res.data.posts.forEach((post) => {
        const haystack = `${post.title} ${post.body}`.toLowerCase();
        expect(haystack).toEqual(expect.stringContaining('love'));
      });
    });
  });

  describe('Update', () => {
    it('updates a post with PUT and echoes new fields', async () => {
      const payload = { title: 'Updated Post Title' };
      const res = await postsApi.update(1, payload);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.title).toBe(payload.title);
      // Unmodified fields should still reflect the original seed post, confirming
      // the API merges the payload onto the existing record rather than replacing it.
      expect(res.data.userId).toBe(121);
      expect(Array.isArray(res.data.tags)).toBe(true);
    });
  });

  describe('Delete', () => {
    it('deletes a post and marks it as deleted', async () => {
      const res = await postsApi.remove(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.isDeleted).toBe(true);
      expect(res.data).toHaveProperty('deletedOn');
      expect(typeof res.data.deletedOn).toBe('string');
      expect(res.data.title).toBe('His mother had always taught him');
    });
  });

  describe('negative cases', () => {
    it('returns 404 (or 429 if rate-limited) for an out-of-range post id', async () => {
      const res = await postsApi.getById(999999);

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });

    it('returns 404 (or 429 if rate-limited) when updating a non-existent post', async () => {
      const res = await postsApi.update(999999, { title: 'nope' });

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });

    it('returns 404 (or 429 if rate-limited) when deleting a non-existent post', async () => {
      const res = await postsApi.remove(999999);

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });
  });
});
