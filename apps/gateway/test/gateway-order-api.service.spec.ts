import type { ClientGrpc } from "@nestjs/microservices";
import { orderv1 } from "@nebula/protos";
import { of } from "rxjs";
import type { GatewayRequestContext } from "../src/application/application.contracts";
import type { GatewayHttpRequest } from "../src/http/public-client-boundary";
import { GatewayOrderApiService } from "../src/order/gateway-order-api.service";

const USER_ID = "user-1";
const CART_ID = "8e2df5b8-f116-4fc8-b229-84abdf9a1830";
const ORDER_ID = "cc2021df-562b-433d-a749-26cc16487ab4";
const PRODUCT_ID = "28ed8f3d-981f-48c0-a2bf-3922de1af08c";
const requestContext: GatewayRequestContext = Object.freeze({
  requestId: "request-order-api-123", applicationId: "mobile-local",
  applicationProfile: "mobile", tenantId: "single-site-tenant", siteId: "single-site",
  channelId: "native-mobile", channelKind: "mobile", rateLimitProfile: "default",
});

function gatewayRequest(): GatewayHttpRequest {
  const identity = { userId: USER_ID, role: "user" as const, sessionRef: "session-1" };
  return {
    headers: {}, rawHeaders: [], requestContext,
    actor: { kind: "authenticated", identity }, user: identity, accessToken: "user-token",
  } as GatewayHttpRequest;
}

function cart(userId = USER_ID) {
  return orderv1.Cart.create({ id: CART_ID, userId, currency: "USD", expiresAt: "2026-08-15T01:00:00.000Z", items: [] });
}

function order(userId = USER_ID) {
  return orderv1.Order.create({
    id: ORDER_ID, orderNumber: "ORD-1", userId, status: "PENDING", currency: "USD",
    subtotal: "10", discountTotal: "0", taxTotal: "0", total: "10",
    createdAt: "2026-08-15T00:00:00.000Z", updatedAt: "2026-08-15T00:00:00.000Z", items: [],
  });
}

function harness(overrides: Record<string, jest.Mock>) {
  const unused = jest.fn(() => of({}));
  const raw = {
    GetCart: overrides.GetCart ?? unused, AddToCart: overrides.AddToCart ?? unused,
    UpdateCartItem: overrides.UpdateCartItem ?? unused, RemoveCartItem: overrides.RemoveCartItem ?? unused,
    Checkout: overrides.Checkout ?? unused, GetOrder: overrides.GetOrder ?? unused,
    ListOrders: overrides.ListOrders ?? unused, UpdateOrderStatus: overrides.UpdateOrderStatus ?? unused,
  };
  const client = { getService: jest.fn(() => raw) } as unknown as ClientGrpc;
  return { service: new GatewayOrderApiService(client), raw };
}

describe("GatewayOrderApiService", () => {
  const originalKeys = process.env.GATEWAY_OUTBOUND_KEYS;

  beforeEach(() => {
    process.env.GATEWAY_OUTBOUND_KEYS = JSON.stringify({
      "order-service": { id: "gateway-order-v1", secret: "gateway-order-api-test-secret-000000001" },
    });
  });

  afterAll(() => {
    if (originalKeys === undefined) delete process.env.GATEWAY_OUTBOUND_KEYS;
    else process.env.GATEWAY_OUTBOUND_KEYS = originalKeys;
  });

  it("derives actor identity from signed context instead of request fields", async () => {
    const addToCart = jest.fn(() => of({ data: cart() }));
    const { service } = harness({ AddToCart: addToCart });
    await service.addToCart(gatewayRequest(), { productId: PRODUCT_ID, quantity: 2 });
    expect(addToCart.mock.calls[0]?.[0]).toEqual({ userId: "", productId: PRODUCT_ID, quantity: 2 });
  });

  it("rejects cart and order replies owned by another actor", async () => {
    const wrongCart = harness({ GetCart: jest.fn(() => of({ data: cart("other-user") })) });
    await expect(wrongCart.service.getCart(gatewayRequest())).rejects.toMatchObject({ status: 502 });

    const wrongOrder = harness({ ListOrders: jest.fn(() => of({ data: [order("other-user")] })) });
    await expect(wrongOrder.service.list(gatewayRequest(), {})).rejects.toMatchObject({ status: 502 });
  });

  it("keeps admin status mutation separate from personal list/read", async () => {
    const update = jest.fn(() => of({ data: order("customer-2") }));
    const { service, raw } = harness({ UpdateOrderStatus: update });
    await service.updateStatus(gatewayRequest(), ORDER_ID, "PAID");
    expect(update.mock.calls[0]?.[0]).toEqual({ id: ORDER_ID, status: "PAID" });
    expect(raw).not.toHaveProperty("AdminListOrders");
  });
});
