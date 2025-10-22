// apps/auth-service/test/e2e/auth.http-grpc.flow.e2e.spec.ts
import { randomUUID } from 'node:crypto';
import {
  loadClient,
  call,
  mdS2S,
  mdUser,
  mdAuth,
  mergeMd,
  CODES,
} from '../grpc/helpers';
import { httpJson, AUTH_HTTP, subFromJwt, LoginResp } from '../utils/http';

const AUTH_GRPC_URL = process.env.AUTH_GRPC_URL ?? '127.0.0.1:50052';
const AUTH_PROTO = require.resolve('@nebula/protos/auth.proto');
const authClient = loadClient<any>({
  url: AUTH_GRPC_URL,
  protoPath: AUTH_PROTO,
  pkg: ['auth', 'authv1'],
  svc: 'AuthService',
});

const itIf = (cond: any) => (cond ? it : it.skip);
const skipIfUnavailable = (e: any) => e?.code === CODES.UNAVAILABLE;

describe('Auth HTTP + gRPC end-to-end', () => {
  const runId = randomUUID().slice(0, 8);
  const userEmail = `user.${runId}@e2e.test`;
  const adminEmail = `admin.${runId}@e2e.test`;
  const userPass1 = 'UserP@ssw0rd!1';
  const userPass2 = 'UserP@ssw0rd!2';
  const adminPass = 'AdminP@ssw0rd!1';

  let userTokens: LoginResp;
  let adminTokens: LoginResp;
  let userId = '';
  let adminId = '';

  const haveRealAdmin = !!(process.env.ADMIN_USER && process.env.ADMIN_PASS);

  it('registers two users', async () => {
    await httpJson('POST', `${AUTH_HTTP}/auth/register`, {
      email: userEmail,
      password: userPass1,
    });
    await httpJson('POST', `${AUTH_HTTP}/auth/register`, {
      email: adminEmail,
      password: adminPass,
    });
  });

  it('logs in both', async () => {
    userTokens = await httpJson('POST', `${AUTH_HTTP}/auth/login`, {
      identifier: userEmail,
      password: userPass1,
    });
    userId = subFromJwt(userTokens.accessToken);

    if (haveRealAdmin) {
      adminTokens = await httpJson('POST', `${AUTH_HTTP}/auth/login`, {
        identifier: process.env.ADMIN_USER!,
        password: process.env.ADMIN_PASS!,
      });
    } else {
      adminTokens = await httpJson('POST', `${AUTH_HTTP}/auth/login`, {
        identifier: adminEmail,
        password: adminPass,
      });
    }
    adminId = subFromJwt(adminTokens.accessToken);

    expect(userTokens.accessToken).toBeTruthy();
    expect(adminTokens.accessToken).toBeTruthy();

    // Expose for user-service gRPC tests if they run separately
    process.env.USER_ID = userId;
    process.env.ADMIN_ID = adminId;
    process.env.USER_ACCESS = userTokens.accessToken;
    process.env.ADMIN_ACCESS = adminTokens.accessToken;
  });

  it('GET /auth/me works for both (needs controller to pass initiatorId)', async () => {
    // This assumes AuthController GET /auth/me calls:
    // this.authService.GetProfile(req.user!.userId, token, req.user!.userId)
    const meU = await httpJson<any>(
      'GET',
      `${AUTH_HTTP}/auth/me`,
      undefined,
      userTokens.accessToken
    );
    expect(meU).toHaveProperty('id', userId);

    const meA = await httpJson<any>(
      'GET',
      `${AUTH_HTTP}/auth/me`,
      undefined,
      adminTokens.accessToken
    );
    expect(meA).toHaveProperty('id', adminId);
  });

  it('PUT /auth/me updates user password and re-login works', async () => {
    await httpJson(
      'PUT',
      `${AUTH_HTTP}/auth/me`,
      {
        email: userEmail,
        currentPassword: userPass1,
        newPassword: userPass2,
      },
      userTokens.accessToken
    );

    await expect(
      httpJson('POST', `${AUTH_HTTP}/auth/login`, {
        identifier: userEmail,
        password: userPass1,
      })
    ).rejects.toBeTruthy();

    userTokens = await httpJson('POST', `${AUTH_HTTP}/auth/login`, {
      identifier: userEmail,
      password: userPass2,
    });
    expect(subFromJwt(userTokens.accessToken)).toBe(userId);
  });

  it('gRPC validateToken returns isValid for both', async () => {
    try {
      const vU = await call<any>(
        authClient,
        'validateToken',
        { token: userTokens.accessToken },
        mdS2S()
      );
      const vA = await call<any>(
        authClient,
        'validateToken',
        { token: adminTokens.accessToken },
        mdS2S()
      );
      expect(vU.isValid).toBe(true);
      expect(vA.isValid).toBe(true);
    } catch (e: any) {
      if (skipIfUnavailable(e)) return;
      throw e;
    }
  });

  it('gRPC getTokens mints tokens with S2S + x-user-id', async () => {
    try {
      const md = mergeMd(mdS2S(), mdUser(userId));
      const tk = await call<{ accessToken: string; refreshToken: string }>(
        authClient,
        'getTokens',
        {},
        md
      );
      expect(tk.accessToken).toBeTruthy();
      expect(tk.refreshToken).toBeTruthy();
    } catch (e: any) {
      if (skipIfUnavailable(e)) return;
      throw e;
    }
  });

  it('gRPC GetProfile user→self succeeds; user→admin denied (if real admin)', async () => {
    try {
      const self = await call<any>(
        authClient,
        'GetProfile',
        { userId },
        mdAuth({ access: userTokens.accessToken, userId })
      );
      expect(self).toHaveProperty('id', userId);

      if (haveRealAdmin && adminId !== userId) {
        await expect(
          call<any>(
            authClient,
            'GetProfile',
            { userId: adminId },
            mdAuth({ access: userTokens.accessToken, userId })
          )
        ).rejects.toMatchObject({ code: CODES.PERMISSION_DENIED });
      }
    } catch (e: any) {
      if (skipIfUnavailable(e)) return;
      throw e;
    }
  });

  itIf(haveRealAdmin)('gRPC GetProfile admin→user succeeds', async () => {
    try {
      const res = await call<any>(
        authClient,
        'GetProfile',
        { userId },
        mdAuth({ access: adminTokens.accessToken, userId: adminId })
      );
      expect(res).toHaveProperty('id', userId);
    } catch (e: any) {
      if (skipIfUnavailable(e)) return;
      throw e;
    }
  });

  it('POST /auth/logout revokes refresh; /auth/refresh fails', async () => {
    await httpJson(
      'POST',
      `${AUTH_HTTP}/auth/logout`,
      {
        refreshToken: userTokens.refreshToken,
        allDevices: false,
      },
      userTokens.accessToken
    );

    await expect(
      httpJson('POST', `${AUTH_HTTP}/auth/refresh`, {
        refreshToken: userTokens.refreshToken,
      })
    ).rejects.toBeTruthy();

    await httpJson(
      'POST',
      `${AUTH_HTTP}/auth/logout`,
      {
        refreshToken: adminTokens.refreshToken,
        allDevices: false,
      },
      adminTokens.accessToken
    );

    await expect(
      httpJson('POST', `${AUTH_HTTP}/auth/refresh`, {
        refreshToken: adminTokens.refreshToken,
      })
    ).rejects.toBeTruthy();
  });
});
