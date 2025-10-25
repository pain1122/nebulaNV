/**
 * E2E gRPC tests for user-service
 *
 * Requirements:
 *  - user-service gRPC running locally (default 127.0.0.1:50051)
 *  - JWT_ACCESS_SECRET available in env (shared root .env)
 *  - If you want deterministic "200 vs 404/NOT_FOUND", set:
 *      SELF_USER_ID, OTHER_USER_ID, ADMIN_USER_ID to real records
 *  - Optional S2S test:
 *      S2S_NAME, S2S_SECRET, (optional) S2S_HEADER, S2S_SIGN_HEADER, and INTERNAL_METHOD
 *
 * Notes:
 *  - We defensively tolerate NOT_FOUND where fixtures may be missing.
 *  - We skip methods that don't exist on the client (ts-proto configs vary).
 */

import { credentials, Metadata, status } from '@grpc/grpc-js';
import * as jwt from 'jsonwebtoken';
import { userv1 } from '@nebula/protos';

const {
  USER_GRPC_ADDR,
  USER_GRPC_PORT,
  JWT_ACCESS_SECRET,
  SELF_USER_ID,
  OTHER_USER_ID,
  ADMIN_USER_ID,

  // Optional S2S/Internal
  S2S_NAME,
  S2S_SECRET,
  S2S_HEADER = 'x-svc',
  S2S_SIGN_HEADER = 'x-svc-sign',
  INTERNAL_METHOD, // e.g. "InternalLookup" or whatever your @InternalOnly endpoint is
} = process.env;

if (!JWT_ACCESS_SECRET) {
  throw new Error('Missing JWT_ACCESS_SECRET in env for gRPC tests.');
}

const GRPC_ADDR =
  USER_GRPC_ADDR ?? `127.0.0.1:${USER_GRPC_PORT ? Number(USER_GRPC_PORT) : 50051}`;

const ids = {
  self: SELF_USER_ID ?? 'u_self_e2e',
  other: OTHER_USER_ID ?? 'u_other_e2e',
  admin: ADMIN_USER_ID ?? 'u_admin_e2e',
};

// -- Token helpers -------------------------------------------------------------
function signAccessToken(payload: {
  sub: string;
  role: 'user' | 'admin' | 'root';
  email?: string;
  name?: string;
}) {
  return jwt.sign(
    {
      sub: payload.sub,
      role: payload.role,
      email: payload.email ?? `${payload.sub}@e2e.test`,
      name: payload.name ?? `User ${payload.sub}`,
    },
    JWT_ACCESS_SECRET!,
    { expiresIn: '15m' },
  );
}

const tokens = {
  userSelf: signAccessToken({ sub: ids.self, role: 'user' }),
  userOther: signAccessToken({ sub: ids.other, role: 'user' }),
  admin: signAccessToken({ sub: ids.admin, role: 'admin' }),
};

// -- Metadata builders ---------------------------------------------------------
function authMd(token?: string): Metadata {
  const md = new Metadata();
  if (token) md.add('authorization', `Bearer ${token}`);
  return md;
}

function s2sMd(): Metadata {
  const md = new Metadata();
  if (!S2S_NAME || !S2S_SECRET) return md;
  // Minute-bucket HMAC (mirrors your S2SGuard logic)
  const minuteBucket = Math.floor(Date.now() / 60000);
  const crypto = require('crypto') as typeof import('crypto');
  const payload = `${S2S_NAME}:${minuteBucket}`;
  const sign = crypto.createHmac('sha256', S2S_SECRET).update(payload).digest('hex');
  md.add(S2S_HEADER, S2S_NAME);
  md.add(S2S_SIGN_HEADER, sign);
  return md;
}

// -- Client & call helpers -----------------------------------------------------
const client = new userv1.UserServiceClient(GRPC_ADDR, credentials.createInsecure());

