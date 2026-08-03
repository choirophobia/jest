const { usersApi } = require('../helpers/usersApi');

describe('Users API', () => {
  describe('Create', () => {
    it('creates a new user and echoes payload fields', async () => {
      const payload = { firstName: 'Ada', lastName: 'Lovelace', age: 36 };
      const res = await usersApi.create(payload);

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data.firstName).toBe(payload.firstName);
      expect(res.data.lastName).toBe(payload.lastName);
    });
  });

  describe('Read', () => {
    it('lists users with default pagination', async () => {
      const res = await usersApi.list();

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.users)).toBe(true);
      expect(res.data).toHaveProperty('total');
      expect(res.data).toHaveProperty('limit');
      expect(res.data).toHaveProperty('skip');
    });

    it('gets a single user by id', async () => {
      const res = await usersApi.getById(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data).toHaveProperty('firstName');
      expect(res.data).toHaveProperty('email');
    });

    it('searches users by query', async () => {
      const res = await usersApi.search('a');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.users)).toBe(true);
    });

    it('filters users by key/value', async () => {
      const res = await usersApi.filter('hair.color', 'Brown');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.users)).toBe(true);
      res.data.users.forEach((user) => {
        expect(user.hair.color).toBe('Brown');
      });
    });
  });

  describe('Update', () => {
    it('fully updates a user with PUT and echoes new fields', async () => {
      const payload = { firstName: 'Grace' };
      const res = await usersApi.update(1, payload);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.firstName).toBe(payload.firstName);
    });

    it('partially updates a user with PATCH and echoes new fields', async () => {
      const payload = { age: 42 };
      const res = await usersApi.patch(1, payload);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.age).toBe(payload.age);
    });
  });

  describe('Delete', () => {
    it('deletes a user and marks it as deleted', async () => {
      const res = await usersApi.remove(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.isDeleted).toBe(true);
      expect(res.data).toHaveProperty('deletedOn');
    });
  });

  describe('negative cases', () => {
    it('returns 404 for an out-of-range user id', async () => {
      const res = await usersApi.getById(999999);

      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('message');
    });

    it('returns 404 when updating a non-existent user', async () => {
      const res = await usersApi.update(999999, { firstName: 'nope' });

      expect(res.status).toBe(404);
    });

    it('returns 404 when deleting a non-existent user', async () => {
      const res = await usersApi.remove(999999);

      expect(res.status).toBe(404);
    });

    it('returns an empty list when filtering on a non-existent value', async () => {
      const res = await usersApi.filter('hair.color', 'Not-A-Real-Color');

      expect(res.status).toBe(200);
      expect(res.data.users).toEqual([]);
    });
  });
});
