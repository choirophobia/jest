expect.extend({
  toMatchSchema(received, schema) {
    const result = schema.safeParse(received);

    if (result.success) {
      return {
        pass: true,
        message: () => 'expected value not to match the provided schema',
      };
    }

    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    return {
      pass: false,
      message: () =>
        `expected value to match the provided schema, but it didn't:\n${issues}\n\n` +
        `Received:\n${this.utils.printReceived(received)}`,
    };
  },

  toRespondWithin(received, maxMs) {
    const duration = received && received.duration;
    const pass = typeof duration === 'number' && duration <= maxMs;

    return {
      pass,
      message: () =>
        pass
          ? `expected response not to respond within ${maxMs}ms (took ${duration}ms)`
          : `expected response to respond within ${maxMs}ms, but took ${duration}ms`,
    };
  },
});
