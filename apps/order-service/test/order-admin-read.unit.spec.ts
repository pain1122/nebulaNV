import type { ClientGrpc } from "@nestjs/microservices";
import { ValidationPipe } from "@nestjs/common";
import { orderv1 } from "@nebula/protos";
import { ROLES_KEY, grpcS2SProtoLoaderOptions } from "@nebula/grpc-auth";
import { loadSync, type ServiceDefinition } from "@grpc/proto-loader";
import { Prisma } from "../prisma/generated/client";
import { OrderService } from "../src/order/order.service";
import { AdminOrderController } from "../src/order/admin-order.controller";
import { OrderGrpcController } from "../src/order/grpc/order-grpc.controller";
import {
  VISIBLE_ORDER,
  type AdminOrderQuery,
} from "../src/order/order-admin-read";
import type { PrismaService } from "../src/prisma.service";
import { storedOrder } from "./utils/order.fixture";
import { AdminOrderListDto } from "../src/order/dto/order.dto";

const ID = "00000000-0000-4000-8000-000000000001";
const OWNER = "00000000-0000-4000-8000-000000000002";
function harness() {
  const tx = {
    order: {
      findMany: jest
        .fn()
        .mockResolvedValue([storedOrder({ id: ID, userId: OWNER })]),
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest
        .fn()
        .mockResolvedValue(storedOrder({ id: ID, userId: OWNER })),
    },
  };
  const transaction = jest.fn((work: (value: typeof tx) => Promise<unknown>) =>
    work(tx),
  );
  const svc = new OrderService(
    { ...tx, $transaction: transaction } as unknown as PrismaService,
    {} as ClientGrpc,
    {} as ClientGrpc,
  );
  return { tx, transaction, svc };
}
describe("admin Order reads", () => {
  it("preserves optional/default/invalid RPC query values through the actual codec", async () => {
    const codec = orderv1.OrderServiceService.adminListOrders;
    const decoded = codec.requestDeserialize(
      codec.requestSerialize(orderv1.AdminListOrdersRequest.create({})),
    );
    const h = harness();
    const controller = new OrderGrpcController(h.svc);
    expect(await controller.adminListOrders(decoded)).toMatchObject({
      page: 1,
      limit: 20,
    });
    const invalid = codec.requestDeserialize(
      codec.requestSerialize(
        orderv1.AdminListOrdersRequest.create({ limit: 0 }),
      ),
    );
    await expect(controller.adminListOrders(invalid)).rejects.toMatchObject({
      status: 400,
    });
    const loaded = loadSync(
      require.resolve("@nebula/protos/order.proto"),
      grpcS2SProtoLoaderOptions(),
    );
    const receiver = (loaded["order.OrderService"] as ServiceDefinition)
      .AdminListOrders;
    const omitted = receiver.requestDeserialize(
      receiver.requestSerialize({}),
    ) as orderv1.AdminListOrdersRequest;
    expect(omitted.page).toBeUndefined();
    expect(await controller.adminListOrders(omitted)).toMatchObject({
      page: 1,
      limit: 20,
    });
    const explicitZero = receiver.requestDeserialize(
      receiver.requestSerialize({ limit: 0 }),
    ) as orderv1.AdminListOrdersRequest;
    await expect(
      controller.adminListOrders(explicitZero),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("converts native query numbers and rejects unknown or invalid fields", async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    const meta = { type: "query" as const, metatype: AdminOrderListDto };
    expect(
      await pipe.transform({ page: "2", limit: "5", userId: OWNER }, meta),
    ).toMatchObject({ page: 2, limit: 5, userId: OWNER });
    for (const input of [
      { page: "0" },
      { limit: "101" },
      { status: "BAD" },
      { userId: "bad" },
      { sort: "id" },
    ])
      await expect(pipe.transform(input, meta)).rejects.toMatchObject({
        status: 400,
      });
  });
  it("reads a completed/legacy Order without impersonating its customer", async () => {
    const h = harness();
    expect((await h.svc.getOrderForAdmin(ID)).data.userId).toBe(OWNER);
    expect(h.tx.order.findFirst).toHaveBeenCalledWith({
      where: { id: ID, ...VISIBLE_ORDER },
      include: { items: true },
    });
  });
  it("uses the same visible predicate for deterministic bounded rows and total", async () => {
    const h = harness();
    const result = await h.svc.listOrdersForAdmin({
      userId: OWNER,
      status: "PAID",
      page: 2,
      limit: 5,
    });
    const where = { ...VISIBLE_ORDER, userId: OWNER, status: "PAID" };
    expect(h.tx.order.findMany).toHaveBeenCalledWith({
      where,
      include: { items: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: 5,
      take: 5,
    });
    expect(h.tx.order.count).toHaveBeenCalledWith({ where });
    expect(h.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 5000,
      timeout: 10000,
    });
    expect(result).toMatchObject({ page: 2, limit: 5, total: 1 });
  });
  it("defaults pagination and supports a genuine empty page", async () => {
    const h = harness();
    h.tx.order.findMany.mockResolvedValue([]);
    h.tx.order.count.mockResolvedValue(0);
    expect(await h.svc.listOrdersForAdmin()).toEqual({
      data: [],
      page: 1,
      limit: 20,
      total: 0,
    });
  });
  it.each([
    null,
    [],
    { page: 0 },
    { page: 1.5 },
    { page: 1_000_001 },
    { limit: 0 },
    { limit: 101 },
    { limit: "20" },
    { status: "" },
    { status: "REFUNDED" },
    { userId: "other" },
  ])("rejects invalid filters before any database query: %j", async (input) => {
    const h = harness();
    await expect(
      h.svc.listOrdersForAdmin(input as unknown as AdminOrderQuery),
    ).rejects.toMatchObject({ status: 400 });
    expect(h.transaction).not.toHaveBeenCalled();
  });
  it("rejects malformed IDs before lookup and hides missing/unfinished Orders", async () => {
    const h = harness();
    await expect(h.svc.getOrderForAdmin("bad")).rejects.toMatchObject({
      status: 400,
    });
    expect(h.tx.order.findFirst).not.toHaveBeenCalled();
    h.tx.order.findFirst.mockResolvedValue(null);
    await expect(h.svc.getOrderForAdmin(ID)).rejects.toMatchObject({
      status: 404,
    });
  });
  it("retains explicit admin roles at both native and RPC boundaries", () => {
    for (const [prototype, names] of [
      [AdminOrderController.prototype, ["list", "get"]],
      [OrderGrpcController.prototype, ["adminListOrders", "adminGetOrder"]],
    ] as const)
      for (const name of names) {
        const method: unknown = Object.getOwnPropertyDescriptor(
          prototype,
          name,
        )?.value;
        if (typeof method !== "function")
          throw new Error(`missing_read_handler:${name}`);
        expect(Reflect.getMetadata(ROLES_KEY, method)).toEqual([
          "admin",
          "root-admin",
        ]);
      }
  });
});
