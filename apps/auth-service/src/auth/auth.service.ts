// apps/auth-service/src/auth/auth.service.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { safeErrorName } from '@packages/config';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GrpcAuthService } from './grpc/grpc-auth.service';
import { AuthRedisService } from './redis/auth-redis.service';
import { userv1 } from '@nebula/protos';
import { wrapGrpc } from '@nebula/grpc-auth';
import {
  AuthUserDto,
  TokenPair,
  type AccessTokenPayload,
  type RefreshTokenPayload,
  isRefreshTokenPayload,
  toAuthRole,
} from './auth.types';

type UserResponse = userv1.UserResponse;
type CreateUserRequest = userv1.CreateUserRequest;
type FindUserWithHashRequest = userv1.FindUserWithHashRequest;
type UpdateProfileRequest = userv1.UpdateProfileRequest;
type GetUserWithHashResponse = userv1.GetUserWithHashResponse;

type LogoutRequest = {
  userId: string;
  sessionId?: string;
  refreshToken?: string;
  allDevices?: boolean;
};

type IssuedTokenPair = TokenPair & {
  refreshTokenId: string;
  refreshTokenHash: string;
};

function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly grpc: GrpcAuthService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    private readonly authRedis: AuthRedisService,
  ) {}

  private bcryptRounds(): number {
    const n = Number(this.cfg.get('BCRYPT_ROUNDS') ?? 10);
    return Number.isFinite(n) && n >= 8 ? n : 10;
  }

  // ---------------- Auth flows ----------------

  async register(email: string, password: string): Promise<AuthUserDto> {
    this.logger.debug('register() → hashing password');
    const hash = await bcrypt.hash(password, this.bcryptRounds());

    const req: CreateUserRequest = userv1.CreateUserRequest.create({
      email: normalizeEmail(email),
      password: hash,
      role: 'user',
    });

    this.logger.debug('register() → gRPC createUser start');
    try {
      const res = await this.grpc.createUser(req); // S2S only inside the client
      this.logger.debug('register() → gRPC createUser done');

      const out: AuthUserDto = {
        id: res.id,
        email: res.email,
        role: toAuthRole(res.role),
      };
      this.logger.log(`auth_register_succeeded userId=${out.id}`);
      await this.authRedis.getTokenVersion(out.id);
      return out;
    } catch (e: unknown) {
      this.logger.error(`auth_register_failed cause=${safeErrorName(e)}`);
      throw e;
    }
  }

  async validateUser(
    identifier: string,
    password: string,
  ): Promise<AuthUserDto | null> {
    const isEmail = identifier.includes('@');
    const req: FindUserWithHashRequest = isEmail
      ? userv1.FindUserWithHashRequest.create({
          email: normalizeEmail(identifier),
        })
      : userv1.FindUserWithHashRequest.create({ phone: identifier });

    this.logger.debug('validateUser() → gRPC findUserWithHash start');
    try {
      const u = await this.grpc.findUserWithHash(req); // S2S only

      const hash = u.passwordHash || null;

      if (!hash) {
        this.logger.warn('validateUser() → no hash on user; returning null');
        return null;
      }

      const ok = await bcrypt.compare(password, hash);
      if (!ok) {
        this.logger.debug('validateUser() → password mismatch');
        return null;
      }

      this.logger.debug('validateUser() → password match');
      return {
        id: u.id,
        email: u.email,
        role: toAuthRole(u.role),
      };
    } catch (e: unknown) {
      this.logger.error(`auth_validate_user_failed cause=${safeErrorName(e)}`);
      return null;
    }
  }

  async login(user: AuthUserDto): Promise<TokenPair> {
    const isDisabled = await this.authRedis.isUserDisabled(user.id);
    if (isDisabled) {
      throw new UnauthorizedException('User is disabled');
    }

    const tokenVersion = await this.authRedis.getTokenVersion(user.id);
    const sessionId = randomUUID();
    const issued = this.issueTokenPair(user, tokenVersion, sessionId);

    await this.authRedis.createRefreshSession({
      userId: user.id,
      sessionId,
      tokenId: issued.refreshTokenId,
      tokenHash: issued.refreshTokenHash,
      issuedTokenVersion: tokenVersion,
      ttlSeconds: issued.refreshExpiresInSeconds,
    });

    return {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      accessExpiresInSeconds: issued.accessExpiresInSeconds,
      refreshExpiresInSeconds: issued.refreshExpiresInSeconds,
    };
  }

  async refreshTokens(oldRt: string): Promise<TokenPair> {
    this.logger.debug('refreshTokens() start');

    let payload: RefreshTokenPayload;
    try {
      const verified: unknown = this.jwt.verify(oldRt, {
        secret: this.cfg.get<string>('JWT_REFRESH_SECRET'),
      });
      if (!isRefreshTokenPayload(verified)) {
        throw new UnauthorizedException('Invalid refresh token payload');
      }
      payload = verified;
    } catch {
      this.logger.warn('refreshTokens() rejected during verification');
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = payload.sub;
    if (!userId) {
      this.logger.error('refreshTokens() missing payload.sub');
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenVersion = await this.authRedis.getTokenVersion(userId);
    if (payload.tv !== tokenVersion) {
      this.logger.warn('refreshTokens() rejected stale token version');
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (await this.authRedis.isUserDisabled(userId)) {
      this.logger.warn('refreshTokens() rejected disabled user');
      throw new UnauthorizedException('Invalid refresh token');
    }

    const getReq = userv1.GetUserWithHashRequest.create({ id: userId });
    const uw: GetUserWithHashResponse = await this.grpc.getUserWithHash(getReq);
    if (!uw) throw new UnauthorizedException('Invalid refresh token');

    const issued = this.issueTokenPair(
      {
        id: userId,
        email: uw.email,
        role: toAuthRole(uw.role),
      },
      tokenVersion,
      payload.sid,
    );
    const rotation = await this.authRedis.rotateRefreshSession({
      userId,
      sessionId: payload.sid,
      expectedTokenId: payload.jti,
      expectedTokenHash: this.hashToken(oldRt),
      nextTokenId: issued.refreshTokenId,
      nextTokenHash: issued.refreshTokenHash,
      issuedTokenVersion: tokenVersion,
      ttlSeconds: issued.refreshExpiresInSeconds,
    });

    if (rotation !== 'rotated') {
      this.logger.warn(
        rotation === 'replayed'
          ? 'refreshTokens() replay detected; session revoked'
          : 'refreshTokens() rejected missing session',
      );
      throw new UnauthorizedException('Invalid refresh token');
    }

    this.logger.debug('refreshTokens() success -> tokens rotated');
    return {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      accessExpiresInSeconds: issued.accessExpiresInSeconds,
      refreshExpiresInSeconds: issued.refreshExpiresInSeconds,
    };
  }

  // ---------------- Profile ----------------

  async getProfile(id: string, token: string): Promise<UserResponse> {
    if (!token) throw new UnauthorizedException('Missing access token');
    return wrapGrpc(this.grpc.getUser(id, token));
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    token: string,
  ): Promise<UserResponse> {
    if (!token) throw new UnauthorizedException('Missing access token');

    const req: UpdateProfileRequest = userv1.UpdateProfileRequest.create({
      id: userId,
      email: dto.email ? normalizeEmail(dto.email) : '',
      newPassword: dto.newPassword ?? '',
      currentPassword: dto.currentPassword ?? '',
    });

    return this.grpc.updateProfile(req, token);
  }

  // ---------------- Logout / Revocation ----------------

  async logout(req: LogoutRequest): Promise<void> {
    if (req.allDevices) {
      await this.authRedis.revokeAllRefreshSessions(req.userId);
      await this.authRedis.bumpTokenVersion(req.userId);
      this.logger.debug(
        `logout(allDevices) → revoked sessions for user=${req.userId}`,
      );
      return;
    }

    if (req.sessionId) {
      if (req.refreshToken) {
        const payload = this.verifyRefreshToken(req.refreshToken);
        if (
          !payload ||
          payload.sub !== req.userId ||
          payload.sid !== req.sessionId
        ) {
          this.logger.debug(
            'logout(current) → refresh token does not match bearer session (noop)',
          );
          return;
        }
      }
      await this.authRedis.revokeRefreshSession(req.userId, req.sessionId);
      this.logger.debug(
        `logout(current) → revoked bearer session for user=${req.userId}`,
      );
      return;
    }

    if (req.refreshToken) {
      const payload = this.verifyRefreshToken(req.refreshToken);
      if (!payload || payload.sub !== req.userId) {
        this.logger.debug('logout(one) → invalid refresh token (noop)');
        return;
      }
      await this.authRedis.revokeRefreshSession(req.userId, payload.sid);
      this.logger.debug(`logout(one) → revoked session for user=${req.userId}`);
      return;
    }

    await this.authRedis.revokeAllRefreshSessions(req.userId);
    await this.authRedis.bumpTokenVersion(req.userId);
    this.logger.debug(
      `logout(default) → revoked sessions for user=${req.userId}`,
    );
  }

  // ---------------- Helpers ----------------

  private issueTokenPair(
    user: AuthUserDto,
    tokenVersion: number,
    sessionId: string,
  ): IssuedTokenPair {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tv: tokenVersion,
      sid: sessionId,
      jti: randomUUID(),
      typ: 'access',
    };
    const refreshPayload: RefreshTokenPayload = {
      ...accessPayload,
      jti: randomUUID(),
      typ: 'refresh',
    };
    const accessToken = this.jwt.sign(accessPayload);
    const refreshToken = this.jwt.sign(refreshPayload, {
      secret: this.cfg.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.cfg.get<NonNullable<JwtSignOptions['expiresIn']>>(
        'JWT_REFRESH_EXPIRATION',
      ),
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenId: refreshPayload.jti,
      refreshTokenHash: this.hashToken(refreshToken),
      accessExpiresInSeconds: this.tokenTtlSeconds(
        accessToken,
        'access_token_expiration_missing',
      ),
      refreshExpiresInSeconds: this.tokenTtlSeconds(
        refreshToken,
        'refresh_token_expiration_missing',
      ),
    };
  }

  private verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const verified: unknown = this.jwt.verify(token, {
        secret: this.cfg.get<string>('JWT_REFRESH_SECRET'),
      });
      return isRefreshTokenPayload(verified) ? verified : null;
    } catch {
      return null;
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private tokenTtlSeconds(token: string, missingError: string): number {
    const decoded: unknown = this.jwt.decode(token);
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof (decoded as Record<string, unknown>).exp !== 'number'
    ) {
      throw new Error(missingError);
    }

    const expiresAt = (decoded as { exp: number }).exp;
    return Math.max(1, expiresAt - Math.floor(Date.now() / 1000));
  }
}
