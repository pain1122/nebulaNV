import { Metadata } from "@grpc/grpc-js";
import type { ClientGrpc } from "@nestjs/microservices";
import type {
  MetadataWithContext,
  RpcContextWithContext,
} from "@nebula/grpc-auth";
import { OrderGrpcController } from "../src/order/grpc/order-grpc.controller";
import { OrderService } from "../src/order/order.service";
import type { PrismaService } from "../src/prisma.service";
import { storedOrder } from "./utils/order.fixture";
import { OrderController } from "../src/order/order.controller";
import { AdminOrderController } from "../src/order/admin-order.controller";
import { orderv1 } from "@nebula/protos";
import { loadSync, type ServiceDefinition } from "@grpc/proto-loader";
import { grpcS2SProtoLoaderOptions } from "@nebula/grpc-auth";
import type { Request } from "express";
import {
  DemoPaymentOutcomeDto,
  OrderStatusDto,
} from "../src/order/dto/order.dto";

describe("order resource authorization", () => {
  it("binds demo actors, keys and downstream correlation from verified HTTP/RPC context", async () => {
    const start = jest.fn().mockResolvedValue({ data: {} });
    const resolve = jest.fn().mockResolvedValue({ data: {} });
    const svc = {
      startDemoPayment: start,
      resolveDemoPayment: resolve,
    } as unknown as OrderService;
    const id = "fd230000-0000-4000-8000-000000000001";
    const attemptId = "fd230000-0000-4000-8000-000000000002";
    const userId = "fd230000-0000-4000-8000-000000000090";
    const req = {
      headers: {
        "idempotency-key": "native-demo-payment-key",
        "x-user-id": "forged",
      },
      user: { userId, role: "user" },
      requestId: "verified-http",
    } as unknown as Request;
    await new OrderController(svc).startDemoPayment(req, id, {
      expectedVersion: 1,
    });
    expect(start).toHaveBeenLastCalledWith(
      id,
      { expectedVersion: 1 },
      "native-demo-payment-key",
      { userId, role: "user", requestId: "verified-http" },
    );
    const adminReq = Object.assign(req, { user: { userId, role: "admin" } });
    await new AdminOrderController(svc).resolveDemoPayment(
      adminReq,
      id,
      attemptId,
      { expectedVersion: 2, outcome: DemoPaymentOutcomeDto.UNKNOWN },
    );
    expect(resolve).toHaveBeenLastCalledWith(
      id,
      { attemptId, expectedVersion: 2, outcome: "UNKNOWN" },
      "native-demo-payment-key",
      { userId, role: "admin", requestId: "verified-http" },
    );
    const metadata = new Metadata() as MetadataWithContext;
    metadata.user = { userId, role: "user" };
    metadata.requestId = "verified-rpc";
    metadata.svc = "gateway";
    metadata.svcKind = "gateway";
    metadata.set("authorization", "Bearer verified-demo-token");
    const controller = new OrderGrpcController(svc);
    await controller.startDemoPayment(
      { id, expectedVersion: 1, idempotencyKey: "signed-demo-payment-key" },
      metadata,
      {} as never,
    );
    const signing: unknown = expect.objectContaining({
      requestId: "verified-rpc",
    });
    expect(start).toHaveBeenLastCalledWith(
      id,
      { expectedVersion: 1 },
      "signed-demo-payment-key",
      { userId, role: "user", requestId: "verified-rpc" },
      expect.objectContaining({ signingPolicy: signing }),
    );
    metadata.user = { userId, role: "root-admin" };
    await controller.resolveDemoPayment(
      {
        id,
        attemptId,
        outcome: "FAILED",
        expectedVersion: 2,
        idempotencyKey: "signed-demo-outcome-key",
      },
      metadata,
      {} as never,
    );
    expect(resolve).toHaveBeenLastCalledWith(
      id,
      { attemptId, outcome: "FAILED", expectedVersion: 2 },
      "signed-demo-outcome-key",
      { userId, role: "root-admin", requestId: "verified-rpc" },
      expect.objectContaining({ signingPolicy: signing }),
    );
  });

  it("preserves optional command versions and empty items through actual demo protobuf codecs", () => {
    const definition = orderv1.OrderServiceService;
    for (const roundtrip of [
      (expectedVersion?: number) =>
        orderv1.StartDemoPaymentRequest.decode(
          orderv1.StartDemoPaymentRequest.encode(
            orderv1.StartDemoPaymentRequest.create({ expectedVersion }),
          ).finish(),
        ),
      (expectedVersion?: number) =>
        orderv1.ResolveDemoPaymentRequest.decode(
          orderv1.ResolveDemoPaymentRequest.encode(
            orderv1.ResolveDemoPaymentRequest.create({ expectedVersion }),
          ).finish(),
        ),
    ]) {
      expect(roundtrip().expectedVersion).toBeUndefined();
      expect(roundtrip(0).expectedVersion).toBe(0);
    }
    const decoded = definition.startDemoPayment.responseDeserialize(
      definition.startDemoPayment.responseSerialize(
        orderv1.DemoPaymentResponse.create({
          data: {
            order: { id: "order", items: [] },
            attempt: { mode: "DEMO" },
          },
        }),
      ),
    );
    expect(decoded.data?.order?.items).toEqual([]);
    expect(decoded.data?.attempt?.mode).toBe("DEMO");
    expect(
      definition.resolveDemoPayment.responseDeserialize(
        definition.resolveDemoPayment.responseSerialize(decoded),
      ),
    ).toEqual(decoded);
    const receiver = loadSync(
      require.resolve("@nebula/protos/order.proto"),
      grpcS2SProtoLoaderOptions(),
    )["order.OrderService"] as ServiceDefinition;
    const gateway = loadSync(require.resolve("@nebula/protos/order.proto"), {
      defaults: true,
      oneofs: true,
    })["order.OrderService"] as ServiceDefinition;
    const absent = receiver.StartDemoPayment.requestDeserialize(
      definition.startDemoPayment.requestSerialize(
        orderv1.StartDemoPaymentRequest.create(),
      ),
    );
    expect(absent).not.toHaveProperty("expectedVersion");
    expect(
      receiver.StartDemoPayment.requestDeserialize(
        definition.startDemoPayment.requestSerialize(
          orderv1.StartDemoPaymentRequest.create({ expectedVersion: 0 }),
        ),
      ),
    ).toMatchObject({ expectedVersion: 0 });
    expect(
      gateway.StartDemoPayment.responseDeserialize(
        definition.startDemoPayment.responseSerialize(decoded),
      ),
    ).toMatchObject({
      data: { order: { items: [] }, attempt: { mode: "DEMO" } },
    });
  });
  it("takes status actor and correlation from verified transport context", async () => {
    const update = jest.fn().mockResolvedValue({ data: {} });
    const svc = { updateOrderStatusAdmin: update } as unknown as OrderService;
    const id = "fd230000-0000-4000-8000-000000000001";
    const userId = "fd230000-0000-4000-8000-000000000090";
    const dto = { status: OrderStatusDto.PAID, expectedVersion: 1 };
    await new OrderController(svc).updateStatusAdmin(
      {
        headers: {
          "idempotency-key": "native-status-context-key",
          "x-user-id": "forged",
        },
        user: { userId, role: "admin" },
        requestId: "verified-http",
      } as unknown as Request,
      id,
      dto,
    );
    expect(update).toHaveBeenLastCalledWith(
      id,
      dto,
      "native-status-context-key",
      { userId, role: "admin", requestId: "verified-http" },
    );
    const metadata = new Metadata() as MetadataWithContext;
    metadata.user = { userId, role: "root-admin" };
    metadata.requestId = "verified-rpc";
    metadata.svc = "gateway";
    metadata.svcKind = "gateway";
    metadata.set("authorization", "Bearer verified-status-token");
    await new OrderGrpcController(svc).updateOrderStatus(
      { id, ...dto, idempotencyKey: "signed-status-context-key" },
      metadata,
      {} as never,
    );
    const statusSigningMatcher: unknown = expect.objectContaining({
      requestId: "verified-rpc",
    });
    expect(update).toHaveBeenLastCalledWith(
      id,
      dto,
      "signed-status-context-key",
      { userId, role: "root-admin", requestId: "verified-rpc" },
      expect.objectContaining({
        signingPolicy: statusSigningMatcher,
      }),
    );
  });
  it("uses verified actor context instead of caller-supplied userId", async () => {
    const service = {
      getCartForUser: jest.fn().mockResolvedValue({ data: {} }),
      getOrderForUser: jest.fn().mockResolvedValue({ data: {} }),
      listOrdersForUser: jest.fn().mockResolvedValue({ data: [] }),
      checkout: jest.fn().mockResolvedValue({ data: {} }),
      updateOrderStatusAdmin: jest.fn().mockResolvedValue({ data: {} }),
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
    await controller.checkout(
      {
        userId: "forged-user",
        note: "demo",
        idempotencyKey: "signed-checkout-key",
      },
      metadata,
      call as never,
    );
    const checkoutSigningMatcher: unknown = expect.objectContaining({
      requestId: "req-resource-owner",
    });
    await controller.updateOrderStatus(
      {
        id: "order-1",
        status: "CANCELLED",
        expectedVersion: 1,
        idempotencyKey: "signed-cancel-key",
      },
      metadata,
      call as never,
    );
    expect(service.updateOrderStatusAdmin).toHaveBeenCalledWith(
      "order-1",
      { status: "CANCELLED", expectedVersion: 1 },
      "signed-cancel-key",
      {
        userId: "verified-user",
        role: "user",
        requestId: "req-resource-owner",
      },
      expect.objectContaining({ signingPolicy: checkoutSigningMatcher }),
    );
    expect(service.checkout).toHaveBeenCalledWith(
      "verified-user",
      "signed-checkout-key",
      "demo",
      expect.objectContaining({
        signingPolicy: checkoutSigningMatcher,
      }),
    );

    expect(service.getCartForUser).toHaveBeenCalledWith(
      "verified-user",
      expect.objectContaining({
        signingPolicy: checkoutSigningMatcher,
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
        findFirst: jest
          .fn()
          .mockResolvedValue(
            storedOrder({ id: "order-1", userId: "verified-user" }),
          ),
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
        where: {
          id: "order-1",
          userId: "verified-user",
          OR: [
            { checkoutAttempt: { is: null } },
            { checkoutAttempt: { is: { state: "COMPLETED" } } },
          ],
        },
      }),
    );
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "verified-user",
          OR: [
            { checkoutAttempt: { is: null } },
            { checkoutAttempt: { is: { state: "COMPLETED" } } },
          ],
        },
      }),
    );
  });
});
