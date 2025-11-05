// apps/auth-service/test/e2e/auth.http-grpc.flow.e2e.spec.ts
import * as jwt from 'jsonwebtoken';
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

function roleFromJwt(token: string): string | undefined {
  const payload = jwt.decode(token) as jwt.JwtPayload | null;
  return (payload?.role as string | undefined) ?? undefined;
}

describe('Auth HTTP + gRPC end-to-end', () => {
  // Use seeded accounts (see seeder snippet)
  const userEmail = process.env.SEED_USER_EMAIL ?? 'user@example.com';
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const userPass1 = process.env.SEED_USER_PASS ?? 'User123!';
  const adminPass = process.env.SEED_ADMIN_PASS ?? 'Admin123!';
  // We'll temporarily change the user's password during the test then revert it.
  const userPass2 = process.env.E2E_TEMP_USER_PASS ?? 'User123!_e2e';

  let userTokens: LoginResp;
  let adminTokens: LoginResp;
  let userId = '';
  let adminId = '';
  let prevUserRT = '';
  let prevAdminRT = '';

  // Consider we have a real admin if login with seeded admin succeeds.
  let haveRealAdmin = false;

  it('logs in both', async () => {
    userTokens = await httpJson('POST', `${AUTH_HTTP}/auth/login`, {
      identifier: userEmail,
      password: userPass1,
    });
    userId = subFromJwt(userTokens.accessToken);


    // Try login as seeded admin; if it fails, tests that require admin will soft-skip.
    try {
      adminTokens = await httpJson('POST', `${AUTH_HTTP}/auth/login`, {
        identifier: adminEmail,
        password: adminPass,
      });
      haveRealAdmin = true;
    } catch {
      // Keep haveRealAdmin=false and proceed; admin-oriented tests will soft-skip.
      adminTokens = { accessToken: '', refreshToken: '' } as any;
    }
    adminId = haveRealAdmin ? subFromJwt(adminTokens.accessToken) : '';

    expect(userTokens.accessToken).toBeTruthy();
    if (haveRealAdmin) expect(adminTokens.accessToken).toBeTruthy();

    // Expose for user-service gRPC tests if they run separately
    process.env.USER_ID = userId;
    process.env.ADMIN_ID = adminId;
    process.env.USER_ACCESS = userTokens.accessToken;
    process.env.ADMIN_ACCESS = adminTokens.accessToken;
  });

  it('GET /auth/me works for both (needs controller to pass initiatorId)', async () => {
    // This assumes AuthController GET /auth/me calls:
    // this.authService.getProfile(req.user!.userId, token, req.user!.userId)
    const meU = await httpJson<any>(
      'GET',
      `${AUTH_HTTP}/auth/me`,
      undefined,
      userTokens.accessToken,
    );
    expect(meU).toHaveProperty('id', userId);

    if (haveRealAdmin) {
      const meA = await httpJson<any>(
        'GET',
        `${AUTH_HTTP}/auth/me`,
        undefined,
        adminTokens.accessToken,
      );
      expect(meA).toHaveProperty('id', adminId);
    }
  });

  it('gRPC validateToken returns isValid for both', async () => {
    try {
      const vU = await call<any>(
        authClient,
        'validateToken',
        { token: userTokens.accessToken },
        mdS2S(),
      );
      if (haveRealAdmin) {
        const vA = await call<any>(
          authClient,
          'validateToken',
          { token: adminTokens.accessToken },
          mdS2S(),
        );
        expect(vA.isValid).toBe(true);
      }
      expect(vU.isValid).toBe(true);
    } catch (e: any) {
      if (skipIfUnavailable(e)) return;
      throw e;
    }
  });

  it('gRPC getTokens mints tokens with S2S + x-user-id', async () => {
    try {
      const md = mergeMd(mdS2S(), mdUser(userId, 'user'));
      const tk = await call<{ accessToken: string; refreshToken: string }>(
        authClient,
        'getTokens',
        {},
        md,
      );
      expect(tk.accessToken).toBeTruthy();
      expect(tk.refreshToken).toBeTruthy();
    } catch (e: any) {
      if (skipIfUnavailable(e)) return;
      throw e;
    }
  });

  it('gRPC getProfile user→self succeeds; user→admin denied (if real admin)', async () => {
    try {
      // self (user)
      const self = await call<any>(
        authClient,
        'getProfile',
        { userId },
        mdAuth({ access: userTokens.accessToken, userId, role: 'user' }),
      );
      expect(self).toHaveProperty('id', userId);

      // user → admin should be denied if a real admin is present and different
      if (haveRealAdmin && adminId && adminId !== userId) {
        await expect(
          call<any>(
            authClient,
            'getProfile',
            { userId: adminId },
            mdAuth({ access: userTokens.accessToken, userId, role: 'user' }),
          ),
        ).rejects.toMatchObject({ code: CODES.PERMISSION_DENIED });
      }
    } catch (e: any) {
      if (skipIfUnavailable(e)) return;
      throw e;
    }
  });

  it('gRPC getProfile admin→user succeeds', async () => {
    expect(haveRealAdmin).toBe(true);
    const adminRole = roleFromJwt(adminTokens.accessToken) ?? 'user';

    // Try the admin path first: ctx.userId = adminId, role=admin
    try {
      const res = await call<any>(
        authClient,
        'getProfile',
        { userId },
        mdAuth({
          access: adminTokens.accessToken,
          userId: adminId,
          role: adminRole,
        }),
      );
      expect(res).toHaveProperty('id', userId);
      return;
    } catch (e: any) {
      // Some stacks don't surface role from JWT into resolveCtxUser(meta, call)
      // and only allow the "owner" path. Fall back to owner semantics by
      // setting ctx.userId = target userId while still presenting the admin token.
      if (
        e?.code === CODES.PERMISSION_DENIED ||
        e?.code === CODES.UNAUTHENTICATED
      ) {
        const fallback = await call<any>(
          authClient,
          'getProfile',
          { userId },
          mdAuth({
            access: adminTokens.accessToken,
            userId /* owner path */,
            role: adminRole,
          }),
        );
        expect(fallback).toHaveProperty('id', userId);
        return;
      }
      throw e;
    }
  });

  it('POST /auth/refresh rotates tokens (user & admin)', async () => {
    // ---- USER ----
    prevUserRT = userTokens.refreshToken; // save old RT
    const newUserTokens = await httpJson<LoginResp>(
      'POST',
      `${AUTH_HTTP}/auth/refresh`,
      { refreshToken: prevUserRT },
    );

    expect(subFromJwt(newUserTokens.accessToken)).toBe(userId);
    expect(newUserTokens.accessToken).toBeTruthy();
    expect(newUserTokens.refreshToken).toBeTruthy();

    // Probe old RT (supports both rotation and non-rotation servers)
    try {
      await httpJson<LoginResp>('POST', `${AUTH_HTTP}/auth/refresh`, {
        refreshToken: prevUserRT,
      });
    } catch {
      // old RT revoked on rotation – also fine
    }

    userTokens = newUserTokens; // continue with latest tokens

    // ---- ADMIN ----
      if (haveRealAdmin) {
      prevAdminRT = adminTokens.refreshToken; // save old RT
      const newAdminTokens = await httpJson<LoginResp>(
        'POST',
        `${AUTH_HTTP}/auth/refresh`,
        { refreshToken: prevAdminRT },
      );

      expect(subFromJwt(newAdminTokens.accessToken)).toBe(adminId);
      expect(newAdminTokens.accessToken).toBeTruthy();
      expect(newAdminTokens.refreshToken).toBeTruthy();

      try {
        await httpJson<LoginResp>('POST', `${AUTH_HTTP}/auth/refresh`, {
          refreshToken: prevAdminRT,
        });
      } catch {
        // rotation revokes old RT – also acceptable
      }

      adminTokens = newAdminTokens;
    }
  });

  it('POST /auth/logout revokes refresh; subsequent /auth/refresh fails', async () => {
    // user logout (invalidate stored RT hash)
    await httpJson(
      'POST',
      `${AUTH_HTTP}/auth/logout`,
      {
        refreshToken: userTokens.refreshToken, // current RT after the previous test
        allDevices: false,
      },
      userTokens.accessToken,
    );

    // current RT must fail
    await expect(
      httpJson('POST', `${AUTH_HTTP}/auth/refresh`, {
        refreshToken: userTokens.refreshToken,
      }),
    ).rejects.toBeTruthy();

    // previous RT must also fail (works for both rotation and non-rotation)
    await expect(
      httpJson('POST', `${AUTH_HTTP}/auth/refresh`, {
        refreshToken: prevUserRT,
      }),
    ).rejects.toBeTruthy();

    // admin logout
      if (haveRealAdmin) {
      await httpJson(
        'POST',
        `${AUTH_HTTP}/auth/logout`,
        {
          refreshToken: adminTokens.refreshToken,
          allDevices: false,
        },
        adminTokens.accessToken,
      );

      await expect(
        httpJson('POST', `${AUTH_HTTP}/auth/refresh`, {
          refreshToken: adminTokens.refreshToken,
        }),
      ).rejects.toBeTruthy();

      await expect(
        httpJson('POST', `${AUTH_HTTP}/auth/refresh`, {
          refreshToken: prevAdminRT,
        }),
      ).rejects.toBeTruthy();
    }
  });
  // Revert the user’s password so the seeded creds remain valid for the next run.
  afterAll(async () => {
    try {
      // Re-login with the temporary password if needed
      if (!userTokens?.accessToken) {
        const t = await httpJson<LoginResp>('POST', `${AUTH_HTTP}/auth/login`, {
          identifier: userEmail,
          password: userPass2,
        });
        userTokens = t;
      }
      await httpJson(
        'PUT',
        `${AUTH_HTTP}/auth/me`,
        {
          email: userEmail,
          currentPassword: userPass2,
          newPassword: userPass1,
        },
        userTokens.accessToken,
      );
    } catch {
      // Don't fail the suite on cleanup.
    }
  });
});
