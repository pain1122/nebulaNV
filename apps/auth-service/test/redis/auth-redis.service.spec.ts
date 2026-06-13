import Redis from 'ioredis';
import { AuthRedisService } from '../../src/auth/redis/auth-redis.service';

describe('AuthRedisService', () => {
  let redis: Redis;
  let service: AuthRedisService;

  const userId = `auth-redis-test-user-${Date.now()}`;

  beforeAll(async () => {
    const testRedisPassword = process.env.AUTH_REDIS_TEST_PASSWORD;

    redis = new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      db: Number(process.env.AUTH_REDIS_TEST_DB ?? 15),
      ...(testRedisPassword ? { password: testRedisPassword } : {}),
    });

    await redis.ping();

    service = new AuthRedisService(redis);
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

  it('auto-expires disabled user', async () => {
    await service.disableUser(userId, 1);

    expect(await service.isUserDisabled(userId)).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    expect(await service.isUserDisabled(userId)).toBe(false);
  });

  it('bumps token version for logout-style invalidation', async () => {
    const versionBeforeLogout = await service.getTokenVersion(userId);

    await service.bumpTokenVersion(userId);

    const versionAfterLogout = await service.getTokenVersion(userId);

    expect(versionAfterLogout).toBe(versionBeforeLogout + 1);
  });
});
