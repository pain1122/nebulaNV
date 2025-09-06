import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { Roles } from '@nebula/grpc-auth';
import { UserService } from './user.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ReqUser, ReqUser as ReqUserType } from '../common/decorators/req-user.decorator';


@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles('admin')
  @Get()
  async getAllUsers() {
    return this.userService.getAllUsers();
  }
  @Put('me')
  @Roles('user', 'admin', 'root-admin')
  updateProfile(@ReqUser() user: ReqUserType, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(user.userId, dto);
  }

  @Get(':id')
  @Roles('user', 'admin', 'root-admin')
  async findOne(@Param('id') id: string, @ReqUser() user: ReqUserType) {
    const isAdmin = user.role === 'admin' || user.role === 'root-admin';
    if (user.userId !== id && !isAdmin)
      throw new ForbiddenException('Access denied');
    return this.userService.getUserById(id);
  }
}
