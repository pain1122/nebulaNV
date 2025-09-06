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
function basicSlugify(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

function randToken(len = 6) {
  return Math.random().toString(36).slice(2, 2 + len);
}
@Injectable()
export class AuthService {
  constructor(
    private readonly grpc: GrpcAuthService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  private readonly logger = new Logger(AuthService.name);

  async register(email: string, password: string) {
    this.logger.debug('register() → hashing password');
    console.time('auth.register::bcrypt.hash');
    const hash = await bcrypt.hash(password, 10);
    console.timeEnd('auth.register::bcrypt.hash');

    const req: CreateUserRequest = userv1.CreateUserRequest.create({
      email,
      password: hash,
      role: 'user',
    });

    this.logger.debug('register() → gRPC createUser start');
    console.time('auth.register->grpc.createUser');
    try {
      const res = await this.grpc.createUser(req);
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
      try {
        console.timeEnd('auth.register->grpc.createUser');
      } catch {}
      this.logger.error(`register() gRPC error: ${e?.message || e}`);
      throw e;
    }
  }

  async validateUser(identifier: string, password: string) {
    const req: FindUserWithHashRequest = identifier.includes('@')
      ? userv1.FindUserWithHashRequest.create({ email: identifier })
      : userv1.FindUserWithHashRequest.create({ phone: identifier });

    this.logger.debug('validateUser() → gRPC findUserWithHash start');
    console.time('grpc.findUserWithHash');

    try {
      const u = await this.grpc.findUserWithHash(req);
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
      try {
        console.timeEnd('grpc.findUserWithHash');
      } catch {}
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

    const hash = await bcrypt.hash(rt, 10);
    const setReq: SetRefreshTokenRequest = userv1.SetRefreshTokenRequest.create(
      { userId: user.id, refreshToken: hash },
    );
    await this.grpc.setRefreshToken(setReq);

    return { access_token: at, refresh_token: rt };
  }

  async refreshTokens(oldRt: string) {
    this.logger.debug('refreshTokens() start');
  
    // 1) Verify incoming refresh token
    let payload: any;
    try {
      payload = this.jwt.verify(oldRt, {
        secret: this.cfg.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch (e: any) {
      this.logger.error(`refreshTokens() verify failed: ${e?.message || e}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
    this.logger.debug(`refreshTokens() payload keys=${Object.keys(payload || {}).join(',')}`);
  
    const userId: string | undefined = payload?.sub;
    if (!userId) {
      this.logger.error('refreshTokens() missing payload.sub');
      throw new UnauthorizedException('Invalid refresh token');
    }
  
    // 2) Load stored hash by userId (ID-only)
    const getReq = userv1.GetUserWithHashRequest.create({ id: userId });
    const uw: userv1.GetUserWithHashResponse = await this.grpc.getUserWithHash(getReq);
    this.logger.debug(
      `refreshTokens() getUserWithHash -> id=${uw?.id || ''} email=${uw?.email || ''} ` +
      `hasHash=${uw?.refreshToken ? 'yes' : 'no'}`
    );
  
    if (!uw || !uw.refreshToken) {
      this.logger.error('refreshTokens() no stored refreshToken hash');
      throw new UnauthorizedException('No refresh token on record');
    }
  
    // 3) Compare provided token with stored hash
    const ok = await bcrypt.compare(oldRt, uw.refreshToken);
    if (!ok) {
      this.logger.error('refreshTokens() bcrypt.compare failed (mismatch)');
      throw new UnauthorizedException('Invalid refresh token');
    }
  
    // 4) Re-issue & rotate
    const p = { sub: userId, email: uw.email, role: uw.role };
    const at = this.jwt.sign(p);
    const rt = this.jwt.sign(p, {
      secret: this.cfg.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.cfg.get<string>('JWT_REFRESH_EXPIRATION'),
    });
  
    await this.grpc.setRefreshToken(
      userv1.SetRefreshTokenRequest.create({
        userId,
        refreshToken: await bcrypt.hash(rt, 10),
      }),
    );
  
    this.logger.debug('refreshTokens() success -> tokens rotated');
    return { access_token: at, refresh_token: rt };
  }

  async getProfile(id: string) {
    try {
      return this.grpc.getUser(id);
    } catch {
      throw new NotFoundException('User not found');
    }
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    token: string,
  ): Promise<UserResponse> {
    const req: UpdateProfileRequest = userv1.UpdateProfileRequest.create({
      id: userId,
      email: dto.email ?? '',
      newPassword: dto.newPassword ?? '',
      currentPassword: dto.currentPassword ?? '',
    });
    return this.grpc.updateProfile(req, token);
  }
}
