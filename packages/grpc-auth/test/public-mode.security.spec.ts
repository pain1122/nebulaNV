import "reflect-metadata";
import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RpcException, type ClientGrpc } from "@nestjs/microservices";
import { GrpcTokenAuthGuard } from "../src/grpc-token-auth.guard";
import { OperationalHealth, Public } from "../src/public.decorator";

type ContextKind = "http" | "rpc";
type RoutePolicy = "private" | "public" | "health";

function policyClass(policy: RoutePolicy) {
  class TestController {}
  if (policy === "public") Public()(TestController);
  if (policy === "health") OperationalHealth()(TestController);
  return TestController;
}

function testContext(
  policy: RoutePolicy,
  kind: ContextKind = "http",
): ExecutionContext {
  const request = { headers: {} };
  return {
    getType: () => kind,
    getClass: () => policyClass(policy),
    getHandler: () => () => undefined,
    getArgByIndex: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
    switchToRpc: () => ({ getContext: () => undefined }),
  } as unknown as ExecutionContext;
}

function guard(publicMode: "OPEN" | "GATEWAY_ONLY") {
  process.env.PUBLIC_MODE = publicMode;
  process.env.NODE_ENV = "production";
  const client = { getService: () => ({}) } as unknown as ClientGrpc;
  const instance = new GrpcTokenAuthGuard(client, new Reflector());
  instance.onModuleInit();
  return instance;
}

describe("GrpcTokenAuthGuard fail-closed public mode", () => {
  it("allows only explicit operational HTTP health in production GATEWAY_ONLY", async () => {
    const instance = guard("GATEWAY_ONLY");

    await expect(instance.canActivate(testContext("health"))).resolves.toBe(
      true,
    );
    await expect(
      instance.canActivate(testContext("public")),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      instance.canActivate(testContext("private")),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("never turns operational health metadata into an unsigned RPC bypass", async () => {
    await expect(
      guard("GATEWAY_ONLY").canActivate(testContext("health", "rpc")),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it("does not let PUBLIC_MODE=OPEN bypass a private HTTP route", async () => {
    await expect(
      guard("OPEN").canActivate(testContext("private")),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
