import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { Metadata, status } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { userv1 } from '@nebula/protos';
import {
  IS_PUBLIC_KEY,
  ROLES_KEY,
  type RpcContextWithContext,
} from '@nebula/grpc-auth';
import { PrismaService } from '../src/prisma.service';
import { UserGrpcController } from '../src/user/grpc/user-grpc.controller';
import { UserService } from '../src/user/user.service';

async function rpcError(promise: Promise<unknown>) {
  try {
    await promise;
    throw new Error('expected_rpc_error');
  } catch (error) {
    if (!(error instanceof RpcException)) throw error;
    return error.getError() as { code: number; message: string };
  }
}

describe('User ListUsers contract', () => {
  const getAllUsers = jest.fn();
  const controller = new UserGrpcController({
    getAllUsers,
  } as unknown as UserService);

  beforeEach(() => jest.clearAllMocks());

  it('is private and restricted to admin roles', () => {
    const handler: unknown = Object.getOwnPropertyDescriptor(
      UserGrpcController.prototype,
      'listUsers',
    )?.value;
    if (typeof handler !== 'function') throw new Error('missing_list_handler');
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
      'admin',
      'root-admin',
    ]);
  });

  it('maps only the existing admin-list projection', async () => {
    const createdAt = new Date('2026-08-11T10:00:00.000Z');
    getAllUsers.mockResolvedValue([
      {
        id: 'user-1',
        email: 'user@example.com',
        phone: null,
        role: 'user',
        createdAt,
      },
    ]);
    const call: RpcContextWithContext = {
      user: { userId: 'admin-1', role: 'admin' },
    };

    await expect(
      controller.listUsers(
        userv1.ListUsersRequest.create(),
        new Metadata(),
        call,
      ),
    ).resolves.toEqual(
      userv1.ListUsersResponse.create({
        users: [
          userv1.UserListItem.create({
            id: 'user-1',
            email: 'user@example.com',
            phone: '',
            role: 'user',
            createdAt: createdAt.toISOString(),
          }),
        ],
      }),
    );
    expect(getAllUsers).toHaveBeenCalledWith({ role: 'admin' });
  });

  it.each([
    [undefined, status.UNAUTHENTICATED, 'Missing user context'],
    [
      { userId: 'user-1', role: 'user' },
      status.PERMISSION_DENIED,
      'admin_only',
    ],
  ] as const)('rejects a non-admin actor', async (user, code, message) => {
    const error = await rpcError(
      controller.listUsers(userv1.ListUsersRequest.create(), new Metadata(), {
        user,
      } as RpcContextWithContext),
    );
    expect(error).toEqual({ code, message });
    expect(getAllUsers).not.toHaveBeenCalled();
  });

  it('keeps the service-layer query limited to non-secret list fields', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new UserService({
      user: { findMany },
    } as unknown as PrismaService);

    await expect(service.getAllUsers({ role: 'root-admin' })).resolves.toEqual(
      [],
    );
    expect(findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
  });

  it('keeps service-layer admin enforcement', async () => {
    const service = new UserService({} as PrismaService);
    await expect(service.getAllUsers({ role: 'user' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
