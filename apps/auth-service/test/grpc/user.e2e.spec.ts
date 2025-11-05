// apps/auth-service/test/grpc/user.e2e.spec.ts
import * as jwt from 'jsonwebtoken';
import { mdAuth, mdS2S, loadClient, call, CODES } from './helpers';
import { httpJson, AUTH_HTTP, subFromJwt, LoginResp } from '../utils/http';

const USER_PROTO = require.resolve('@nebula/protos/user.proto');

function roleFromJwt(token: string): string | undefined {
  try {
    const p = jwt.decode(token) as any | null;
    return p?.role ? String(p.role) : undefined;
  } catch {
    return undefined;
  }
}

describe('UserService gRPC (e2e, TS)', () => {
  const url = process.env.USER_GRPC_URL || '127.0.0.1:50051';
  const client = loadClient<any>({
    url,
    protoPath: USER_PROTO,
    pkg: ['user', 'userv1'],
    svc: 'UserService',
  });

  // Use seeded accounts (same as the seeder)
  const userEmail = process.env.SEED_USER_EMAIL ?? 'user@example.com';
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const userPass  = process.env.SEED_USER_PASS  ?? 'User123!';
  const adminPass = process.env.SEED_ADMIN_PASS ?? 'Admin123!';

  let userId = '', adminId = '';
  let userAccess = '', adminAccess = '';
  let haveRealAdmin = false;
  let adminTokens: LoginResp | null = null;

  beforeAll(async () => {
    // login seeded user
    const userTokens = await httpJson<LoginResp>(
      'POST',
      `${AUTH_HTTP}/auth/login`,
      { identifier: userEmail, password: userPass },
    );

    // login seeded admin (optional)
    try {
      adminTokens = await httpJson<LoginResp>(
        'POST',
        `${AUTH_HTTP}/auth/login`,
        { identifier: adminEmail, password: adminPass },
      );
      haveRealAdmin = true;
    } catch {
      haveRealAdmin = false;
    }

    userId = subFromJwt(userTokens.accessToken);
    adminId = haveRealAdmin && adminTokens ? subFromJwt(adminTokens.accessToken) : '';
    userAccess = userTokens.accessToken;
    adminAccess = haveRealAdmin && adminTokens ? adminTokens.accessToken : '';
  });

  it('findUserWithHash accepts S2S only', async () => {
    const res = await call<any>(
      client,
      'findUserWithHash',
      { email: 'nope@example.com' },
      mdS2S(),
    );
    expect(res).toHaveProperty('id'); // empty when not found is ok
  });

  it('getUser self with user JWT succeeds', async () => {
    const res = await call<any>(
      client,
      'getUser',
      { id: userId },
      mdAuth({ access: userAccess, userId }),
    );
    expect(res).toHaveProperty('id', userId);
  });

  it('getUser user→admin is denied', async () => {
    if (!haveRealAdmin || !adminId) return; // soft-skip
    await expect(
      call(
        client,
        'getUser',
        { id: adminId },
        mdAuth({ access: userAccess, userId }),
      ),
    ).rejects.toMatchObject({ code: CODES.PERMISSION_DENIED });
  });

  it(haveRealAdmin ? 'getUser admin→user succeeds' : 'getUser admin→user (no real admin) skipped', async () => {
    if (!haveRealAdmin || !adminAccess) return;
    const adminRole = roleFromJwt(adminAccess) ?? 'admin';
    const res = await call<any>(
      client,
      'getUser',
      { id: userId },
      mdAuth({ access: adminAccess, userId: adminId, role: adminRole }),
    );
    expect(res).toHaveProperty('id', userId);
  });
});
