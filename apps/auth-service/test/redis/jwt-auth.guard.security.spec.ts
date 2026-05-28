import { Metadata } from '@grpc/grpc-js';
import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY, ROLES_KEY, type Role } from '@nebula/grpc-auth';
import { JwtAuthGuard } from '../../src/auth/jwt/jwt-auth.guard';
import type {
  AuthTokenPayload,
  AuthenticatedRequest,
  MetadataWithAuthUser,
  RpcContextWithAuthUser,
} from '../../src/auth/auth.types';

type GuardFixture = {
  guard: JwtAuthGuard;
  jwtService: {
    verify: jest.Mock<unknown, [string, { secret?: string }]>;
  };
};

type GuardContextOptions = {
  req?: Partial<AuthenticatedRequest>;
  metadata?: Metadata;
  rpcContext?: RpcContextWithAuthUser;
};

function createGuard(options: {
  isPublic?: boolean;
  roles?: Role[];
}): GuardFixture {
  const jwtService = {
    verify: jest.fn<unknown, [string, { secret?: string }]>(),
  };
  const configService = {
    get: jest.fn().mockReturnValue('access-secret'),
  };
  const reflector = {
    getAllAndOverride: jest.fn((key: unknown) => {
      if (key === IS_PUBLIC_KEY) return options.isPublic ?? false;
      if (key === ROLES_KEY) return options.roles ?? [];
      return undefined;
    }),
  };

  return {
    guard: new JwtAuthGuard(
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      reflector as unknown as Reflector,
    ),
    jwtService,
  };
}

function makeContext({
  req,
  metadata,
  rpcContext,
}: GuardContextOptions): ExecutionContext {
  const context = rpcContext ?? {};
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    getArgByIndex: (index: number) => (index === 1 ? metadata : undefined),
    switchToRpc: () => ({
      getContext: () => context,
    }),
  } as unknown as ExecutionContext;
}

function metadataWithBearer(token = 'access-token'): Metadata {
  const metadata = new Metadata();
  metadata.set('authorization', `Bearer ${token}`);
  return metadata;
}

const validUserPayload: AuthTokenPayload = {
  sub: 'user-1',
  email: 'user@test.com',
  role: 'user',
  tv: 1,
};

describe('JwtAuthGuard security behavior', () => {
  it('reads bearer tokens from gRPC metadata when there is no HTTP request', () => {
    const { guard, jwtService } = createGuard({ roles: ['user'] });
    jwtService.verify.mockReturnValue(validUserPayload);

    const metadata = metadataWithBearer();
    const rpcContext: RpcContextWithAuthUser = {};
    const context = makeContext({
      req: {},
      metadata,
      rpcContext,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect((metadata as MetadataWithAuthUser).user).toEqual({
      userId: validUserPayload.sub,
      email: validUserPayload.email,
      role: validUserPayload.role,
    });
    expect(rpcContext.user).toEqual({
      userId: validUserPayload.sub,
      email: validUserPayload.email,
      role: validUserPayload.role,
    });
  });

  it('does not trust spoofed gRPC role metadata over the signed JWT payload', () => {
    const { guard, jwtService } = createGuard({ roles: ['admin'] });
    jwtService.verify.mockReturnValue(validUserPayload);

    const metadata = metadataWithBearer();
    metadata.set('x-user-id', 'admin-1');
    metadata.set('x-role', 'admin');

    const context = makeContext({
      req: {},
      metadata,
      rpcContext: {},
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect((metadata as MetadataWithAuthUser).user).toEqual({
      userId: validUserPayload.sub,
      email: validUserPayload.email,
      role: 'user',
    });
  });

  it('rejects signed tokens with missing auth payload fields', () => {
    const { guard, jwtService } = createGuard({ roles: ['user'] });
    jwtService.verify.mockReturnValue({ sub: 'user-1' });

    const metadata = metadataWithBearer();
    const context = makeContext({
      req: {},
      metadata,
      rpcContext: {},
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect((metadata as MetadataWithAuthUser).user).toBeUndefined();
  });

  it('does not verify tokens for routes marked public', () => {
    const { guard, jwtService } = createGuard({ isPublic: true });
    const context = makeContext({});

    expect(guard.canActivate(context)).toBe(true);
    expect(jwtService.verify).not.toHaveBeenCalled();
  });
});
