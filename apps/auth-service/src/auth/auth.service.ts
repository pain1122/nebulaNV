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
type FindUserWithHashResponse = userv1.FindUserWithHashResponse;
type SetRefreshTokenRequest = userv1.SetRefreshTokenRequest;

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
      email, password: hash, role: 'user',
    });
  
    this.logger.debug('register() → gRPC createUser start');
    console.time('auth.register->grpc.createUser');
    try {
      const res = await this.grpc.createUser(req);
      console.timeEnd('auth.register->grpc.createUser');
      this.logger.debug('register() → gRPC createUser done');
  
      // Return a plain, JSON-safe shape
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
    const req: FindUserWithHashRequest = identifier.includes('@')
      ? userv1.FindUserWithHashRequest.create({ email: identifier })
      : userv1.FindUserWithHashRequest.create({ phone: identifier });
    this.logger.debug('validateUser() → gRPC findUserWithHash start');
    console.time('grpc.findUserWithHash');

    let prom: any;
    try {
      prom = this.grpc.findUserWithHash(req);
      this.logger.debug(
        'validateUser() → got promise-like? then=' + typeof prom?.then,
      );

      const u = await prom; // ← await the promise
      console.timeEnd('grpc.findUserWithHash');
      this.logger.debug('validateUser() → gRPC findUserWithHash DONE');

      const keys = Object.keys(u ?? {});
      const hashPreviewLen =
        (u as any)?.passwordHash?.length ?? (u as any)?.password?.length ?? 0;

      this.logger.debug(
        `validateUser() → user keys=${JSON.stringify(keys)} hashLen=${hashPreviewLen}`,
      );

      this.logger.debug('validateUser() → comparing password hash');
      console.time('bcrypt.compare');
      const hash =
        (u as any).passwordHash ??
        (u as any).password ??
        (u as any).password_hash ??
        null;

      if (!hash) {
        console.timeEnd('bcrypt.compare');
        this.logger.warn('validateUser() → no hash on user; returning null');
        return null;
      }

      const ok = await bcrypt.compare(password, hash);
      console.timeEnd('bcrypt.compare');

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
      // If ANY exception occurs before/after the await, we’ll see it here.
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
      {
        userId: user.id,
        refreshToken: hash,
      },
    );
    await this.grpc.setRefreshToken(setReq);
    return { access_token: at, refresh_token: rt };
  }

  async refreshTokens(oldRt: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(oldRt, {
        secret: this.cfg.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const findReq: FindUserWithHashRequest =
      userv1.FindUserWithHashRequest.create({
        email: payload.email,
      });
    const u = await this.grpc.findUserWithHash(findReq);

    if (
      !u ||
      !u.refreshToken ||
      !(await bcrypt.compare(oldRt, u.refreshToken))
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const p = { sub: payload.sub, email: payload.email, role: payload.role };
    const at = this.jwt.sign(p);
    const rt = this.jwt.sign(p, {
      secret: this.cfg.get('JWT_REFRESH_SECRET'),
      expiresIn: this.cfg.get('JWT_REFRESH_EXPIRATION'),
    });
    const setReq: SetRefreshTokenRequest = userv1.SetRefreshTokenRequest.create(
      {
        userId: p.sub,
        refreshToken: await bcrypt.hash(rt, 10),
      },
    );
    await this.grpc.setRefreshToken(setReq);
    return { access_token: at, refresh_token: rt };
  }

  async getProfile(id: string) {
    try {
      return this.grpc.getUser(id);
    } catch {
      throw new NotFoundException('User not found');
    }
  }

  // new signature: accept your DTO + the userId
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
