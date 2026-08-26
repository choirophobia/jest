module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
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
