import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

const USER_DISABLED_KEY = 'auth:user:disabled:';
const TOKEN_VERSION_KEY = (userId: string) =>
  `auth:user:tokenVersion:${userId}`;
const REFRESH_SESSION_KEY = (userId: string, sessionId: string) =>
  `auth:user:${userId}:refreshSession:${sessionId}`;
const USER_SESSIONS_KEY = (userId: string) =>
  `auth:user:${userId}:refreshSessions`;

const ROTATE_REFRESH_SESSION_SCRIPT = `
local sessionKey = KEYS[1]
local userSessionsKey = KEYS[2]
local expectedTokenHash = ARGV[1]
local expectedTokenId = ARGV[2]
local nextTokenHash = ARGV[3]
local nextTokenId = ARGV[4]
local ttlSeconds = tonumber(ARGV[5])
local sessionId = ARGV[6]

if redis.call('EXISTS', sessionKey) == 0 then
  redis.call('SREM', userSessionsKey, sessionId)
  return 0
end

local storedTokenHash = redis.call('HGET', sessionKey, 'tokenHash')
local storedTokenId = redis.call('HGET', sessionKey, 'tokenId')

if storedTokenHash ~= expectedTokenHash or storedTokenId ~= expectedTokenId then
  redis.call('DEL', sessionKey)
  redis.call('SREM', userSessionsKey, sessionId)
  return -1
end

redis.call('HSET', sessionKey, 'tokenHash', nextTokenHash, 'tokenId', nextTokenId)
redis.call('EXPIRE', sessionKey, ttlSeconds)
redis.call('SADD', userSessionsKey, sessionId)
local sessionsTtl = redis.call('TTL', userSessionsKey)
if sessionsTtl < ttlSeconds then
  redis.call('EXPIRE', userSessionsKey, ttlSeconds)
end
return 1
`;

export type RefreshSessionRotation = 'rotated' | 'missing' | 'replayed';

@Injectable()
export class AuthRedisService implements OnModuleDestroy {
  constructor(private readonly redis: Redis) {}

  async checkReadiness(): Promise<void> {
    await this.redis.ping();
  }

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

  async createRefreshSession(input: {
    userId: string;
    sessionId: string;
    tokenId: string;
    tokenHash: string;
    ttlSeconds: number;
  }): Promise<void> {
    const sessionKey = REFRESH_SESSION_KEY(input.userId, input.sessionId);
    const sessionsKey = USER_SESSIONS_KEY(input.userId);
    const ttlSeconds = Math.max(1, Math.floor(input.ttlSeconds));

    await this.redis
      .multi()
      .hset(sessionKey, 'tokenHash', input.tokenHash, 'tokenId', input.tokenId)
      .expire(sessionKey, ttlSeconds)
      .sadd(sessionsKey, input.sessionId)
      .expire(sessionsKey, ttlSeconds)
      .exec();
  }

  async hasRefreshSession(userId: string, sessionId: string): Promise<boolean> {
    return (
      (await this.redis.exists(REFRESH_SESSION_KEY(userId, sessionId))) === 1
    );
  }

  async rotateRefreshSession(input: {
    userId: string;
    sessionId: string;
    expectedTokenId: string;
    expectedTokenHash: string;
    nextTokenId: string;
    nextTokenHash: string;
    ttlSeconds: number;
  }): Promise<RefreshSessionRotation> {
    const result = Number(
      await this.redis.eval(
        ROTATE_REFRESH_SESSION_SCRIPT,
        2,
        REFRESH_SESSION_KEY(input.userId, input.sessionId),
        USER_SESSIONS_KEY(input.userId),
        input.expectedTokenHash,
        input.expectedTokenId,
        input.nextTokenHash,
        input.nextTokenId,
        String(Math.max(1, Math.floor(input.ttlSeconds))),
        input.sessionId,
      ),
    );

    if (result === 1) return 'rotated';
    if (result === -1) return 'replayed';
    return 'missing';
  }

  async revokeRefreshSession(userId: string, sessionId: string): Promise<void> {
    await this.redis
      .multi()
      .del(REFRESH_SESSION_KEY(userId, sessionId))
      .srem(USER_SESSIONS_KEY(userId), sessionId)
      .exec();
  }

  async revokeAllRefreshSessions(userId: string): Promise<void> {
    const sessionsKey = USER_SESSIONS_KEY(userId);
    const sessionIds = await this.redis.smembers(sessionsKey);
    const keys = sessionIds.map((sessionId) =>
      REFRESH_SESSION_KEY(userId, sessionId),
    );

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    await this.redis.del(sessionsKey);
  }

  async disableUser(userId: string, ttlSeconds = 3600) {
    await this.redis.set(`auth:user:disabled:${userId}`, '1', 'EX', ttlSeconds);
  }

  async enableUser(userId: string) {
    await this.redis.del(`${USER_DISABLED_KEY}${userId}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status === 'ready') await this.redis.quit();
    else this.redis.disconnect();
  }
}
