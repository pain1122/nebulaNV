import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Metadata, status } from '@grpc/grpc-js';
import { userv1 } from '@nebula/protos';
import { UserService } from '../user.service';
import {
  Roles,
  RequireUserId,
  toRpc,
  resolveCtxUser,
  Public,              
} from '@nebula/grpc-auth';

@Controller()
export class UserGrpcController {
  constructor(private readonly users: UserService) {}

  private assertSelfOrAdmin(ctxUser: any, targetId: string): void {
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, 'Missing user context');
    const { userId, role } = ctxUser;
    if (role === 'admin' || role === 'root-admin') return;
    if (userId !== targetId)
      throw toRpc(status.PERMISSION_DENIED, 'Access denied: not owner or admin');
  }

  @Roles('user', 'admin', 'root-admin')
  @GrpcMethod('UserService', 'GetUser')
  async getUser(
    data: userv1.GetUserRequest,
    meta: Metadata,
    call: any
  ): Promise<userv1.UserResponse> {
    const ctxUser = resolveCtxUser(meta, call);
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, 'Missing user context');
    this.assertSelfOrAdmin(ctxUser, data.id);

    const u = await this.users.getUserById(data.id);
    if (!u) throw toRpc(status.NOT_FOUND, 'User not found');

    return userv1.UserResponse.create({
      id: u.id,
      email: u.email ?? '',
      role: u.role,
    });
  }

  @Roles('admin', 'root-admin')
  @GrpcMethod('UserService', 'FindUser')
  async findUser(
    data: userv1.FindUserRequest,
    meta: Metadata,
    call: any
  ) {
    const role =
      call?.user?.role ??
      (meta as any)?.user?.role ??
      (meta.get?.('x-user-role')?.[0] as string | undefined) ?? '';
    const isAdmin = role === 'admin' || role === 'root-admin';
    if (!isAdmin) throw toRpc(status.PERMISSION_DENIED, 'admin_only');

    const u = data.email
      ? await this.users.getUserByEmail(data.email)
      : data.phone
      ? await this.users.getUserByPhone(data.phone)
      : null;

    if (!u) throw toRpc(status.NOT_FOUND, 'User not found');
    return userv1.UserResponse.create({ id: u.id, email: u.email ?? '', role: u.role });
  }

  @Roles('user', 'admin', 'root-admin')
  @GrpcMethod('UserService', 'UpdateProfile')
  async updateProfile(
    data: userv1.UpdateProfileRequest,
    meta: Metadata,
    call: any
  ): Promise<userv1.UserResponse> {
    const ctxUser = resolveCtxUser(meta, call);
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, 'Missing user context');
    this.assertSelfOrAdmin(ctxUser, data.id);

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

  // Called by auth-service.register → internal (S2S) and must carry a user id
  @Public({ gatewayOnly: true })            
  @RequireUserId()                          
  @GrpcMethod('UserService', 'CreateUser')
  async createUser(
    data: userv1.CreateUserRequest,
    meta: Metadata,
    call: any
  ) {
    const ctxUser = resolveCtxUser(meta, call);
    const isAdmin = ['admin', 'root-admin'].includes(ctxUser?.role ?? '');
    const role = isAdmin && data.role ? data.role : 'user';
    const u = await this.users.createUserWithHash(data.email, data.password, role);
    return userv1.UserResponse.create({ id: u.id, email: u.email ?? '', role: u.role });
  }

  // Internal auth flows (no JWT required; S2S is enough)
  @Public({ gatewayOnly: true })            
  @GrpcMethod('UserService', 'FindUserWithHash')
  async findUserWithHash(
    data: userv1.FindUserWithHashRequest
  ): Promise<userv1.FindUserWithHashResponse> {
    const u = data.email
      ? await this.users.getUserByEmail(data.email)
      : data.phone
      ? await this.users.getUserByPhone(data.phone)
      : null;

    if (!u) {
      return userv1.FindUserWithHashResponse.create({
        id: '',
        email: '',
        role: 'user',
        passwordHash: '',
        refreshToken: '',
      });
    }

    return userv1.FindUserWithHashResponse.create({
      id: u.id,
      email: u.email ?? '',
      role: u.role,
      passwordHash: u.password,
      refreshToken: u.refreshToken ?? '',
    });
  }

  @Public({ gatewayOnly: true })            
  @RequireUserId()
  @GrpcMethod('UserService', 'SetRefreshToken')
  async setRefreshToken(
    data: userv1.SetRefreshTokenRequest
  ): Promise<userv1.UserResponse> {
    const u = await this.users.setRefreshToken(data.userId, data.refreshToken);
    return userv1.UserResponse.create({ id: u.id, email: u.email ?? '', role: u.role });
  }

  @Public({ gatewayOnly: true })            
  @RequireUserId()
  @GrpcMethod('UserService', 'GetUserWithHash')
  async getUserWithHash(
    data: userv1.GetUserWithHashRequest
  ): Promise<userv1.GetUserWithHashResponse> {
    const u = await this.users.getUserById(data.id);
    if (!u) {
      return userv1.GetUserWithHashResponse.create({
        id: '',
        email: '',
        role: 'user',
        passwordHash: '',
        refreshToken: '',
      });
    }

    return userv1.GetUserWithHashResponse.create({
      id: u.id,
      email: u.email ?? '',
      role: u.role,
      passwordHash: u.password,
      refreshToken: u.refreshToken ?? '',
    });
  }
}
