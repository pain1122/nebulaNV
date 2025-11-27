import { httpJson } from '../utils/http';

const PRODUCT_HTTP  = process.env.PRODUCT_HTTP_URL  ?? 'http://127.0.0.1:3003';
const AUTH_HTTP     = process.env.AUTH_HTTP_URL     ?? 'http://127.0.0.1:3001';

type LoginResp = { accessToken: string };

describe('taxonomy-service HTTP (admin writes, public reads)', () => {
  let admin = '';
  let user  = '';
  let id = '';

  beforeAll(async () => {
    const ut = await httpJson<LoginResp>('POST', `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_USER_EMAIL ?? 'user@example.com',
      password:   process.env.SEED_USER_PASS  ?? 'User123!',
    });
    user = ut.accessToken;

    const at = await httpJson<LoginResp>('POST', `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com',
      password:   process.env.SEED_ADMIN_PASS  ?? 'Admin123!',
    });
    admin = at.accessToken;

    // ensure default category exists (idempotent)
    await httpJson<any>('POST', `${PRODUCT_HTTP}/categories/default/ensure`, null, {
      authorization: `Bearer ${admin}`,
    });
  });

  it('GET /taxonomy is public', async () => {
    const res = await httpJson<any>('GET', `${PRODUCT_HTTP}/taxonomy`);
    expect(res).toHaveProperty('data');
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('POST /taxonomy requires admin', async () => {
    await expect(
      httpJson<any>('POST', `${PRODUCT_HTTP}/taxonomy`,
        { data: { title: 'E2E Widget', price: 199.99 } },
        { authorization: `Bearer ${user}` })
    ).rejects.toBeTruthy();
  });

  it('POST /taxonomy (admin) creates', async () => {
    const res = await httpJson<any>('POST', `${PRODUCT_HTTP}/taxonomy`,
      { data: { title: 'E2E Widget', price: 199.99 } },
      { authorization: `Bearer ${admin}` });
    id = res.data.id;
    expect(res.data.title).toBe('E2E Widget');
  });

  it('GET /taxonomy/:id returns the created taxonomy', async () => {
    const res = await httpJson<any>('GET', `${PRODUCT_HTTP}/taxonomy/${id}`);
    expect(res.data.id).toBe(id);
  });

  it('PATCH /taxonomy/:id (admin) updates', async () => {
    const res = await httpJson<any>('PATCH', `${PRODUCT_HTTP}/taxonomy/${id}`,
      { patch: { title: 'E2E Widget Pro' } },
      { authorization: `Bearer ${admin}` });
    expect(res.data.title).toBe('E2E Widget Pro');
  });

  it('GET /taxonomy lists includes the taxonomy', async () => {
    const res = await httpJson<any>('GET', `${PRODUCT_HTTP}/taxonomy?q=widget`);
    const hit = res.data.find((p: any) => p.id === id);
    expect(!!hit).toBe(true);
  });
});
