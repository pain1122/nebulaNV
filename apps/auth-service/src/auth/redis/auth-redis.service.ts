import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

const USER_DISABLED_KEY = 'auth:user:disabled:';
const TOKEN_VERSION_KEY = (userId: string) =>
  `auth:user:tokenVersion:${userId}`;

@Injectable()
export class AuthRedisService {
  constructor(private readonly redis: Redis) {}

  async isUserDisabled(userId: string): Promise<boolean> {
    return (await this.redis.exists(`auth:user:disabled:${userId}`)) === 1;
  }

  async getTokenVersion(userId: string): Promise<number> {
    const v = await this.redis.get(TOKEN_VERSION_KEY(userId));
    if (!v) {
      // initialize lazily
      await this.redis.set(TOKEN_VERSION_KEY(userId), '1');
      return 1;
    }
    return Number(v);
  }

  async bumpTokenVersion(userId: string): Promise<void> {
    await this.redis.incr(TOKEN_VERSION_KEY(userId));
  }

  async disableUser(userId: string, ttlSeconds = 3600) {
    await this.redis.set(`auth:user:disabled:${userId}`, '1', 'EX', ttlSeconds);
  }

  async enableUser(userId: string) {
    await this.redis.del(`${USER_DISABLED_KEY}${userId}`);
  }
}
