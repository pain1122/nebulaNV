// apps/blog-service/test/grpc/taxonomy.e2e.spec.ts
import { loadClient, call, mdS2S } from "./helpers";

const BLOG_PROTO = require.resolve("@nebula/protos/blog.proto");
const URL = process.env.BLOG_GRPC_URL || "127.0.0.1:50055";

describe("BlogTaxonomyService gRPC (admin required on writes)", () => {
  const client = loadClient<any>({
    url: URL,
    protoPath: BLOG_PROTO,
    pkg: ["blog"],
    svc: "BlogTaxonomyService",
  });

  // For blog-service we hard-lock scope="blog" in the proxy,
  // so here we only care about the "kind"
  const kind = "category.default";

  let id   = "";
  let slug = "";

  it("Create (admin) succeeds for blog category kind", async () => {
    slug = `e2e-blog-tax-grpc-${Date.now()}`;
    const input = {
      kind,
      slug,
      title: "E2E Blog Category gRPC",
      description: "",
      parentId: "",
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
  });

  it("List (public) finds the created item for that kind", async () => {
    const res = await call<any>(
      client,
      "List",
      {
        kind,
        page: 1,
        limit: 20,
        q: "Blog Category gRPC", // matches title
      },
      mdS2S(),
    );

    const list = Array.isArray(res.data) ? res.data : [];
    expect(Array.isArray(list)).toBe(true);

    const hit = list.find((t: any) => t.id === id);
    expect(!!hit).toBe(true);
  });

  it("Update (admin) changes title", async () => {
    const newTitle = "E2E Blog Category gRPC Pro";

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
