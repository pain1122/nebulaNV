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
import { userv1 } from '@nebula/protos';

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

function normalizeEmail(s: string) {
  return s.trim().toLowerCase();
}


@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly grpc: GrpcAuthService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  private bcryptRounds(): number {
    const n = Number(this.cfg.get('BCRYPT_ROUNDS') ?? 10);
    return Number.isFinite(n) && n >= 8 ? n : 10;
  }

  // ---------------- Auth flows ----------------

  async register(email: string, password: string) {
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

      const raw: any = (res as any)?.user ?? res;
      const out = {
        id: raw?.id?.toString?.() ?? String(raw?.id ?? ''),
        email: raw?.email ?? '',
        role: raw?.role ?? 'user',
      };
      this.logger.log(`register() end -> id=${out.id}`);
      return out;
    } catch (e: any) {
      try { console.timeEnd('auth.register->grpc.createUser'); } catch {}
      this.logger.error(`register() gRPC error: ${e?.message || e}`);
      throw e;
    }
  }

  async validateUser(identifier: string, password: string) {
    const isEmail = identifier.includes('@');
    const req: FindUserWithHashRequest = isEmail
      ? userv1.FindUserWithHashRequest.create({ email: normalizeEmail(identifier) })
      : userv1.FindUserWithHashRequest.create({ phone: identifier });

    this.logger.debug('validateUser() → gRPC findUserWithHash start');
    console.time('grpc.findUserWithHash');

    try {
      const u = await this.grpc.findUserWithHash(req); // S2S only
      console.timeEnd('grpc.findUserWithHash');

      const hash: string | null =
        (u as any).passwordHash ??
        (u as any).password ??
        (u as any).password_hash ??
        null;

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
        id: (u as any).id,
        email: (u as any).email,
        role: (u as any).role,
      };
    } catch (e: any) {
      try { console.timeEnd('grpc.findUserWithHash'); } catch {}
      this.logger.error(
        `validateUser() → error type=${e?.constructor?.name} msg=${e?.message ?? e}`,
      );
      return null;
    }
  }

  async login(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const at = this.jwt.sign(payload);
    const rt = this.jwt.sign(payload, {
      secret: this.cfg.get('JWT_REFRESH_SECRET'),
      expiresIn: this.cfg.get('JWT_REFRESH_EXPIRATION'),
    });

    const hash = await bcrypt.hash(rt, this.bcryptRounds());
    const setReq: SetRefreshTokenRequest = userv1.SetRefreshTokenRequest.create({
      userId: user.id,
      refreshToken: hash,
    });

    await this.grpc.setRefreshToken(setReq); // S2S + x-user-id inside client

    return { accessToken: at, refreshToken: rt };
  }

  async refreshTokens(oldRt: string) {
    this.logger.debug('refreshTokens() start');

    let payload: any;
    try {
      payload = this.jwt.verify(oldRt, {
        secret: this.cfg.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch (e: any) {
      this.logger.error(`refreshTokens() verify failed: ${e?.message || e}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId: string | undefined = payload?.sub;
    if (!userId) {
      this.logger.error('refreshTokens() missing payload.sub');
      throw new UnauthorizedException('Invalid refresh token');
    }

    // S2S + x-user-id(userId) downstream
    const getReq = userv1.GetUserWithHashRequest.create({ id: userId });
    const uw: GetUserWithHashResponse = await this.grpc.getUserWithHash(getReq, userId);

    if (!uw || !uw.refreshToken) {
      this.logger.error('refreshTokens() no stored refreshToken hash');
      throw new UnauthorizedException('No refresh token on record');
    }

    const ok = await bcrypt.compare(oldRt, uw.refreshToken);
    if (!ok) {
      this.logger.error('refreshTokens() bcrypt.compare failed (mismatch)');
      throw new UnauthorizedException('Invalid refresh token');
    }

    const p = { sub: userId, email: uw.email, role: uw.role };
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

  async getProfile(id: string, token: string, initiatorId?: string) {
    try {
      if (!token) throw new UnauthorizedException('Missing access token');
      // Pass token (for @Roles on user-service) + x-user-id(id) via client
      return this.grpc.getUser(id, token, initiatorId);
    } catch {
      throw new NotFoundException('User not found');
    }
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, token: string): Promise<UserResponse> {
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
      this.logger.debug(`logout(allDevices) → cleared RT for user=${req.userId}`);
      return;
    }

    if (req.refreshToken) {
      const uw = await this.getUserWithHash(req.userId);
      if (!uw?.refreshToken) {
        this.logger.debug(`logout(one) → no stored RT for user=${req.userId} (noop)`);
        return;
      }
      const ok = await bcrypt.compare(req.refreshToken, uw.refreshToken);
      if (!ok) {
        this.logger.debug(`logout(one) → provided RT mismatch for user=${req.userId} (noop)`);
        return;
      }
      await this.clearStoredRefreshToken(req.userId);
      this.logger.debug(`logout(one) → cleared RT for user=${req.userId}`);
      return;
    }

    await this.clearStoredRefreshToken(req.userId);
    this.logger.debug(`logout(default) → cleared RT for user=${req.userId}`);
  }

  // ---------------- Helpers ----------------

  private async getUserWithHash(userId: string): Promise<GetUserWithHashResponse> {
    const getReq: GetUserWithHashRequest = userv1.GetUserWithHashRequest.create({ id: userId });
    // Propagate userId for auditing/authorization downstream
    return this.grpc.getUserWithHash(getReq, userId);
  }

  private async clearStoredRefreshToken(userId: string): Promise<void> {
    const clearReq: SetRefreshTokenRequest = userv1.SetRefreshTokenRequest.create({
      userId,
      refreshToken: '',
    });
    await this.grpc.setRefreshToken(clearReq); // S2S + x-user-id
  }
}
