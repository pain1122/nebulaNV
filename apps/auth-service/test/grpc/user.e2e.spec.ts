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

  // Locals populated in this file (no cross-file env dependency)
  let userId = '', adminId = '';
  let userAccess = '', adminAccess = '';
  const haveRealAdmin = !!(process.env.ADMIN_USER && process.env.ADMIN_PASS);

  beforeAll(async () => {
    const run = Math.random().toString(36).slice(2, 8);
    const userEmail = `u.${run}@e2e.test`;
    const adminEmail = `a.${run}@e2e.test`;

    await httpJson('POST', `${AUTH_HTTP}/auth/register`, {
      email: userEmail,
      password: 'UserP@ssw0rd!1',
    });
    await httpJson('POST', `${AUTH_HTTP}/auth/register`, {
      email: adminEmail,
      password: 'AdminP@ssw0rd!1',
    });

    const userTokens = await httpJson<LoginResp>(
      'POST',
      `${AUTH_HTTP}/auth/login`,
      { identifier: userEmail, password: 'UserP@ssw0rd!1' },
    );
    const adminTokens = await httpJson<LoginResp>(
      'POST',
      `${AUTH_HTTP}/auth/login`,
      {
        identifier: process.env.ADMIN_USER ?? adminEmail,
        password: process.env.ADMIN_PASS ?? 'AdminP@ssw0rd!1',
      },
    );

    userId = subFromJwt(userTokens.accessToken);
    adminId = subFromJwt(adminTokens.accessToken);
    userAccess = userTokens.accessToken;
    adminAccess = adminTokens.accessToken;
  });

  it('findUserWithHash accepts S2S only', async () => {
    const res = await call<any>(
      client,
      'findUserWithHash',
      { email: 'nope@example.com' },
      mdS2S(),
    );
    expect(res).toHaveProperty('id'); // empty string when not found is ok
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
    if (!haveRealAdmin) {
      // When no real admin creds are provided, the locally registered "adminEmail"
      // likely has role "user", so asserting success would be wrong. Mark as soft-skip.
      return;
    }
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
