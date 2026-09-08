import {
  createGatewayClient,
  type GatewayFetch,
} from "../index";

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
