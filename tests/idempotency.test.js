const { productsApi } = require('../helpers/productsApi');
const { usersApi } = require('../helpers/usersApi');

describe('Idempotency & Concurrency', () => {
  describe('DELETE against a stateless mock — same status/shape, but not byte-identical', () => {
    // Against a real backend, a repeated DELETE of an already-deleted resource
    // would typically 404 the second time. DummyJSON's writes aren't persisted,
    // so it re-simulates the delete from seed data on every call — the second
    // call still succeeds with the same status/shape rather than 404ing.
    it('returns 200 + isDeleted:true on both a first and a repeated delete', async () => {
      const first = await productsApi.remove(1);
      const second = await productsApi.remove(1);

      [first, second].forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.data.id).toBe(1);
        expect(res.data.isDeleted).toBe(true);
        expect(typeof res.data.deletedOn).toBe('string');
      });
    });

    it('repeats the same behavior for a different resource (users), confirming it is platform-wide', async () => {
      const first = await usersApi.remove(1);
      const second = await usersApi.remove(1);

      [first, second].forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.data.id).toBe(1);
        expect(res.data.isDeleted).toBe(true);
      });
    });
  });

  describe('PUT is idempotent — identical requests produce identical responses', () => {
    it('returns an identical response body for the same PUT payload called twice', async () => {
      const payload = { title: 'Idempotent Title' };

      const first = await productsApi.update(1, payload);
      const second = await productsApi.update(1, payload);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(second.data).toEqual(first.data);
    });
  });

  describe('concurrent requests do not cross-contaminate each other\'s responses', () => {
    it('handles 5 parallel PATCH requests, each echoing only its own payload', async () => {
      const responses = await Promise.all(
        [1, 2, 3, 4, 5].map((n) => productsApi.patch(1, { title: `Concurrent-${n}` }))
      );

      responses.forEach((res, index) => {
        expect(res.status).toBe(200);
        expect(res.data.title).toBe(`Concurrent-${index + 1}`);
      });
    });

    it('handles 3 parallel creates without erroring or mixing up payloads', async () => {
      const responses = await Promise.all(
        ['A', 'B', 'C'].map((label) => productsApi.create({ title: `Concurrent-Create-${label}` }))
      );

      responses.forEach((res, index) => {
        expect(res.status).toBe(201);
        expect(res.data.title).toBe(`Concurrent-Create-${['A', 'B', 'C'][index]}`);
        expect(typeof res.data.id).toBe('number');
      });
      // Every concurrent create gets the *same* simulated id (current total + 1) —
      // a real backend would hand out unique ids under concurrent writes; this
      // mock computes "next id" statelessly per-request rather than persisting
      // a counter, so it can't. Documenting the difference, not asserting it's fine.
      const ids = responses.map((res) => res.data.id);
      expect(new Set(ids).size).toBe(1);
    });
  });
});
