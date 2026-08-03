import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenValidationService } from '../../src/auth/token/access-token-validation.service';
import { AuthRedisService } from '../../src/auth/redis/auth-redis.service';
import type { AuthTokenPayload } from '../../src/auth/auth.types';

const payload: AuthTokenPayload = {
  sub: 'user-1',
  email: 'user@example.com',
  role: 'user',
  tv: 3,
  sid: 'session-1',
  jti: 'access-1',
  typ: 'access',
};

describe('AccessTokenValidationService', () => {
  const jwt = { verify: jest.fn() };
  const config = { get: jest.fn().mockReturnValue('access-secret') };
  const redis = {
    isUserDisabled: jest.fn(),
    getTokenVersion: jest.fn(),
    hasRefreshSession: jest.fn(),
  };

  let service: AccessTokenValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue('access-secret');
    redis.isUserDisabled.mockResolvedValue(false);
    redis.getTokenVersion.mockResolvedValue(payload.tv);
    redis.hasRefreshSession.mockResolvedValue(true);
    service = new AccessTokenValidationService(
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      redis as unknown as AuthRedisService,
    );
  });

  it('accepts a signed, enabled, current-version token', async () => {
    jwt.verify.mockReturnValue(payload);

    const result = await service.validate('access-token');

    expect(result).toEqual({
      valid: true,
      payload,
      sessionRef: expect.stringMatching(/^[A-Za-z0-9_-]{32}$/),
    });
    if (result.valid) {
      expect(result.sessionRef).not.toContain(payload.sid);
    }
  });

  it('rejects a disabled user', async () => {
    jwt.verify.mockReturnValue(payload);
    redis.isUserDisabled.mockResolvedValue(true);

    await expect(service.validate('access-token')).resolves.toEqual({
      valid: false,
      reason: 'user_disabled',
    });
    expect(redis.getTokenVersion).not.toHaveBeenCalled();
  });

  it('rejects a stale token version', async () => {
    jwt.verify.mockReturnValue(payload);
    redis.getTokenVersion.mockResolvedValue(payload.tv + 1);

    await expect(service.validate('access-token')).resolves.toEqual({
      valid: false,
      reason: 'token_version_mismatch',
    });
  });

  it('rejects an access token whose session was revoked', async () => {
    jwt.verify.mockReturnValue(payload);
    redis.hasRefreshSession.mockResolvedValue(false);

    await expect(service.validate('access-token')).resolves.toEqual({
      valid: false,
      reason: 'session_revoked',
    });
  });

  it('rejects an invalid signature without querying Redis', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('signature verification failed');
    });

    await expect(service.validate('access-token')).resolves.toEqual({
      valid: false,
      reason: 'invalid_access_token',
    });
    expect(redis.isUserDisabled).not.toHaveBeenCalled();
    expect(redis.getTokenVersion).not.toHaveBeenCalled();
  });

  it('does not fall back to an undocumented legacy JWT secret', async () => {
    config.get.mockReturnValue(undefined);

    await expect(service.validate('access-token')).resolves.toEqual({
      valid: false,
      reason: 'missing_access_secret',
    });
    expect(config.get).toHaveBeenCalledTimes(1);
    expect(config.get).toHaveBeenCalledWith('JWT_ACCESS_SECRET');
    expect(jwt.verify).not.toHaveBeenCalled();
  });
});
