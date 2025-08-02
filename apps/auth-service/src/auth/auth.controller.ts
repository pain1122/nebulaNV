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
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

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
  constructor(private readonly authService: AuthService) {}

  /** Register a new user */
  @Public()
  @HttpCode(HttpStatus.CREATED) // 201
  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    // returns the newly created user record (sans password)
    return this.authService.register(dto.email, dto.password);
  }

  /** Login with email or phone */
  @Public()
  @HttpCode(HttpStatus.OK) // 200
  @Post('login')
  async login(@Body() dto: LoginUserDto) {
    const user = await this.authService.validateUser(
      dto.identifier,
      dto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // returns { access_token, refresh_token }
    return this.authService.login(user);
  }

  /** Rotate a refresh token */
  @Public()
  @HttpCode(HttpStatus.OK) // 200
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    try {
      return await this.authService.refreshTokens(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /** Fetch the current user's profile */
  @UseGuards(JwtAuthGuard)
  @Roles('user', 'admin', 'root-admin')
  @HttpCode(HttpStatus.OK)
  @Get('me')
  getProfile(@Req() req: Request) {
    return this.authService.getProfile(req.user!.userId);
  }

  /** Update current user's email/password */
  @UseGuards(JwtAuthGuard)
  @Roles('user', 'admin', 'root-admin')
  @HttpCode(HttpStatus.OK)
  @Put('me')
  updateProfile(
    @Req() req: Request,
    @Body() dto: UpdateProfileDto,
  ) {
    // pull the raw JWT out of the Authorization header
    const authHeader = req.headers.authorization || '';
    const token =
      authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

    return this.authService.updateProfile(
      req.user!.userId,
      dto,
      token,
    );
  }
  /** Example admin‑only route */
  @UseGuards(JwtAuthGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @Get('admin-only')
  adminRoute(@Req() req: Request) {
    return { message: 'Admin access granted', user: req.user };
  }
}
