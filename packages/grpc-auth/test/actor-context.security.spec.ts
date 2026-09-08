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
import type { S2SActorAssertion } from "../src/s2s-context";
import { gatewayTestSignedContext } from "./gateway-context.fixture";

const REQUEST_CONTEXT = Object.freeze({
  applicationId: "storefront-web-local",
  tenantId: "single-site-tenant",
  siteId: "single-site",
  channelId: "web",
});

function attachSignedContext(
  metadata: MetadataWithContext,
  actor?: S2SActorAssertion,
): void {
  metadata.requestContext = REQUEST_CONTEXT;
  metadata.signedActor = actor;
}

const ACTOR_MISMATCH_CASES: Array<[string, Partial<S2SActorAssertion>]> = [
  ["user ID", { userId: "different-user" }],
  ["role", { role: "root-admin" }],
  ["session", { sessionRef: "different-session" }],
];

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
  it("builds the test gateway assertion from the same session reference contract", () => {
    const previous = process.env.JWT_ACCESS_SECRET;
    process.env.JWT_ACCESS_SECRET = "test-only-access-secret-000000000000001";
    const payload = Buffer.from(
      JSON.stringify({ sub: "user-1", role: "user", sid: "session-1" }),
      "utf8",
    ).toString("base64url");
    try {
      expect(gatewayTestSignedContext(`header.${payload}.signature`)).toEqual(
        expect.objectContaining({
          actor: {
            userId: "user-1",
            role: "user",
            sessionRef: expect.stringMatching(/^sr1_[A-Za-z0-9_-]{32}$/),
          },
        }),
      );
    } finally {
      if (previous === undefined) delete process.env.JWT_ACCESS_SECRET;
      else process.env.JWT_ACCESS_SECRET = previous;
    }
  });

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
    attachSignedContext(metadata, {
      userId: "verified-user",
      role: "admin",
      sessionRef: "safe-session-reference",
    });
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
        sessionRef: "safe-session-reference",
      }),
    );
    const guard = createGuard(validateToken);
    const metadata = new Metadata() as MetadataWithContext;
    metadata.svc = "web-gateway";
    metadata.svcKind = "gateway";
    attachSignedContext(metadata, {
      userId: "verified-user",
      role: "user",
      sessionRef: "safe-session-reference",
    });
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

  it.each(ACTOR_MISMATCH_CASES)(
    "rejects a signed actor whose %s disagrees with auth truth",
    async (_label, mismatch) => {
      const validateToken = jest.fn().mockReturnValue(
        of({
          isValid: true,
          userId: "verified-user",
          role: "admin",
          sessionRef: "verified-session",
        }),
      );
      const guard = createGuard(validateToken);
      const metadata = new Metadata() as MetadataWithContext;
      metadata.svc = "web-gateway";
      metadata.svcKind = "gateway";
      attachSignedContext(metadata, {
        userId: "verified-user",
        role: "admin",
        sessionRef: "verified-session",
        ...mismatch,
      });
      metadata.set("authorization", "Bearer signed-access-token");

      await expect(
        guard.canActivate(
          rpcContext(metadata, {} as GrpcServerCallWithContext, {
            requireUser: true,
          }),
        ),
      ).rejects.toMatchObject({
        error: expect.objectContaining({
          code: status.UNAUTHENTICATED,
          message: "s2s_actor_bearer_mismatch",
        }),
      });
      expect(metadata.user).toBeUndefined();
    },
  );

  it("binds v2 actor identity to live user/session without authorizing by global role", async () => {
    const validateToken = jest.fn().mockReturnValue(
      of({
        isValid: true,
        userId: "verified-user",
        role: "admin",
        sessionRef: "verified-session",
      }),
    );
    const guard = createGuard(validateToken);
    const metadata = new Metadata() as MetadataWithContext;
    metadata.svc = "web-gateway";
    metadata.svcKind = "gateway";
    metadata.resolutionContext = {
      version: "2",
      purpose: "RESOLUTION",
      resolutionStage: "AUTHORITY",
      actor: {
        userId: "verified-user",
        sessionRef: "verified-session",
      },
    };
    metadata.signedActor = metadata.resolutionContext.actor;
    metadata.set("authorization", "Bearer signed-access-token");

    await expect(
      guard.canActivate(
        rpcContext(metadata, {} as GrpcServerCallWithContext, {
          requireUser: true,
        }),
      ),
    ).resolves.toBe(true);
    expect(metadata.user).toEqual({
      userId: "verified-user",
      role: "admin",
      sessionRef: "verified-session",
    });

    const mismatched = new Metadata() as MetadataWithContext;
    mismatched.svc = "web-gateway";
    mismatched.svcKind = "gateway";
    mismatched.resolutionContext = {
      version: "2",
      purpose: "RESOLUTION",
      resolutionStage: "AUTHORITY",
      actor: {
        userId: "verified-user",
        sessionRef: "different-session",
      },
    };
    mismatched.signedActor = mismatched.resolutionContext.actor;
    mismatched.set("authorization", "Bearer signed-access-token");
    await expect(
      guard.canActivate(
        rpcContext(mismatched, {} as GrpcServerCallWithContext, {
          requireUser: true,
        }),
      ),
    ).rejects.toMatchObject({
      error: expect.objectContaining({
        message: "s2s_actor_bearer_mismatch",
      }),
    });
  });

  it("rejects either half of a v3 actor/bearer pair", async () => {
    const guard = createGuard();
    const actorWithoutBearer = new Metadata() as MetadataWithContext;
    actorWithoutBearer.svc = "web-gateway";
    actorWithoutBearer.svcKind = "gateway";
    attachSignedContext(actorWithoutBearer, {
      userId: "verified-user",
      role: "user",
      sessionRef: "verified-session",
    });
    await expect(
      guard.canActivate(
        rpcContext(actorWithoutBearer, {} as GrpcServerCallWithContext, {
          public: true,
          gatewayOnly: true,
        }),
      ),
    ).rejects.toMatchObject({
      error: expect.objectContaining({
        message: "s2s_actor_bearer_missing",
      }),
    });

    const bearerWithoutActor = new Metadata() as MetadataWithContext;
    bearerWithoutActor.svc = "web-gateway";
    bearerWithoutActor.svcKind = "gateway";
    attachSignedContext(bearerWithoutActor);
    bearerWithoutActor.set("authorization", "Bearer signed-access-token");
    await expect(
      guard.canActivate(
        rpcContext(bearerWithoutActor, {} as GrpcServerCallWithContext),
      ),
    ).rejects.toMatchObject({
      error: expect.objectContaining({
        message: "s2s_actor_assertion_missing",
      }),
    });
  });

  it("allows anonymous v3 and legacy service-v2 bearer behavior during migration", async () => {
    const anonymousGuard = createGuard();
    const anonymous = new Metadata() as MetadataWithContext;
    anonymous.svc = "web-gateway";
    anonymous.svcKind = "gateway";
    attachSignedContext(anonymous);
    await expect(
      anonymousGuard.canActivate(
        rpcContext(anonymous, {} as GrpcServerCallWithContext, {
          public: true,
          gatewayOnly: true,
        }),
      ),
    ).resolves.toBe(true);
    expect(anonymous.user).toEqual({ userId: null, role: "guest" });

    const validateToken = jest.fn().mockReturnValue(
      of({
        isValid: true,
        userId: "legacy-user",
        role: "user",
        sessionRef: "legacy-session",
      }),
    );
    const serviceGuard = createGuard(validateToken);
    const legacyService = new Metadata() as MetadataWithContext;
    legacyService.svc = "legacy-service";
    legacyService.svcKind = "service";
    legacyService.set("authorization", "Bearer signed-access-token");
    await expect(
      serviceGuard.canActivate(
        rpcContext(legacyService, {} as GrpcServerCallWithContext),
      ),
    ).resolves.toBe(true);
    expect(legacyService.user).toMatchObject({ userId: "legacy-user" });
  });

  it("does not make a private GatewayOnly RPC anonymous", async () => {
    const guard = createGuard();
    const metadata = new Metadata() as MetadataWithContext;
    metadata.svc = "web-gateway";
    metadata.svcKind = "gateway";
    attachSignedContext(metadata);

    await expect(
      guard.canActivate(
        rpcContext(metadata, {} as GrpcServerCallWithContext, {
          gatewayOnly: true,
        }),
      ),
    ).rejects.toMatchObject({
      error: expect.objectContaining({
        code: status.UNAUTHENTICATED,
        message: "missing_token_or_signature",
      }),
    });
    expect(metadata.user).toBeUndefined();
  });
});
