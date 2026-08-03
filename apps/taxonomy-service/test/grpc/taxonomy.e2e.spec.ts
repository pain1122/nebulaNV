// apps/taxonomy-service/test/grpc/taxonomy.grpc.e2e.spec.ts
import * as path from "path";
import {
  call,
  CODES,
  loadClient,
  mdProductService,
  mdS2S,
  setS2STestActorToken,
} from "./helpers";
import { taxonomy } from "@nebula/protos";
import { httpJson } from "../utils/http";

const URL = process.env.TAXONOMY_GRPC_URL ?? "127.0.0.1:50057";
const AUTH_HTTP = process.env.AUTH_HTTP_URL ?? "http://127.0.0.1:3001";

type LoginResponse = { accessToken: string };

const PROTO_PATH = path.resolve(
  __dirname,
  "../../../../packages/protos/taxonomy.proto",
);

const SCOPE = "product";
const KIND = "category.default";
const RUN_ID = Date.now().toString(36);
const ROOT_SLUG = `root-cat-grpc-${RUN_ID}`;
const CHILD_SLUG = `child-cat-grpc-${RUN_ID}`;

describe("taxonomy-service gRPC", () => {
  let client: taxonomy.TaxonomyServiceClient;
  let rootId: string;
  let childId: string;

  beforeAll(async () => {
    client = loadClient<taxonomy.TaxonomyServiceClient>({
      url: URL,
      protoPath: PROTO_PATH,
      pkg: ["taxonomy"],
      svc: "TaxonomyService",
    });
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

  it("CreateTaxonomy rejects service identity with forged user headers", async () => {
    const metadata = mdProductService();
    metadata.set("x-user-id", "forged-root-admin");
    metadata.set("x-user-role", "root-admin");

    await expect(
      call<taxonomy.TaxonomyResponse>(
        client,
        "CreateTaxonomy",
        {
          data: {
            scope: SCOPE,
            kind: KIND,
            slug: `forged-${RUN_ID}`,
            title: `Forged taxonomy ${RUN_ID}`,
            isTree: true,
          },
        },
        metadata,
      ),
    ).rejects.toMatchObject({ code: CODES.UNAUTHENTICATED });
  });

  it("EnsureSystemTaxonomy rejects caller and scope mismatches", async () => {
    await expect(
      call<taxonomy.TaxonomyResponse>(
        client,
        "EnsureSystemTaxonomy",
        {
          scope: "blog",
          kind: KIND,
          slug: "uncategorized",
          title: "Uncategorized",
          description: "Default blog category",
        },
        mdProductService(),
      ),
    ).rejects.toMatchObject({ code: CODES.PERMISSION_DENIED });
  });

  it("EnsureSystemTaxonomy rejects unsigned callers", async () => {
    await expect(
      call<taxonomy.TaxonomyResponse>(client, "EnsureSystemTaxonomy", {
        scope: SCOPE,
        kind: KIND,
        slug: "uncategorized",
        title: "Uncategorized",
        description: "Default product category",
      }),
    ).rejects.toMatchObject({ code: CODES.UNAUTHENTICATED });
  });

  it("EnsureSystemTaxonomy is idempotent for the product default", async () => {
    const request = {
      scope: SCOPE,
      kind: KIND,
      slug: "uncategorized",
      title: "Uncategorized",
      description: "Default product category",
    };

    const first = await call<taxonomy.TaxonomyResponse>(
      client,
      "EnsureSystemTaxonomy",
      request,
      mdProductService(),
    );
    const second = await call<taxonomy.TaxonomyResponse>(
      client,
      "EnsureSystemTaxonomy",
      request,
      mdProductService(),
    );

    expect(first.data?.id).toBeTruthy();
    expect(second.data?.id).toBe(first.data?.id);
  });

  it("CreateTaxonomy creates a root taxonomy", async () => {
    const res = await call<taxonomy.TaxonomyResponse>(
      client,
      "CreateTaxonomy",
      {
        data: {
          scope: SCOPE,
          kind: KIND,
          slug: ROOT_SLUG,
          title: `Taxonomy ${RUN_ID} Root`,
          isTree: true,
        },
      },
      mdS2S(),
    );

    expect(res.data?.id).toBeDefined();
    expect(res.data?.scope).toBe(SCOPE);
    expect(res.data?.kind).toBe(KIND);
    expect(res.data?.slug).toBe(ROOT_SLUG);
    expect(res.data?.depth).toBe(0);
    expect(res.data?.path).toBe(ROOT_SLUG);

    rootId = res.data!.id;
  });

  it("CreateTaxonomy creates a child taxonomy", async () => {
    const res = await call<taxonomy.TaxonomyResponse>(
      client,
      "CreateTaxonomy",
      {
        data: {
          scope: SCOPE,
          kind: KIND,
          slug: CHILD_SLUG,
          title: `Taxonomy ${RUN_ID} Child`,
          parentId: rootId,
        },
      },
      mdS2S(),
    );

    expect(res.data?.id).toBeDefined();
    expect(res.data?.parentId).toBe(rootId);
    expect(res.data?.depth).toBe(1);
    expect(res.data?.path).toBe(`${ROOT_SLUG}/${CHILD_SLUG}`);

    childId = res.data!.id;
  });

  it("ListTaxonomies returns both items", async () => {
    const res = await call<taxonomy.ListTaxonomiesResponse>(
      client,
      "ListTaxonomies",
      {
        scope: SCOPE,
        kind: KIND,
        page: 1,
        limit: 10,
        q: RUN_ID,
      },
      mdS2S(),
    );

    expect(res.data.length).toBeGreaterThanOrEqual(2);
    const ids = res.data.map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining([rootId, childId]));
  });

  it("GetTaxonomy returns the child", async () => {
    const res = await call<taxonomy.TaxonomyResponse>(
      client,
      "GetTaxonomy",
      { id: childId },
      mdS2S(),
    );

    expect(res.data?.id).toBe(childId);
    expect(res.data?.parentId).toBe(rootId);
  });

  it("GetTaxonomy returns NOT_FOUND for a missing taxonomy", async () => {
    await expect(
      call<taxonomy.TaxonomyResponse>(
        client,
        "GetTaxonomy",
        { id: "00000000-0000-0000-0000-000000000000" },
        mdS2S(),
      ),
    ).rejects.toMatchObject({
      code: CODES.NOT_FOUND,
      details: "taxonomy_not_found",
    });
  });

  it("DeleteTaxonomy refuses to delete parent with children", async () => {
    await expect(
      call<taxonomy.BasicResponse>(
        client,
        "DeleteTaxonomy",
        { id: rootId },
        mdS2S(),
      ),
    ).rejects.toBeTruthy();
  });

  it("DeleteTaxonomy deletes child then parent", async () => {
    const delChild = await call<taxonomy.BasicResponse>(
      client,
      "DeleteTaxonomy",
      { id: childId },
      mdS2S(),
    );
    expect(delChild.success).toBe(true);

    const delRoot = await call<taxonomy.BasicResponse>(
      client,
      "DeleteTaxonomy",
      { id: rootId },
      mdS2S(),
    );
    expect(delRoot.success).toBe(true);
  });
});
