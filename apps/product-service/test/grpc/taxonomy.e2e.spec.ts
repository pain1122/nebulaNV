// apps/product-service/test/grpc/taxonomy.e2e.spec.ts
import { status } from "@grpc/grpc-js";
import { loadClient, call, mdS2S, setS2STestActorToken } from "./helpers";
import { httpJson } from "../utils/http";

const PRODUCT_PROTO = require.resolve("@nebula/protos/product.proto");
const URL = process.env.PRODUCT_GRPC_URL || "127.0.0.1:50053";
const AUTH_HTTP = process.env.AUTH_HTTP_URL ?? "http://127.0.0.1:3001";

type LoginResponse = { accessToken: string };

describe("ProductTaxonomyService gRPC (admin required on writes)", () => {
  const client = loadClient<any>({
    url: URL,
    protoPath: PRODUCT_PROTO,
    pkg: ["product"],
    svc: "ProductTaxonomyService",
  });

  // For product-service we hard-lock scope="product" in the proxy,
  // so here we only care about the "kind"
  const kind = "category.default";

  let id = "";
  let slug = "";

  beforeAll(async () => {
    const login = await httpJson<LoginResponse>(
      "POST",
      `${AUTH_HTTP}/auth/login`,
      {
        identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
        password: process.env.SEED_ADMIN_PASS ?? "Admin123!",
      },
    );
    setS2STestActorToken(login.accessToken);
  });

  it("Create (admin) succeeds for product category kind", async () => {
    slug = `e2e-tax-grpc-${Date.now()}`;
    const input = {
      kind,
      slug,
      title: "E2E Product Category gRPC",
      description: "",
      parentId: "", // treated as null by taxonomy-service
      isHidden: false,
      sortOrder: 0,
    };

    const res = await call<any>(
      client,
      "Create",
      input,
      mdS2S({ role: "admin" }), // S2S admin metadata
    );

    expect(res.data).toBeTruthy();
    expect(res.data.id).toBeTruthy();
    expect(res.data.slug).toBe(slug);
    expect(res.data.kind).toBe(kind);
    expect(res.data.scope).toBe("product");
    expect(typeof res.data.hasChildren).toBe("boolean");

    id = res.data.id;
  });

  it("Get (public) returns the created taxonomy item", async () => {
    const res = await call<any>(
      client,
      "Get",
      { id },
      mdS2S(), // public read
    );

    expect(res.data.id).toBe(id);
    expect(res.data.slug).toBe(slug);
    expect(res.data.kind).toBe(kind);
    expect(res.data.scope).toBe("product");
    expect(typeof res.data.hasChildren).toBe("boolean");
  });

  it("Get (public) returns NOT_FOUND for a missing taxonomy item", async () => {
    await expect(
      call<any>(
        client,
        "Get",
        { id: "00000000-0000-0000-0000-000000000000" },
        mdS2S(),
      ),
    ).rejects.toMatchObject({
      code: status.NOT_FOUND,
      details: "taxonomy_not_found",
    });
  });

  it("List (public) finds the created item for that kind", async () => {
    const res = await call<any>(
      client,
      "List",
      {
        kind,
        page: 1,
        limit: 20,
        q: "Category gRPC", // should match title "E2E Product Category gRPC"
      },
      mdS2S(),
    );

    const list = Array.isArray(res.data) ? res.data : [];

    expect(Array.isArray(list)).toBe(true);

    const hit = list.find((t: any) => t.id === id);
    expect(!!hit).toBe(true);
    expect(typeof hit.hasChildren).toBe("boolean");
  });

  it("Update (admin) changes title", async () => {
    const newTitle = "E2E Product Category gRPC Pro";

    const res = await call<any>(
      client,
      "Update",
      {
        id,
        title: newTitle,
      },
      mdS2S({ role: "admin" }),
    );

    expect(res.data.id).toBe(id);
    expect(res.data.title).toBe(newTitle);
    expect(res.data.kind).toBe(kind);
  });

  it("Delete (admin) removes the taxonomy item", async () => {
    const res = await call<any>(
      client,
      "Delete",
      { id },
      mdS2S({ role: "admin" }),
    );

    expect(res.success).toBe(true);
  });
});
