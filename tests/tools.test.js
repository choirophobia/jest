const { totpApi } = require('../helpers/totpApi');
const { customResponseApi } = require('../helpers/customResponseApi');
const { webhookApi } = require('../helpers/webhookApi');

// Tools bundles three unrelated utility APIs (2FA TOTP, Custom Response,
// Webhook). None of them model a CRUD entity, so this file is grouped by
// tool instead of Create/Read/Update/Delete — same reasoning as
// mockHttp.test.js. See README's "Understanding Mock HTTP" section for the
// general "why mock at all" background; these three go further, since each
// one is generative/stateful (a fresh secret-derived code, a freshly minted
// URL) rather than a fixed status code.
describe('Tools API', () => {
  describe('2FA TOTP', () => {
    const SECRET = 'JBSWY3DPEHPK3PXP';

    it('generates a TOTP code via GET', async () => {
      const res = await totpApi.generate(SECRET);

      expect(res.status).toBe(200);
      expect(res.data.totp).toMatch(/^\d{6}$/);
      expect(res.data.period).toBe(30);
      expect(res.data.expiresIn).toBeGreaterThanOrEqual(0);
      expect(res.data.expiresIn).toBeLessThanOrEqual(30);
    });

    it('generates a TOTP code via POST (keeps the secret out of the URL)', async () => {
      const res = await totpApi.generateViaPost(SECRET);

      expect(res.status).toBe(200);
      expect(res.data.totp).toMatch(/^\d{6}$/);
      expect(res.data.period).toBe(30);
    });

    it('returns 400 when the secret key is missing', async () => {
      const res = await totpApi.generateViaPost(undefined);

      expect(res.status).toBe(400);
      expect(res.data).toHaveProperty('message');
    });

    it('returns 400 for a malformed secret key', async () => {
      const res = await totpApi.generateViaPost('not-a-valid-base32!!');

      expect(res.status).toBe(400);
      expect(res.data).toHaveProperty('message');
    });
  });

  describe('Custom Response', () => {
    it('creates a custom endpoint and echoes the configured JSON back on the configured method', async () => {
      const payload = { hello: 'world', nested: { ok: true } };
      const createRes = await customResponseApi.create(payload, 'GET');

      expect(createRes.status).toBe(200);
      expect(createRes.data.url).toEqual(expect.stringContaining('https://dummyjson.com/c/'));

      const callRes = await customResponseApi.call(createRes.data.url, 'get');
      expect(callRes.status).toBe(200);
      expect(callRes.data).toEqual(payload);
    });

    it('returns 404 when the generated endpoint is called with the wrong method', async () => {
      // A unique payload keeps this from colliding with an identical-looking
      // create call from a previous run — DummyJSON appears to cache
      // /c/generate results by payload hash at the CDN edge, so a repeated
      // payload can serve a stale cached response instead of a fresh 404.
      const uniquePayload = { a: 1, nonce: `${Date.now()}-${Math.random()}` };
      const createRes = await customResponseApi.create(uniquePayload, 'POST');
      const wrongMethodRes = await customResponseApi.call(createRes.data.url, 'get');

      expect(wrongMethodRes.status).toBe(404);
    });

    it('returns 500 with a message when "method" is missing from the create payload', async () => {
      const res = await customResponseApi.create({ a: 1 }, undefined);

      expect(res.status).toBe(500);
      expect(res.data).toHaveProperty('message');
    });
  });

  describe('Webhook', () => {
    it('creates a webhook endpoint', async () => {
      const res = await webhookApi.create();

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('identifier');
      expect(res.data.url).toBe(`https://dummyjson.com/webhook/${res.data.identifier}`);
      expect(res.data).toHaveProperty('expiresAt');
    });

    it('captures a request sent to the webhook and lists it back', async () => {
      const { data: hook } = await webhookApi.create();
      const payload = { ping: 'pong' };

      const sendRes = await webhookApi.send(hook.identifier, payload);
      expect(sendRes.status).toBe(200);
      expect(sendRes.data.received).toBe(true);
      expect(sendRes.data).toHaveProperty('requestId');

      const listRes = await webhookApi.listRequests(hook.identifier);
      expect(listRes.status).toBe(200);
      expect(listRes.data.requests).toHaveLength(1);
      expect(listRes.data.requests[0].method).toBe('POST');
      expect(listRes.data.requests[0].body).toEqual(payload);
    });

    it('deletes a captured request', async () => {
      const { data: hook } = await webhookApi.create();
      const { data: sent } = await webhookApi.send(hook.identifier, { x: 1 });

      const deleteRes = await webhookApi.deleteRequest(hook.identifier, sent.requestId);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.data.deleted).toBe(true);

      const listRes = await webhookApi.listRequests(hook.identifier);
      expect(listRes.data.requests).toHaveLength(0);
    });

    it('returns 404 when listing requests for an unknown identifier', async () => {
      const res = await webhookApi.listRequests('nonexistent-identifier-xyz');

      expect(res.status).toBe(404);
    });
  });
});
