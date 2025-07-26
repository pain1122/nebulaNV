import {
  Body,
  Controller,
  Post,
  Put,
  UnauthorizedException,
  UseGuards,
  Get,
  Req,
} from '@nestjs/common';
import 'express';
import { AuthService } from './auth.service';
import { Request } from 'express';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../common/decorators/public.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';


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

  @Public()
  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto.email, dto.password);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginUserDto) {
    const user = await this.authService.validateUser(dto.identifier, dto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    return this.authService.login(user);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    try {
      return await this.authService.refreshTokens(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Roles('user','admin','root-admin')
  @Get('me')
  getProfile(@Req() req: Request) {
    return this.authService.getUserById(req.user!.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Roles('admin')
  @Get('admin-only')
  adminRoute(@Req() req: Request) {
    return { message: 'Admin access granted', user: req.user };
  }
}
