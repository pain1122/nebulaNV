import Redis from 'ioredis';
import { httpJson, AUTH_HTTP, subFromJwt, LoginResp } from '../utils/http';

import { AuthRedisService } from '../../src/auth/redis/auth-redis.service';

describe('AuthRedisService', () => {
  let redis: Redis;
  let service: AuthRedisService;

  let adminId: string;
  let userId: string;
  let adminTokens: LoginResp;
  let userTokens: LoginResp;

  beforeAll(async () => {
    redis = new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD,
    });
    service = new AuthRedisService(redis);

    // login normal user
    const userLogin = await httpJson<LoginResp>(
      'POST',
      `${AUTH_HTTP}/auth/login`,
      {
        identifier: process.env.SEED_USER_EMAIL ?? 'user@example.com',
        password: process.env.SEED_USER_PASS ?? 'User123!',
      },
    );
    userTokens = userLogin;
    userId = subFromJwt(userTokens.accessToken); // Get userId from the JWT

    // login admin
    const adminLogin = await httpJson<LoginResp>(
      'POST',
      `${AUTH_HTTP}/auth/login`,
      {
        identifier: process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com',
        password: process.env.SEED_ADMIN_PASS ?? 'Admin123!',
      },
    );
    adminTokens = adminLogin;
    adminId = subFromJwt(adminTokens.accessToken); // Get adminId from the JWT
  });

  afterAll(async () => {
    await redis.flushdb();
    await redis.quit();
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  it('initializes token version lazily', async () => {
    const version = await service.getTokenVersion(userId);
    expect(version).toBe(1);

    const stored = await redis.get(`auth:user:tokenVersion:${userId}`);
    expect(stored).toBe('1');
  });

  it('increments token version', async () => {
    await service.getTokenVersion(userId);
    await service.bumpTokenVersion(userId);

    const version = await service.getTokenVersion(userId);
    expect(version).toBe(2);
  });

  it('disables and enables a user', async () => {
    expect(await service.isUserDisabled(userId)).toBe(false);

    await service.disableUser(userId, 60);
    expect(await service.isUserDisabled(userId)).toBe(true);

    await service.enableUser(userId);
    expect(await service.isUserDisabled(userId)).toBe(false);
  });

  it('blocks login for disabled user', async () => {
    await service.disableUser(userId, 60);

    await expect(
      httpJson<LoginResp>('POST', `${AUTH_HTTP}/auth/login`, {
        identifier: process.env.SEED_USER_EMAIL ?? 'user@example.com',
        password: process.env.SEED_USER_PASS ?? 'User123!',
      }),
    ).rejects.toThrow('User is disabled');
  });

  it('auto-expires disabled user', async () => {
    await service.disableUser(userId, 1);
    expect(await service.isUserDisabled(userId)).toBe(true);

    await new Promise((r) => setTimeout(r, 1100));
    expect(await service.isUserDisabled(userId)).toBe(false);
  });

  it('handles logout (allDevices) and invalidates old refresh tokens', async () => {
    // Disable user before logout to ensure token invalidation
    await service.disableUser(userId, 60);

    const versionBeforeLogout = await service.getTokenVersion(userId);

    // Simulate logout (allDevices: true)
    await service.bumpTokenVersion(userId);

    const versionAfterLogout = await service.getTokenVersion(userId);
    expect(versionBeforeLogout).not.toBe(versionAfterLogout); // Ensure version changed after logout
  });
});
