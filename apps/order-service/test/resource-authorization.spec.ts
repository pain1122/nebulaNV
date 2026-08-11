import { Metadata } from "@grpc/grpc-js";
import type { ClientGrpc } from "@nestjs/microservices";
import type {
  MetadataWithContext,
  RpcContextWithContext,
} from "@nebula/grpc-auth";
import { OrderGrpcController } from "../src/order/grpc/order-grpc.controller";
import { OrderService } from "../src/order/order.service";
import type { PrismaService } from "../src/prisma.service";

describe("order resource authorization", () => {
  it("uses verified actor context instead of caller-supplied userId", async () => {
    const service = {
      getCartForUser: jest.fn().mockResolvedValue({ data: {} }),
      getOrderForUser: jest.fn().mockResolvedValue({ data: {} }),
      listOrdersForUser: jest.fn().mockResolvedValue({ data: [] }),
    };
    const controller = new OrderGrpcController(
      service as unknown as OrderService,
    );
    const metadata = new Metadata() as MetadataWithContext;
    metadata.svc = "gateway";
    metadata.svcKind = "gateway";
    metadata.requestId = "req-resource-owner";
    metadata.requestContext = {
      applicationId: "admin-web",
      tenantId: "tenant-main",
      siteId: "site-main",
      channelId: "browser",
    };
    metadata.signedActor = {
      userId: "verified-user",
      role: "user",
      sessionRef: "session-1",
    };
    metadata.user = metadata.signedActor;
    metadata.set("authorization", "Bearer verified-token");
    const call = {
      svc: metadata.svc,
      svcKind: metadata.svcKind,
      requestId: metadata.requestId,
      requestContext: metadata.requestContext,
      signedActor: metadata.signedActor,
      user: metadata.user,
    } as RpcContextWithContext;

    await controller.getCart(
      { userId: "forged-user" },
      metadata,
      call as never,
    );
    await controller.getOrder(
      { userId: "forged-user", id: "order-1" },
      metadata,
      call as never,
    );
    await controller.listOrders(
      { userId: "forged-user" },
      metadata,
      call as never,
    );

    expect(service.getCartForUser).toHaveBeenCalledWith(
      "verified-user",
      expect.objectContaining({
        signingPolicy: expect.objectContaining({
          requestId: "req-resource-owner",
        }),
      }),
    );
    expect(service.getOrderForUser).toHaveBeenCalledWith(
      "verified-user",
      "order-1",
    );
    expect(service.listOrdersForUser).toHaveBeenCalledWith(
      "verified-user",
      undefined,
    );
  });

  it("scopes order reads by both resource ID and verified owner ID", async () => {
    const prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue({ id: "order-1" }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const emptyClient = {} as ClientGrpc;
    const service = new OrderService(
      prisma as unknown as PrismaService,
      emptyClient,
      emptyClient,
    );

    await service.getOrderForUser("verified-user", "order-1");
    await service.listOrdersForUser("verified-user");

    expect(prisma.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-1", userId: "verified-user" },
      }),
    );
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "verified-user" },
      }),
    );
  });
});
