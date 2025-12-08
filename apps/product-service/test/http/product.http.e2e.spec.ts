// apps/product-service/test/http/product.http.e2e.spec.ts
import { httpJson } from "../utils/http";

const PRODUCT_HTTP = process.env.PRODUCT_HTTP_URL ?? "http://127.0.0.1:3003";
const AUTH_HTTP    = process.env.AUTH_HTTP_URL    ?? "http://127.0.0.1:3001";

type LoginResp = { accessToken: string };

describe("product-service HTTP (admin writes, public reads)", () => {
  let admin = "";
  let user  = "";
  let id    = "";

  beforeAll(async () => {
    // login normal user
    const ut = await httpJson<LoginResp>("POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_USER_EMAIL ?? "user@example.com",
      password:   process.env.SEED_USER_PASS  ?? "User123!",
    });
    user = ut.accessToken;

    // login admin
    const at = await httpJson<LoginResp>("POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
      password:   process.env.SEED_ADMIN_PASS  ?? "Admin123!",
    });
    admin = at.accessToken;

    // 📝 No need to create a category via HTTP anymore:
    // product-service uses default_product_category from settings-service
    // and we already seed that via the default-product-taxonomy initializer.
  });

  it("GET /products is public", async () => {
    const res = await httpJson<any>("GET", `${PRODUCT_HTTP}/products`);
    expect(res).toHaveProperty("data");
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("POST /products requires admin", async () => {
    await expect(
      httpJson<any>(
        "POST",
        `${PRODUCT_HTTP}/products`,
        { data: { title: "E2E Widget", price: 199.99 } },
        { authorization: `Bearer ${user}` },
      ),
    ).rejects.toBeTruthy();
  });

  it("POST /products (admin) creates", async () => {
    const res = await httpJson<any>(
      "POST",
      `${PRODUCT_HTTP}/products`,
      { data: { title: "E2E Widget", price: 199.99 } },
      { authorization: `Bearer ${admin}` },
    );
    id = res.data.id;
    expect(res.data.title).toBe("E2E Widget");
    // categoryId should be auto-filled with default_product_category
    expect(typeof res.data.categoryId).toBe("string");
    expect(res.data.categoryId.length).toBeGreaterThan(0);
  });

  it("GET /products/:id returns the created product", async () => {
    const res = await httpJson<any>("GET", `${PRODUCT_HTTP}/products/${id}`);
    expect(res.data.id).toBe(id);
  });

  it("PATCH /products/:id (admin) updates", async () => {
    const res = await httpJson<any>(
      "PATCH",
      `${PRODUCT_HTTP}/products/${id}`,
      { patch: { title: "E2E Widget Pro" } },
      { authorization: `Bearer ${admin}` },
    );
    expect(res.data.title).toBe("E2E Widget Pro");
  });

  it("GET /products lists includes the product", async () => {
    const res = await httpJson<any>("GET", `${PRODUCT_HTTP}/products?q=widget`);
    const hit = res.data.find((p: any) => p.id === id);
    expect(!!hit).toBe(true);
  });
});
