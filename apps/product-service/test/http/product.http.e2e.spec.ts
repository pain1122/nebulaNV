import { httpJson } from '../utils/http';

const PRODUCT_HTTP  = process.env.PRODUCT_HTTP_URL  ?? 'http://127.0.0.1:3003';
const AUTH_HTTP     = process.env.AUTH_HTTP_URL     ?? 'http://127.0.0.1:3001';

type LoginResp = { accessToken: string; refreshToken: string };

describe('product-service HTTP (admin-only writes, public reads)', () => {
  let userAccess = '';
  let adminAccess = '';
  let createdId = '';

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

    // Ensure default category exists (idempotent)
    await httpJson<any>('POST', `${PRODUCT_HTTP}/categories/default/ensure`, null, {
      authorization: `Bearer ${adminAccess}`,
    });
  });

  it('GET /products (initially) → { data: [], total: 0 } or >= 0', async () => {
    const res = await httpJson<any>('GET', `${PRODUCT_HTTP}/products`);
    expect(res).toHaveProperty('data');
    expect(res).toHaveProperty('total');
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('POST /products requires admin; user token should fail', async () => {
    await expect(
      httpJson<any>('POST', `${PRODUCT_HTTP}/products`,
        { data: { title: 'E2E Widget', price: 199.99 } },
        { authorization: `Bearer ${userAccess}` }
      )
    ).rejects.toBeTruthy();
  });

  it('POST /products (admin) → created', async () => {
    const res = await httpJson<any>('POST', `${PRODUCT_HTTP}/products`,
      { data: { title: 'E2E Widget', price: 199.99 } },
      { authorization: `Bearer ${adminAccess}` }
    );
    expect(res).toHaveProperty('data');
    expect(res.data).toHaveProperty('id');
    expect(res.data.title).toBe('E2E Widget');
    expect(res.data.price).toBe(199.99);
    createdId = res.data.id;
  });

  it('GET /products/:id returns the created product', async () => {
    const res = await httpJson<any>('GET', `${PRODUCT_HTTP}/products/${createdId}`);
    expect(res.data.id).toBe(createdId);
    expect(res.data.title).toBe('E2E Widget');
  });

  it('PATCH /products/:id (admin) updates the title', async () => {
    const res = await httpJson<any>('PATCH', `${PRODUCT_HTTP}/products/${createdId}`,
      { patch: { title: 'E2E Widget Pro' } },
      { authorization: `Bearer ${adminAccess}` }
    );
    expect(res.data.id).toBe(createdId);
    expect(res.data.title).toBe('E2E Widget Pro');
  });

  it('GET /products lists the new product', async () => {
    const res = await httpJson<any>('GET', `${PRODUCT_HTTP}/products?q=widget`);
    expect(res.total).toBeGreaterThanOrEqual(1);
    const found = res.data.find((p: any) => p.id === createdId);
    expect(!!found).toBe(true);
  });
});
