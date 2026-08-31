const { authApi } = require('../helpers/authApi');

const VALID_CREDENTIALS = { username: 'emilys', password: 'emilyspass' };
const JWT_PATTERN = /^[\w-]+\.[\w-]+\.[\w-]+$/;

describe('Auth API', () => {
  let accessToken;
  let refreshToken;

  beforeAll(async () => {
    const res = await authApi.login(VALID_CREDENTIALS);
    accessToken = res.data.accessToken;
    refreshToken = res.data.refreshToken;
  });

  describe('Login', () => {
    it('logs in with valid credentials and returns tokens @smoke', async () => {
      const res = await authApi.login(VALID_CREDENTIALS);

      expect(res.status).toBe(200);
      expect(res.data.username).toBe(VALID_CREDENTIALS.username);
      expect(res.data).toHaveProperty('accessToken');
      expect(res.data).toHaveProperty('refreshToken');
      expect(res.data.accessToken).toEqual(expect.stringMatching(JWT_PATTERN));
      expect(res.data.refreshToken).toEqual(expect.stringMatching(JWT_PATTERN));
      expect(res.data.id).toBe(1);
      expect(res.data.email).toBe('emily.johnson@x.dummyjson.com');
      expect(res.data.firstName).toBe('Emily');
      expect(res.data.lastName).toBe('Johnson');
      expect(res.data).not.toHaveProperty('password');
    });
  });

  describe('Protected route', () => {
    it('returns the current user when a valid Bearer token is provided', async () => {
      const res = await authApi.me(accessToken);

      expect(res.status).toBe(200);
      expect(res.data.username).toBe(VALID_CREDENTIALS.username);
      expect(res.data.id).toBe(1);
      expect(res.data.email).toBe('emily.johnson@x.dummyjson.com');
      expect(res.data).toHaveProperty('address');
      expect(res.data).toHaveProperty('company');
      expect(typeof res.data.role).toBe('string');
    });

    it('rejects the request when no token is provided', async () => {
      const res = await authApi.me();

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('message');
      expect(typeof res.data.message).toBe('string');
    });

    it('rejects the request when an invalid token is provided', async () => {
      const res = await authApi.me('not-a-real-token');

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('message');
      expect(typeof res.data.message).toBe('string');
    });
  });

  describe('Token refresh', () => {
    it('issues a new access token given a valid refresh token', async () => {
      const res = await authApi.refresh(refreshToken);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('accessToken');
      expect(res.data).toHaveProperty('refreshToken');
      expect(res.data.accessToken).toEqual(expect.stringMatching(JWT_PATTERN));
      expect(res.data.refreshToken).toEqual(expect.stringMatching(JWT_PATTERN));
    });

    it('rejects refresh when no refresh token is provided', async () => {
      const res = await authApi.refresh();

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('message');
    });
  });

  describe('negative cases', () => {
    it('rejects login with an invalid password', async () => {
      const res = await authApi.login({
        username: VALID_CREDENTIALS.username,
        password: 'wrong-password',
      });

      expect(res.status).toBe(400);
      expect(res.data).toHaveProperty('message');
      expect(res.data).not.toHaveProperty('accessToken');
    });

    it('rejects login with a missing required field', async () => {
      const res = await authApi.login({ username: VALID_CREDENTIALS.username });

      expect(res.status).toBe(400);
      expect(res.data).toHaveProperty('message');
      expect(res.data).not.toHaveProperty('accessToken');
    });

    it('rejects login for a non-existent username', async () => {
      const res = await authApi.login({ username: 'not-a-real-user', password: 'whatever' });

      expect(res.status).toBe(400);
      expect(res.data).toHaveProperty('message');
      expect(res.data).not.toHaveProperty('accessToken');
    });
  });
});
