import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { PrismaService } from '../prisma.service';
import { GrpcAuthService } from './grpc/grpc-auth.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponse } from './grpc/user-service-client.interface';
import { dtoToProtoUpdate } from './mappers';

@Injectable()
export class AuthService {
  constructor(
    private readonly grpcAuth: GrpcAuthService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async getUserById(id: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.email) {
      // you could also throw, but at least coalesce to empty string:
      throw new NotFoundException('User has no email');
    }
    // Now email is definitely a string
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  async updateProfileViaGrpc(
    id: string,
    dto: UpdateProfileDto,
    jwt: string,
  ): Promise<UserResponse> {
    const req = dtoToProtoUpdate(id, dto);
    return this.grpcAuth.updateProfile(req, jwt);
  }

  async register(email: string, password: string) {
    const hashed = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { email, password: hashed, role: 'user' },
    });
  }

  /**
   * Login with either email or phone.
   * We keep this path using Prisma directly (not gRPC) because proto UserResponse
   * does not expose password hashes (and it shouldn't).
   */
  async validateUser(identifier: string, password: string) {
    const isEmail = identifier.includes('@');
    const user = await this.prisma.user.findUnique({
      where: isEmail ? { email: identifier } : { phone: identifier },
    });
    if (!user) return null;

    const ok = await bcrypt.compare(password, user.password);
    return ok ? user : null;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email ?? '', role: user.role };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRATION'),
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
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
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

    const newPayload = {
      sub: user.id,
      email: user.email ?? '',
      role: user.role,
    };
    const newAccess = this.jwtService.sign(newPayload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRATION'),
    });
    const newRefresh = this.jwtService.sign(newPayload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRATION'),
    });

    const newHash = await bcrypt.hash(newRefresh, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newHash },
    });

    return { access_token: newAccess, refresh_token: newRefresh };
  }
}
