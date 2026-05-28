// apps/auth-service/src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GrpcAuthService } from './grpc/grpc-auth.service';
import { AuthRedisService } from './redis/auth-redis.service';
import { userv1 } from '@nebula/protos';
import {
  AuthTokenPayload,
  AuthUserDto,
  TokenPair,
  isAuthTokenPayload,
  toAuthRole,
} from './auth.types';
import { errorMessage, errorName } from './error.utils';

type UserResponse = userv1.UserResponse;
type CreateUserRequest = userv1.CreateUserRequest;
type FindUserWithHashRequest = userv1.FindUserWithHashRequest;
type UpdateProfileRequest = userv1.UpdateProfileRequest;
type GetUserWithHashRequest = userv1.GetUserWithHashRequest;
type SetRefreshTokenRequest = userv1.SetRefreshTokenRequest;
type GetUserWithHashResponse = userv1.GetUserWithHashResponse;

type LogoutRequest = {
  userId: string;
  refreshToken?: string;
  allDevices?: boolean;
};

function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

function safeTimeEnd(label: string): void {
  try {
    console.timeEnd(label);
  } catch {
    return;
  }
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
    console.time('auth.register::bcrypt.hash');
    const hash = await bcrypt.hash(password, this.bcryptRounds());
    console.timeEnd('auth.register::bcrypt.hash');

    const req: CreateUserRequest = userv1.CreateUserRequest.create({
      email: normalizeEmail(email),
      password: hash,
      role: 'user',
    });

    this.logger.debug('register() → gRPC createUser start');
    console.time('auth.register->grpc.createUser');
    try {
      const res = await this.grpc.createUser(req); // S2S only inside the client
      console.timeEnd('auth.register->grpc.createUser');
      this.logger.debug('register() → gRPC createUser done');

      const out: AuthUserDto = {
        id: res.id,
        email: res.email,
        role: toAuthRole(res.role),
      };
      this.logger.log(`register() end -> id=${out.id}`);
      await this.authRedis.getTokenVersion(out.id);
      return out;
    } catch (e: unknown) {
      safeTimeEnd('auth.register->grpc.createUser');
      this.logger.error(`register() gRPC error: ${errorMessage(e)}`);
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
    console.time('grpc.findUserWithHash');

    try {
      const u = await this.grpc.findUserWithHash(req); // S2S only
      console.timeEnd('grpc.findUserWithHash');

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
      safeTimeEnd('grpc.findUserWithHash');
      this.logger.error(
        `validateUser() → error type=${errorName(e)} msg=${errorMessage(e)}`,
      );
      return null;
    }
  }

  async login(user: AuthUserDto): Promise<TokenPair> {
    const isDisabled = await this.authRedis.isUserDisabled(user.id);
    if (isDisabled) {
      throw new UnauthorizedException('User is disabled');
    }

    const tokenVersion = await this.authRedis.getTokenVersion(user.id);

    const payload: AuthTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tv: tokenVersion,
    };

    const at = this.jwt.sign(payload);
    const rt = this.jwt.sign(payload, {
      secret: this.cfg.get('JWT_REFRESH_SECRET'),
      expiresIn: this.cfg.get('JWT_REFRESH_EXPIRATION'),
    });

    const hash = await bcrypt.hash(rt, this.bcryptRounds());
    const setReq: SetRefreshTokenRequest = userv1.SetRefreshTokenRequest.create(
      {
        userId: user.id,
        refreshToken: hash,
      },
    );

    await this.grpc.setRefreshToken(setReq); // S2S + x-user-id inside client

    return { accessToken: at, refreshToken: rt };
  }

  async refreshTokens(oldRt: string): Promise<TokenPair> {
    this.logger.debug('refreshTokens() start');

    let payload: AuthTokenPayload;
    try {
      const verified: unknown = this.jwt.verify(oldRt, {
        secret: this.cfg.get<string>('JWT_REFRESH_SECRET'),
      });
      if (!isAuthTokenPayload(verified)) {
        throw new UnauthorizedException('Invalid refresh token payload');
      }
      payload = verified;
    } catch (e: unknown) {
      this.logger.error(`refreshTokens() verify failed: ${errorMessage(e)}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = payload.sub;
    if (!userId) {
      this.logger.error('refreshTokens() missing payload.sub');
      throw new UnauthorizedException('Invalid refresh token');
    }

    // S2S + x-user-id(userId) downstream
    const getReq = userv1.GetUserWithHashRequest.create({ id: userId });
    const uw: GetUserWithHashResponse = await this.grpc.getUserWithHash(
      getReq,
      userId,
    );

    if (!uw || !uw.refreshToken) {
      this.logger.error('refreshTokens() no stored refreshToken hash');
      throw new UnauthorizedException('No refresh token on record');
    }

    const ok = await bcrypt.compare(oldRt, uw.refreshToken);
    if (!ok) {
      this.logger.error('refreshTokens() bcrypt.compare failed (mismatch)');
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenVersion = await this.authRedis.getTokenVersion(userId);

    const p: AuthTokenPayload = {
      sub: userId,
      email: uw.email,
      role: toAuthRole(uw.role),
      tv: tokenVersion,
    };
    const at = this.jwt.sign(p);
    const rt = this.jwt.sign(p, {
      secret: this.cfg.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.cfg.get<string>('JWT_REFRESH_EXPIRATION'),
    });

    await this.grpc.setRefreshToken(
      userv1.SetRefreshTokenRequest.create({
        userId,
        refreshToken: await bcrypt.hash(rt, this.bcryptRounds()),
      }),
    );

    this.logger.debug('refreshTokens() success -> tokens rotated');
    return { accessToken: at, refreshToken: rt };
  }

  // ---------------- Profile ----------------

  async getProfile(
    id: string,
    token: string,
    initiatorId?: string,
  ): Promise<UserResponse> {
    try {
      if (!token) throw new UnauthorizedException('Missing access token');
      // Pass token (for @Roles on user-service) + x-user-id(id) via client
      return this.grpc.getUser(id, token, initiatorId);
    } catch {
      throw new NotFoundException('User not found');
    }
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

    return this.grpc.updateProfile(req, token); // JWT + S2S + x-user-id
  }

  // ---------------- Logout / Revocation ----------------

  async logout(req: LogoutRequest): Promise<void> {
    if (req.allDevices) {
      await this.clearStoredRefreshToken(req.userId);
      await this.authRedis.bumpTokenVersion(req.userId);
      this.logger.debug(
        `logout(allDevices) → cleared RT for user=${req.userId}`,
      );
      return;
    }

    if (req.refreshToken) {
      const uw = await this.getUserWithHash(req.userId);
      if (!uw?.refreshToken) {
        this.logger.debug(
          `logout(one) → no stored RT for user=${req.userId} (noop)`,
        );
        return;
      }
      const ok = await bcrypt.compare(req.refreshToken, uw.refreshToken);
      if (!ok) {
        this.logger.debug(
          `logout(one) → provided RT mismatch for user=${req.userId} (noop)`,
        );
        return;
      }
      await this.clearStoredRefreshToken(req.userId);
      await this.authRedis.bumpTokenVersion(req.userId);
      this.logger.debug(`logout(one) → cleared RT for user=${req.userId}`);
      return;
    }

    await this.clearStoredRefreshToken(req.userId);
    await this.authRedis.bumpTokenVersion(req.userId);
    this.logger.debug(`logout(default) → cleared RT for user=${req.userId}`);
  }

  // ---------------- Helpers ----------------

  private async getUserWithHash(
    userId: string,
  ): Promise<GetUserWithHashResponse> {
    const getReq: GetUserWithHashRequest = userv1.GetUserWithHashRequest.create(
      { id: userId },
    );
    // Propagate userId for auditing/authorization downstream
    return this.grpc.getUserWithHash(getReq, userId);
  }

  private async clearStoredRefreshToken(userId: string): Promise<void> {
    const clearReq: SetRefreshTokenRequest =
      userv1.SetRefreshTokenRequest.create({
        userId,
        refreshToken: '',
      });
    await this.grpc.setRefreshToken(clearReq); // S2S + x-user-id
  }
}
