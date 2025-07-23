import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { PrismaService } from '../prisma.service';
import { GrpcAuthService } from './grpc/grpc-auth.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Metadata } from '@grpc/grpc-js';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import {
  UserServiceClient,
  UserResponse,
} from './user-service-client.interface';

@Injectable()
export class AuthService {
  constructor(
    private grpcAuth: GrpcAuthService,
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    @Inject('USER_SERVICE') private client: ClientGrpc,
  ) {}

  
  private buildJwtMeta(accessToken: string): Metadata {
    const meta = new Metadata();
    meta.add('Authorization', `Bearer ${accessToken}`);
    return meta;
  }

  async getUserById(id: string, jwt: string): Promise<UserResponse> {
   return this.grpcAuth.getUser(id, jwt);
  }

  async updateProfileViaGrpc(
    id: string,
    dto: UpdateProfileDto,
    jwt: string,
  ): Promise<UserResponse> {
    const req = { id, ...dto };
    return this.grpcAuth.updateProfile(req, jwt);
  }

  async register(email: string, password: string) {
    const hashed = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { email, password: hashed, role: 'user' },
    });
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.password);
    return ok ? user : null;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRATION'),
    });

    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hash },
    });

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  async refreshTokens(token: string) {
    const payload = this.jwtService.verify(token, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const matches = await bcrypt.compare(token, user.refreshToken);
    if (!matches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const newPayload = { sub: user.id, email: user.email, role: user.role };
    const newAccess = this.jwtService.sign(newPayload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRATION'),
    });
    const newRefresh = this.jwtService.sign(newPayload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRATION'),
    });

    const newHash = await bcrypt.hash(newRefresh, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newHash },
    });

    return { access_token: newAccess, refresh_token: newRefresh };
  }
}
