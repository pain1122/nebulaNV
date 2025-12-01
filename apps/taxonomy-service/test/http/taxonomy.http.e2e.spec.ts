// apps/taxonomy-service/test/http/taxonomy.http.e2e.spec.ts
import { httpJson } from "../utils/http";

const TAXONOMY_HTTP = process.env.TAXONOMY_HTTP_URL ?? "http://127.0.0.1:3006";
const AUTH_HTTP     = process.env.AUTH_HTTP_URL     ?? "http://127.0.0.1:3001";

type LoginResp = { accessToken: string };

const SCOPE = "product";
const KIND  = "category.default";

describe("taxonomy-service HTTP (admin writes, public reads)", () => {
  let admin = "";
  let rootId = "";
  let childId = "";

  beforeAll(async () => {
    const at = await httpJson<LoginResp>("POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
      password:   process.env.SEED_ADMIN_PASS ?? "Admin123!",
    });
    admin = at.accessToken;
  });

  it("POST /taxonomies creates a root taxonomy", async () => {
    const body = {
      scope: SCOPE,
      kind:  KIND,
      slug:  "root-cat",
      title: "Root Category",
      isTree: true,
    };

    const res = await httpJson<any>(
      "POST",
      `${TAXONOMY_HTTP}/taxonomies`,
      body,
      { authorization: `Bearer ${admin}` }
    );

    // service returns { data: dto }
    const t = res.data;

    expect(t.id).toBeDefined();
    expect(t.scope).toBe(SCOPE);
    expect(t.kind).toBe(KIND);
    expect(t.slug).toBe("root-cat");
    expect(t.isTree).toBe(true);
    expect(t.parentId).toBeNull();
    expect(t.depth).toBe(0);
    expect(t.path).toBe("root-cat");

    rootId = t.id;
  });

  it("POST /taxonomies creates a child taxonomy with correct depth/path", async () => {
    const body = {
      scope:    SCOPE,
      kind:     KIND,
      slug:     "child-cat",
      title:    "Child Category",
      parentId: rootId,
    };

    const res = await httpJson<any>(
      "POST",
      `${TAXONOMY_HTTP}/taxonomies`,
      body,
      { authorization: `Bearer ${admin}` }
    );

    const t = res.data;

    expect(t.id).toBeDefined();
    expect(t.parentId).toBe(rootId);
    expect(t.depth).toBe(1);
    expect(t.path).toBe("root-cat/child-cat");
    expect(t.isTree).toBe(true);

    childId = t.id;
  });

  it("GET /taxonomies returns both items filtered by scope/kind", async () => {
    const res = await httpJson<any>(
      "GET",
      `${TAXONOMY_HTTP}/taxonomies?scope=${SCOPE}&kind=${KIND}`,
      undefined,
      { authorization: `Bearer ${admin}` }
    );

    // list() returns { data, page, limit, total }
    expect(res).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);

    const ids = res.data.map((t: any) => t.id);
    expect(ids).toEqual(expect.arrayContaining([rootId, childId]));
  });

  it("GET /taxonomies/:id returns a single taxonomy", async () => {
    const res = await httpJson<any>(
      "GET",
      `${TAXONOMY_HTTP}/taxonomies/${childId}`,
      undefined,
      { authorization: `Bearer ${admin}` }
    );

    const t = res.data;

    expect(t.id).toBe(childId);
    expect(t.parentId).toBe(rootId);
    expect(t.depth).toBe(1);
  });

  it("DELETE /taxonomies/:id fails if taxonomy has children", async () => {
    await expect(
      httpJson<any>(
        "DELETE",
        `${TAXONOMY_HTTP}/taxonomies/${rootId}`,
        undefined,
        { authorization: `Bearer ${admin}` }
      )
    ).rejects.toThrow(/taxonomy_has_children/);
  });

  it("DELETE /taxonomies/:id deletes child then parent", async () => {
    const delChild = await httpJson<any>(
      "DELETE",
      `${TAXONOMY_HTTP}/taxonomies/${childId}`,
      undefined,
      { authorization: `Bearer ${admin}` }
    );
    expect(delChild).toBe(true);

    const delRoot = await httpJson<any>(
      "DELETE",
      `${TAXONOMY_HTTP}/taxonomies/${rootId}`,
      undefined,
      { authorization: `Bearer ${admin}` }
    );
    expect(delRoot).toBe(true);
  });
});
