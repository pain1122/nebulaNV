// apps/auth-service/test/e2e/auth.http-grpc.flow.e2e.spec.ts
import {
  loadClient,
  call,
  mdS2S,
  mdForgedActor,
  mdAuth,
  mergeMd,
  CODES,
} from '../grpc/helpers';
import type { S2SActorAssertion } from '@nebula/grpc-auth';
import { httpJson, AUTH_HTTP, subFromJwt, LoginResp } from '../utils/http';

const AUTH_GRPC_URL = process.env.AUTH_GRPC_URL ?? '127.0.0.1:50052';
const AUTH_PROTO = require.resolve('@nebula/protos/auth.proto');
const authClient = loadClient<any>({
  url: AUTH_GRPC_URL,
  protoPath: AUTH_PROTO,
  pkg: ['auth', 'authv1'],
  svc: 'AuthService',
});

const skipIfUnavailable = (e: any) => e?.code === CODES.UNAVAILABLE;

function tamperToken(token: string): string {
  const replacement = token.endsWith('a') ? 'b' : 'a';
  return `${token.slice(0, -1)}${replacement}`;
}

async function verifiedGatewayActor(
  accessToken: string,
): Promise<S2SActorAssertion> {
  const validation = await call<{
    isValid: boolean;
    userId: string;
    role: S2SActorAssertion['role'];
    sessionRef: string;
  }>(
    authClient,
    'validateToken',
    { token: accessToken },
    mdS2S({ kind: 'service' }),
  );
  if (
    !validation.isValid ||
    !validation.userId ||
    !validation.role ||
    !validation.sessionRef
  ) {
    throw new Error('e2e_verified_gateway_actor_missing');
  }
  return {
    userId: validation.userId,
    role: validation.role,
    sessionRef: validation.sessionRef,
  };
}

