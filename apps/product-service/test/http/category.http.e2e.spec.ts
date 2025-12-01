import { httpJson } from '../utils/http';

const BASE = process.env.PRODUCT_HTTP_URL ?? 'http://127.0.0.1:3003';
const AUTH = process.env.AUTH_HTTP_URL ?? 'http://127.0.0.1:3001';

type LoginResp = { accessToken: string };

describe.skip('category HTTP (admin writes, public reads)', () => {
  let admin = '';
  let user  = '';
  let id    = '';

  beforeAll(async () => {
    // login as admin
    const a = await httpJson<LoginResp>('POST', `${AUTH}/auth/login`, {
      identifier: process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com',
      password:   process.env.SEED_ADMIN_PASS  ?? 'Admin123!',
    });
    admin = a.accessToken;

    // login as normal user
    const u = await httpJson<LoginResp>('POST', `${AUTH}/auth/login`, {
      identifier: process.env.SEED_USER_EMAIL ?? 'user@example.com',
      password:   process.env.SEED_USER_PASS  ?? 'User123!',
    });
    user = u.accessToken;
  });

  it('POST /categories requires admin', async () => {
    await expect(
      httpJson<any>(
        'POST',
        `${BASE}/categories`,
        { slug: 'e2e-cat', title: 'E2E Category' },
        { authorization: `Bearer ${user}` },
      ),
    ).rejects.toBeTruthy();
  });

  it('POST /categories (admin) creates', async () => {
    const res = await httpJson<any>(
      'POST',
      `${BASE}/categories`,
      { slug: 'e2e-cat', title: 'E2E Category' },
      { authorization: `Bearer ${admin}` },
    );

    const body = res.data ?? res;
    id = body.id;
    expect(id).toBeTruthy();
    expect(body.slug).toBe('e2e-cat');
    expect(body.title).toBe('E2E Category');
  });

  it('GET /categories is public', async () => {
    const res = await httpJson<any>('GET', `${BASE}/categories`);
    const list = res.data ?? res;
    expect(Array.isArray(list)).toBe(true);

    const hit = list.find((c: any) => c.id === id);
    expect(!!hit).toBe(true);
  });

  it('GET /categories/:id is public', async () => {
    const res = await httpJson<any>('GET', `${BASE}/categories/${id}`);
    const body = res.data ?? res;
    expect(body.id).toBe(id);
    expect(body.slug).toBe('e2e-cat');
  });

  it('PATCH /categories/:id requires admin', async () => {
    await expect(
      httpJson<any>(
        'PATCH',
        `${BASE}/categories/${id}`,
        { title: 'E2E Category Updated' },
        { authorization: `Bearer ${user}` },
      ),
    ).rejects.toBeTruthy();
  });

  it('PATCH /categories/:id (admin) updates', async () => {
    const res = await httpJson<any>(
      'PATCH',
      `${BASE}/categories/${id}`,
      { title: 'E2E Category Updated' },
      { authorization: `Bearer ${admin}` },
    );

    const body = res.data ?? res;
    expect(body.id).toBe(id);
    expect(body.title).toBe('E2E Category Updated');
  });

  it('DELETE /categories/:id requires admin', async () => {
    await expect(
      httpJson<any>(
        'DELETE',
        `${BASE}/categories/${id}`,
        undefined,
        { authorization: `Bearer ${user}` },
      ),
    ).rejects.toBeTruthy();
  });

  it('DELETE /categories/:id (admin) deletes', async () => {
    const res = await httpJson<any>(
      'DELETE',
      `${BASE}/categories/${id}`,
      undefined,
      { authorization: `Bearer ${admin}` },
    );

    const body = res.data ?? res;
    // our service returns { data: true } – accept either true or an object with id
    expect(body === true || body.id === id).toBeTruthy();
  });
});
