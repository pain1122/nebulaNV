// apps/taxonomy-service/test/grpc/taxonomy.grpc.e2e.spec.ts
import * as path from "path";
import { call, loadClient, mdS2S } from "./helpers";
import { taxonomy } from "@nebula/protos";

const URL = process.env.TAXONOMY_GRPC_URL ?? "127.0.0.1:50057";

const PROTO_PATH = path.resolve(
  __dirname,
  "../../../../packages/protos/taxonomy.proto"
);

const SCOPE = "product";
const KIND  = "category.default";

describe("taxonomy-service gRPC", () => {
  let client: taxonomy.TaxonomyServiceClient;
  let rootId: string;
  let childId: string;

  beforeAll(() => {
    client = loadClient<taxonomy.TaxonomyServiceClient>({
      url: URL,
      protoPath: PROTO_PATH,
      pkg: ["taxonomy"],
      svc: "TaxonomyService",
    });
  });

  it("CreateTaxonomy creates a root taxonomy", async () => {
    const res = await call<taxonomy.TaxonomyResponse>(
      client,
      "CreateTaxonomy",
      {
        data: {
          scope: SCOPE,
          kind:  KIND,
          slug:  "root-cat-grpc",
          title: "Root Category gRPC",
          isTree: true,
        },
      },
      mdS2S()
    );

    expect(res.data?.id).toBeDefined();
    expect(res.data?.scope).toBe(SCOPE);
    expect(res.data?.kind).toBe(KIND);
    expect(res.data?.slug).toBe("root-cat-grpc");
    expect(res.data?.depth).toBe(0);
    expect(res.data?.path).toBe("root-cat-grpc");

    rootId = res.data!.id;
  });

  it("CreateTaxonomy creates a child taxonomy", async () => {
    const res = await call<taxonomy.TaxonomyResponse>(
      client,
      "CreateTaxonomy",
      {
        data: {
          scope:    SCOPE,
          kind:     KIND,
          slug:     "child-cat-grpc",
          title:    "Child Category gRPC",
          parentId: rootId,
        },
      },
      mdS2S()
    );

    expect(res.data?.id).toBeDefined();
    expect(res.data?.parentId).toBe(rootId);
    expect(res.data?.depth).toBe(1);
    expect(res.data?.path).toBe("root-cat-grpc/child-cat-grpc");

    childId = res.data!.id;
  });

  it("ListTaxonomies returns both items", async () => {
    const res = await call<taxonomy.ListTaxonomiesResponse>(
      client,
      "ListTaxonomies",
      {
        scope: SCOPE,
        kind:  KIND,
        page:  1,
        limit: 10,
      },
      mdS2S()
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
      mdS2S()
    );

    expect(res.data?.id).toBe(childId);
    expect(res.data?.parentId).toBe(rootId);
  });

  it("DeleteTaxonomy refuses to delete parent with children", async () => {
    await expect(
      call<taxonomy.BasicResponse>(
        client,
        "DeleteTaxonomy",
        { id: rootId },
        mdS2S()
      )
    ).rejects.toBeTruthy();
  });

  it("DeleteTaxonomy deletes child then parent", async () => {
    const delChild = await call<taxonomy.BasicResponse>(
      client,
      "DeleteTaxonomy",
      { id: childId },
      mdS2S()
    );
    expect(delChild.success).toBe(true);

    const delRoot = await call<taxonomy.BasicResponse>(
      client,
      "DeleteTaxonomy",
      { id: rootId },
      mdS2S()
    );
    expect(delRoot.success).toBe(true);
  });
});
