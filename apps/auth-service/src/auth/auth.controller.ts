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
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import { Public, Roles } from '@nebula/grpc-auth';
import type { AuthenticatedRequest } from './auth.types';

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
  constructor(private readonly authService: AuthService) {}

  // ---------- PUBLIC ----------
  @Public({ optionalAuth: true })
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto.email, dto.password);
  }

  // ---------- PUBLIC ----------
  @Public({ optionalAuth: true })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginUserDto) {
    const user = await this.authService.validateUser(
      dto.identifier,
      dto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.authService.login(user);
  }

  // ---------- PUBLIC ----------
  @Public({ optionalAuth: true })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    try {
      return await this.authService.refreshTokens(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ---------- AUTHENTICATED ----------
  @Roles('user', 'admin', 'root-admin')
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: AuthenticatedRequest, @Body() dto: LogoutDto) {
    await this.authService.logout({
      userId: req.user!.userId,
      refreshToken: dto.refreshToken,
      allDevices: !!dto.allDevices,
    });
    return { success: true };
  }

  @Get('me')
  @Roles('user', 'admin', 'root-admin')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: AuthenticatedRequest) {
    const token = extractBearer(req.headers.authorization);
    if (!token) throw new UnauthorizedException('Missing access token');
    return this.authService.getProfile(req.user!.userId, token);
  }
}
