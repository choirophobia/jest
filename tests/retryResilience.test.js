const axios = require('axios');
const {
  MAX_RETRIES,
  MAX_BACKOFF_MS,
  computeRetryDelayMs,
  createRetryOn429Interceptor,
} = require('../helpers/apiClient');

// The rest of this suite makes only real HTTP calls (see CLAUDE.md: "no
// mocking, no Supertest"). This file is the one deliberate exception —
// axios's built-in `adapter` option swaps out the transport layer with a
// synthetic one, so the exact retry interceptor shipped in
// helpers/apiClient.js can be exercised deterministically. There's no way
// to make the real DummyJSON API return exactly N consecutive 429s on
// demand, and depending on the real rate limiter to test the code that
// exists *because of* that rate limiter would be circular.
function createFakeClient(statusSequence) {
  let callCount = 0;

  const adapter = (config) => {
    callCount += 1;
    const status = statusSequence[Math.min(callCount - 1, statusSequence.length - 1)];
    return Promise.resolve({ data: {}, status, statusText: String(status), headers: {}, config, request: {} });
  };

  const client = axios.create({ validateStatus: () => true, adapter });
  client.interceptors.request.use((config) => {
    config.metadata = { startTime: Date.now() };
    return config;
  });
  client.interceptors.response.use(createRetryOn429Interceptor(client));

  return { client, getCallCount: () => callCount };
}

describe('Retry & Backoff Resilience', () => {
  describe('computeRetryDelayMs', () => {
    it('uses the time until x-ratelimit-reset when present and in the future, capped at MAX_BACKOFF_MS', () => {
      const resetInTwoSeconds = Math.floor(Date.now() / 1000) + 2;
      const response = { headers: { 'x-ratelimit-reset': String(resetInTwoSeconds) } };

      expect(computeRetryDelayMs(response, 1)).toBe(MAX_BACKOFF_MS);
    });

    it('falls back to exponential backoff when the reset header is missing', () => {
      const response = { headers: {} };

      expect(computeRetryDelayMs(response, 1)).toBe(200);
      expect(computeRetryDelayMs(response, 2)).toBe(400);
      expect(computeRetryDelayMs(response, 3)).toBe(800);
    });

    it('falls back to exponential backoff when the reset header is already in the past', () => {
      const resetOneSecondAgo = Math.floor(Date.now() / 1000) - 1;
      const response = { headers: { 'x-ratelimit-reset': String(resetOneSecondAgo) } };

      expect(computeRetryDelayMs(response, 1)).toBe(200);
    });

    it('caps the exponential fallback at MAX_BACKOFF_MS for a high attempt number', () => {
      const response = { headers: {} };

      expect(computeRetryDelayMs(response, 10)).toBe(MAX_BACKOFF_MS);
    });
  });

  describe('the interceptor, exercised against a fake adapter', () => {
    it('retries on 429 and returns the eventual success response', async () => {
      const { client, getCallCount } = createFakeClient([429, 429, 200]);

      const res = await client.get('/whatever');

      expect(res.status).toBe(200);
      expect(getCallCount()).toBe(3);
    });

    it('gives up after MAX_RETRIES and returns the last 429 response, without throwing', async () => {
      const { client, getCallCount } = createFakeClient([429]);

      const res = await client.get('/whatever');

      expect(res.status).toBe(429);
      expect(getCallCount()).toBe(MAX_RETRIES + 1); // the original attempt, plus every retry
    });

    it('never retries a non-429 status', async () => {
      const { client, getCallCount } = createFakeClient([404]);

      const res = await client.get('/whatever');

      expect(res.status).toBe(404);
      expect(getCallCount()).toBe(1);
    });
  });
});
