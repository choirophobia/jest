const { todosApi } = require('../helpers/todosApi');

describe('Todos API', () => {
  describe('Create', () => {
    it('creates a new todo and echoes payload fields', async () => {
      const payload = { todo: 'Test todo item', completed: false, userId: 1 };
      const res = await todosApi.create(payload);

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(typeof res.data.id).toBe('number');
      expect(res.data.todo).toBe(payload.todo);
      expect(res.data.completed).toBe(payload.completed);
      expect(res.data.userId).toBe(payload.userId);
    });
  });

  describe('Read', () => {
    it('lists todos with default pagination', async () => {
      const res = await todosApi.list();

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.todos)).toBe(true);
      expect(res.data).toHaveProperty('total');
      expect(res.data).toHaveProperty('limit');
      expect(res.data).toHaveProperty('skip');
      expect(res.data.limit).toBe(30);
      expect(res.data.todos).toHaveLength(res.data.limit);
      expect(res.data.total).toBeGreaterThan(res.data.todos.length);
      res.data.todos.forEach((todo) => {
        expect(typeof todo.id).toBe('number');
        expect(typeof todo.todo).toBe('string');
        expect(typeof todo.completed).toBe('boolean');
        expect(typeof todo.userId).toBe('number');
      });
    });

    it('gets a single todo by id', async () => {
      const res = await todosApi.getById(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(typeof res.data.todo).toBe('string');
      expect(typeof res.data.completed).toBe('boolean');
      expect(typeof res.data.userId).toBe('number');
    });

    it('gets a random todo', async () => {
      const res = await todosApi.random();

      expect(res.status).toBe(200);
      expect(typeof res.data.id).toBe('number');
      expect(typeof res.data.todo).toBe('string');
      expect(typeof res.data.completed).toBe('boolean');
      expect(typeof res.data.userId).toBe('number');
    });
  });

  describe('Update', () => {
    it('updates a todo with PUT and echoes new fields', async () => {
      const payload = { completed: true };
      const res = await todosApi.update(1, payload);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.completed).toBe(payload.completed);
      // Unmodified fields should still reflect the original seed todo, confirming
      // the API merges the payload onto the existing record rather than replacing it.
      expect(res.data.todo).toBe('Do something nice for someone you care about');
      expect(res.data.userId).toBe(152);
    });
  });

  describe('Delete', () => {
    it('deletes a todo and marks it as deleted', async () => {
      const res = await todosApi.remove(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.isDeleted).toBe(true);
      expect(res.data).toHaveProperty('deletedOn');
      expect(typeof res.data.deletedOn).toBe('string');
      expect(res.data.todo).toBe('Do something nice for someone you care about');
    });
  });

  describe('negative cases', () => {
    it('returns 404 (or 429 if rate-limited) for an out-of-range todo id', async () => {
      const res = await todosApi.getById(999999);

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });

    it('returns 404 (or 429 if rate-limited) when updating a non-existent todo', async () => {
      const res = await todosApi.update(999999, { completed: true });

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });

    it('returns 404 (or 429 if rate-limited) when deleting a non-existent todo', async () => {
      const res = await todosApi.remove(999999);

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });
  });
});
