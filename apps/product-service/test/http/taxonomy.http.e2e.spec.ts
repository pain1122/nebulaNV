// apps/product-service/test/http/taxonomy.http.e2e.spec.ts
import { httpJson } from "../utils/http";

const PRODUCT_HTTP = process.env.PRODUCT_HTTP_URL || "http://127.0.0.1:3003";
const AUTH_HTTP = process.env.AUTH_HTTP_URL || "http://127.0.0.1:3001";

const BASE = `${PRODUCT_HTTP}/taxonomies`;
const KIND = "category.default";

type LoginResp = { accessToken: string };

describe("Product taxonomy HTTP (category.default kind)", () => {
  let id = "";
  let slug = "";
  let admin = "";

  beforeAll(async () => {
    // login admin
    const at = await httpJson<LoginResp>("POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
      password: process.env.SEED_ADMIN_PASS ?? "Admin123!",
    });
    admin = at.accessToken;
  });

  it("POST /taxonomies/:kind (admin) creates taxonomy", async () => {
    slug = `e2e-tax-http-${Date.now()}`;
    const body = {
      slug,
      title: "E2E HTTP Category",
      description: "",
      parentId: null,
      isHidden: false,
      sortOrder: 0,
    };

    const res = await httpJson<any>("POST", `${BASE}/${KIND}`, body, {
      authorization: `Bearer ${admin}`,
    });

    expect(res.data.id).toBeTruthy();
    expect(res.data.slug).toBe(slug);
    expect(res.data.kind).toBe(KIND);
    expect(res.data.scope).toBe("product");

    id = res.data.id;
  });

  it("GET /taxonomies/:kind/:id returns the created item", async () => {
    const res = await httpJson<any>("GET", `${BASE}/${KIND}/${id}`);

    expect(res.data.id).toBe(id);
    expect(res.data.slug).toBe(slug);
    expect(res.data.kind).toBe(KIND);
    expect(res.data.scope).toBe("product");
    expect(typeof res.data.hasChildren).toBe("boolean");
  });

  it("GET /taxonomies/:kind lists and finds the created item", async () => {
    // no search filter here; just list page 1 and make sure our item is present
    const res = await httpJson<any>("GET", `${BASE}/${KIND}?page=1&limit=50`);

    const list = Array.isArray(res.data) ? res.data : [];
    expect(Array.isArray(list)).toBe(true);

    const hit = list.find((t: any) => t.id === id);
    expect(!!hit).toBe(true);
    expect(typeof hit.hasChildren).toBe("boolean");
  });

  it("PATCH /taxonomies/:kind/:id (admin) updates title", async () => {
    const body = { title: "E2E HTTP Category Pro" };

    const res = await httpJson<any>("PATCH", `${BASE}/${KIND}/${id}`, body, {
      authorization: `Bearer ${admin}`,
    });

    expect(res.data.id).toBe(id);
    expect(res.data.title).toBe("E2E HTTP Category Pro");
  });

  it("DELETE /taxonomies/:kind/:id (admin) deletes the taxonomy", async () => {
    const res = await httpJson<any>(
      "DELETE",
      `${BASE}/${KIND}/${id}`,
      undefined,
      { authorization: `Bearer ${admin}` },
    );

    expect(res.data).toBe(true);
  });
});
