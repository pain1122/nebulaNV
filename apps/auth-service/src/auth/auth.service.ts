import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
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

  async register(email: string, password: string): Promise<UserResponse> {
    const hash = await bcrypt.hash(password, 10);
    const req: CreateUserRequest = userv1.CreateUserRequest.create({
      email,
      password: hash,
      role: 'user',
    });

    return this.grpc.createUser(req);
  }

  async validateUser(identifier: string, password: string) {
    const req: FindUserWithHashRequest = identifier.includes('@')
      ? userv1.FindUserWithHashRequest.create({ email: identifier })
      : userv1.FindUserWithHashRequest.create({ phone: identifier });

    const u = await this.grpc.findUserWithHash(req);
    if (!u) return null;

    const ok = await bcrypt.compare(password, u.passwordHash);
    return ok ? { id: u.id, email: u.email, role: u.role } : null;
  }

  async login(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const at = this.jwt.sign(payload);
    const rt = this.jwt.sign(payload, {
      secret: this.cfg.get('JWT_REFRESH_SECRET'),
      expiresIn: this.cfg.get('JWT_REFRESH_EXPIRATION'),
    });
    const hash = await bcrypt.hash(rt, 10);
    const setReq: SetRefreshTokenRequest = userv1.SetRefreshTokenRequest.create({
      userId: user.id,
      refreshToken: hash,
    });
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

    const findReq: FindUserWithHashRequest = userv1.FindUserWithHashRequest.create({
      email: payload.email,
    });
    const u = await this.grpc.findUserWithHash(findReq);
    
    if (!u || !u.refreshToken || !(await bcrypt.compare(oldRt, u.refreshToken))) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const p = { sub: payload.sub, email: payload.email, role: payload.role };
    const at = this.jwt.sign(p);
    const rt = this.jwt.sign(p, {
      secret: this.cfg.get('JWT_REFRESH_SECRET'),
      expiresIn: this.cfg.get('JWT_REFRESH_EXPIRATION'),
    });
    const setReq: SetRefreshTokenRequest = userv1.SetRefreshTokenRequest.create({
      userId: p.sub,
      refreshToken: await bcrypt.hash(rt, 10),
    });
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
  async updateProfile(userId: string, dto: UpdateProfileDto, token: string): Promise<UserResponse> {
    const req: UpdateProfileRequest = userv1.UpdateProfileRequest.create({
      id: userId,
      email: dto.email ?? '',
      newPassword: dto.newPassword ?? '',
      currentPassword: dto.currentPassword ?? '',
    });
    return this.grpc.updateProfile(req, token);
  }
}
