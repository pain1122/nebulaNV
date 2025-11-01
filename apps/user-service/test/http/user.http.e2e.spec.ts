// apps/user-service/test/http/user.http.e2e.spec.ts

import request from 'supertest';
import { ensureIdentities } from '../grpc/helpers';

const USER_HTTP_URL = process.env.USER_HTTP_URL || 'http://127.0.0.1:3100';

async function ping(url: string) {
  try {
    const r = await fetch(url, { method: 'GET' });
    return !!r;
  } catch {
    return false;
  }
}

beforeAll(async () => {
  const AUTH = process.env.AUTH_HTTP_URL || 'http://127.0.0.1:3001';
  const USER = process.env.USER_HTTP_URL || 'http://127.0.0.1:3100';

  const [authUp, userUp] = await Promise.all([
    ping(`${AUTH}/`),
    ping(`${USER}/`),
  ]);

  if (!authUp)
    throw new Error(
      `auth-service HTTP not reachable at ${AUTH}. Start @nebula/auth-service.`,
    );
  if (!userUp)
    throw new Error(
      `user-service HTTP not reachable at ${USER}. Start @nebula/user-service.`,
    );
});

function authz(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('[HTTP] user-service endpoints (live instance)', () => {
  // real tokens from auth-service
  let admin: { access: string; userId: string; role?: string };
  let user: { access: string; userId: string; role?: string };

  beforeAll(async () => {
    jest.setTimeout(60_000);
    const ids = await ensureIdentities();
    admin = ids.admin;
    user = ids.user;
  });

  describe('GET /users (admin only)', () => {
    it('returns 200 and a list for admin token', async () => {
      const res = await request(USER_HTTP_URL)
        .get('/users')
        .set(authz(admin.access));

      expect([200, 204]).toContain(res.status); // prefer 200; 204 if empty list is plausible
      if (res.status === 200) {
        // Accept array or {items: []}
        const payload = res.body;
        const isArray = Array.isArray(payload);
        const isWrapped = payload && Array.isArray(payload.items);
        expect(isArray || isWrapped).toBe(true);
      }
    });

    it('returns 403 for normal user token', async () => {
      const res = await request(USER_HTTP_URL)
        .get('/users')
        .set(authz(user.access));

      expect(res.status).toBe(403);
    });
  });

  describe('GET /users/:id (self or admin)', () => {
    it('self read: returns 200 and same id for user token', async () => {
      const res = await request(USER_HTTP_URL)
        .get(`/users/${user.userId}`)
        .set(authz(user.access));

      expect(res.status).toBe(200);
      // Allow either { id, ... } or nested shape like { user: { id } }
      const id =
        res.body?.id ??
        res.body?.user?.id ??
        res.body?.data?.id ??
        res.body?.data?.user?.id;
      expect(id).toBe(user.userId);
    });

    it('cross read: user tries to read admin → 403', async () => {
      const res = await request(USER_HTTP_URL)
        .get(`/users/${admin.userId}`)
        .set(authz(user.access));

      expect(res.status).toBe(403);
    });

    it('admin can read any user → 200', async () => {
      const res = await request(USER_HTTP_URL)
        .get(`/users/${user.userId}`)
        .set(authz(admin.access));

      expect(res.status).toBe(200);
      const id =
        res.body?.id ??
        res.body?.user?.id ??
        res.body?.data?.id ??
        res.body?.data?.user?.id;
      expect(id).toBe(user.userId);
    });
  });

  describe('PUT /users/me (validation path triggers controller/guard)', () => {
    it('rejects empty body with 4xx (triggers guard + pipe)', async () => {
      const res = await request(USER_HTTP_URL)
        .put('/users/me')
        .set(authz(user.access))
        .send({}); // intentionally invalid / empty to exercise ValidationPipe

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    // NOTE:
    // We avoid mutating seeded admin/user here to keep your fixture logins stable.
    // In the gRPC spec that follows, we’ll S2S-create a throwaway user and then
    // come back to /users/me to perform a real update on that temporary account.
  });
});