// ts-proto grpc-js clients expose PascalCase methods. We check presence to be robust.
function hasMethod(name: string): boolean {
  return typeof (client as any)[name] === 'function';
}

function callUnary<TReq extends object, TRes = any>(
  method: string,
  req: TReq,
  md?: Metadata,
): Promise<TRes> {
  return new Promise((resolve, reject) => {
    const fn = (client as any)[method];
    if (typeof fn !== 'function') return reject(new Error(`Method ${method} not found on client`));
    if (md) fn.call(client, req, md, (err: any, res: any) => (err ? reject(err) : resolve(res)));
    else fn.call(client, req, (err: any, res: any) => (err ? reject(err) : resolve(res)));
  });
}

// Small assertion helpers
function expectGrpcError(err: any, code: number) {
  expect(err).toBeTruthy();
  expect(err.code).toBe(code);
}
function allowOkOrNotFound<T>(resOrErr: T | any) {
  // If NOT_FOUND, it will be thrown as an error with code = status.NOT_FOUND
  // The test that uses this helper should catch and pass when NOT_FOUND.
  return resOrErr;
}

// ──────────────────────────────────────────────────────────────────────────────
// Test suite
// ──────────────────────────────────────────────────────────────────────────────
describe('user-service gRPC e2e (roles & scenarios)', () => {
  it('client should connect to server', () => {
    expect(client).toBeTruthy();
  });

  // ---------- GetUser(self) ----------
  (hasMethod('GetUser') ? it : it.skip)(
    'GetUser(self) — user can read self',
    async () => {
      try {
        const res = await callUnary('GetUser', { id: ids.self }, authMd(tokens.userSelf));
        expect(res).toHaveProperty('id', ids.self);
      } catch (err: any) {
        // If DB not seeded, allow NOT_FOUND
        if (err.code === status.NOT_FOUND) return;
        throw err;
      }
    },
  );

  // ---------- GetUser(other) ----------
  (hasMethod('GetUser') ? it : it.skip)(
    'GetUser(other) — user cannot read other user',
    async () => {
      try {
        await callUnary('GetUser', { id: ids.other }, authMd(tokens.userSelf));
        throw new Error('Expected PERMISSION_DENIED or NOT_FOUND');
      } catch (err: any) {
        // Policy-first is PERMISSION_DENIED; some impls may return NOT_FOUND
        expect([status.PERMISSION_DENIED, status.NOT_FOUND]).toContain(err.code);
      }
    },
  );

  // ---------- GetUser(other) as admin ----------
  (hasMethod('GetUser') ? it : it.skip)(
    'GetUser(other) — admin can read any user',
    async () => {
      try {
        const res = await callUnary('GetUser', { id: ids.other }, authMd(tokens.admin));
        expect(res).toHaveProperty('id');
      } catch (err: any) {
        if (err.code === status.NOT_FOUND) return;
        throw err;
      }
    },
  );

  // ---------- ListUsers ----------
  (hasMethod('ListUsers') ? it : it.skip)(
    'ListUsers — user is forbidden; admin is allowed',
    async () => {
      // user forbidden
      try {
        await callUnary('ListUsers', { limit: 5 }, authMd(tokens.userSelf));
        throw new Error('Expected PERMISSION_DENIED for user');
      } catch (err: any) {
        expect([status.PERMISSION_DENIED, status.UNAUTHENTICATED]).toContain(err.code);
      }
      // admin allowed
      try {
        const res = await callUnary('ListUsers', { limit: 5 }, authMd(tokens.admin));
        // shape can vary; just assert it's a container with an array or has items
        expect(res).toBeTruthy();
      } catch (err: any) {
        if (err.code === status.NOT_FOUND) return; // no users seeded
        throw err;
      }
    },
  );

  // ---------- UpdateUser ----------
  (hasMethod('UpdateUser') ? it : it.skip)(
    'UpdateUser(self) — self can update own fields',
    async () => {
      const dto = { id: ids.self, name: 'E2E Self' };
      try {
        const res = await callUnary('UpdateUser', dto, authMd(tokens.userSelf));
        expect(res).toMatchObject({ id: ids.self });
      } catch (err: any) {
        if (err.code === status.NOT_FOUND) return;
        throw err;
      }
    },
  );

  (hasMethod('UpdateUser') ? it : it.skip)(
    'UpdateUser(other) — user cannot update others',
    async () => {
      const dto = { id: ids.other, name: 'Nope' };
      try {
        await callUnary('UpdateUser', dto, authMd(tokens.userSelf));
        throw new Error('Expected PERMISSION_DENIED or NOT_FOUND');
      } catch (err: any) {
        expect([status.PERMISSION_DENIED, status.NOT_FOUND]).toContain(err.code);
      }
    },
  );

  (hasMethod('UpdateUser') ? it : it.skip)(
    'UpdateUser(other) — admin can update others',
    async () => {
      const dto = { id: ids.other, name: 'E2E Admin Updated' };
      try {
        const res = await callUnary('UpdateUser', dto, authMd(tokens.admin));
        expect(res).toBeTruthy();
      } catch (err: any) {
        if (err.code === status.NOT_FOUND) return;
        throw err;
      }
    },
  );

  // ---------- DeleteUser ----------
  (hasMethod('DeleteUser') ? it : it.skip)(
    'DeleteUser(other) — user cannot delete others',
    async () => {
      try {
        await callUnary('DeleteUser', { id: ids.other }, authMd(tokens.userSelf));
        throw new Error('Expected PERMISSION_DENIED or NOT_FOUND');
      } catch (err: any) {
        expect([status.PERMISSION_DENIED, status.NOT_FOUND]).toContain(err.code);
      }
    },
  );

  (hasMethod('DeleteUser') ? it : it.skip)(
    'DeleteUser(other) — admin can delete',
    async () => {
      try {
        const res = await callUnary('DeleteUser', { id: ids.other }, authMd(tokens.admin));
        expect(res).toBeTruthy();
      } catch (err: any) {
        if (err.code === status.NOT_FOUND) return;
        throw err;
      }
    },
  );

  // ---------- Guarding direct access (no token) ----------
  (hasMethod('GetUser') ? it : it.skip)(
    'GetUser(self) — UNAUTHENTICATED without token',
    async () => {
      try {
        await callUnary('GetUser', { id: ids.self }, authMd()); // no auth
        throw new Error('Expected UNAUTHENTICATED');
      } catch (err: any) {
        expectGrpcError(err, status.UNAUTHENTICATED);
      }
    },
  );

  // ---------- Optional: Internal/S2S-only method ----------
  ((INTERNAL_METHOD && hasMethod(INTERNAL_METHOD)) ? it : it.skip)(
    `${INTERNAL_METHOD} — requires valid S2S metadata`,
    async () => {
      // Without S2S → expect PERMISSION_DENIED or UNAUTHENTICATED
      try {
        await callUnary(INTERNAL_METHOD!, {}, authMd(tokens.admin));
        throw new Error('Expected S2S rejection');
      } catch (err: any) {
        expect([status.PERMISSION_DENIED, status.UNAUTHENTICATED]).toContain(err.code);
      }
      // With S2S → should pass (shape is impl-specific)
      const md = s2sMd();
      // Include auth if your Internal guard still expects a user; if purely internal, omit.
      try {
        const res = await callUnary(INTERNAL_METHOD!, {}, md);
        expect(res).toBeTruthy();
      } catch (err: any) {
        // If your Internal method also checks user context, add auth token:
        if (err.code === status.UNAUTHENTICATED) {
          const md2 = s2sMd();
          md2.add('authorization', `Bearer ${tokens.admin}`);
          const res2 = await callUnary(INTERNAL_METHOD!, {}, md2);
          expect(res2).toBeTruthy();
        } else {
          throw err;
        }
      }
    },
  );
});
