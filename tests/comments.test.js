const { commentsApi } = require('../helpers/commentsApi');

describe('Comments API', () => {
  describe('Create', () => {
    it('creates a new comment and echoes payload fields', async () => {
      const payload = { body: 'Test comment body', postId: 1, userId: 1 };
      const res = await commentsApi.create(payload);

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(typeof res.data.id).toBe('number');
      expect(res.data.body).toBe(payload.body);
      expect(res.data.postId).toBe(payload.postId);
      expect(res.data).toHaveProperty('user');
      expect(res.data.user.id).toBe(payload.userId);
    });
  });

  describe('Read', () => {
    it('lists comments with default pagination', async () => {
      const res = await commentsApi.list();

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.comments)).toBe(true);
      expect(res.data).toHaveProperty('total');
      expect(res.data).toHaveProperty('limit');
      expect(res.data).toHaveProperty('skip');
      expect(res.data.limit).toBe(30);
      expect(res.data.comments).toHaveLength(res.data.limit);
      expect(res.data.total).toBeGreaterThan(res.data.comments.length);
      res.data.comments.forEach((comment) => {
        expect(typeof comment.id).toBe('number');
        expect(typeof comment.body).toBe('string');
        expect(typeof comment.postId).toBe('number');
        expect(comment).toHaveProperty('user');
        expect(typeof comment.user.id).toBe('number');
      });
    });

    it('gets a single comment by id', async () => {
      const res = await commentsApi.getById(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(typeof res.data.body).toBe('string');
      expect(typeof res.data.postId).toBe('number');
      expect(typeof res.data.likes).toBe('number');
      expect(res.data).toHaveProperty('user');
      expect(typeof res.data.user.username).toBe('string');
    });

    it('gets comments for a specific post', async () => {
      const res = await commentsApi.byPost(1);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.comments)).toBe(true);
      expect(res.data.comments.length).toBeGreaterThan(0);
      res.data.comments.forEach((comment) => {
        expect(comment.postId).toBe(1);
      });
    });
  });

  describe('Update', () => {
    it('updates a comment with PUT and echoes new fields', async () => {
      const payload = { body: 'Updated comment body' };
      const res = await commentsApi.update(1, payload);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.body).toBe(payload.body);
      // Unmodified fields should still reflect the original seed comment, confirming
      // the API merges the payload onto the existing record rather than replacing it.
      expect(res.data.postId).toBe(242);
      expect(res.data).toHaveProperty('user');
    });
  });

  describe('Delete', () => {
    it('deletes a comment and marks it as deleted', async () => {
      const res = await commentsApi.remove(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.isDeleted).toBe(true);
      expect(res.data).toHaveProperty('deletedOn');
      expect(typeof res.data.deletedOn).toBe('string');
      expect(res.data.body).toBe('This is some awesome thinking!');
    });
  });

  describe('negative cases', () => {
    const NON_EXISTENT_ID = 999999;

    test.each([
      ['getting', () => commentsApi.getById(NON_EXISTENT_ID)],
      ['updating', () => commentsApi.update(NON_EXISTENT_ID, { body: 'nope' })],
      ['deleting', () => commentsApi.remove(NON_EXISTENT_ID)],
    ])('returns 404 (or 429 if rate-limited) when %s a non-existent comment', async (_action, makeRequest) => {
      const res = await makeRequest();

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });
  });
});
