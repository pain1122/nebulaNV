import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { UserService } from './user.service';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles('admin')
  @Get()
  async getAllUsers() {
    return this.userService.getAllUsers();
  }
  @Roles('user')
  @Put('me')
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(req.user!.userId, dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const requester = req.user;
    const isAdmin = requester?.role === 'admin';
    const isSelf = requester?.userId === id;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException('Access denied');
    }

    return this.userService.getUserById(id);
  }
}
