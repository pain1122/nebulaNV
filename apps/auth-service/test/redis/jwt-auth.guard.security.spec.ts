import { Metadata, status } from '@grpc/grpc-js';
import { type ExecutionContext } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Reflector } from '@nestjs/core';
import {
  IS_PUBLIC_KEY,
  ROLES_KEY,
  type Role,
  type RpcContextWithContext,
} from '@nebula/grpc-auth';
import { JwtAuthGuard } from '../../src/auth/jwt/jwt-auth.guard';
import type {
  AuthTokenPayload,
  AuthenticatedRequest,
  MetadataWithAuthUser,
} from '../../src/auth/auth.types';
import type { AccessTokenValidationService } from '../../src/auth/token/access-token-validation.service';

type GuardFixture = {
  guard: JwtAuthGuard;
  accessTokens: {
    validate: jest.Mock;
  };
};

type GuardContextOptions = {
  req?: Partial<AuthenticatedRequest>;
  metadata?: Metadata;
  rpcContext?: RpcContextWithContext;
};

async function expectRpcException(
  action: () => Promise<unknown>,
  code: number,
  message?: string,
): Promise<void> {
  let thrown: unknown;

  try {
    await action();
  } catch (err) {
    thrown = err;
  }

  expect(thrown).toBeInstanceOf(RpcException);

  const error = (thrown as RpcException).getError();
  expect(error).toMatchObject({ code });

  if (message) {
    expect(error).toMatchObject({ message });
  }
}

function createGuard(options: {
  isPublic?: boolean;
  roles?: Role[];
}): GuardFixture {
  const accessTokens = {
    validate: jest.fn(),
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
      accessTokens as unknown as AccessTokenValidationService,
      reflector as unknown as Reflector,
    ),
    accessTokens,
  };
}

function makeContext({
  req,
  metadata,
  rpcContext,
}: GuardContextOptions): ExecutionContext {
  const context = rpcContext ?? {};
  return {
    getType: () => (metadata ? 'rpc' : 'http'),
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
  sid: 'session-1',
  jti: 'access-1',
  typ: 'access',
};

describe('JwtAuthGuard security behavior', () => {
  it('reads bearer tokens from gRPC metadata when there is no HTTP request', async () => {
    const { guard, accessTokens } = createGuard({ roles: ['user'] });
    accessTokens.validate.mockResolvedValue({
      valid: true,
      payload: validUserPayload,
      sessionRef: 'safe-session-reference',
    });

    const metadata = metadataWithBearer();
    const rpcContext: RpcContextWithContext = {};
    const context = makeContext({
      req: {},
      metadata,
      rpcContext,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((metadata as MetadataWithAuthUser).user).toEqual({
      userId: validUserPayload.sub,
      email: validUserPayload.email,
      role: validUserPayload.role,
      sessionRef: 'safe-session-reference',
    });
    expect(rpcContext.user).toEqual({
      userId: validUserPayload.sub,
      email: validUserPayload.email,
      role: validUserPayload.role,
      sessionRef: 'safe-session-reference',
    });
  });

  it('does not trust spoofed gRPC role metadata over the signed JWT payload', async () => {
    const { guard, accessTokens } = createGuard({ roles: ['admin'] });
    accessTokens.validate.mockResolvedValue({
      valid: true,
      payload: validUserPayload,
      sessionRef: 'safe-session-reference',
    });

    const metadata = metadataWithBearer();
    metadata.set('x-user-id', 'admin-1');
    metadata.set('x-role', 'admin');

    const context = makeContext({
      req: {},
      metadata,
      rpcContext: {},
    });

    await expectRpcException(
      () => guard.canActivate(context),
      status.PERMISSION_DENIED,
      'Insufficient role',
    );
    expect((metadata as MetadataWithAuthUser).user).toEqual({
      userId: validUserPayload.sub,
      email: validUserPayload.email,
      role: 'user',
      sessionRef: 'safe-session-reference',
    });
  });

  it('rejects tokens rejected by authoritative validation', async () => {
    const { guard, accessTokens } = createGuard({ roles: ['user'] });
    accessTokens.validate.mockResolvedValue({
      valid: false,
      reason: 'token_version_mismatch',
    });

    const metadata = metadataWithBearer();
    const context = makeContext({
      req: {},
      metadata,
      rpcContext: {},
    });

    await expectRpcException(
      () => guard.canActivate(context),
      status.UNAUTHENTICATED,
    );
    expect((metadata as MetadataWithAuthUser).user).toBeUndefined();
  });

  it('does not verify tokens for routes marked public', async () => {
    const { guard, accessTokens } = createGuard({ isPublic: true });
    const context = makeContext({});

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(accessTokens.validate).not.toHaveBeenCalled();
  });

  it('allows a valid admin token to satisfy admin role requirements', async () => {
    const { guard, accessTokens } = createGuard({ roles: ['admin'] });
    accessTokens.validate.mockResolvedValue({
      valid: true,
      payload: {
        sub: 'admin-1',
        email: 'admin@test.com',
        role: 'admin',
        tv: 1,
        sid: 'session-admin',
        jti: 'access-admin',
        typ: 'access',
      },
      sessionRef: 'safe-admin-session-reference',
    });

    const metadata = metadataWithBearer();
    const rpcContext: RpcContextWithContext = {};
    const context = makeContext({
      req: {},
      metadata,
      rpcContext,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(rpcContext.user).toEqual({
      userId: 'admin-1',
      email: 'admin@test.com',
      role: 'admin',
      sessionRef: 'safe-admin-session-reference',
    });
  });
});
