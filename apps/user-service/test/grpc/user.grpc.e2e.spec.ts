// apps/user-service/test/grpc/user.grpc.e2e.spec.ts
//
// This spec does REAL calls against the running user-service gRPC server.
// It guarantees the guard + controller methods get invoked by:
//  - Using real JWTs (minted via auth HTTP)
//  - Using real S2S HMAC metadata (x-gateway-sign + x-svc)
//  - Passing x-user-id where @RequireUserId() is present
//
// All configuration (ports, URLs, identifiers) is now loaded from .env or jest.env.ts

import { Metadata, status as GrpcStatus } from '@grpc/grpc-js';
import * as path from 'node:path';
import * as fs from 'node:fs';

// --- Load env early ---
require('../jest.env'); // ensures test defaults are set if missing

import {
  bootstrapForSpecs,
  loadGrpcClient,
  grpcUnary,
  mdAuthOnly,
  mdS2SOnly,
  mdS2SUser,
} from './helpers';

// ---- Resolve URLs from environment ----
const USER_GRPC_URL = process.env.USER_GRPC_URL!;
const AUTH_HTTP_URL = process.env.AUTH_HTTP_URL!;
const USER_IDENTIFIER = process.env.USER_IDENTIFIER!;
const ADMIN_IDENTIFIER = process.env.ADMIN_IDENTIFIER!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const USER_PASSWORD = process.env.USER_PASSWORD!;

// ---- Resolve proto path robustly (monorepo/node_modules friendly) ----
function tryResolve(p: string) {
  try {
    return require.resolve(p);
  } catch {
    return null;
  }
}

function resolveUserProto(): string {
  try {
    const pkgRoot = path.dirname(require.resolve('@nebula/protos/package.json'));
    const p1 = path.join(pkgRoot, 'proto', 'user.proto');
    if (fs.existsSync(p1)) return p1;
  } catch {}

  const repoRoot = path.resolve(__dirname, '../../../..'); // D:\Salar\nebulaNV
  const p2 = path.join(repoRoot, 'packages', 'protos', 'user.proto');
  if (fs.existsSync(p2)) return p2;

  throw new Error(
    'user.proto not found. Tried:\n' +
      ' - @nebula/protos/proto/user.proto\n' +
      ` - ${path.join(repoRoot, 'packages', 'protos', 'user.proto')}\n`,
  );
}

const USER_PROTO = resolveUserProto();
const USER_PKG = 'user';
const USER_SVC = 'UserService';

// ---- Helper: pick actual method name on client (Pascal vs camel) ----
function resolveMethodName(client: any, ...names: string[]): string {
  for (const n of names) {
    if (typeof (client as any)[n] === 'function') return n;
  }
  throw new Error(
    `None of the method names exist on client: ${names.join(', ')}`,
  );
}

describe('[gRPC] user-service RPCs (JWT & S2S)', () => {
  jest.setTimeout(60_000);

  // identities & metadata
  let admin!: { access: string; userId: string; role?: string };
  let user!: { access: string; userId: string; role?: string };

  // raw metadata builders (we still call helpers for combos)
  let mdAdminAuth!: Metadata;
  let mdUserAuth!: Metadata;
  let mdS2S!: Metadata;

  // grpc client
  let client: any;

  beforeAll(async () => {
    const boot = await bootstrapForSpecs(); // logs in admin & user via auth HTTP
    admin = boot.admin;
    user = boot.user;
    mdAdminAuth = boot.md.adminAuth;
    mdUserAuth = boot.md.userAuth;
    mdS2S = boot.md.s2s;

    client = loadGrpcClient({
      protoPath: USER_PROTO,
      pkg: USER_PKG,
      service: USER_SVC,
      url: USER_GRPC_URL,
    });
  });

  // ----------------------------- S2S-only RPCs -----------------------------

  it('FindUserWithHash (S2S) succeeds with signature', async () => {
    const method = resolveMethodName(client, 'FindUserWithHash', 'findUserWithHash');
    const req = { identifier: USER_IDENTIFIER };

    const res = await grpcUnary(client, method, req, mdS2SOnly());
    expect(res).toBeTruthy();
  });

  it('GetUserWithHash (S2S + x-user-id) succeeds with signature and user id', async () => {
    const method = resolveMethodName(client, 'GetUserWithHash', 'getUserWithHash');
    const req = { id: user.userId };

    const res = await grpcUnary(client, method, req, mdS2SUser(user.userId, user.role));
    expect(res).toBeTruthy();
  });

  it('SetRefreshToken (S2S + x-user-id) stores/rotates a token', async () => {
    const method = resolveMethodName(client, 'SetRefreshToken', 'setRefreshToken');
    const req = { userId: user.userId, refreshToken: 'TEST-RT-TOKEN' };

    const res = await grpcUnary(client, method, req, mdS2SUser(user.userId, user.role));
    expect(res).toBeDefined();
  });

  it('S2S-only RPC should reject when signature is missing', async () => {
    const method = resolveMethodName(client, 'FindUserWithHash', 'findUserWithHash');
    const req = { identifier: USER_IDENTIFIER };

    await expect(grpcUnary(client, method, req))
      .rejects.toMatchObject({ code: GrpcStatus.UNAUTHENTICATED });
  });

  // ----------------------------- JWT-guarded RPCs -----------------------------

  it('GetUser (JWT) self: user can read own profile', async () => {
    const method = resolveMethodName(client, 'GetUser', 'getUser');
    const req = { id: user.userId };

    const res = await grpcUnary(client, method, req, mdUserAuth);
    const id =
      (res as any)?.id ??
      (res as any)?.user?.id ??
      (res as any)?.data?.id ??
      (res as any)?.data?.user?.id;

    expect(id).toBe(user.userId);
  });

  it('GetUser (JWT) cross: user reading admin should be denied', async () => {
    const method = resolveMethodName(client, 'GetUser', 'getUser');
    const req = { id: admin.userId };

    await expect(grpcUnary(client, method, req, mdUserAuth))
      .rejects.toMatchObject({ code: GrpcStatus.PERMISSION_DENIED });
  });

  it('GetUser (JWT) admin: admin can read any user', async () => {
    const method = resolveMethodName(client, 'GetUser', 'getUser');
    const req = { id: user.userId };

    const res = await grpcUnary(client, method, req, mdAdminAuth);
    const id =
      (res as any)?.id ??
      (res as any)?.user?.id ??
      (res as any)?.data?.id ??
      (res as any)?.data?.user?.id;

    expect(id).toBe(user.userId);
  });

  // ----------------------------- Optional: Create temporary user via S2S -----------------------------

  it('CreateUser (S2S + x-user-id) creates a temp user (if implemented)', async () => {
    const maybeCreate = ['CreateUser', 'createUser'].find(
      (n) => typeof (client as any)[n] === 'function',
    );
    if (!maybeCreate) return;

    let bcrypt: any;
    try {
      bcrypt = require('bcryptjs');
    } catch {
      return;
    }

    const email = `temp.${Date.now()}@local.test`;
    const plain = 'Temp123!';
    const password = await bcrypt.hash(plain, 10);

    const method = resolveMethodName(client, 'CreateUser', 'createUser');
    const req: any = { email, password, role: 'user' };

    const res = await grpcUnary(client, method, req, mdS2SUser('self-register'));
    expect(res).toBeTruthy();
  });
});
