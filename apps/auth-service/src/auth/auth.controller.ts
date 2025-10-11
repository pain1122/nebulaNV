// apps/auth-service/src/auth/auth.controller.ts
import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Get,
  Put,
  Req,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { LogoutDto } from './dto/logout.dto';
import { Public, Roles } from '@nebula/grpc-auth';

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

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  // ---------- PUBLIC ----------
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    this.logger.log(`register() start email=${dto.email}`);
    const res = await this.authService.register(dto.email, dto.password);
    this.logger.log(`register() end -> id=${(res as any)?.id ?? 'n/a'}`);
    return res;
  }

  // ---------- PUBLIC ----------
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginUserDto) {
    this.logger.log(`login() start identifier=${dto.identifier}`);
    console.time('login.validateUser');
    const user = await this.authService.validateUser(dto.identifier, dto.password);
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
  @Public()
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

  @Roles('user', 'admin', 'root-admin')
  @HttpCode(HttpStatus.OK)
  @Get('me')
  getProfile(@Req() req: Request) {
    this.logger.log(`getProfile() for id=${req.user?.userId}`);
    return this.authService.getProfile(req.user!.userId);
  }

  @Roles('user', 'admin', 'root-admin')
  @HttpCode(HttpStatus.OK)
  @Put('me')
  updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    this.logger.log(`updateProfile() for id=${req.user?.userId}`);
    // Temporary: still pass AT for downstream gRPC until all callers use authAndS2S()
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    return this.authService.updateProfile(req.user!.userId, dto, token);
  }

  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @Get('admin-only')
  adminRoute(@Req() req: Request) {
    this.logger.log(`adminRoute() accessed by id=${req.user?.userId}`);
    return { message: 'Admin access granted', user: req.user };
  }
}
