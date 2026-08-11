import 'reflect-metadata';
import { Metadata, status } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { authv1 } from '@nebula/protos';
import {
  ALLOWED_S2S_CALLERS_KEY,
  ALLOWED_S2S_IDENTITIES_KEY,
  INTERNAL_ONLY_KEY,
  IS_PUBLIC_KEY,
  PUBLIC_FLAGS_KEY,
  ROLES_KEY,
  type RpcContextWithContext,
} from '@nebula/grpc-auth';
import { AuthService } from '../../src/auth/auth.service';
import { AuthGrpcController } from '../../src/auth/grpc/grpc-auth.controller';
import { GrpcAuthService } from '../../src/auth/grpc/grpc-auth.service';
import { AccessTokenValidationService } from '../../src/auth/token/access-token-validation.service';

async function rpcError(promise: Promise<unknown>) {
  try {
    await promise;
    throw new Error('expected_rpc_error');
  } catch (error) {
    if (!(error instanceof RpcException)) throw error;
    return error.getError() as { code: number; message: string };
  }
}

describe('AuthGrpcController additive gateway contracts', () => {
  const register = jest.fn();
  const logout = jest.fn();
  const validate = jest.fn();
  let controller: AuthGrpcController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthGrpcController(
      { register, logout } as unknown as AuthService,
      {} as GrpcAuthService,
      { validate } as unknown as AccessTokenValidationService,
    );
  });

  it('keeps Register public-to-gateway while Logout remains user-authenticated gateway-only', () => {
    const registerHandler = AuthGrpcController.prototype.register;
    const logoutHandler = AuthGrpcController.prototype.logout;

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, registerHandler)).toBe(true);
    expect(Reflect.getMetadata(PUBLIC_FLAGS_KEY, registerHandler)).toEqual({
      gatewayOnly: true,
    });
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, logoutHandler)).toBeUndefined();
    expect(Reflect.getMetadata(PUBLIC_FLAGS_KEY, logoutHandler)).toEqual({
      gatewayOnly: true,
    });
    expect(Reflect.getMetadata(ROLES_KEY, logoutHandler)).toEqual([
      'user',
      'admin',
      'root-admin',
    ]);
  });

  it('gives only ValidateToken the exact mixed gateway and approved-service policy', () => {
    const validateTokenHandler = AuthGrpcController.prototype.validateToken;

    expect(
      Reflect.getMetadata(INTERNAL_ONLY_KEY, validateTokenHandler),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(ALLOWED_S2S_CALLERS_KEY, validateTokenHandler),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(ALLOWED_S2S_IDENTITIES_KEY, validateTokenHandler),
    ).toEqual([
      { kind: 'gateway', caller: 'gateway' },
      { kind: 'service', caller: 'auth-service' },
      { kind: 'service', caller: 'user-service' },
      { kind: 'service', caller: 'settings-service' },
      { kind: 'service', caller: 'blog-service' },
      { kind: 'service', caller: 'product-service' },
      { kind: 'service', caller: 'media-service' },
      { kind: 'service', caller: 'taxonomy-service' },
      { kind: 'service', caller: 'order-service' },
    ]);

    expect(
      Reflect.getMetadata(
        ALLOWED_S2S_IDENTITIES_KEY,
        AuthGrpcController.prototype.register,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        ALLOWED_S2S_IDENTITIES_KEY,
        AuthGrpcController.prototype.logout,
      ),
    ).toBeUndefined();
  });

  it('registers through auth-service ownership and maps its public response', async () => {
    register.mockResolvedValue({
      id: 'user-1',
      email: 'new@example.com',
      role: 'user',
    });

    await expect(
      controller.register(
        authv1.RegisterRequest.create({
          email: ' NEW@example.com ',
          password: 'secret-password',
        }),
      ),
    ).resolves.toEqual(
      authv1.RegisterResponse.create({
        id: 'user-1',
        email: 'new@example.com',
        role: 'user',
      }),
    );
    expect(register).toHaveBeenCalledWith('NEW@example.com', 'secret-password');
  });

  it.each([
    [{ email: 'not-an-email', password: 'secret-password' }, 'email'],
    [{ email: 'new@example.com', password: 'short' }, 'password'],
  ])('rejects invalid Register %s', async (input, field) => {
    const error = await rpcError(
      controller.register(authv1.RegisterRequest.create(input)),
    );
    expect(error).toEqual({
      code: status.INVALID_ARGUMENT,
      message: `validation_failed:${field}`,
    });
    expect(register).not.toHaveBeenCalled();
  });

  it('derives Logout user and session exclusively from the validated bearer', async () => {
    validate.mockResolvedValue({
      valid: true,
      payload: {
        sub: 'verified-user',
        email: 'verified@example.com',
        role: 'user',
        tv: 1,
        sid: 'verified-session',
        jti: 'access-token-id',
        typ: 'access',
      },
      sessionRef: 'verified-session-reference',
    });
    logout.mockResolvedValue(undefined);
    const metadata = new Metadata();
    metadata.set('authorization', 'Bearer verified-access-token');
    const call: RpcContextWithContext = {
      user: {
        userId: 'verified-user',
        role: 'user',
        sessionRef: 'verified-session-reference',
      },
    };

    await expect(
      controller.logout(
        authv1.LogoutRequest.create({
          allDevices: false,
          refreshToken: 'matching-refresh-token',
        }),
        metadata,
        call,
      ),
    ).resolves.toEqual(authv1.LogoutResponse.create({ success: true }));
    expect(logout).toHaveBeenCalledWith({
      userId: 'verified-user',
      sessionId: 'verified-session',
      refreshToken: 'matching-refresh-token',
      allDevices: false,
    });
  });

  it('rejects missing bearer and actor/session disagreement before revocation', async () => {
    const context: RpcContextWithContext = {
      user: {
        userId: 'different-user',
        role: 'user',
        sessionRef: 'different-session-reference',
      },
    };
    expect(
      (
        await rpcError(
          controller.logout(
            authv1.LogoutRequest.create(),
            new Metadata(),
            context,
          ),
        )
      ).message,
    ).toBe('missing_bearer');

    validate.mockResolvedValue({
      valid: true,
      payload: {
        sub: 'verified-user',
        email: 'verified@example.com',
        role: 'user',
        tv: 1,
        sid: 'verified-session',
        jti: 'access-token-id',
        typ: 'access',
      },
      sessionRef: 'verified-session-reference',
    });
    const metadata = new Metadata();
    metadata.set('authorization', 'Bearer verified-access-token');
    const mismatch = await rpcError(
      controller.logout(authv1.LogoutRequest.create(), metadata, context),
    );
    expect(mismatch).toEqual({
      code: status.UNAUTHENTICATED,
      message: 'actor_session_mismatch',
    });
    expect(logout).not.toHaveBeenCalled();
  });
});
