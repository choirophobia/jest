const { mockHttpApi } = require('../helpers/mockHttpApi');

// Mock HTTP is a utility resource, not a data resource — it doesn't model an
// entity with CRUD operations, so this file doesn't follow the
// Create/Read/Update/Delete shape used elsewhere. Instead it's grouped by what
// you'd actually use this endpoint for: simulating success/error responses,
// overriding the message, and confirming it's HTTP-method-agnostic.
describe('Mock HTTP API', () => {
  describe('success status codes', () => {
    it('mocks a 200 response', async () => {
      const res = await mockHttpApi.get(200);

      expect(res.status).toBe(200);
      expect(res.data.status).toBe(200);
      expect(res.data.message).toBe('OK');
    });

    it('mocks a 201 response', async () => {
      const res = await mockHttpApi.get(201);

      expect(res.status).toBe(201);
      expect(res.data.status).toBe(201);
      expect(res.data.message).toBe('Created');
    });

    it('mocks a 204 response with an empty body', async () => {
      const res = await mockHttpApi.get(204);

      expect(res.status).toBe(204);
      expect(res.data).toBeFalsy();
    });
  });

  describe('redirect and client/server error status codes', () => {
    it('mocks a 301 redirect response', async () => {
      const res = await mockHttpApi.get(301);

      expect(res.status).toBe(301);
      expect(res.data.status).toBe(301);
      expect(res.data.message).toBe('Moved Permanently');
    });

    it('mocks a 404 response', async () => {
      const res = await mockHttpApi.get(404);

      expect(res.status).toBe(404);
      expect(res.data.status).toBe(404);
      expect(res.data.message).toBe('Not Found');
    });

    it('mocks a 429 response', async () => {
      const res = await mockHttpApi.get(429);

      expect(res.status).toBe(429);
      expect(res.data.status).toBe(429);
      expect(res.data.message).toBe('Too Many Requests');
    });

    it('mocks a 500 response', async () => {
      const res = await mockHttpApi.get(500);

      expect(res.status).toBe(500);
      expect(res.data.status).toBe(500);
      expect(res.data.message).toBe('Internal Server Error');
    });
  });

  describe('custom messages', () => {
    it('overrides the default message on a success code', async () => {
      const res = await mockHttpApi.get(200, 'All_good');

      expect(res.status).toBe(200);
      expect(res.data.message).toBe('All_good');
    });

    it('overrides the default message on an error code', async () => {
      const res = await mockHttpApi.get(400, 'Missing_field_email');

      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Missing_field_email');
    });
  });

  describe('method-agnostic behavior', () => {
    it('honors the mocked code regardless of HTTP verb used', async () => {
      const [getRes, postRes, putRes, patchRes, deleteRes] = await Promise.all([
        mockHttpApi.get(200),
        mockHttpApi.post(200),
        mockHttpApi.put(200),
        mockHttpApi.patch(200),
        mockHttpApi.remove(200),
      ]);

      [getRes, postRes, putRes, patchRes, deleteRes].forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.data.status).toBe(200);
      });
    });
  });

  describe('negative cases', () => {
    it('returns 500 with a message when the requested status code is not supported', async () => {
      const res = await mockHttpApi.get(999);

      expect(res.status).toBe(500);
      expect(res.data).toHaveProperty('message');
      expect(res.data.message).toEqual(expect.stringContaining('999'));
    });
  });
});
