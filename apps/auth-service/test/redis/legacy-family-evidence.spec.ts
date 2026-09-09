import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { AuthRedisService } from '../../src/auth/redis/auth-redis.service';
import { readLegacySubjectEvidence } from '../../src/auth/migration/legacy-family-evidence';

describe('Legacy family migration evidence (isolated Redis)', () => {
  let redis: Redis;
  let service: AuthRedisService;
  let userId: string;
  let sessionId: string;
  let familyKey: string;
  let versionKey: string;
  let indexKey: string;
  let disabledKey: string;
  const tokenId = randomUUID();
  const tokenHash = 'a'.repeat(64);

  beforeAll(async () => {
    // Explicit target: this suite never guesses the current application Redis.
    const port = Number(process.env.AUTH_MIGRATION_TEST_REDIS_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('AUTH_MIGRATION_TEST_REDIS_PORT_required');
    }
    redis = new Redis({
      host: '127.0.0.1',
      port,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    await redis.connect();
    service = new AuthRedisService(redis);
  });

  beforeEach(() => {
    userId = randomUUID();
    sessionId = randomUUID();
    familyKey = `auth:user:${userId}:refreshSession:${sessionId}`;
    versionKey = `auth:user:tokenVersion:${userId}`;
    indexKey = `auth:user:${userId}:refreshSessions`;
    disabledKey = `auth:user:disabled:${userId}`;
  });

  afterEach(async () => {
    if (redis?.status === 'ready' && familyKey) {
      await redis.del(familyKey, versionKey, indexKey, disabledKey);
    }
  });
  afterAll(async () => {
    if (redis) await service?.onModuleDestroy();
  });

  async function createFamily(issuedTokenVersion = 7) {
    await service.createRefreshSession({
      userId,
      sessionId,
      tokenId,
      tokenHash,
      issuedTokenVersion,
      ttlSeconds: 60,
    });
  }
  const read = () => service.readLegacyFamilyEvidence(userId, sessionId);

  it('returns a bounded snapshot without changing family state or version', async () => {
    await redis.set(versionKey, '7');
    await createFamily();
    const before = await redis.hgetall(familyKey);
    const first = await read();
    expect(first).toMatchObject({
      status: 'eligible',
      tokenVersion: 7,
      tokenHash,
      tokenId,
    });
    if (first.status !== 'eligible') throw new Error('expected_eligible');
    expect(first.expiresAtMs - first.sourceTimeMs).toBeGreaterThan(0);
    expect(first.expiresAtMs - first.sourceTimeMs).toBeLessThanOrEqual(60_000);
    await read();
    expect(await redis.hgetall(familyKey)).toEqual(before);
    expect(await redis.get(versionKey)).toBe('7');
  });

  it('reads the subject generation and indexed families in one operation', async () => {
    await redis.set(versionKey, '7');
    await createFamily();
    const before = await redis.hgetall(familyKey);
    const result = await readLegacySubjectEvidence(redis, userId);
    expect(result).toMatchObject({
      status: 'eligible',
      tokenVersion: 7,
      generationSource: 'CURRENT_TOKEN_VERSION',
      disabled: false,
      familyQuarantineCounts: {
        missingOrUnbounded: 0,
        issuedVersionMissingOrInvalid: 0,
        versionMismatch: 0,
        tokenEvidenceInvalid: 0,
      },
      families: [{ sessionId, tokenHash, tokenId }],
    });
    expect(await redis.hgetall(familyKey)).toEqual(before);
    expect(await redis.get(versionKey)).toBe('7');
  });

  it('maps an untouched subject to the legacy empty-state generation without writing it', async () => {
    expect(await readLegacySubjectEvidence(redis, userId)).toMatchObject({
      status: 'eligible',
      tokenVersion: 1,
      generationSource: 'EMPTY_LEGACY_STATE',
      families: [],
    });
    expect(await redis.get(versionKey)).toBeNull();
    expect(await redis.exists(indexKey)).toBe(0);
  });

  it('quarantines missing subject version when indexed families exist', async () => {
    await createFamily();
    expect(await readLegacySubjectEvidence(redis, userId)).toEqual({
      status: 'quarantined',
      reason: 'current_version_missing_with_families',
    });
    expect(await redis.get(versionKey)).toBeNull();
  });

  it('does not promote a late login family after logout-all advances the version', async () => {
    await redis.set(versionKey, '7');
    const versionReadByLogin = await service.getTokenVersion(userId);
    await service.revokeAllRefreshSessions(userId);
    await service.bumpTokenVersion(userId);
    await createFamily(versionReadByLogin);
    expect(await read()).toEqual({
      status: 'quarantined',
      reason: 'version_mismatch',
    });
    expect(await redis.hget(familyKey, 'issuedTokenVersion')).toBe('7');
    expect(await redis.get(versionKey)).toBe('8');
  });

  it('preserves the largest exactly representable generation', async () => {
    await redis.set(versionKey, String(Number.MAX_SAFE_INTEGER));
    await createFamily(Number.MAX_SAFE_INTEGER);
    expect(await read()).toMatchObject({
      status: 'eligible',
      tokenVersion: Number.MAX_SAFE_INTEGER,
    });
  });

  it('fails on contradictory Redis types instead of returning eligible evidence', async () => {
    await redis.set(versionKey, '7');
    await createFamily();
    await redis.del(indexKey);
    await redis.set(indexKey, 'not-a-set');
    await expect(read()).rejects.toThrow('WRONGTYPE');
    expect(await redis.get(versionKey)).toBe('7');
    expect(await redis.hget(familyKey, 'issuedTokenVersion')).toBe('7');
  });

  it.each([null, '', '0', '-1', '01', '1.5', '1e2', 'NaN', '9007199254740992'])(
    'quarantines absent/invalid current version %s without initializing it',
    async (value) => {
      await createFamily();
      if (value !== null) await redis.set(versionKey, value);
      expect(await read()).toEqual({
        status: 'quarantined',
        reason: 'current_version_missing_or_invalid',
      });
      expect(await redis.get(versionKey)).toBe(value);
    },
  );

  it.each([null, '', '0', '-1', '01', '1.5', '9007199254740992'])(
    'quarantines absent/invalid issued version %s',
    async (value) => {
      await redis.set(versionKey, '7');
      await createFamily();
      if (value === null) await redis.hdel(familyKey, 'issuedTokenVersion');
      else await redis.hset(familyKey, 'issuedTokenVersion', value);
      expect(await read()).toEqual({
        status: 'quarantined',
        reason: 'issued_version_missing_or_invalid',
      });
      expect(await service.hasRefreshSession(userId, sessionId)).toBe(true);
    },
  );

  it('qualifies an older family only after successful owner rotation records its version', async () => {
    await redis.set(versionKey, '7');
    await createFamily();
    await redis.hdel(familyKey, 'issuedTokenVersion');
    expect(await read()).toMatchObject({ status: 'quarantined' });
    const nextTokenId = randomUUID();
    expect(
      await service.rotateRefreshSession({
        userId,
        sessionId,
        expectedTokenId: tokenId,
        expectedTokenHash: tokenHash,
        nextTokenId,
        nextTokenHash: 'b'.repeat(64),
        issuedTokenVersion: 7,
        ttlSeconds: 60,
      }),
    ).toBe('rotated');
    expect(await read()).toMatchObject({
      status: 'eligible',
      tokenVersion: 7,
      tokenId: nextTokenId,
      tokenHash: 'b'.repeat(64),
    });
    expect(
      await service.rotateRefreshSession({
        userId,
        sessionId,
        expectedTokenId: tokenId,
        expectedTokenHash: tokenHash,
        nextTokenId: randomUUID(),
        nextTokenHash: 'c'.repeat(64),
        issuedTokenVersion: 7,
        ttlSeconds: 60,
      }),
    ).toBe('replayed');
    expect(await service.hasRefreshSession(userId, sessionId)).toBe(false);
  });

  it.each([
    'missing',
    'expired',
    'unbounded',
    'disabled',
    'unindexed',
    'bad_hash',
    'bad_token_id',
  ])('quarantines %s evidence', async (scenario) => {
    await redis.set(versionKey, '7');
    await createFamily();
    if (scenario === 'missing') await redis.del(familyKey);
    if (scenario === 'expired') await redis.pexpireat(familyKey, 1);
    if (scenario === 'unbounded') await redis.persist(familyKey);
    if (scenario === 'disabled') await redis.set(disabledKey, '1');
    if (scenario === 'unindexed') await redis.srem(indexKey, sessionId);
    if (scenario === 'bad_hash')
      await redis.hset(familyKey, 'tokenHash', 'not-a-hash');
    if (scenario === 'bad_token_id')
      await redis.hset(familyKey, 'tokenId', 'not-a-uuid');
    expect(await read()).toMatchObject({ status: 'quarantined' });
  });
});
