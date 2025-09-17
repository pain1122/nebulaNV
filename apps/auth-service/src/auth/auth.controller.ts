import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
  Get,
  Put,
  Req,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { LogoutDto } from './dto/logout.dto';
import { Public, Roles } from '@nebula/grpc-auth';

// Extend Express Request with our User payload
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

  /** Register a new user */
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    this.logger.log(`register() start email=${dto.email}`);
    const res = await this.authService.register(dto.email, dto.password);
    this.logger.log(`register() end -> id=${(res as any)?.id ?? 'n/a'}`);
    return res; // already JSON-safe
  }

  /** Login with email or phone */
  @Public()
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

  @UseGuards(JwtAuthGuard)
  @Roles('user', 'admin', 'root-admin')
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: Request, @Body() dto: LogoutDto) {
    // If a refreshToken is provided → revoke that session
    // Else if allDevices → revoke all of the user's sessions
    // Else (default) → revoke all of the user's sessions on this device if you track deviceId,
    //     or just no-op with success for simplicity.
    await this.authService.logout({
      userId: req.user!.userId,
      refreshToken: dto.refreshToken,
      allDevices: !!dto.allDevices,
    });
    return { success: true };
  }

  /** Rotate a refresh token */
  @Public()
  @HttpCode(HttpStatus.OK) // 200
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

  /** Fetch the current user's profile */
  @UseGuards(JwtAuthGuard)
  @Roles('user', 'admin', 'root-admin')
  @HttpCode(HttpStatus.OK)
  @Get('me')
  getProfile(@Req() req: Request) {
    this.logger.log(`getProfile() for id=${req.user?.userId}`);
    return this.authService.getProfile(req.user!.userId);
  }

  /** Update current user's email/password */
  @UseGuards(JwtAuthGuard)
  @Roles('user', 'admin', 'root-admin')
  @HttpCode(HttpStatus.OK)
  @Put('me')
  updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    this.logger.log(`updateProfile() for id=${req.user?.userId}`);
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    return this.authService.updateProfile(req.user!.userId, dto, token);
  }

  /** Example admin-only route */
  @UseGuards(JwtAuthGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @Get('admin-only')
  adminRoute(@Req() req: Request) {
    this.logger.log(`adminRoute() accessed by id=${req.user?.userId}`);
    return { message: 'Admin access granted', user: req.user };
  }
}
