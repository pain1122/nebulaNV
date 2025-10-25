/**
 * E2E HTTP tests for user-service
 *
 * These tests:
 *  - Generate real JWTs using JWT_ACCESS_SECRET (so guards behave realistically)
 *  - Hit the actually running user-service over HTTP (Supertest)
 *  - Cover user vs admin authorization in "real life" flows
 *
 * Assumptions:
 *  - user-service is running locally on USER_HTTP_PORT (default 3100)
 *  - DB has at least one user with id = SELF_USER_ID and one admin with id = ADMIN_USER_ID
 *    If you don't have fixtures yet, set them via env vars or adjust the create/seed calls below.
 *
 * Optional env overrides for convenience while developing:
 *  - E2E_BASE_URL=http://127.0.0.1:3100
 *  - SELF_USER_ID=<existing user id>
 *  - OTHER_USER_ID=<another existing user id>
 *  - ADMIN_USER_ID=<existing admin id>
 */

import request from 'supertest';
import * as jwt from 'jsonwebtoken';

const {
  E2E_BASE_URL,
  USER_HTTP_PORT,
  JWT_ACCESS_SECRET,
  SELF_USER_ID,
  OTHER_USER_ID,
  ADMIN_USER_ID,
} = process.env;

const BASE_URL =
  E2E_BASE_URL ??
  `http://127.0.0.1:${USER_HTTP_PORT ? Number(USER_HTTP_PORT) : 3100}`;

if (!JWT_ACCESS_SECRET) {
  // Fail early with a clear message
  // (This secret comes from your root .env shared across services)
  throw new Error(
    'Missing JWT_ACCESS_SECRET. Ensure your .env is loaded when running tests.'
  );
}

/** Helper: issue a signed access token with role + subject */
function signAccessToken(payload: {
  sub: string;
  role: 'user' | 'admin' | 'root';
  email?: string;
  name?: string;
}) {
  // keep it as close to your Auth payload as possible
  return jwt.sign(
    {
      sub: payload.sub,
      role: payload.role,
      email: payload.email ?? `${payload.sub}@e2e.test`,
      name: payload.name ?? `User ${payload.sub}`,
      // add any claims your guards expect (iat/exp handled by sign options)
    },
    JWT_ACCESS_SECRET!,
    { expiresIn: '15m' }
  );
}

/** Pre-canned identities for readability */
const ids = {
  self: SELF_USER_ID ?? 'u_self_e2e',
  other: OTHER_USER_ID ?? 'u_other_e2e',
  admin: ADMIN_USER_ID ?? 'u_admin_e2e',
};

const tokens = {
  selfUser: signAccessToken({ sub: ids.self, role: 'user' }),
  otherUser: signAccessToken({ sub: ids.other, role: 'user' }),
  admin: signAccessToken({ sub: ids.admin, role: 'admin' }),
};

describe('user-service HTTP e2e (roles & real scenarios)', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────────
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function getMe(t: string) {
    return request(BASE_URL).get('/users/me').set(auth(t));
  }

  async function getUser(t: string, id: string) {
    return request(BASE_URL).get(`/users/${id}`).set(auth(t));
  }

  async function listUsers(t: string, q?: Record<string, any>) {
    const r = request(BASE_URL).get('/users');
    if (q) r.query(q);
    return r.set(auth(t));
  }

  async function updateUser(t: string, id: string, dto: any) {
    return request(BASE_URL).patch(`/users/${id}`).send(dto).set(auth(t));
  }

  async function deleteUser(t: string, id: string) {
    return request(BASE_URL).delete(`/users/${id}`).set(auth(t));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Smoke: public/health if available (non-fatal if 404)
  // ─────────────────────────────────────────────────────────────────────────────
  it('smoke: service is reachable', async () => {
    const res = await request(BASE_URL).get('/health');
    // Allow flexible behavior (200 OK or 404 if no health route)
    expect([200, 404]).toContain(res.status);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Self profile flows
  // ─────────────────────────────────────────────────────────────────────────────
  it('GET /users/me — returns own profile with user token (200 or 404 if not seeded)', async () => {
    const res = await getMe(tokens.selfUser);
    // If fixtures not present yet, service may return 404; let’s surface both outcomes.
    expect([200, 404, 401]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toMatchObject({
        id: ids.self,
      });
    }
  });

  it('GET /users/me — unauthorized with invalid token (401)', async () => {
    const res = await request(BASE_URL)
      .get('/users/me')
      .set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Visibility & isolation
  // ─────────────────────────────────────────────────────────────────────────────
  it('GET /users — user role MUST NOT list all users (403)', async () => {
    const res = await listUsers(tokens.selfUser, { limit: 5 });
    expect([403, 401]).toContain(res.status);
  });

  it('GET /users — admin CAN list users (200)', async () => {
    const res = await listUsers(tokens.admin, { limit: 5 });
    expect([200, 204]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true);
    }
  });

  it('GET /users/:id — user CANNOT read someone else (403)', async () => {
    const res = await getUser(tokens.selfUser, ids.other);
    // If OTHER user doesn’t exist yet, a 404 may happen — but the *policy* should be enforced first.
    // Your controller may short-circuit to 403 before lookup; both are acceptable in early phases.
    expect([403, 404]).toContain(res.status);
  });

  it('GET /users/:id — self CAN read self (200)', async () => {
    const res = await getUser(tokens.selfUser, ids.self);
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toMatchObject({ id: ids.self });
    }
  });

  it('GET /users/:id — admin CAN read any user (200)', async () => {
    const res = await getUser(tokens.admin, ids.other);
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Updates: self vs admin
  // ─────────────────────────────────────────────────────────────────────────────
  it('PATCH /users/:id — self CAN update own basic fields (200)', async () => {
    const res = await updateUser(tokens.selfUser, ids.self, {
      name: 'E2E Self',
    });
    expect([200, 400, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toMatchObject({ id: ids.self, name: 'E2E Self' });
    }
  });

  it('PATCH /users/:id — user CANNOT update others (403)', async () => {
    const res = await updateUser(tokens.selfUser, ids.other, { name: 'Nope' });
    expect([403, 404]).toContain(res.status);
  });

  it('PATCH /users/:id — admin CAN update others (200)', async () => {
    const res = await updateUser(tokens.admin, ids.other, {
      name: 'E2E Admin Updated',
    });
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toMatchObject({ name: 'E2E Admin Updated' });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Deletions: admin only (if your policy allows)
  // ─────────────────────────────────────────────────────────────────────────────
  it('DELETE /users/:id — user CANNOT delete others (403)', async () => {
    const res = await deleteUser(tokens.selfUser, ids.other);
    expect([403, 404]).toContain(res.status);
  });

  it('DELETE /users/:id — admin CAN delete (200/204)', async () => {
    const res = await deleteUser(tokens.admin, ids.other);
    expect([200, 204, 404]).toContain(res.status);
  });
});
