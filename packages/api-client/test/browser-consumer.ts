import {
  createGatewayClient,
  type GatewayFetch,
  type GatewayProductDto,
} from "../index";

const browserFetch: GatewayFetch = async (url, init) =>
  fetch(url, init as RequestInit);

const client = createGatewayClient({
  baseUrl: "https://api.example.test",
  publicClientId: "storefront-web",
  fetch: browserFetch,
});

void client.request("products_list", { query: { page: 1, limit: 20 } }).then((result) => {
  if (!result.ok) return;
  const first: GatewayProductDto | undefined = result.data.data[0];
  void first;
});
