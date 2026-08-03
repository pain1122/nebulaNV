import type Redis from 'ioredis';
import { AuthRedisService } from '../../src/auth/redis/auth-redis.service';

type RedisLifecycleMock = {
  status: string;
  ping: jest.Mock<Promise<string>, []>;
  quit: jest.Mock<Promise<'OK'>, []>;
  disconnect: jest.Mock<void, []>;
};

function createRedis(status = 'ready'): RedisLifecycleMock {
  return {
    status,
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
  };
}

describe('AuthRedisService lifecycle', () => {
  it('uses the owned Redis client for readiness', async () => {
    const redis = createRedis();
    const service = new AuthRedisService(redis as unknown as Redis);

    await service.checkReadiness();

    expect(redis.ping).toHaveBeenCalledTimes(1);
  });

  it('quits a ready Redis connection during shutdown', async () => {
    const redis = createRedis();
    const service = new AuthRedisService(redis as unknown as Redis);

    await service.onModuleDestroy();

    expect(redis.quit).toHaveBeenCalledTimes(1);
    expect(redis.disconnect).not.toHaveBeenCalled();
  });

  it('disconnects a Redis client that is not ready during shutdown', async () => {
    const redis = createRedis('connecting');
    const service = new AuthRedisService(redis as unknown as Redis);

    await service.onModuleDestroy();

    expect(redis.disconnect).toHaveBeenCalledTimes(1);
    expect(redis.quit).not.toHaveBeenCalled();
  });
});
