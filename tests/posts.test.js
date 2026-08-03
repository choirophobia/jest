const { postsApi } = require('../helpers/postsApi');

describe('Posts API', () => {
  describe('Create', () => {
    it('creates a new post and echoes payload fields', async () => {
      const payload = { title: 'Test Post', body: 'Test body content', userId: 1 };
      const res = await postsApi.create(payload);

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data.title).toBe(payload.title);
      expect(res.data.userId).toBe(payload.userId);
    });
  });

  describe('Read', () => {
    it('lists posts with default pagination', async () => {
      const res = await postsApi.list();

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.posts)).toBe(true);
      expect(res.data).toHaveProperty('total');
    });

    it('gets a single post by id', async () => {
      const res = await postsApi.getById(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data).toHaveProperty('title');
    });

    it('searches posts by query', async () => {
      const res = await postsApi.search('love');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.posts)).toBe(true);
    });
  });

  describe('Update', () => {
    it('updates a post with PUT and echoes new fields', async () => {
      const payload = { title: 'Updated Post Title' };
      const res = await postsApi.update(1, payload);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.title).toBe(payload.title);
    });
  });

  describe('Delete', () => {
    it('deletes a post and marks it as deleted', async () => {
      const res = await postsApi.remove(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.isDeleted).toBe(true);
    });
  });

  describe('negative cases', () => {
    it('returns 404 for an out-of-range post id', async () => {
      const res = await postsApi.getById(999999);

      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('message');
    });

    it('returns 404 when updating a non-existent post', async () => {
      const res = await postsApi.update(999999, { title: 'nope' });

      expect(res.status).toBe(404);
    });

    it('returns 404 when deleting a non-existent post', async () => {
      const res = await postsApi.remove(999999);

      expect(res.status).toBe(404);
    });
  });
});
