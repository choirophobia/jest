const { usersApi } = require('../helpers/usersApi');
const { userSchema } = require('../schemas/userSchema');

describe('Users API', () => {
  describe('Create', () => {
    it('creates a new user and echoes payload fields', async () => {
      const payload = { firstName: 'Ada', lastName: 'Lovelace', age: 36 };
      const res = await usersApi.create(payload);

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(typeof res.data.id).toBe('number');
      expect(res.data.firstName).toBe(payload.firstName);
      expect(res.data.lastName).toBe(payload.lastName);
      expect(res.data.age).toBe(payload.age);
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
      expect(res.data.limit).toBe(30);
      expect(res.data.users).toHaveLength(res.data.limit);
      expect(res.data.total).toBeGreaterThan(res.data.users.length);
      // One schema check per item replaces two shallow typeof assertions and
      // validates the entire nested shape (address, company, hair, bank, ...).
      res.data.users.forEach((user) => {
        expect(user).toMatchSchema(userSchema);
      });
    });

    it('gets a single user by id @smoke', async () => {
      const res = await usersApi.getById(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data).toMatchSchema(userSchema);
    });

    it('searches users by query', async () => {
      const res = await usersApi.search('a');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.users)).toBe(true);
      expect(res.data).toHaveProperty('total');
      expect(res.data.users.length).toBeGreaterThan(0);
      res.data.users.forEach((user) => {
        expect(user).toMatchSchema(userSchema);
        const haystack = `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase();
        expect(haystack).toEqual(expect.stringContaining('a'));
      });
    });

    it('filters users by key/value', async () => {
      const res = await usersApi.filter('hair.color', 'Brown');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.users)).toBe(true);
      expect(res.data.users.length).toBeGreaterThan(0);
      res.data.users.forEach((user) => {
        expect(user).toMatchSchema(userSchema);
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
      // Unmodified fields should still reflect the original seed user, confirming
      // the API merges the payload onto the existing record rather than replacing it.
      expect(res.data.lastName).toBe('Johnson');
      expect(res.data.email).toBe('emily.johnson@x.dummyjson.com');
    });

    it('partially updates a user with PATCH and echoes new fields', async () => {
      const payload = { age: 42 };
      const res = await usersApi.patch(1, payload);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.age).toBe(payload.age);
      expect(res.data.firstName).toBe('Emily');
    });
  });

  describe('Delete', () => {
    it('deletes a user and marks it as deleted', async () => {
      const res = await usersApi.remove(1);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(1);
      expect(res.data.isDeleted).toBe(true);
      expect(res.data).toHaveProperty('deletedOn');
      expect(typeof res.data.deletedOn).toBe('string');
      expect(res.data.firstName).toBe('Emily');
    });
  });

  describe('negative cases', () => {
    const NON_EXISTENT_ID = 999999;

    test.each([
      ['getting', () => usersApi.getById(NON_EXISTENT_ID)],
      ['updating', () => usersApi.update(NON_EXISTENT_ID, { firstName: 'nope' })],
      ['deleting', () => usersApi.remove(NON_EXISTENT_ID)],
    ])('returns 404 (or 429 if rate-limited) when %s a non-existent user', async (_action, makeRequest) => {
      const res = await makeRequest();

      expect([404, 429]).toContain(res.status);
      expect(res.data).toHaveProperty('message');
    });

    it('returns an empty list when filtering on a non-existent value', async () => {
      const res = await usersApi.filter('hair.color', 'Not-A-Real-Color');

      expect(res.status).toBe(200);
      expect(res.data.users).toEqual([]);
    });
  });
});
