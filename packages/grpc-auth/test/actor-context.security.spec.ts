import "reflect-metadata";
import { type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Metadata, status } from "@grpc/grpc-js";
import type { ClientGrpc } from "@nestjs/microservices";
import { of } from "rxjs";
import { GrpcTokenAuthGuard } from "../src/grpc-token-auth.guard";
import {
  IS_PUBLIC_KEY,
  PUBLIC_FLAGS_KEY,
  REQUIRE_USER_ID_KEY,
} from "../src/public.decorator";
import { ROLES_KEY, type Role } from "../src/roles.decorator";
import { resolveCtxUser } from "../src/metadata";
import type {
  GrpcServerCallWithContext,
  HttpRequestWithContext,
  MetadataWithContext,
} from "../src/context";

type RoutePolicy = {
  public?: boolean;
  gatewayOnly?: boolean;
  requireUser?: boolean;
  roles?: Role[];
};

function rpcContext(
  metadata: MetadataWithContext,
  call: GrpcServerCallWithContext,
  policy: RoutePolicy = {},
): ExecutionContext {
  const handler = () => undefined;
  Reflect.defineMetadata(IS_PUBLIC_KEY, policy.public ?? false, handler);
  Reflect.defineMetadata(
    PUBLIC_FLAGS_KEY,
    { gatewayOnly: policy.gatewayOnly ?? false },
    handler,
  );
  Reflect.defineMetadata(
    REQUIRE_USER_ID_KEY,
    policy.requireUser ?? false,
    handler,
  );
  Reflect.defineMetadata(ROLES_KEY, policy.roles ?? [], handler);

  return {
    getType: () => "rpc",
    getClass: () => class TestController {},
    getHandler: () => handler,
    getArgByIndex: (index: number) =>
      index === 1 ? metadata : index === 2 ? call : undefined,
    switchToHttp: () => ({ getRequest: () => undefined }),
    switchToRpc: () => ({ getContext: () => call }),
  } as unknown as ExecutionContext;
}

function createGuard(validateToken = jest.fn()) {
  process.env.PUBLIC_MODE = "GATEWAY_ONLY";
  process.env.NODE_ENV = "production";
  process.env.SVC_NAME = "test-service";
  process.env.S2S_OUTBOUND_KEYS = JSON.stringify({
    "auth-service": {
      id: "test-auth-v1",
      secret: "test-only-auth-service-edge-secret-000001",
    },
  });
  delete process.env.JWT_ACCESS_SECRET;

  const client = {
    getService: () => ({ validateToken }),
  } as unknown as ClientGrpc;
  const guard = new GrpcTokenAuthGuard(client, new Reflector());
  guard.onModuleInit();
  return guard;
}

function httpContext(
  request: HttpRequestWithContext,
  policy: RoutePolicy = {},
): ExecutionContext {
  const handler = () => undefined;
  Reflect.defineMetadata(IS_PUBLIC_KEY, policy.public ?? false, handler);
  Reflect.defineMetadata(
    PUBLIC_FLAGS_KEY,
    { gatewayOnly: policy.gatewayOnly ?? false },
    handler,
  );
  Reflect.defineMetadata(
    REQUIRE_USER_ID_KEY,
    policy.requireUser ?? false,
    handler,
  );
  Reflect.defineMetadata(ROLES_KEY, policy.roles ?? [], handler);

  return {
    getType: () => "http",
    getClass: () => class TestController {},
    getHandler: () => handler,
    getArgByIndex: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
    switchToRpc: () => ({ getContext: () => undefined }),
  } as unknown as ExecutionContext;
}

describe("verified actor context", () => {
  it("does not resolve raw identity metadata as a user", () => {
    const metadata = new Metadata() as MetadataWithContext;
    metadata.set("x-user-id", "forged-user");
    metadata.set("x-user-role", "root-admin");

    expect(resolveCtxUser(metadata)).toBeNull();
  });

  it("rejects raw x-user-id on a gateway-only user-required route", async () => {
    const metadata = new Metadata() as MetadataWithContext;
    metadata.svc = "web-gateway";
    metadata.svcKind = "gateway";
    metadata.set("x-user-id", "forged-user");
    metadata.set("x-user-role", "root-admin");
    const call = {} as GrpcServerCallWithContext;
    const guard = createGuard();

    const activation = guard.canActivate(
      rpcContext(metadata, call, {
        public: true,
        gatewayOnly: true,
        requireUser: true,
      }),
    );

    await expect(activation).rejects.toMatchObject({
      error: expect.objectContaining({
        code: status.UNAUTHENTICATED,
        message: "missing_user_id",
      }),
    });
    expect(resolveCtxUser(metadata, call)).toBeNull();
  });

  it("rejects raw HTTP actor headers without a verified user", async () => {
    const request: HttpRequestWithContext = {
      svc: "web-gateway",
      svcKind: "gateway",
      headers: {
        "x-user-id": "forged-user",
        "x-user-role": "root-admin",
      },
    };
    const guard = createGuard();

    await expect(
      guard.canActivate(
        httpContext(request, {
          public: true,
          gatewayOnly: true,
          requireUser: true,
        }),
      ),
    ).rejects.toMatchObject({ message: "missing_user_id" });
    expect(request.user).toEqual({ userId: null, role: "guest" });
  });

  it("uses auth-service validation instead of conflicting raw metadata", async () => {
    const validateToken = jest.fn().mockReturnValue(
      of({
        isValid: true,
        userId: "verified-user",
        email: "verified@example.test",
        role: "admin",
        sessionRef: "safe-session-reference",
      }),
    );
    const guard = createGuard(validateToken);
    const metadata = new Metadata() as MetadataWithContext;
    metadata.svc = "web-gateway";
    metadata.svcKind = "gateway";
    metadata.set("authorization", "Bearer signed-access-token");
    metadata.set("x-user-id", "forged-user");
    metadata.set("x-user-role", "root-admin");
    const call = {} as GrpcServerCallWithContext;

    await expect(
      guard.canActivate(
        rpcContext(metadata, call, {
          requireUser: true,
        }),
      ),
    ).resolves.toBe(true);

    expect(validateToken).toHaveBeenCalledTimes(1);
    expect(resolveCtxUser(metadata, call)).toEqual({
      userId: "verified-user",
      role: "admin",
      email: undefined,
      sessionRef: "safe-session-reference",
    });
  });

  it("rejects a verified normal user from an admin-only RPC", async () => {
    const validateToken = jest.fn().mockReturnValue(
      of({
        isValid: true,
        userId: "verified-user",
        role: "user",
      }),
    );
    const guard = createGuard(validateToken);
    const metadata = new Metadata() as MetadataWithContext;
    metadata.svc = "web-gateway";
    metadata.svcKind = "gateway";
    metadata.set("authorization", "Bearer signed-access-token");

    await expect(
      guard.canActivate(
        rpcContext(metadata, {} as GrpcServerCallWithContext, {
          roles: ["admin", "root-admin"],
        }),
      ),
    ).rejects.toMatchObject({
      error: expect.objectContaining({
        code: status.PERMISSION_DENIED,
        message: "role_not_allowed",
      }),
    });
  });
});
