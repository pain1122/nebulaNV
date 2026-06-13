import * as jwt from 'jsonwebtoken';
import { loadClient, call, mdAuth, mdS2S, CODES } from './helpers';
import { httpJson, AUTH_HTTP, subFromJwt, LoginResp } from '../utils/http';
import * as bcrypt from 'bcryptjs';

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
  const run = Math.random().toString(36).slice(2, 8);
  const createdEmail = `grpc-user+${run}@e2e.test`;
  const createdUpdatedEmail = `grpc-user-updated+${run}@e2e.test`;
  const createdPassword = `GrpcUser123!${run}`;

  let createdId = '';
  let createdAccess = '';
  const client = loadClient<any>({
    url,
    protoPath: USER_PROTO,
    pkg: ['user'],
    svc: 'UserService',
  });

  const userEmail = process.env.SEED_USER_EMAIL ?? 'user@example.com';
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const userPass = process.env.SEED_USER_PASS ?? 'User123!';
  const adminPass = process.env.SEED_ADMIN_PASS ?? 'Admin123!';

  let userId = '',
    adminId = '';
  let userAccess = '',
    adminAccess = '';
  let haveAdmin = false;

  beforeAll(async () => {
    // login seeded user
    const userTokens = await httpJson<LoginResp>(
      'POST',
      `${AUTH_HTTP}/auth/login`,
      {
        identifier: userEmail,
        password: userPass,
      },
    );

    // login seeded admin (optional, for admin path)
    let adminTokens: LoginResp | null = null;
    try {
      adminTokens = await httpJson<LoginResp>(
        'POST',
        `${AUTH_HTTP}/auth/login`,
        {
          identifier: adminEmail,
          password: adminPass,
        },
      );
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
      {
        email:
          'nope+' + Math.random().toString(36).slice(2, 8) + '@example.com',
      },
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

  it('findUser lets admin find seeded user by email', async () => {
    if (!haveAdmin) return;

    const res = await call<any>(
      client,
      'findUser',
      { email: userEmail },
      mdAuth({
        access: adminAccess,
        userId: adminId,
        role: roleFromJwt(adminAccess) ?? 'admin',
      }),
    );

    expect(res).toMatchObject({
      id: userId,
      email: userEmail,
      role: 'user',
    });
  });

  it('findUser rejects normal users', async () => {
    await expect(
      call<any>(
        client,
        'findUser',
        { email: userEmail },
        mdAuth({ access: userAccess, userId, role: 'user' }),
      ),
    ).rejects.toMatchObject({ code: CODES.PERMISSION_DENIED });
  });

  it('createUser creates a user through auth-service style S2S metadata', async () => {
    const passwordHash = await bcrypt.hash(createdPassword, 10);

    const res = await call<any>(
      client,
      'createUser',
      {
        email: createdEmail.toUpperCase(),
        password: passwordHash,
        role: 'admin',
      },
      mdS2S({ userId: 'self-register' }),
    );

    createdId = res.id;

    expect(res.id).toEqual(expect.any(String));
    expect(res.email).toBe(createdEmail);
    expect(res.role).toBe('user');
  });

  it('findUserWithHash returns stored auth fields for created user', async () => {
    const res = await call<any>(
      client,
      'findUserWithHash',
      { email: createdEmail },
      mdS2S(),
    );

    expect(res.id).toBe(createdId);
    expect(res.email).toBe(createdEmail);
    expect(res.role).toBe('user');
    expect(res.passwordHash).toEqual(expect.any(String));
  });

  it('created gRPC user can log in through auth-service', async () => {
    const tokens = await httpJson<LoginResp>(
      'POST',
      `${AUTH_HTTP}/auth/login`,
      {
        identifier: createdEmail,
        password: createdPassword,
      },
    );

    createdAccess = tokens.accessToken;
    expect(subFromJwt(createdAccess)).toBe(createdId);
  });

  it('setRefreshToken stores refresh token hash for internal auth flows', async () => {
    const refreshTokenHash = `stored-refresh-${run}`;

    const res = await call<any>(
      client,
      'setRefreshToken',
      {
        userId: createdId,
        refreshToken: refreshTokenHash,
      },
      mdS2S({ userId: createdId }),
    );

    expect(res.id).toBe(createdId);

    const stored = await call<any>(
      client,
      'getUserWithHash',
      { id: createdId },
      mdS2S({ userId: createdId }),
    );

    expect(stored.refreshToken).toBe(refreshTokenHash);
  });

  it('updateProfile lets a user update their own email through gRPC', async () => {
    const res = await call<any>(
      client,
      'updateProfile',
      {
        id: createdId,
        email: createdUpdatedEmail,
      },
      mdAuth({ access: createdAccess, userId: createdId }),
    );

    expect(res).toMatchObject({
      id: createdId,
      email: createdUpdatedEmail,
      role: 'user',
    });
  });

  it('getUser rejects spoofed admin metadata when bearer token is a normal user', async () => {
    if (!haveAdmin) return;

    await expect(
      call<any>(
        client,
        'getUser',
        { id: adminId },
        mdAuth({ access: userAccess, userId, role: 'admin' }),
      ),
    ).rejects.toMatchObject({ code: CODES.PERMISSION_DENIED });
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

  it(
    haveAdmin
      ? 'getUser admin→user succeeds'
      : 'getUser admin→user (no admin) skipped',
    async () => {
      if (!haveAdmin) return;
      const adminRole = roleFromJwt(adminAccess) ?? 'admin';
      const res = await call<any>(
        client,
        'getUser',
        { id: userId },
        mdAuth({ access: adminAccess, userId: adminId, role: adminRole }),
      );
      expect(res).toHaveProperty('id', userId);
    },
  );
});
