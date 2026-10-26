import type { ClientGrpc } from "@nestjs/microservices";
import type { Metadata } from "@grpc/grpc-js";
import {
  digestGrpcS2SRequest,
  X_S2S_BODY_SHA256_HEADER,
} from "@nebula/grpc-auth";
import { orderv1 } from "@nebula/protos";
import { of } from "rxjs";
import type { GatewayRequestContext } from "../src/application/application.contracts";
import type { GatewayHttpRequest } from "../src/http/public-client-boundary";
import { GatewayOrderApiService } from "../src/order/gateway-order-api.service";
import {
  GatewayOrderStatus,
  GatewayDemoPaymentOutcome,
} from "../src/order/order-api.dto";

const USER_ID = "user-1";
const CART_ID = "8e2df5b8-f116-4fc8-b229-84abdf9a1830";
const ORDER_ID = "cc2021df-562b-433d-a749-26cc16487ab4";
const PRODUCT_ID = "28ed8f3d-981f-48c0-a2bf-3922de1af08c";
const requestContext: GatewayRequestContext = Object.freeze({
  requestId: "request-order-api-123",
  applicationId: "mobile-local",
  applicationProfile: "mobile",
  tenantId: "single-site-tenant",
  siteId: "single-site",
  channelId: "native-mobile",
  channelKind: "mobile",
  rateLimitProfile: "default",
});

function gatewayRequest(): GatewayHttpRequest {
  const identity = {
    userId: USER_ID,
    role: "user" as const,
    sessionRef: "session-1",
  };
  return {
    headers: {},
    rawHeaders: [],
    requestContext,
    actor: { kind: "authenticated", identity },
    user: identity,
    accessToken: "user-token",
  } as unknown as GatewayHttpRequest;
}

function cart(userId = USER_ID) {
  return orderv1.Cart.create({
    id: CART_ID,
    userId,
    currency: "USD",
    subtotal: "0.00",
    total: "0.00",
    expiresAt: "2026-08-15T01:00:00.000Z",
    items: [],
  });
}

function order(userId = USER_ID) {
  return orderv1.Order.create({
    id: ORDER_ID,
    orderNumber: "ORD-1",
    userId,
    status: "PENDING",
    version: 1,
    currency: "USD",
    checkoutMode: "DEMO_NO_PAYMENT",
    subtotal: "10.00",
    discountTotal: "0.00",
    taxTotal: "0.00",
    total: "10.00",
    createdAt: "2026-08-15T00:00:00.000Z",
    updatedAt: "2026-08-15T00:00:00.000Z",
    items: [],
  });
}

function harness(overrides: Record<string, jest.Mock>) {
  const unused = jest.fn((_request: unknown, _metadata?: unknown) => {
    void _request;
    void _metadata;
    return of({});
  });
  const raw = {
    GetCart: overrides.GetCart ?? unused,
    AddToCart: overrides.AddToCart ?? unused,
    UpdateCartItem: overrides.UpdateCartItem ?? unused,
    RemoveCartItem: overrides.RemoveCartItem ?? unused,
    Checkout: overrides.Checkout ?? unused,
    GetOrder: overrides.GetOrder ?? unused,
    ListOrders: overrides.ListOrders ?? unused,
    UpdateOrderStatus: overrides.UpdateOrderStatus ?? unused,
    AdminGetOrder: overrides.AdminGetOrder ?? unused,
    AdminListOrders: overrides.AdminListOrders ?? unused,
    StartDemoPayment: overrides.StartDemoPayment ?? unused,
    ResolveDemoPayment: overrides.ResolveDemoPayment ?? unused,
  };
  const client = {
    getService: jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return raw;
    }),
  } as unknown as ClientGrpc;
  return { service: new GatewayOrderApiService(client), raw };
}

