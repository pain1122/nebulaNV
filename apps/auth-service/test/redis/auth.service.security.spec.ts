import { status } from '@grpc/grpc-js';
import {
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AuthService } from '../../src/auth/auth.service';
import { GrpcAuthService } from '../../src/auth/grpc/grpc-auth.service';
import type {
  AuthUserDto,
  RefreshTokenPayload,
} from '../../src/auth/auth.types';
import { AuthRedisService } from '../../src/auth/redis/auth-redis.service';

describe('AuthService security behaviors', () => {
  let authService: AuthService;
  let redis: jest.Mocked<AuthRedisService>;
  let jwt: jest.Mocked<JwtService>;
  let grpc: jest.Mocked<GrpcAuthService>;

  const user: AuthUserDto = {
    id: 'user-1',
    email: 'user@test.com',
    role: 'user',
  };

  const refreshPayload: RefreshTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    tv: 1,
    sid: 'session-1',
    jti: 'refresh-1',
    typ: 'refresh',
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRedisService,
          useValue: {
            getTokenVersion: jest.fn().mockResolvedValue(1),
            bumpTokenVersion: jest.fn(),
            isUserDisabled: jest.fn().mockResolvedValue(false),
            createRefreshSession: jest.fn(),
            rotateRefreshSession: jest.fn().mockResolvedValue('rotated'),
            revokeRefreshSession: jest.fn(),
            revokeAllRefreshSessions: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn((payload: { typ?: string }) =>
              payload.typ === 'refresh' ? 'new-refresh-token' : 'access-token',
            ),
            verify: jest.fn(),
            decode: jest.fn().mockReturnValue({
              exp: Math.floor(Date.now() / 1000) + 3600,
            }),
          },
        },
        {
          provide: GrpcAuthService,
          useValue: {
            getUser: jest.fn(),
            getUserWithHash: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
              if (key === 'JWT_REFRESH_EXPIRATION') return '7d';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    redis = module.get(AuthRedisService);
    jwt = module.get(JwtService);
    grpc = module.get(GrpcAuthService);
  });

  describe('User disablement', () => {
    it('blocks login if user is disabled', async () => {
      redis.isUserDisabled.mockResolvedValue(true);

      await expect(authService.login(user)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(redis.isUserDisabled).toHaveBeenCalledWith(user.id);
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('Profile translation', () => {
    it('preserves missing access token as unauthorized', async () => {
      await expect(authService.getProfile(user.id, '')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(grpc.getUser).not.toHaveBeenCalled();
    });

    it.each([
      {
        code: status.NOT_FOUND,
        details: 'user_not_found',
        exception: NotFoundException,
      },
      {
        code: status.UNAVAILABLE,
        details: 'user_unavailable',
        exception: ServiceUnavailableException,
      },
    ])(
      'maps user-service status $code without collapsing it',
      async ({ code, details, exception }) => {
        grpc.getUser.mockRejectedValue({ code, details });

        await expect(
          authService.getProfile(user.id, 'access-token'),
        ).rejects.toBeInstanceOf(exception);
      },
    );
  });

  describe('Refresh token rotation', () => {
    beforeEach(() => {
      jwt.verify.mockReturnValue(refreshPayload);
      grpc.getUserWithHash.mockResolvedValue({
        id: user.id,
        email: user.email,
        role: user.role,
      } as Awaited<ReturnType<GrpcAuthService['getUserWithHash']>>);
    });

    it('rotates one session without bumping the global token version', async () => {
      await authService.refreshTokens('valid-refresh-token');

      expect(redis.rotateRefreshSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          sessionId: refreshPayload.sid,
          expectedTokenId: refreshPayload.jti,
        }),
      );
      expect(redis.bumpTokenVersion).not.toHaveBeenCalled();
    });

    it('rejects a structurally invalid refresh payload before user lookup', async () => {
      jwt.verify.mockReturnValue({ sub: user.id });

      await expect(
        authService.refreshTokens('structurally-invalid-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(grpc.getUserWithHash).not.toHaveBeenCalled();
      expect(redis.rotateRefreshSession).not.toHaveBeenCalled();
    });

    it('rejects a refresh token whose signature cannot be verified', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        authService.refreshTokens('bad-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(grpc.getUserWithHash).not.toHaveBeenCalled();
      expect(redis.rotateRefreshSession).not.toHaveBeenCalled();
    });

    it('rejects stale token versions before rotating the session', async () => {
      redis.getTokenVersion.mockResolvedValue(refreshPayload.tv + 1);

      await expect(
        authService.refreshTokens('stale-refresh-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(grpc.getUserWithHash).not.toHaveBeenCalled();
      expect(redis.rotateRefreshSession).not.toHaveBeenCalled();
    });

    it('rejects a detected replay after the session family is revoked', async () => {
      redis.rotateRefreshSession.mockResolvedValue('replayed');

      await expect(
        authService.refreshTokens('replayed-refresh-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(redis.rotateRefreshSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('Logout behavior', () => {
    it('revokes every session and bumps token version on all-device logout', async () => {
      await authService.logout({ userId: user.id, allDevices: true });

      expect(redis.revokeAllRefreshSessions).toHaveBeenCalledWith(user.id);
      expect(redis.bumpTokenVersion).toHaveBeenCalledWith(user.id);
    });

    it('does not revoke a session when the supplied refresh token is invalid', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await authService.logout({
        userId: user.id,
        refreshToken: 'attacker-refresh-token',
        allDevices: false,
      });

      expect(redis.revokeRefreshSession).not.toHaveBeenCalled();
      expect(redis.bumpTokenVersion).not.toHaveBeenCalled();
    });

    it('revokes only the matching session on current-session logout', async () => {
      jwt.verify.mockReturnValue(refreshPayload);

      await authService.logout({
        userId: user.id,
        refreshToken: 'real-refresh-token',
        allDevices: false,
      });

      expect(redis.revokeRefreshSession).toHaveBeenCalledWith(
        user.id,
        refreshPayload.sid,
      );
      expect(redis.revokeAllRefreshSessions).not.toHaveBeenCalled();
      expect(redis.bumpTokenVersion).not.toHaveBeenCalled();
    });
  });
});
