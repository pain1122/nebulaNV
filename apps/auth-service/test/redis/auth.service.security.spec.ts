import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../src/auth/auth.service';
import { GrpcAuthService } from '../../src/auth/grpc/grpc-auth.service';
import type { AuthTokenPayload, AuthUserDto } from '../../src/auth/auth.types';
import { AuthRedisService } from '../../src/auth/redis/auth-redis.service';

type StoredUserWithHash = Awaited<
  ReturnType<GrpcAuthService['getUserWithHash']>
>;

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

  const refreshPayload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    tv: 1,
  };

  async function storedUserWithHash(
    refreshToken: string,
  ): Promise<StoredUserWithHash> {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      refreshToken: await bcrypt.hash(refreshToken, 10),
    } as StoredUserWithHash;
  }

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

  describe('Refresh token rotation', () => {
    it('does not bump token version during refreshTokens', async () => {
      jwt.verify.mockReturnValue(refreshPayload);
      redis.getTokenVersion.mockResolvedValue(1);
      grpc.getUserWithHash.mockResolvedValue(
        await storedUserWithHash('valid-refresh-token'),
      );

      await authService.refreshTokens('valid-refresh-token');

      expect(redis.bumpTokenVersion).not.toHaveBeenCalled();
      expect(grpc.setRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('rejects a refresh token with an incomplete payload before user lookup', async () => {
      jwt.verify.mockReturnValue({ sub: user.id });

      await expect(
        authService.refreshTokens('structurally-invalid-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(grpc.getUserWithHash).not.toHaveBeenCalled();
      expect(grpc.setRefreshToken).not.toHaveBeenCalled();
    });

    it('rejects a refresh token whose signature cannot be verified', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        authService.refreshTokens('bad-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(grpc.getUserWithHash).not.toHaveBeenCalled();
      expect(grpc.setRefreshToken).not.toHaveBeenCalled();
    });

    it('rejects a stolen refresh token when the stored hash does not match', async () => {
      jwt.verify.mockReturnValue(refreshPayload);
      grpc.getUserWithHash.mockResolvedValue(
        await storedUserWithHash('different-refresh-token'),
      );

      await expect(
        authService.refreshTokens('stolen-refresh-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(redis.getTokenVersion).not.toHaveBeenCalled();
      expect(grpc.setRefreshToken).not.toHaveBeenCalled();
    });

    it('rejects refresh when there is no stored refresh token hash', async () => {
      jwt.verify.mockReturnValue(refreshPayload);
      grpc.getUserWithHash.mockResolvedValue({
        id: user.id,
        email: user.email,
        role: user.role,
        refreshToken: '',
      } as StoredUserWithHash);

      await expect(
        authService.refreshTokens('valid-looking-refresh-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(redis.getTokenVersion).not.toHaveBeenCalled();
      expect(grpc.setRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('Logout behavior', () => {
    it('clears stored refresh token and bumps token version on global logout', async () => {
      await authService.logout({
        userId: user.id,
        allDevices: true,
      });

      expect(grpc.setRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          refreshToken: '',
        }),
      );
      expect(redis.bumpTokenVersion).toHaveBeenCalledWith(user.id);
    });

    it('does not clear or bump when single-device logout gets the wrong refresh token', async () => {
      grpc.getUserWithHash.mockResolvedValue(
        await storedUserWithHash('real-refresh-token'),
      );

      await authService.logout({
        userId: user.id,
        refreshToken: 'attacker-refresh-token',
        allDevices: false,
      });

      expect(grpc.setRefreshToken).not.toHaveBeenCalled();
      expect(redis.bumpTokenVersion).not.toHaveBeenCalled();
    });

    it('clears and bumps on single-device logout only when the refresh token matches', async () => {
      grpc.getUserWithHash.mockResolvedValue(
        await storedUserWithHash('real-refresh-token'),
      );

      await authService.logout({
        userId: user.id,
        refreshToken: 'real-refresh-token',
        allDevices: false,
      });

      expect(grpc.setRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          refreshToken: '',
        }),
      );
      expect(redis.bumpTokenVersion).toHaveBeenCalledWith(user.id);
    });
  });
});
