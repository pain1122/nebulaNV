// apps/product-service/test/grpc/product.e2e.spec.ts
import { loadClient, call, mdS2S } from "./helpers";
import { getDefaultProductCategoryGrpc } from "../utils/settings";

const PRODUCT_PROTO = require.resolve("@nebula/protos/product.proto");
const URL       = process.env.PRODUCT_GRPC_URL || "127.0.0.1:50053";
const AUTH_HTTP = process.env.AUTH_HTTP_URL    ?? "http://127.0.0.1:3001";

type LoginResp = { accessToken: string };

describe("ProductService gRPC (admin required on writes)", () => {
  const client = loadClient<any>({
    url: URL,
    protoPath: PRODUCT_PROTO,
    pkg: ["product"],
    svc: "ProductService",
  });

  let id = "";
  let categoryId = "";

  beforeAll(async () => {
    // (Optional) login admin – not strictly needed for S2S, but handy to ensure auth-service is alive
    await fetch(`${AUTH_HTTP}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
        password:   process.env.SEED_ADMIN_PASS  ?? "Admin123!",
      }),
    }).then(r => r.json() as Promise<LoginResp>);

    // Read the default product category from settings via gRPC
    categoryId = await getDefaultProductCategoryGrpc();
  });

  it("CreateProduct succeeds with S2S admin metadata", async () => {
    const input = { title: "E2E Widget gRPC", price: 149.5, categoryId };

    const res = await call<any>(
      client,
      "CreateProduct",
      { data: input },
      mdS2S({ role: "admin" }),
    );

    id = res.data.id;
    expect(res.data.title).toBe(input.title);
    expect(res.data.categoryId).toBe(categoryId);
  });

  it("GetProduct returns the created item (public)", async () => {
    const res = await call<any>(
      client,
      "GetProduct",
      { id },
      mdS2S(),
    );
    expect(res.data.id).toBe(id);
    expect(res.data.categoryId).toBe(categoryId);
  });

  it("ListProducts finds the created item (public)", async () => {
    const res = await call<any>(
      client,
      "ListProducts",
      { q: "gRPC", page: 1, limit: 20 },
      mdS2S(),
    );
    const hit = res.data.find((p: any) => p.id === id);
    expect(!!hit).toBe(true);
  });

  it("UpdateProduct (admin) changes title", async () => {
    const res = await call<any>(
      client,
      "UpdateProduct",
      { id, data: { title: "E2E Widget gRPC Pro" } },
      mdS2S({ role: "admin" }),
    );
    expect(res.data.title).toBe("E2E Widget gRPC Pro");
  });
});
