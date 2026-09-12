const { usersApi } = require('../helpers/usersApi');

// Not a bug this project can fix — DummyJSON is a fixed, external service —
// and not something to work around either. This is a deliberate,
// documented security-awareness check: OWASP's API Security Top 10 calls
// this class of issue "Excessive Data Exposure" (an endpoint returns more
// sensitive data than the caller has any legitimate reason to receive).
// schemas/userSchema.js already declares these fields (see Understanding
// Contract Drift Detection for how that schema was built directly from
// what the live API actually returns) — this file is what makes their
// presence a named, deliberate finding instead of an implicit fact buried
// in a schema. See Understanding Sensitive Data Exposure.
describe('Sensitive Data Exposure', () => {
  describe('GET /users/{id} returns personal identifiers a real API should never expose this way', () => {
    it('returns the plaintext password', async () => {
      const res = await usersApi.getById(1);

      expect(res.status).toBe(200);
      expect(typeof res.data.password).toBe('string');
      expect(res.data.password.length).toBeGreaterThan(0);
    });

    it('returns a government ID number (ssn) and an ein', async () => {
      const res = await usersApi.getById(1);

      expect(typeof res.data.ssn).toBe('string');
      expect(typeof res.data.ein).toBe('string');
    });
  });

  describe('GET /users/{id} returns financial data a real API would mask or omit entirely', () => {
    it('returns a full, unmasked bank card number', async () => {
      const res = await usersApi.getById(1);

      // 13-19 digits covers every real card network's length range — this
      // isn't a last-4-digits mask, it's the complete number.
      expect(res.data.bank.cardNumber).toMatch(/^\d{13,19}$/);
    });

    it('returns a crypto wallet address', async () => {
      const res = await usersApi.getById(1);

      expect(typeof res.data.crypto.wallet).toBe('string');
      expect(res.data.crypto.wallet.length).toBeGreaterThan(0);
    });
  });

  describe('this is not a single-lookup fluke — a bulk list exposes the same fields for every item', () => {
    it('GET /users returns password/ssn/card number for every user in the page, not just single fetches', async () => {
      const res = await usersApi.list({ limit: 5 });

      expect(res.status).toBe(200);
      res.data.users.forEach((user) => {
        expect(typeof user.password).toBe('string');
        expect(typeof user.ssn).toBe('string');
        expect(user.bank.cardNumber).toMatch(/^\d{13,19}$/);
      });
    });
  });
});