describe("GatewayOrderApiService", () => {
  const originalKeys = process.env.GATEWAY_OUTBOUND_KEYS;

  beforeEach(() => {
    process.env.GATEWAY_OUTBOUND_KEYS = JSON.stringify({
      "order-service": {
        id: "gateway-order-v1",
        secret: "gateway-order-api-test-secret-000000001",
      },
    });
  });

  afterAll(() => {
    if (originalKeys === undefined) delete process.env.GATEWAY_OUTBOUND_KEYS;
    else process.env.GATEWAY_OUTBOUND_KEYS = originalKeys;
  });

  function paymentReply(outcome?: GatewayDemoPaymentOutcome) {
    const state =
      outcome === undefined || outcome === "UNKNOWN" ? "PROCESSING" : outcome;
    return orderv1.DemoPaymentResponse.create({
      data: {
        order: {
          ...order(),
          status:
            state === "PROCESSING"
              ? "PAYMENT_PROCESSING"
              : state === "SUCCEEDED"
                ? "PAID"
                : "PENDING",
          version: 2,
        },
        attempt: {
          id: CART_ID,
          orderId: ORDER_ID,
          mode: "DEMO",
          state,
          amount: "10.00",
          currency: "USD",
          failureCode: "",
          createdAt: "2026-10-24T00:00:00.000Z",
          updatedAt: "2026-10-24T00:00:00.000Z",
        },
      },
    });
  }

  it("signs demo start identity/version/key and maps an actual empty-item protobuf response", async () => {
    const codec = orderv1.OrderServiceService.startDemoPayment;
    const decoded = codec.responseDeserialize(
      codec.responseSerialize(paymentReply()),
    );
    const start = jest.fn(
      (req: orderv1.StartDemoPaymentRequest, metadata?: Metadata) => {
        void req;
        void metadata;
        return of(decoded);
      },
    );
    const { service, raw } = harness({ StartDemoPayment: start });
    const request = gatewayRequest();
    request.headers["idempotency-key"] = "demo-start-gateway-unit";
    const mapped = await service.startDemoPayment(request, ORDER_ID, {
      expectedVersion: 1,
    });
    expect(mapped).toMatchObject({
      order: { id: ORDER_ID, userId: USER_ID, version: 2, items: [] },
      attempt: { mode: "DEMO", state: "PROCESSING" },
    });
    const body = start.mock.calls[0][0];
    expect(body).toEqual({
      id: ORDER_ID,
      expectedVersion: 1,
      idempotencyKey: "demo-start-gateway-unit",
    });
    expect(start.mock.calls[0][1]?.get(X_S2S_BODY_SHA256_HEADER)).toEqual([
      digestGrpcS2SRequest(codec, body),
    ]);
    expect(
      digestGrpcS2SRequest(codec, { ...body, expectedVersion: 2 }),
    ).not.toBe(digestGrpcS2SRequest(codec, body));
    expect(raw.UpdateOrderStatus).not.toHaveBeenCalled();
  });

  it.each(Object.values(GatewayDemoPaymentOutcome))(
    "maps the explicit %s outcome and signs its target/version/key",
    async (outcome) => {
      const reply = paymentReply(outcome);
      const resolve = jest.fn(
        (req: orderv1.ResolveDemoPaymentRequest, metadata?: Metadata) => {
          void req;
          void metadata;
          return of(reply);
        },
      );
      const { service } = harness({ ResolveDemoPayment: resolve });
      const request = gatewayRequest();
      request.headers["idempotency-key"] = "demo-outcome-gateway-unit";
      const expectedVersion = outcome === "UNKNOWN" ? 2 : 1;
      const mapped = await service.resolveDemoPayment(
        request,
        ORDER_ID,
        CART_ID,
        { outcome, expectedVersion },
      );
      expect(mapped.attempt.state).toBe(
        outcome === "UNKNOWN" ? "PROCESSING" : outcome,
      );
      const body = resolve.mock.calls[0][0];
      expect(body).toEqual({
        id: ORDER_ID,
        attemptId: CART_ID,
        outcome,
        expectedVersion,
        idempotencyKey: "demo-outcome-gateway-unit",
      });
      expect(resolve.mock.calls[0][1]?.get(X_S2S_BODY_SHA256_HEADER)).toEqual([
        digestGrpcS2SRequest(
          orderv1.OrderServiceService.resolveDemoPayment,
          body,
        ),
      ]);
    },
  );

  it("maps a failed retry start without hiding the selection-changed result", async () => {
    const reply = paymentReply();
    reply.data!.order!.status = "PENDING";
    reply.data!.attempt!.state = "FAILED";
    reply.data!.attempt!.failureCode = "SELECTION_CHANGED";
    const { service } = harness({
      StartDemoPayment: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of(reply);
      }),
    });
    const request = gatewayRequest();
    request.headers["idempotency-key"] = "demo-start-gateway-unit";
    expect(
      await service.startDemoPayment(request, ORDER_ID, { expectedVersion: 1 }),
    ).toMatchObject({
      order: { status: "PENDING" },
      attempt: { state: "FAILED", failureCode: "SELECTION_CHANGED" },
    });
  });

  it("rejects missing keys for both demo commands before issuing RPC", async () => {
    const { service, raw } = harness({});
    await expect(
      service.startDemoPayment(gatewayRequest(), ORDER_ID, {
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.resolveDemoPayment(gatewayRequest(), ORDER_ID, CART_ID, {
        expectedVersion: 2,
        outcome: GatewayDemoPaymentOutcome.FAILED,
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(raw.StartDemoPayment).not.toHaveBeenCalled();
    expect(raw.ResolveDemoPayment).not.toHaveBeenCalled();
  });

  it.each([
    "missing",
    "owner",
    "order",
    "attempt",
    "mode",
    "amount",
    "currency",
    "state",
    "version",
    "failure",
    "date",
    "items",
  ])(
    "rejects malformed demo %s replies rather than concealing producer drift",
    async (field) => {
      const reply = paymentReply();
      const o = reply.data!.order!,
        a = reply.data!.attempt!;
      switch (field) {
        case "missing":
          reply.data = undefined;
          break;
        case "owner":
          o.userId = "another-owner";
          break;
        case "order":
          a.orderId = CART_ID;
          break;
        case "attempt":
          a.id = "not-a-uuid";
          break;
        case "mode":
          a.mode = "LIVE";
          break;
        case "amount":
          a.amount = "1.00";
          break;
        case "currency":
          a.currency = "EUR";
          break;
        case "state":
          a.state = "PREPARING";
          break;
        case "version":
          o.version = undefined;
          break;
        case "failure":
          a.failureCode = "provider-secret";
          break;
        case "date":
          a.updatedAt = "invalid-date";
          break;
        case "items":
          Reflect.deleteProperty(o, "items");
          break;
      }
      const { service } = harness({
        StartDemoPayment: jest.fn((_request: unknown, _metadata?: unknown) => {
          void _request;
          void _metadata;
          return of(reply);
        }),
      });
      const request = gatewayRequest();
      request.headers["idempotency-key"] = "demo-start-gateway-unit";
      await expect(
        service.startDemoPayment(request, ORDER_ID, { expectedVersion: 1 }),
      ).rejects.toMatchObject({ status: 502 });
    },
  );

  it("rejects a resolution reply from a different attempt", async () => {
    const { service } = harness({
      ResolveDemoPayment: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of(paymentReply(GatewayDemoPaymentOutcome.FAILED));
      }),
    });
    const request = gatewayRequest();
    request.headers["idempotency-key"] = "demo-outcome-gateway-unit";
    await expect(
      service.resolveDemoPayment(request, ORDER_ID, PRODUCT_ID, {
        expectedVersion: 1,
        outcome: GatewayDemoPaymentOutcome.FAILED,
      }),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("signs admin filter bodies and maps another customer's order without impersonation", async () => {
    const snapshot = order(PRODUCT_ID);
    const list = jest.fn(
      (request: orderv1.AdminListOrdersRequest, metadata?: Metadata) => {
        void request;
        void metadata;
        return of({ data: [snapshot], page: 1, limit: 20, total: 1 });
      },
    );
    const get = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({ data: snapshot });
    });
    const { service } = harness({ AdminListOrders: list, AdminGetOrder: get });
    const query = { userId: PRODUCT_ID.toUpperCase() };
    expect(await service.adminList(gatewayRequest(), query)).toMatchObject({
      data: [{ userId: PRODUCT_ID }],
      page: 1,
      limit: 20,
      total: 1,
    });
    expect(list.mock.calls[0][0]).toEqual({
      userId: PRODUCT_ID.toUpperCase(),
      status: undefined,
      page: 1,
      limit: 20,
    });
    expect(list.mock.calls[0][1]?.get(X_S2S_BODY_SHA256_HEADER)).toEqual([
      digestGrpcS2SRequest(
        orderv1.OrderServiceService.adminListOrders,
        list.mock.calls[0][0],
      ),
    ]);
    expect(
      await service.adminGet(gatewayRequest(), ORDER_ID.toUpperCase()),
    ).toMatchObject({ id: ORDER_ID, userId: PRODUCT_ID });
  });

  it("honors an empty protobuf list without inventing pagination", async () => {
    const codec = orderv1.OrderServiceService.adminListOrders;
    const decoded = codec.responseDeserialize(
      codec.responseSerialize(
        orderv1.AdminListOrdersResponse.create({
          data: [],
          page: 1,
          limit: 20,
          total: 0,
        }),
      ),
    );
    const { service } = harness({
      AdminListOrders: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of(decoded);
      }),
    });
    expect(await service.adminList(gatewayRequest(), {})).toEqual({
      data: [],
      page: 1,
      limit: 20,
      total: 0,
    });
  });

  it.each([
    { page: 2 },
    { limit: 100 },
    { total: -1 },
    { total: 1.5 },
    { total: 0, data: [order()] },
    { total: 21, data: Array.from({ length: 21 }, () => order()) },
  ])("rejects admin pagination drift: %j", async (changes) => {
    const { service } = harness({
      AdminListOrders: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ data: [], page: 1, limit: 20, total: 0, ...changes });
      }),
    });
    await expect(service.adminList(gatewayRequest(), {})).rejects.toMatchObject(
      { status: 502 },
    );
  });

  it("rejects a mismatching detail or filter response", async () => {
    const { service } = harness({
      AdminGetOrder: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ data: order() });
      }),
      AdminListOrders: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ data: [order()], page: 1, limit: 20, total: 1 });
      }),
    });
    await expect(
      service.adminGet(gatewayRequest(), PRODUCT_ID),
    ).rejects.toMatchObject({ status: 502 });
    await expect(
      service.adminList(gatewayRequest(), { userId: PRODUCT_ID }),
    ).rejects.toMatchObject({ status: 502 });
    await expect(
      service.adminList(gatewayRequest(), { status: "PAID" as never }),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("derives actor identity from signed context instead of request fields", async () => {
    const addToCart = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({ data: cart() });
    });
    const { service } = harness({ AddToCart: addToCart });
    await service.addToCart(gatewayRequest(), {
      productId: PRODUCT_ID,
      quantity: 2,
    });
    expect(addToCart.mock.calls[0]?.[0]).toEqual({
      userId: "",
      productId: PRODUCT_ID,
      quantity: 2,
      variantId: undefined,
    });
  });

  it("rejects cart and order replies owned by another actor", async () => {
    const wrongCart = harness({
      GetCart: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ data: cart("other-user") });
      }),
    });
    await expect(
      wrongCart.service.getCart(gatewayRequest()),
    ).rejects.toMatchObject({ status: 502 });

    const wrongOrder = harness({
      ListOrders: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ data: [order("other-user")] });
      }),
    });
    await expect(
      wrongOrder.service.list(gatewayRequest(), {}),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("keeps status mutation separate and signs version/key with the command", async () => {
    const response = { ...order("customer-2"), status: "PAID", version: 2 };
    const update = jest.fn(
      (input: orderv1.UpdateOrderStatusRequest, metadata?: Metadata) => {
        void input;
        void metadata;
        return of({ data: response });
      },
    );
    const { service, raw } = harness({ UpdateOrderStatus: update });
    const request = gatewayRequest();
    request.headers["idempotency-key"] = "order-status-gateway-unit";
    expect(
      await service.updateStatus(request, ORDER_ID, {
        status: GatewayOrderStatus.PAID,
        expectedVersion: 1,
      }),
    ).toMatchObject({ status: "PAID", version: 2 });
    expect(update.mock.calls[0][0]).toEqual({
      id: ORDER_ID,
      status: "PAID",
      expectedVersion: 1,
      idempotencyKey: "order-status-gateway-unit",
    });
    expect(update.mock.calls[0][1]?.get(X_S2S_BODY_SHA256_HEADER)).toEqual([
      digestGrpcS2SRequest(
        orderv1.OrderServiceService.updateOrderStatus,
        update.mock.calls[0][0],
      ),
    ]);
    expect(raw.AdminListOrders).not.toHaveBeenCalled();
    expect(raw.AdminGetOrder).not.toHaveBeenCalled();
  });

  it("rejects missing mutation keys before RPC and version/status reply drift", async () => {
    const response = { ...order(), status: "PAID", version: 3 };
    const { service, raw } = harness({
      UpdateOrderStatus: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ data: response });
      }),
    });
    await expect(
      service.updateStatus(gatewayRequest(), ORDER_ID, {
        status: GatewayOrderStatus.PAID,
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(raw.UpdateOrderStatus).not.toHaveBeenCalled();
    const request = gatewayRequest();
    request.headers["idempotency-key"] = "order-status-gateway-unit";
    await expect(
      service.updateStatus(request, ORDER_ID, {
        status: GatewayOrderStatus.PAID,
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("keeps historical replay version absent but requires it on current admin reads", async () => {
    const legacy = order();
    legacy.version = undefined;
    const codec = orderv1.OrderServiceService.checkout;
    const decoded = codec.responseDeserialize(
      codec.responseSerialize(orderv1.OrderResponse.create({ data: legacy })),
    );
    const { service } = harness({
      Checkout: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of(decoded);
      }),
      AdminGetOrder: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of(decoded);
      }),
    });
    const request = gatewayRequest();
    request.headers["idempotency-key"] = "checkout-legacy-unit-key";
    expect(await service.checkout(request, {})).not.toHaveProperty("version");
    await expect(service.adminGet(request, ORDER_ID)).rejects.toMatchObject({
      status: 502,
    });
  });

  it("forwards optional variant identity and maps exact selection totals", async () => {
    const response = cart();
    response.subtotal = response.total = "0.30";
    response.items = [
      orderv1.CartItem.create({
        id: ORDER_ID,
        productId: PRODUCT_ID,
        variantId: CART_ID,
        sku: "BLUE",
        name: "Desk",
        quantity: 3,
        unitPrice: "0.10",
        lineTotal: "0.30",
        selectedOptions: { colour: "Blue" },
      }),
    ];
    const add = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({ data: response });
    });
    const { service } = harness({ AddToCart: add });
    await expect(
      service.addToCart(gatewayRequest(), {
        productId: PRODUCT_ID,
        variantId: CART_ID,
        quantity: 3,
      }),
    ).resolves.toMatchObject({
      subtotal: "0.30",
      total: "0.30",
      items: [
        {
          variantId: CART_ID,
          selectedOptions: { colour: "Blue" },
          lineTotal: "0.30",
        },
      ],
    });
    expect(add.mock.calls[0]?.[0]).toEqual({
      userId: "",
      productId: PRODUCT_ID,
      variantId: CART_ID,
      quantity: 3,
    });
  });

  it("fails closed on older replies with missing exact Cart totals", async () => {
    const old = cart();
    old.total = "";
    const { service } = harness({
      GetCart: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ data: old });
      }),
    });
    await expect(service.getCart(gatewayRequest())).rejects.toMatchObject({
      status: 502,
    });
  });

  it("preserves demo variant snapshots through the actual Order codec", async () => {
    const snapshot = order();
    snapshot.items = [
      orderv1.OrderItem.create({
        id: CART_ID,
        productId: PRODUCT_ID,
        variantId: ORDER_ID,
        selectedOptions: { colour: "Blue" },
        sku: "BLUE",
        name: "Desk",
        quantity: 2,
        unitPrice: "5.00",
        lineTotal: "10.00",
      }),
    ];
    const decoded = orderv1.Order.decode(
      orderv1.Order.encode(snapshot).finish(),
    );
    const { service } = harness({
      GetOrder: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ data: decoded });
      }),
    });
    expect(await service.get(gatewayRequest(), ORDER_ID)).toMatchObject({
      checkoutMode: "DEMO_NO_PAYMENT",
      items: [
        {
          variantId: ORDER_ID,
          selectedOptions: { colour: "Blue" },
          unitPrice: "5.00",
          lineTotal: "10.00",
        },
      ],
    });
  });

  it("forwards the validated checkout header in the signed RPC body", async () => {
    const checkout = jest.fn(
      (request: orderv1.CheckoutRequest, metadata?: Metadata) => {
        void request;
        void metadata;
        return of({ data: order() });
      },
    );
    const { service } = harness({ Checkout: checkout });
    const request = gatewayRequest();
    request.headers["idempotency-key"] = "checkout-forward-unit-key";
    await service.checkout(request, { note: "demo" });
    expect(checkout.mock.calls[0]?.[0]).toEqual({
      userId: "",
      note: "demo",
      idempotencyKey: "checkout-forward-unit-key",
    });
    const decoded = orderv1.CheckoutRequest.decode(
      orderv1.CheckoutRequest.encode(checkout.mock.calls[0][0]).finish(),
    );
    expect(decoded.idempotencyKey).toBe("checkout-forward-unit-key");
    const digest = digestGrpcS2SRequest(
      orderv1.OrderServiceService.checkout,
      decoded,
    );
    expect(checkout.mock.calls[0]?.[1]?.get(X_S2S_BODY_SHA256_HEADER)).toEqual([
      digest,
    ]);
    expect(
      digestGrpcS2SRequest(orderv1.OrderServiceService.checkout, {
        ...decoded,
        idempotencyKey: "different-checkout-key",
      }),
    ).not.toBe(digest);
  });

  it("fails before issuing checkout RPC when the header is missing", async () => {
    const { service, raw } = harness({});
    await expect(service.checkout(gatewayRequest(), {})).rejects.toMatchObject({
      status: 400,
    });
    expect(raw.Checkout).not.toHaveBeenCalled();
  });

  it.each(["mode", "amount"])(
    "rejects malformed Order %s rather than hiding producer drift",
    async (field) => {
      const snapshot = order();
      if (field === "mode") snapshot.checkoutMode = "";
      else snapshot.total = "10";
      const { service } = harness({
        GetOrder: jest.fn((_request: unknown, _metadata?: unknown) => {
          void _request;
          void _metadata;
          return of({ data: snapshot });
        }),
      });
      await expect(
        service.get(gatewayRequest(), ORDER_ID),
      ).rejects.toMatchObject({ status: 502 });
    },
  );
});
