const { authApi } = require('../helpers/authApi');

const VALID_CREDENTIALS = { username: 'emilys', password: 'emilyspass' };

describe('Auth API', () => {
  let accessToken;
  let refreshToken;

  beforeAll(async () => {
    const res = await authApi.login(VALID_CREDENTIALS);
    accessToken = res.data.accessToken;
    refreshToken = res.data.refreshToken;
  });

  describe('Login', () => {
    it('logs in with valid credentials and returns tokens', async () => {
      const res = await authApi.login(VALID_CREDENTIALS);

      expect(res.status).toBe(200);
      expect(res.data.username).toBe(VALID_CREDENTIALS.username);
      expect(res.data).toHaveProperty('accessToken');
      expect(res.data).toHaveProperty('refreshToken');
    });
  });

  describe('Protected route', () => {
    it('returns the current user when a valid Bearer token is provided', async () => {
      const res = await authApi.me(accessToken);

      expect(res.status).toBe(200);
      expect(res.data.username).toBe(VALID_CREDENTIALS.username);
    });

    it('rejects the request when no token is provided', async () => {
      const res = await authApi.me();

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('message');
    });

    it('rejects the request when an invalid token is provided', async () => {
      const res = await authApi.me('not-a-real-token');

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('message');
    });
  });

  describe('Token refresh', () => {
    it('issues a new access token given a valid refresh token', async () => {
      const res = await authApi.refresh(refreshToken);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('accessToken');
      expect(res.data).toHaveProperty('refreshToken');
    });

    it('rejects refresh when no refresh token is provided', async () => {
      const res = await authApi.refresh();

      expect(res.status).toBe(401);
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
    });

    it('rejects login with a missing required field', async () => {
      const res = await authApi.login({ username: VALID_CREDENTIALS.username });

      expect(res.status).toBe(400);
      expect(res.data).toHaveProperty('message');
    });

    it('rejects login for a non-existent username', async () => {
      const res = await authApi.login({ username: 'not-a-real-user', password: 'whatever' });

      expect(res.status).toBe(400);
    });
  });
});
