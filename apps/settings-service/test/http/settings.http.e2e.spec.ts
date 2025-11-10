import { httpJson } from '../utils/http';

const SETTINGS_HTTP = process.env.SETTINGS_HTTP_URL ?? 'http://127.0.0.1:3010';
const AUTH_HTTP     = process.env.AUTH_HTTP_URL     ?? 'http://127.0.0.1:3001';

type LoginResp = { accessToken: string; refreshToken: string };

describe('settings-service HTTP (admin-only writes, public reads)', () => {
  const ns  = 'e2e';
  const key = `theme_color_${Math.random().toString(36).slice(2, 8)}`;
  const env = 'default';

  let userAccess = '';
  let adminAccess = '';

  beforeAll(async () => {
    // login seeded user
    const ut = await httpJson<LoginResp>('POST', `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_USER_EMAIL ?? 'user@example.com',
      password:   process.env.SEED_USER_PASS  ?? 'User123!',
    });
    userAccess = ut.accessToken;

    // login seeded admin
    const at = await httpJson<LoginResp>('POST', `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com',
      password:   process.env.SEED_ADMIN_PASS  ?? 'Admin123!',
    });
    adminAccess = at.accessToken;
  });

  it('GET /settings/string (miss) → found=false', async () => {
    const res = await httpJson<any>(
      'GET',
      `${SETTINGS_HTTP}/settings/string?namespace=${ns}&key=${key}&environment=${env}`
    );
    expect(res).toEqual({ value: '', found: false });
  });

  it('PUT /settings/string requires admin (user denied, admin allowed)', async () => {
    // user token → should fail
    await expect(
      httpJson<any>(
        'PUT',
        `${SETTINGS_HTTP}/settings/string`,
        { namespace: ns, key, value: 'red', environment: env },
        { authorization: `Bearer ${userAccess}` }
      )
    ).rejects.toBeTruthy();

    // admin token → should succeed
    const res = await httpJson<any>(
      'PUT',
      `${SETTINGS_HTTP}/settings/string`,
      { namespace: ns, key, value: 'red', environment: env },
      { authorization: `Bearer ${adminAccess}` }
    );
    expect(res).toEqual({ value: 'red' });
  });

  it('GET /settings/string (hit) → found=true', async () => {
    const res = await httpJson<any>(
      'GET',
      `${SETTINGS_HTTP}/settings/string?namespace=${ns}&key=${key}&environment=${env}`
    );
    expect(res).toEqual({ value: 'red', found: true });
  });

  it('DELETE /settings/string requires admin (user denied, admin delete then miss)', async () => {
    await expect(
      httpJson<any>(
        'DELETE',
        `${SETTINGS_HTTP}/settings/string?namespace=${ns}&key=${key}&environment=${env}`,
        undefined,
        { authorization: `Bearer ${userAccess}` }
      )
    ).rejects.toBeTruthy();

    const del = await httpJson<any>(
      'DELETE',
      `${SETTINGS_HTTP}/settings/string?namespace=${ns}&key=${key}&environment=${env}`,
      undefined,
      { authorization: `Bearer ${adminAccess}` }
    );
    expect(del).toEqual({ deleted: true });

    const res = await httpJson<any>(
      'GET',
      `${SETTINGS_HTTP}/settings/string?namespace=${ns}&key=${key}&environment=${env}`
    );
    expect(res).toEqual({ value: '', found: false });
  });
});
