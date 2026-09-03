const { authApi } = require('../helpers/authApi');

const VALID_CREDENTIALS = { username: 'emilys', password: 'emilyspass' };

// No JWT library needed — just base64url-decoding the middle segment to read
// the `iat`/`exp` claims a normal client would never need to inspect itself.
function decodeJwtPayload(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

describe('Auth Token Edge Cases', () => {
  describe('malformed / tampered tokens', () => {
    // Different from auth.test.js's "not-a-real-token" (which isn't even
    // JWT-shaped) — this is a syntactically valid three-segment JWT with a
    // garbage signature, testing whether the API actually verifies it.
    it('returns 500 for a well-formed JWT with an invalid signature', async () => {
      const tamperedJwt =
        'eyJhbGciOiJIUzI1NiJ9.eyJmb28iOiJiYXIifQ.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const res = await authApi.me(tamperedJwt);

      // Surprising, worth pinning down explicitly: an invalid signature
      // returns 500 here, not 401 like every other invalid-token case in
      // auth.test.js. A well-behaved API would treat "signature doesn't
      // verify" as the same 401 "unauthorized" as any other bad token.
      expect(res.status).toBe(500);
      expect(res.data.message.toLowerCase()).toContain('signature');
    });

    it('returns 401 when the Authorization header is missing the "Bearer " scheme', async () => {
      const res = await authApi.meWithAuthorizationHeader('just-a-raw-value-no-scheme');

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('message');
    });
  });

  describe('refresh token edge cases', () => {
    // auth.test.js already covers a *missing* refresh token (401). This
    // covers a *present but invalid* one — a different code path, and it
    // turns out a different status code entirely.
    it('returns 403 for a garbage (non-JWT) refresh token value', async () => {
      const res = await authApi.refresh('not-a-real-refresh-token');

      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('message');
    });
  });

  describe('expiresInMins — custom token lifetime', () => {
    it('honors a custom expiresInMins by setting exp exactly that many minutes after iat', async () => {
      const res = await authApi.login({ ...VALID_CREDENTIALS, expiresInMins: 1 });

      expect(res.status).toBe(200);
      const { iat, exp } = decodeJwtPayload(res.data.accessToken);
      expect(exp - iat).toBe(60);
    });

    it('defaults to a 1-hour token when expiresInMins is omitted entirely', async () => {
      const res = await authApi.login(VALID_CREDENTIALS);

      const { iat, exp } = decodeJwtPayload(res.data.accessToken);
      expect(exp - iat).toBe(60 * 60);
    });

    // A falsy-value quirk, found by curling before writing the assertion:
    // explicitly passing expiresInMins: 0 does NOT mean "expires
    // immediately" (the intuitive reading) — the field is falsy in a `||`
    // check server-side, so it falls through to a much longer default than
    // omitting the field entirely does (30 days vs. 1 hour). Same shape as
    // the limit=0 "no limit" surprise in Understanding Pagination Boundary
    // Testing: a falsy-but-explicit 0 doesn't behave like "none".
    it('treats an explicit expiresInMins: 0 as falsy, producing a 30-day token instead of an immediate expiry', async () => {
      const res = await authApi.login({ ...VALID_CREDENTIALS, expiresInMins: 0 });

      const { iat, exp } = decodeJwtPayload(res.data.accessToken);
      expect(exp - iat).toBe(60 * 60 * 24 * 30);
    });
  });
});
