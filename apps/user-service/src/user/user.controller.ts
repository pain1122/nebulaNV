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
  @Roles('user','admin','root-admin')
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: Request
  ) {
    // only allow admins or the owner
    if (req.user!.userId !== id && req.user!.role !== 'admin') {
      throw new ForbiddenException('Access denied');
    }
    return this.userService.getUserById(id);
  }
  @UseGuards(JwtAuthGuard)
  @Roles('user','admin','root-admin')
  @Put('me')
  updateProfile(
    @Req() req: Request,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(req.user!.userId, dto);
  }
}
