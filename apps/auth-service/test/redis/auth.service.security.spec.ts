import { Test } from '@nestjs/testing';
import { AuthService } from '../../src/auth/auth.service';
import { AuthRedisService } from '../../src/auth/redis/auth-redis.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GrpcAuthService } from '../../src/auth/grpc/grpc-auth.service';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService – security behaviors', () => {
  let authService: AuthService;
  let redis: jest.Mocked<AuthRedisService>;
  let jwt: jest.Mocked<JwtService>;
  let grpc: jest.Mocked<GrpcAuthService>;

  const user = {
    id: 'user-1',
    email: 'user@test.com',
    role: 'user',
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRedisService,
          useValue: {
            getTokenVersion: jest.fn(),
            bumpTokenVersion: jest.fn(),
            isUserDisabled: jest.fn(),
            disableUser: jest.fn(),
            enableUser: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('jwt-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: GrpcAuthService,
          useValue: {
            getUserWithHash: jest.fn(),
            setRefreshToken: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    redis = module.get(AuthRedisService);
    jwt = module.get(JwtService);
    grpc = module.get(GrpcAuthService);
  });

  // ─────────────────────────────────────────────
  // User disablement
  // ─────────────────────────────────────────────
  describe('User disablement', () => {
    it('blocks login if user is disabled', async () => {
      redis.isUserDisabled.mockResolvedValue(true);

      await expect(authService.login(user as any)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(redis.isUserDisabled).toHaveBeenCalledWith(user.id);
    });
  });

  // ─────────────────────────────────────────────
  // Refresh token rotation
  // ─────────────────────────────────────────────
  describe('Refresh token rotation', () => {
    it('does NOT bump token version during refreshTokens', async () => {
      jwt.verify.mockReturnValue({ sub: user.id } as any);
      redis.getTokenVersion.mockResolvedValue(1);

      grpc.getUserWithHash.mockResolvedValue({
        id: user.id,
        email: user.email,
        role: user.role,
        refreshToken: await bcrypt.hash('valid-refresh-token', 10),
      } as any);

      await authService.refreshTokens('valid-refresh-token');

      expect(redis.bumpTokenVersion).not.toHaveBeenCalled();
    });

    it('throws if refresh token is invalid', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        authService.refreshTokens('bad-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ─────────────────────────────────────────────
  // Logout behavior
  // ─────────────────────────────────────────────
  describe('Logout behavior', () => {
    it('bumps token version on global logout (allDevices)', async () => {
      await authService.logout({
        userId: user.id,
        allDevices: true,
      });

      expect(redis.bumpTokenVersion).toHaveBeenCalledWith(user.id);
    });

    it('does NOT bump token version on single-device logout', async () => {
      await authService.logout({
        userId: user.id,
        refreshToken: 'refresh-token',
        allDevices: false,
      });

      expect(redis.bumpTokenVersion).not.toHaveBeenCalled();
    });
  });
});
