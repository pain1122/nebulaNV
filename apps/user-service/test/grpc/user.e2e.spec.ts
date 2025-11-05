import * as jwt from 'jsonwebtoken';
import { loadClient, call, mdAuth, mdS2S, CODES } from './helpers';
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

describe('UserService gRPC (seeded users)', () => {
  const url = process.env.USER_GRPC_URL || '127.0.0.1:50051';
  const client = loadClient<any>({
    url,
    protoPath: USER_PROTO,
    pkg: ['user'],
    svc: 'UserService',
  });

  const userEmail = process.env.SEED_USER_EMAIL ?? 'user@example.com';
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const userPass  = process.env.SEED_USER_PASS  ?? 'User123!';
  const adminPass = process.env.SEED_ADMIN_PASS ?? 'Admin123!';

  let userId = '', adminId = '';
  let userAccess = '', adminAccess = '';
  let haveAdmin = false;

  beforeAll(async () => {
    // login seeded user
    const userTokens = await httpJson<LoginResp>('POST', `${AUTH_HTTP}/auth/login`, {
      identifier: userEmail, password: userPass,
    });

    // login seeded admin (optional, for admin path)
    let adminTokens: LoginResp | null = null;
    try {
      adminTokens = await httpJson<LoginResp>('POST', `${AUTH_HTTP}/auth/login`, {
        identifier: adminEmail, password: adminPass,
      });
      haveAdmin = true;
    } catch {
      haveAdmin = false;
    }

    userId = subFromJwt(userTokens.accessToken);
    userAccess = userTokens.accessToken;

    if (haveAdmin && adminTokens) {
      adminId = subFromJwt(adminTokens.accessToken);
      adminAccess = adminTokens.accessToken;
    }
  });

  it('findUserWithHash (S2S) non-existent → structured empty', async () => {
    const res = await call<any>(
      client,
      'findUserWithHash', // case-insensitive
      { email: 'nope+' + Math.random().toString(36).slice(2, 8) + '@example.com' },
      mdS2S(),
    );
    expect(res).toMatchObject({
      id: expect.any(String),
      email: expect.any(String),
      role: expect.any(String),
      passwordHash: expect.any(String),
      refreshToken: expect.any(String),
    });
    expect(res.id).toBe(''); // not found → empty id
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
    if (!haveAdmin) return; // soft-skip if admin login not available
    await expect(
      call<any>(
        client,
        'getUser',
        { id: adminId },
        mdAuth({ access: userAccess, userId }),
      ),
    ).rejects.toMatchObject({ code: CODES.PERMISSION_DENIED });
  });

  it(haveAdmin ? 'getUser admin→user succeeds' : 'getUser admin→user (no admin) skipped', async () => {
    if (!haveAdmin) return;
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
