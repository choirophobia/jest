const { productsApi } = require('../helpers/productsApi');
const { usersApi } = require('../helpers/usersApi');

// Mass assignment (OWASP's classic "over-posting" concern): does creating
// or updating a resource let a client set fields it has no business
// controlling, just by including them in the payload? Unlike most findings
// in this suite, the answer here is mixed — products gets this right;
// users doesn't, for one specific, privilege-bearing field. See
// Understanding Mass Assignment.
describe('Mass Assignment', () => {
  describe('products/add correctly ignores fields outside its known schema', () => {
    it('strips unrecognized fields like isAdmin and role from the payload entirely', async () => {
      const res = await productsApi.create({ title: 'mass-assign-test', isAdmin: true, role: 'admin' });

      expect(res.status).toBe(201);
      expect(res.data).not.toHaveProperty('isAdmin');
      expect(res.data).not.toHaveProperty('role');
    });
  });

  describe('users/add mostly does the same — with one real exception: role', () => {
    it('defaults role to "user" when the field is not provided at all', async () => {
      const res = await usersApi.create({ firstName: 'NoRoleTest' });

      expect(res.status).toBe(201);
      expect(res.data.role).toBe('user');
    });

    it('strips a genuinely unrecognized field like isAdmin, same as products', async () => {
      const res = await usersApi.create({ firstName: 'PrivEscTest', isAdmin: true });

      expect(res.status).toBe(201);
      expect(res.data).not.toHaveProperty('isAdmin');
    });

    it('does NOT protect role — a client can set it to "admin" directly at account creation', async () => {
      const res = await usersApi.create({ firstName: 'RoleInjectTest', role: 'admin' });

      expect(res.status).toBe(201);
      expect(res.data.role).toBe('admin');
    });

    it('the same gap exists on update — role accepts any arbitrary string, not just a real, known role', async () => {
      const res = await usersApi.patch(1, { role: 'superadmin' });

      expect(res.status).toBe(200);
      expect(res.data.role).toBe('superadmin');
    });
  });
});
