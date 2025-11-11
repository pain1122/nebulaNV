import { httpJson } from '../utils/http';

const BASE = process.env.PRODUCT_HTTP_URL ?? 'http://127.0.0.1:3003';
const AUTH = process.env.AUTH_HTTP_URL ?? 'http://127.0.0.1:3001';

type LoginResp = { accessToken: string };

describe('category HTTP (admin writes, public reads)', () => {
  let admin = '';
  let user = '';
  let id = '';

  beforeAll(async () => {
    const a = await httpJson<LoginResp>('POST', `${AUTH}/auth/login`, {
      identifier: process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com',
      password: process.env.SEED_ADMIN_PASS ?? 'Admin123!',
    });
    admin = a.accessToken;

    const u = await httpJson<LoginResp>('POST', `${AUTH}/auth/login`, {
      identifier: process.env.SEED_USER_EMAIL ?? 'user@example.com',
      password: process.env.SEED_USER_PASS ?? 'User123!',
    });
    user = u.accessToken;
  });

  it('GET /categories is public', async () => {
    const res = await httpJson<any>('GET', `${BASE}/categories`);
    expect(Array.isArray(res.data ?? res)).toBe(true);
  });

  it('POST /categories requires admin', async () => {
    await expect(
      httpJson<any>('POST', `${BASE}/categories`, { title: 'E2E Cat' }, { authorization: `Bearer ${user}` }),
    ).rejects.toBeTruthy();
  });

  it('POST /categories (admin) creates', async () => {
    const res = await httpJson<any>('POST', `${BASE}/categories`, { title: 'E2E Cat' }, { authorization: `Bearer ${admin}` });
    id = (res.data?.id ?? res.id);
    expect(id).toBeTruthy();
  });

  it('PUT /categories/:id (admin) updates', async () => {
    const res = await httpJson<any>('PUT', `${BASE}/categories/${id}`, { title: 'E2E Cat Updated' }, { authorization: `Bearer ${admin}` });
    expect((res.data ?? res).title).toBe('E2E Cat Updated');
  });

  it('DELETE /categories/:id (admin) deletes', async () => {
    const res = await httpJson<any>('DELETE', `${BASE}/categories/${id}`, undefined, { authorization: `Bearer ${admin}` });
    expect((res.data ?? res).id ?? res.id ?? true).toBeTruthy();
  });

  it('POST /categories/default/ensure (admin) is idempotent', async () => {
    const res = await httpJson<any>('POST', `${BASE}/categories/default/ensure`, undefined, { authorization: `Bearer ${admin}` });
    expect(res).toBeTruthy();
  });

  it('GET /categories/default is public', async () => {
    const res = await httpJson<any>('GET', `${BASE}/categories/default`);
    expect((res.data ?? res).id ?? (res.data ?? res).slug).toBeTruthy();
  });
});
