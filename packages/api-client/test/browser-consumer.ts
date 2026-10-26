import {
  createGatewayClient,
  type GatewayFetch,
  type GatewayProductDto,
} from "../index";

void clientDemoTypes;
function clientDemoTypes(client: ReturnType<typeof createGatewayClient>) {
  return client
    .request("admin_orders_demo_payment_outcome", {
      accessToken: "admin-token",
      idempotencyKey: "browser-demo-outcome-key",
      path: { id: "order-id", attemptId: "attempt-id" },
      body: { expectedVersion: 2, outcome: "UNKNOWN" },
    })
    .then((result) => {
      if (!result.ok || !result.data.data) return;
      const mode: "DEMO" = result.data.data.attempt.mode;
      const amount: string = result.data.data.order.total;
      void [mode, amount];
    });
}

const processingStatus: import("../index").GatewayOrderStatusUpdateDto = {
  status: "PAID",
  expectedVersion: 1,
};
void processingStatus;

const browserFetch: GatewayFetch = async (url, init) =>
  fetch(url, init as RequestInit);

const client = createGatewayClient({
  baseUrl: "https://api.example.test",
  publicClientId: "storefront-web",
  fetch: browserFetch,
});

void client
  .request("products_list", { query: { page: 1, limit: 20 } })
  .then((result) => {
    if (!result.ok) return;
    const first: GatewayProductDto | undefined = result.data.data[0];
    const labels = first?.variants.map((variant) => {
      const override: number | null = variant.priceOverride;
      return (override ?? variant.price).toFixed(2);
    });
    void labels;
  });

void client
  .request("orders_cart_add", {
    accessToken: "customer-token",
    idempotencyKey: "cart-add-browser",
    body: { productId: "product-id", variantId: "variant-id", quantity: 2 },
  })
  .then((result) => {
    if (!result.ok) return;
    const cart = result.data.data;
    if (!cart) return;
    const total: string = cart.total;
    const options: Readonly<Record<string, string>> | undefined =
      cart.items[0]?.selectedOptions;
    const variant: string | undefined = cart.items[0]?.variantId;
    void [total, options, variant];
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
