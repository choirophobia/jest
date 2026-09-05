module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Jest's 5000ms default assumed a single request per test. Now that a
  // request can retry up to 3 times on a 429 (see Understanding Retry &
  // Backoff Resilience), a worst case of ~4 round trips plus backoff can
  // legitimately exceed that on a cold connection — raised with margin
  // rather than let the retry feature itself cause spurious timeouts.
  testTimeout: 10000,
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './report',
        filename: 'index.html',
        pageTitle: 'DummyJSON API Test Report',
        openReport: false,
      },
    ],
  ],
};
