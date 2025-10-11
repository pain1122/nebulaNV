import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { userv1 } from '@nebula/protos';
import { UserService } from '../user.service';
import { Public, Roles } from '@nebula/grpc-auth';

const Pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

@Controller()
export class UserGrpcController {
  constructor(private readonly users: UserService) {}

  // ------------------------------------------------------
  // CreateUser (admin-only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles('admin', 'root-admin')
  @GrpcMethod('UserService', 'CreateUser')
  async createUser(
    data: userv1.CreateUserRequest,
  ): Promise<userv1.UserResponse> {
    console.log('[UserService] CreateUser RPC received', data.email);
    const allowedRoles = ['user', 'admin', 'root-admin'];
    const role = allowedRoles.includes(data.role) ? data.role : 'user';

    const u = await this.users.createUserWithHash(
      data.email,
      data.password, // already hashed
      role,
    );
    return userv1.UserResponse.create({
      id: u.id,
      email: u.email ?? '',
      role: u.role,
    });
  }

  // ------------------------------------------------------
  // GetUser (admin-only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles('admin', 'root-admin')
  @GrpcMethod('UserService', 'GetUser')
  async getUser(
    data: userv1.GetUserRequest,
  ): Promise<userv1.UserResponse> {
    const u = await this.users.getUserById(data.id);
    if (!u)
      return userv1.UserResponse.create({ id: '', email: '', role: 'user' });
    return userv1.UserResponse.create({
      id: u.id,
      email: u.email ?? '',
      role: u.role,
    });
  }

  // ------------------------------------------------------
  // FindUser (admin-only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles('admin', 'root-admin')
  @GrpcMethod('UserService', 'FindUser')
  async findUser(
    data: userv1.FindUserRequest,
  ): Promise<userv1.UserResponse> {
    let u = null;
    if (data.email) u = await this.users.getUserByEmail(data.email);
    else if (data.phone) u = await this.users.getUserByPhone(data.phone);

    if (!u)
      return userv1.UserResponse.create({ id: '', email: '', role: 'user' });

    return userv1.UserResponse.create({
      id: u.id,
      email: u.email ?? '',
      role: u.role,
    });
  }

  // ------------------------------------------------------
  // UpdateProfile (admin-only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles('admin', 'root-admin')
  @GrpcMethod('UserService', 'UpdateProfile')
  async updateProfile(
    data: userv1.UpdateProfileRequest,
  ): Promise<userv1.UserResponse> {
    const updated = await this.users.updateProfile(data.id, {
      email: data.email || undefined,
      currentPassword: data.currentPassword || undefined,
      newPassword: data.newPassword || undefined,
    });
    return userv1.UserResponse.create({
      id: updated.id,
      email: updated.email ?? '',
      role: updated.role,
    });
  }

  // ------------------------------------------------------
  // GetUserWithHash (admin-only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles('admin', 'root-admin')
  @GrpcMethod('UserService', 'GetUserWithHash')
  async getUserWithHash(
    data: userv1.GetUserWithHashRequest,
  ): Promise<userv1.GetUserWithHashResponse> {
    const u = await this.users.getUserById(data.id);
    if (!u)
      return userv1.GetUserWithHashResponse.create({
        id: '', email: '', role: 'user', passwordHash: '', refreshToken: '',
      });
    return userv1.GetUserWithHashResponse.create({
      id: u.id,
      email: u.email ?? '',
      role: u.role,
      passwordHash: u.password,
      refreshToken: u.refreshToken ?? '',
    });
  }

  // ------------------------------------------------------
  // Internal (auth-service only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles('admin', 'root-admin')
  @GrpcMethod('UserService', 'FindUserWithHash')
  async findUserWithHash(
    data: userv1.FindUserWithHashRequest,
  ): Promise<userv1.FindUserWithHashResponse> {
    const u = data.email
      ? await this.users.getUserByEmail(data.email)
      : data.phone
      ? await this.users.getUserByPhone(data.phone)
      : null;

    if (!u)
      return userv1.FindUserWithHashResponse.create({
        id: '', email: '', role: 'user', passwordHash: '', refreshToken: '',
      });

    return userv1.FindUserWithHashResponse.create({
      id: u.id,
      email: u.email ?? '',
      role: u.role,
      passwordHash: u.password,
      refreshToken: u.refreshToken ?? '',
    });
  }

  @UsePipes(Pipe)
  @Roles('admin', 'root-admin')
  @GrpcMethod('UserService', 'SetRefreshToken')
  async setRefreshToken(
    data: userv1.SetRefreshTokenRequest,
  ): Promise<userv1.UserResponse> {
    const u = await this.users.setRefreshToken(data.userId, data.refreshToken);
    return userv1.UserResponse.create({
      id: u.id,
      email: u.email ?? '',
      role: u.role,
    });
  }
}
