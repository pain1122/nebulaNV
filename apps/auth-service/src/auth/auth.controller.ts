// apps/auth-service/src/auth/auth.controller.ts
import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Get,
  Req,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import { Public, Roles, RoleAtLeast } from '@nebula/grpc-auth';

// Express typing for req.user (populated by GrpcTokenAuthGuard)
declare module 'express' {
  interface User {
    userId: string;
    email: string;
    role: string;
  }
  interface Request {
    user?: User;
  }
}

function extractBearer(header?: string): string | undefined {
  if (!header) return undefined;
  const parts = header.split(' ');
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
    return parts[1];
  }
  return undefined;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  // ---------- PUBLIC ----------
  @Public({ optionalAuth: true })
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    this.logger.log(`register() start email=${dto.email}`);
    const res = await this.authService.register(dto.email, dto.password);
    this.logger.log(`register() end -> id=${(res as any)?.id ?? 'n/a'}`);
    return res;
  }

  // ---------- PUBLIC ----------
  @Public({ optionalAuth: true })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginUserDto) {
    this.logger.log(`login() start identifier=${dto.identifier}`);
    console.time('login.validateUser');
    const user = await this.authService.validateUser(
      dto.identifier,
      dto.password,
    );
    console.timeEnd('login.validateUser');

    if (!user) {
      this.logger.warn(`login() failed for identifier=${dto.identifier}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    console.time('login.issueTokens');
    const res = await this.authService.login(user);
    console.timeEnd('login.issueTokens');

    this.logger.log(`login() success for id=${user.id}`);
    return res;
  }

  // ---------- PUBLIC ----------
  @Public({ optionalAuth: true })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    this.logger.log(`refresh() start`);
    try {
      const res = await this.authService.refreshTokens(dto.refreshToken);
      this.logger.log(`refresh() success`);
      return res;
    } catch {
      this.logger.warn(`refresh() failed`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ---------- AUTHENTICATED ----------
  @Roles('user', 'admin', 'root-admin')
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: Request, @Body() dto: LogoutDto) {
    await this.authService.logout({
      userId: req.user!.userId,
      refreshToken: dto.refreshToken,
      allDevices: !!dto.allDevices,
    });
    return { success: true };
  }

  @Get('me')
  @Roles('user','admin','root-admin')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: Request) {
    const token = extractBearer(req.headers.authorization);
    if (!token) throw new UnauthorizedException('Missing access token');
    return this.authService.getProfile(req.user!.userId, token, req.user!.userId);
  }
}
