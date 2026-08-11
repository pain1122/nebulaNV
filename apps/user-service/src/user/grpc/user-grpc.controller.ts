import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Metadata, status } from '@grpc/grpc-js';
import { userv1 } from '@nebula/protos';
import { UserService } from '../user.service';
import {
  Roles,
  toRpc,
  Public,
  InternalOnly,
  AllowedS2SCallers,
  resolveCtxUser,
  type CtxUser,
  type RpcContextWithContext,
} from '@nebula/grpc-auth';

@Controller()
export class UserGrpcController {
  constructor(private readonly users: UserService) {}

  private assertSelfOrAdmin(ctxUser: CtxUser | null, targetId: string): void {
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, 'Missing user context');
    const { userId, role } = ctxUser;
    if (role === 'admin' || role === 'root-admin') return;
    if (userId !== targetId)
      throw toRpc(
        status.PERMISSION_DENIED,
        'Access denied: not owner or admin',
      );
  }

  private verifiedCtxUser(
    meta: Metadata,
    call: RpcContextWithContext,
  ): CtxUser | null {
    return resolveCtxUser(meta, call);
  }

  @Roles('user', 'admin', 'root-admin')
  @GrpcMethod('UserService', 'GetUser')
  async getUser(
    data: userv1.GetUserRequest,
    meta: Metadata,
    call: RpcContextWithContext,
  ): Promise<userv1.UserResponse> {
    const ctxUser = this.verifiedCtxUser(meta, call);
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
  @GrpcMethod('UserService', 'ListUsers')
  async listUsers(
    _data: userv1.ListUsersRequest,
    meta: Metadata,
    call: RpcContextWithContext,
  ): Promise<userv1.ListUsersResponse> {
    const ctxUser = this.verifiedCtxUser(meta, call);
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, 'Missing user context');
    if (ctxUser.role !== 'admin' && ctxUser.role !== 'root-admin') {
      throw toRpc(status.PERMISSION_DENIED, 'admin_only');
    }

    const users = await this.users.getAllUsers({ role: ctxUser.role });
    return userv1.ListUsersResponse.create({
      users: users.map((user) =>
        userv1.UserListItem.create({
          id: user.id,
          email: user.email ?? '',
          phone: user.phone ?? '',
          role: user.role,
          createdAt: user.createdAt.toISOString(),
        }),
      ),
    });
  }

  @Roles('admin', 'root-admin')
  @GrpcMethod('UserService', 'FindUser')
  async findUser(
    data: userv1.FindUserRequest,
    meta: Metadata,
    call: RpcContextWithContext,
  ) {
    const ctxUser = this.verifiedCtxUser(meta, call);
    const isAdmin = ctxUser?.role === 'admin' || ctxUser?.role === 'root-admin';

    if (!isAdmin) throw toRpc(status.PERMISSION_DENIED, 'admin_only');

    const u = data.email
      ? await this.users.getUserByEmail(data.email)
      : data.phone
        ? await this.users.getUserByPhone(data.phone)
        : null;

    if (!u) throw toRpc(status.NOT_FOUND, 'User not found');
    return userv1.UserResponse.create({
      id: u.id,
      email: u.email ?? '',
      role: u.role,
    });
  }

  @Roles('user', 'admin', 'root-admin')
  @GrpcMethod('UserService', 'UpdateProfile')
  async updateProfile(
    data: userv1.UpdateProfileRequest,
    meta: Metadata,
    call: RpcContextWithContext,
  ): Promise<userv1.UserResponse> {
    const ctxUser = this.verifiedCtxUser(meta, call);
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

  // Called only by auth-service registration. The signed body is the target;
  // registration never accepts a caller-provided administrative role.
  @Public()
  @InternalOnly()
  @AllowedS2SCallers('auth-service')
  @GrpcMethod('UserService', 'CreateUser')
  async createUser(data: userv1.CreateUserRequest) {
    const u = await this.users.createUserWithHash(
      data.email,
      data.password,
      'user',
    );
    return userv1.UserResponse.create({
      id: u.id,
      email: u.email ?? '',
      role: u.role,
    });
  }

  // Internal auth flows (no JWT required; S2S is enough)
  @Public()
  @InternalOnly()
  @AllowedS2SCallers('auth-service')
  @GrpcMethod('UserService', 'FindUserWithHash')
  async findUserWithHash(
    data: userv1.FindUserWithHashRequest,
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
      });
    }

    return userv1.FindUserWithHashResponse.create({
      id: u.id,
      email: u.email ?? '',
      role: u.role,
      passwordHash: u.password,
    });
  }

  @Public()
  @InternalOnly()
  @AllowedS2SCallers('auth-service')
  @GrpcMethod('UserService', 'GetUserWithHash')
  async getUserWithHash(
    data: userv1.GetUserWithHashRequest,
  ): Promise<userv1.GetUserWithHashResponse> {
    const u = await this.users.getUserById(data.id);
    if (!u) {
      return userv1.GetUserWithHashResponse.create({
        id: '',
        email: '',
        role: 'user',
        passwordHash: '',
      });
    }

    return userv1.GetUserWithHashResponse.create({
      id: u.id,
      email: u.email ?? '',
      role: u.role,
      passwordHash: u.password,
    });
  }
}
