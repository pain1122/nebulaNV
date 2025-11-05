// apps/user-service/test/http/user.http.e2e.spec.ts
import { httpJson, AUTH_HTTP, subFromJwt, LoginResp } from '../utils/http';

const USER_HTTP = process.env.USER_HTTP_URL ?? 'http://127.0.0.1:3100';

describe('UserService HTTP (seeded users)', () => {
  const userEmail = process.env.SEED_USER_EMAIL ?? 'user@example.com';
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const userPass  = process.env.SEED_USER_PASS  ?? 'User123!';
  const adminPass = process.env.SEED_ADMIN_PASS ?? 'Admin123!';

  let userId = '', adminId = '';
  let userAccess = '', adminAccess = '';
  let haveAdmin = false;

  const run = Math.random().toString(36).slice(2, 8);
  const newEmail = `user+${run}@e2e.test`;

  beforeAll(async () => {
    // Login seeded user via auth-service HTTP
    const userTokens = await httpJson<LoginResp>('POST', `${AUTH_HTTP}/auth/login`, {
      identifier: userEmail,
      password: userPass,
    });
    userId = subFromJwt(userTokens.accessToken);
    userAccess = userTokens.accessToken;

    // Login seeded admin (optional; guard admin-only assertions)
    try {
      const adminTokens = await httpJson<LoginResp>('POST', `${AUTH_HTTP}/auth/login`, {
        identifier: adminEmail,
        password: adminPass,
      });
      adminId = subFromJwt(adminTokens.accessToken);
      adminAccess = adminTokens.accessToken;
      haveAdmin = true;
    } catch {
      haveAdmin = false;
    }
  });

  it('GET /users/:id (self) succeeds', async () => {
    const me = await httpJson<any>(
      'GET',
      `${USER_HTTP}/users/${userId}`,
      undefined,
      userAccess,
    );
    expect(me).toHaveProperty('id', userId);
  });

  it('GET /users/:id (user → admin) is denied', async () => {
    if (!haveAdmin) return; // soft-skip if admin login not available
    await expect(
      httpJson<any>('GET', `${USER_HTTP}/users/${adminId}`, undefined, userAccess),
    ).rejects.toBeTruthy();
  });

  it(haveAdmin ? 'GET /users/:id (admin → user) succeeds' : 'GET /users/:id (admin → user) skipped', async () => {
    if (!haveAdmin) return;
    const res = await httpJson<any>(
      'GET',
      `${USER_HTTP}/users/${userId}`,
      undefined,
      adminAccess,
    );
    expect(res).toHaveProperty('id', userId);
  });

  it('PUT /users/me updates email (self)', async () => {
    const updated = await httpJson<any>(
      'PUT',
      `${USER_HTTP}/users/me`,
      { email: newEmail },
      userAccess,
    );
    expect(updated).toMatchObject({ id: userId, email: newEmail });

    // verify via GET
    const fetched = await httpJson<any>(
      'GET',
      `${USER_HTTP}/users/${userId}`,
      undefined,
      userAccess,
    );
    expect(fetched.email).toBe(newEmail);
  });

  afterAll(async () => {
    // revert email so seeds remain stable
    try {
      await httpJson<any>(
        'PUT',
        `${USER_HTTP}/users/me`,
        { email: userEmail },
        userAccess,
      );
    } catch {
      // don’t fail suite on cleanup
    }
  });
});
