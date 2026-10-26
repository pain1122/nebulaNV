import { Metadata } from "@grpc/grpc-js";
import { orderv1 } from "@nebula/protos";
import {
  Prisma,
  type DemoPaymentAttempt,
  type DemoPaymentCommand,
} from "../prisma/generated/client";
import {
  demoCommand,
  demoReply,
  demoBody,
  demoReplay,
  demoRetryStock,
} from "../src/order/demo-payment-contract";
import {
  DemoPaymentCoordinator,
  type DemoPaymentStock,
} from "../src/order/demo-payment";
import type { PrismaService } from "../src/prisma.service";
import { storedOrder } from "./utils/order.fixture";
import {
  product,
  variantProduct,
  PRODUCT_ID,
  VARIANT_ID,
} from "./utils/cart.fixture";

const ID = "fd230000-0000-4000-8000-000000000001";
const USER = {
  userId: "fd230000-0000-4000-8000-000000000090",
  role: "user",
  requestId: "verified-payment-request",
};
const ADMIN = {
  ...USER,
  userId: "fd230000-0000-4000-8000-000000000091",
  role: "admin",
};
const KEY = "demo-payment-unit-command";
const start = () => demoCommand("START", ID, { expectedVersion: 1 }, KEY, USER);

describe("bounded demo payment contract", () => {
  it("reserves a version increment for the confirmed outcome before starting", () => {
    expect(() =>
      demoCommand("START", ID, { expectedVersion: 2147483646 }, KEY, USER),
    ).toThrow("demo_payment_version_capacity");
    expect(
      demoCommand("START", ID, { expectedVersion: 2147483645 }, KEY, USER)
        .expectedVersion,
    ).toBe(2147483645);
    expect(
      demoCommand(
        "OUTCOME",
        ID,
        { expectedVersion: 2147483646, attemptId: ID, outcome: "FAILED" },
        KEY,
        ADMIN,
      ).expectedVersion,
    ).toBe(2147483646);
  });
  it("keeps customer initiation separate from admin outcome authority", () => {
    expect(start()).toMatchObject({
      actorId: USER.userId,
      actorRole: "user",
      kind: "START",
    });
    expect(() =>
      demoCommand("START", ID, { expectedVersion: 1 }, KEY, ADMIN),
    ).toThrow("demo_payment_actor_forbidden");
    expect(() =>
      demoCommand(
        "OUTCOME",
        ID,
        { expectedVersion: 2, attemptId: ID, outcome: "FAILED" },
        KEY,
        USER,
      ),
    ).toThrow("demo_payment_actor_forbidden");
    expect(() =>
      demoCommand("START", ID, { expectedVersion: 1 }, KEY, {
        ...USER,
        userId: "",
      }),
    ).toThrow("missing_user_id");
  });
  it.each([undefined, 0, -1, 1.5, 2147483647])(
    "rejects absent/invalid version %j",
    (version) => {
      expect(() =>
        demoCommand("START", ID, { expectedVersion: version }, KEY, USER),
      ).toThrow("order_expected_version_invalid");
    },
  );
  it("binds target/outcome/version/role while excluding correlation from intent", () => {
    const first = start();
    expect(
      demoCommand("START", ID, { expectedVersion: 1 }, KEY, {
        ...USER,
        requestId: "later",
      }).intentHash,
    ).toBe(first.intentHash);
    expect(
      demoCommand("START", ID, { expectedVersion: 2 }, KEY, USER).intentHash,
    ).not.toBe(first.intentHash);
    const failed = demoCommand(
      "OUTCOME",
      ID,
      { expectedVersion: 2, attemptId: ID, outcome: "FAILED" },
      KEY,
      ADMIN,
    );
    expect(
      demoCommand(
        "OUTCOME",
        ID,
        { expectedVersion: 2, attemptId: ID, outcome: "SUCCEEDED" },
        KEY,
        ADMIN,
      ).intentHash,
    ).not.toBe(failed.intentHash);
    expect(() =>
      demoCommand(
        "OUTCOME",
        ID,
        { expectedVersion: 2, attemptId: ID, outcome: "PAID" },
        KEY,
        ADMIN,
      ),
    ).toThrow("demo_payment_outcome_invalid");
    expect(() =>
      demoCommand("START", ID, { expectedVersion: 1 }, "short", USER),
    ).toThrow("demo_payment_key_invalid");
  });
  it("round-trips an explicit demo reply and fails closed on corrupted replay", () => {
    const order = storedOrder({
      id: ID,
      userId: USER.userId,
      status: "PAYMENT_PROCESSING",
      version: 2,
    });
    const attempt = {
      id: ID,
      orderId: ID,
      state: "PROCESSING",
      abortRequested: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as DemoPaymentAttempt;
    const reply = demoReply(order, attempt);
    const command = {
      ...start(),
      attemptId: ID,
      response: demoBody(reply),
      outcome: null,
    } as unknown as DemoPaymentCommand;
    expect(demoReplay(command, start())).toEqual(reply);
    const decoded = orderv1.Order.decode(
      orderv1.Order.encode(orderv1.Order.create(reply.data.order)).finish(),
    );
    expect(decoded).toMatchObject({
      status: "PAYMENT_PROCESSING",
      version: 2,
      total: "0.30",
    });
    expect(reply.data.attempt).toMatchObject({ mode: "DEMO", amount: "0.30" });
    const bad = structuredClone(command);
    bad.response = {
      ...demoBody(reply),
      attempt: { ...reply.data.attempt, amount: "0.31" },
    };
    expect(() => demoReplay(bad, start())).toThrow(
      "demo_payment_receipt_invalid",
    );
    expect(() =>
      demoReplay({ ...command, intentHash: "b".repeat(64) }, start()),
    ).toThrow("demo_payment_idempotency_conflict");
  });
  it("uses current version for retry stock without rewriting saved price/options", () => {
    const order = storedOrder();
    const facts = demoRetryStock(
      order,
      new Map([[PRODUCT_ID, product({ version: 8 })]]),
      "USD",
    );
    expect(facts.lines[0]).toMatchObject({
      productId: PRODUCT_ID,
      expectedVersion: 8,
      quantity: 3,
      unitPrice: "0.10",
      selectedOptions: {},
    });
    expect(order.items[0].unitPrice.toFixed(2)).toBe("0.10");
    expect(() =>
      demoRetryStock(
        order,
        new Map([[PRODUCT_ID, product({ effectivePriceAmount: "0.11" })]]),
        "USD",
      ),
    ).toThrow("demo_payment_selection_changed");
    expect(() =>
      demoRetryStock(
        order,
        new Map([[PRODUCT_ID, product({ stockQuantity: 2 })]]),
        "USD",
      ),
    ).toThrow("cart_insufficient_stock");
    expect(() =>
      demoRetryStock(order, new Map([[PRODUCT_ID, product()]]), "EUR"),
    ).toThrow("demo_payment_selection_changed");
  });
  it("pins original variant identity/SKU/options and rejects unavailable selections", () => {
    const order = storedOrder();
    Object.assign(order.items[0], {
      variantId: VARIANT_ID,
      sku: "DESK-BLUE",
      selectedOptions: { colour: "Blue" },
      unitPrice: new Prisma.Decimal("7.25"),
    });
    expect(
      demoRetryStock(order, new Map([[PRODUCT_ID, variantProduct()]]), "USD")
        .lines[0],
    ).toMatchObject({ variantId: VARIANT_ID, unitPrice: "7.25" });
    const changed = variantProduct();
    changed.variants![0].options = { colour: "Red" };
    expect(() =>
      demoRetryStock(order, new Map([[PRODUCT_ID, changed]]), "USD"),
    ).toThrow("demo_payment_selection_changed");
    expect(() =>
      demoRetryStock(
        order,
        new Map([[PRODUCT_ID, product({ availability: "OUT_OF_STOCK" })]]),
        "USD",
      ),
    ).toThrow("product_unavailable");
  });
  it("looks up the verified owner's Order before quoting or reserving", async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = {
      order: { findFirst },
      demoPaymentCommand: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const quote = jest.fn(),
      reserve = jest.fn();
    const coordinator = new DemoPaymentCoordinator(prisma, {
      quote,
      reserve,
    } as unknown as DemoPaymentStock);
    await expect(
      coordinator.start(ID, { expectedVersion: 1 }, KEY, USER, {
        signingPolicy: { requestId: USER.requestId },
        metadata: new Metadata(),
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ID, userId: USER.userId } }),
    );
    expect(quote).not.toHaveBeenCalled();
    expect(reserve).not.toHaveBeenCalled();
  });
});