async function mdGatewayAuth(accessToken: string) {
  return mdAuth({
    access: accessToken,
    actor: await verifiedGatewayActor(accessToken),
  });
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

  it('POST /auth/register creates a new user with normalized email', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const email = `E2E.Auth.${suffix}@Example.com`;

    const res = await httpJson<{ id: string; email: string; role: string }>(
      'POST',
      `${AUTH_HTTP}/auth/register`,
      {
        email,
        password: 'Register123!',
      },
    );

    expect(res.id).toBeTruthy();
    expect(res.email).toBe(email.toLowerCase());
    expect(res.role).toBe('user');
  });

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

  it('POST /auth/refresh rejects invalid refresh tokens', async () => {
    await expect(
      httpJson('POST', `${AUTH_HTTP}/auth/refresh`, {
        refreshToken: 'not-a-valid-refresh-token',
      }),
    ).rejects.toBeTruthy();
  });

  it('POST /auth/logout rejects requests without a bearer token', async () => {
    await expect(
      httpJson('POST', `${AUTH_HTTP}/auth/logout`, {
        refreshToken: userTokens.refreshToken,
        allDevices: false,
      }),
    ).rejects.toBeTruthy();
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

  it('GET /auth/me rejects requests without a bearer token', async () => {
    await expect(httpJson('GET', `${AUTH_HTTP}/auth/me`)).rejects.toBeTruthy();
  });

  it('gRPC validateUser returns success for valid credentials and false for invalid credentials', async () => {
    try {
      const ok = await call<any>(
        authClient,
        'validateUser',
        {
          identifier: userEmail,
          password: userPass1,
        },
        mdS2S(),
      );

      expect(ok.isValid).toBe(true);
      expect(ok.userId).toBe(userId);

      const bad = await call<any>(
        authClient,
        'validateUser',
        {
          identifier: userEmail,
          password: `${userPass1}-wrong`,
        },
        mdS2S(),
      );

      expect(bad.isValid).toBe(false);
      expect(bad.userId ?? '').toBe('');
    } catch (e: any) {
      if (skipIfUnavailable(e)) return;
      throw e;
    }
  });

  it('gRPC validateToken returns isValid for both', async () => {
    try {
      const res = await call<any>(
        authClient,
        'validateToken',
        { token: userTokens.accessToken },
        mdS2S({ kind: 'service' }),
      );
      expect(res.isValid).toBe(true);
      expect(res.userId).toBe(userId);
    } catch (e: any) {
      if (skipIfUnavailable(e)) return;
      throw e;
    }
  });

  it('gRPC validateToken rejects a tampered access token', async () => {
    try {
      const res = await call<any>(
        authClient,
        'validateToken',
        { token: tamperToken(userTokens.accessToken) },
        mdS2S({ kind: 'service' }),
      );
      expect(res.isValid).toBe(false);
      expect(res.userId ?? '').toBe('');
    } catch (e: any) {
      if (skipIfUnavailable(e)) return;
      throw e;
    }
  });

  it('gRPC getTokens mints tokens from a gateway-signed request body', async () => {
    try {
      const tk = await call<{ accessToken: string; refreshToken: string }>(
        authClient,
        'getTokens',
        { userId },
        mdS2S(),
      );
      expect(tk.accessToken).toBeTruthy();
      expect(tk.refreshToken).toBeTruthy();
      userTokens = tk;
    } catch (e: any) {
      if (skipIfUnavailable(e)) return;
      throw e;
    }
  });

  it('gRPC getTokens rejects a signed request without a login user id', async () => {
    try {
      await expect(
        call<any>(authClient, 'getTokens', {}, mdS2S()),
      ).rejects.toMatchObject({ code: CODES.UNAUTHENTICATED });
    } catch (e: any) {
      if (skipIfUnavailable(e)) return;
      throw e;
    }
  });

  it('gRPC getProfile rejects requests without a bearer token', async () => {
    try {
      await expect(
        call<any>(
          authClient,
          'getProfile',
          { userId },
          mergeMd(mdS2S(), mdForgedActor(userId, 'user')),
        ),
      ).rejects.toMatchObject({ code: CODES.UNAUTHENTICATED });
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
        await mdGatewayAuth(userTokens.accessToken),
      );
      expect(self).toHaveProperty('id', userId);

      // user → admin should be denied if a real admin is present and different
      if (haveRealAdmin && adminId && adminId !== userId) {
        await expect(
          call<any>(
            authClient,
            'getProfile',
            { userId: adminId },
            await mdGatewayAuth(userTokens.accessToken),
          ),
        ).rejects.toMatchObject({ code: CODES.PERMISSION_DENIED });
      }
    } catch (e: any) {
      if (skipIfUnavailable(e)) return;
      throw e;
    }
  });

  it('gRPC getProfile rejects spoofed admin metadata when the bearer is a user token', async () => {
    if (!haveRealAdmin || !adminId || adminId === userId) return;

    try {
      await expect(
        call<any>(
          authClient,
          'getProfile',
          { userId: adminId },
          mergeMd(
            await mdGatewayAuth(userTokens.accessToken),
            mdForgedActor(adminId, 'admin'),
          ),
        ),
      ).rejects.toMatchObject({ code: CODES.PERMISSION_DENIED });
    } catch (e: any) {
      if (skipIfUnavailable(e)) return;
      throw e;
    }
  });

  it('gRPC getProfile admin->user succeeds', async () => {
    if (!haveRealAdmin) return;
    try {
      const res = await call<any>(
        authClient,
        'getProfile',
        { userId },
        await mdGatewayAuth(adminTokens.accessToken),
      );
      expect(res).toHaveProperty('id', userId);
    } catch (e: any) {
      if (skipIfUnavailable(e)) return;
      throw e;
    }
  });

  it('gRPC getProfile preserves user-service NOT_FOUND', async () => {
    if (!haveRealAdmin) return;

    await expect(
      call<any>(
        authClient,
        'getProfile',
        { userId: '11111111-1111-4111-8111-111111111111' },
        await mdGatewayAuth(adminTokens.accessToken),
      ),
    ).rejects.toMatchObject({
      code: CODES.NOT_FOUND,
      details: 'User not found',
    });
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

    // Replaying the old token revokes that refresh session by design.
    // Use a new session for the separate logout behavior below.
    userTokens = await httpJson('POST', `${AUTH_HTTP}/auth/login`, {
      identifier: userEmail,
      password: userPass1,
    });

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

      adminTokens = await httpJson('POST', `${AUTH_HTTP}/auth/login`, {
        identifier: adminEmail,
        password: adminPass,
      });
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
