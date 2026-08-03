import "reflect-metadata";
import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ClientGrpc } from "@nestjs/microservices";
import { GrpcTokenAuthGuard } from "../src/grpc-token-auth.guard";

describe("GrpcTokenAuthGuard fail-closed public mode", () => {
  it("does not let PUBLIC_MODE=OPEN bypass a private HTTP route", async () => {
    process.env.PUBLIC_MODE = "OPEN";
    process.env.NODE_ENV = "production";
    const client = { getService: () => ({}) } as unknown as ClientGrpc;
    const guard = new GrpcTokenAuthGuard(client, new Reflector());
    guard.onModuleInit();

    const request = { headers: {} };
    const context = {
      getType: () => "http",
      getClass: () => class TestController {},
      getHandler: () => () => undefined,
      getArgByIndex: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
      switchToRpc: () => ({ getContext: () => undefined }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
