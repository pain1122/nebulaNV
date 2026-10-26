import { createGatewayClient, type GatewayFetch } from "../index";

const processingStatus: import("../index").GatewayOrderStatusUpdateDto = {
  status: "PAID",
  expectedVersion: 1,
};
void processingStatus;

void clientDemoTypes;
function clientDemoTypes(client: ReturnType<typeof createGatewayClient>) {
  return client
    .request("orders_demo_payment_start", {
      accessToken: "customer-token",
      idempotencyKey: "native-demo-payment-key",
      path: { id: "order-id" },
      body: { expectedVersion: 1 },
    })
    .then((result) => {
      if (!result.ok || !result.data.data) return;
      const mode: "DEMO" = result.data.data.attempt.mode;
      const amount: string = result.data.data.attempt.amount;
      void [mode, amount];
    });
}

const nativeFetch: GatewayFetch = async () => ({
  ok: true,
  status: 200,
  headers: { get: () => null },
  text: async () => JSON.stringify({ data: { accessToken: "token" } }),
  arrayBuffer: async () => new ArrayBuffer(0),
});

const client = createGatewayClient({
  baseUrl: "https://api.example.test",
  publicClientId: "mobile",
  fetch: nativeFetch,
});

void client.request("auth_login", {
  body: { identifier: "person@example.com", password: "secret" },
});

void client
  .request("orders_cart_add", {
    accessToken: "customer-token",
    idempotencyKey: "cart-add-native",
    body: { productId: "product-id", variantId: "variant-id", quantity: 1 },
  })
  .then((result) => {
    if (!result.ok) return;
    const cart = result.data.data;
    if (!cart) return;
    const subtotal: string = cart.subtotal;
    const lineTotal: string | undefined = cart.items[0]?.lineTotal;
    void [subtotal, lineTotal];
  });

void client
  .request("products_get", { path: { id: "product-id" } })
  .then((result) => {
    if (!result.ok) return;
    const labels = result.data.data.variants.map((variant) => {
      const override: number | null = variant.priceOverride;
      return (override ?? variant.price).toFixed(2);
    });
    void labels;
  });

void client
  .request("orders_get", {
    accessToken: "customer-token",
    path: { id: "order-id" },
  })
  .then((result) => {
    if (!result.ok || !result.data.data) return;
    const order = result.data.data;
    const mode: "DEMO_NO_PAYMENT" = order.checkoutMode;
    const variant: string | undefined = order.items[0]?.variantId;
    const options: Readonly<Record<string, string>> | undefined =
      order.items[0]?.selectedOptions;
    void [mode, variant, options];
  });

void client
  .request("admin_orders_list", {
    accessToken: "admin-token",
    query: { status: "PENDING", userId: "customer-id", page: 1, limit: 20 },
  })
  .then((result) => {
    if (!result.ok) return;
    if (result.data.meta.pagination.profile !== "page-limit-total") return;
    const total: number = result.data.meta.pagination.total;
    const owner: string | undefined = result.data.data[0]?.userId;
    void [total, owner];
  });
void client
  .request("admin_orders_get", {
    accessToken: "admin-token",
    path: { id: "order-id" },
  })
  .then((result) => {
    if (!result.ok || !result.data.data) return;
    const owner: string = result.data.data.userId;
    void owner;
  });
