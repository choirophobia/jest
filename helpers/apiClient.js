const axios = require('axios');

const BASE_URL = 'https://dummyjson.com';

// Only 429 is ever retried — every other status (400/401/403/404/500/etc.)
// is a real outcome this suite tests for on purpose and must reach the
// caller untouched.
const MAX_RETRIES = 3;
// Per-attempt wait is capped so a worst-case run of MAX_RETRIES stays well
// under Jest's default 5000ms test timeout, even stacked with the request
// itself. This trades "always outlast the real rate-limit window" for
// "never make a single test hang" — see Understanding Retry & Backoff
// Resilience in the README for the reasoning.
const MAX_BACKOFF_MS = 1000;

// DummyJSON stamps every response with `x-ratelimit-reset` (a Unix seconds
// timestamp for when the limit window clears) — see Understanding Response
// Header Assertions. Preferring that over a blind guess means a retry that
// actually lands after the window resets, not one timed by luck.
function computeRetryDelayMs(response, attempt) {
  const resetHeader = response.headers && response.headers['x-ratelimit-reset'];
  if (resetHeader) {
    const untilReset = Number(resetHeader) * 1000 - Date.now();
    if (Number.isFinite(untilReset) && untilReset > 0) {
      return Math.min(untilReset, MAX_BACKOFF_MS);
    }
  }
  // Exponential fallback (200ms, 400ms, 800ms, ...) for the rare case the
  // header is missing or already in the past.
  return Math.min(200 * 2 ** (attempt - 1), MAX_BACKOFF_MS);
}

// Factored out (rather than inlined below) so tests/retryResilience.test.js
// can attach the exact same interceptor to a client wired with a fake
// adapter, instead of duplicating the retry logic to test it.
function createRetryOn429Interceptor(client) {
  return async (response) => {
    const config = response.config;
    config.__retryCount = config.__retryCount || 0;

    if (response.status === 429 && config.__retryCount < MAX_RETRIES) {
      config.__retryCount += 1;
      const delayMs = computeRetryDelayMs(response, config.__retryCount);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return client(config);
    }

    // Stamped here (on whichever attempt is actually returned to the
    // caller) so `response.duration` always reflects that one round trip,
    // never the cumulative retry/backoff time — performance.test.js's
    // budget is about server responsiveness, not client-side waiting.
    response.duration = Date.now() - config.metadata.startTime;
    return response;
  };
}

const apiClient = axios.create({
  baseURL: BASE_URL,
  // DummyJSON returns error bodies (e.g. 400/401/404) that we want to assert on
  // directly, rather than have axios throw and force try/catch everywhere.
  validateStatus: () => true,
});

apiClient.interceptors.request.use((config) => {
  config.metadata = { startTime: Date.now() };
  return config;
});

apiClient.interceptors.response.use(createRetryOn429Interceptor(apiClient));

module.exports = {
  apiClient,
  BASE_URL,
  MAX_RETRIES,
  MAX_BACKOFF_MS,
  computeRetryDelayMs,
  createRetryOn429Interceptor,
};
