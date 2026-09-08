import { NextRequest } from "next/server";
import { POST as createTaxonomy } from "../app/api/taxonomy/create/route";
import { GET as listTaxonomies } from "../app/api/taxonomy/route";

function taxonomy() {
  return {
    id: "taxonomy-1",
    scope: "product",
    kind: "category.default",
    slug: "chairs",
    title: "Chairs",
    description: "",
    parentId: "",
    path: "chairs",
    sortOrder: 0,
    isHidden: false,
    isSystem: false,
    hasChildren: false,
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  };
}

describe("current web taxonomy BFF gateway boundary", () => {
  beforeEach(() => {
    process.env.NEBULA_GATEWAY_API_BASE_URL = "http://127.0.0.1:3002";
    process.env.NEBULA_PUBLIC_CLIENT_ID = "admin-web-local";
    process.env.NEBULA_APPLICATION_ORIGIN = "http://localhost:3000";
  });

  afterEach(() => jest.restoreAllMocks());

  it("maps the panel kind and lists through the gateway URL only", async () => {
    const fetchMock = jest.fn<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    >(async () =>
      new Response(
        JSON.stringify({
          data: [taxonomy()],
          meta: { pagination: { page: 2, limit: 5, total: 1 } },
          requestId: "request-taxonomy",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await listTaxonomies(
      new NextRequest(
        "http://localhost:3000/api/taxonomy?kind=product_cat&page=2&limit=5",
        { headers: { authorization: "Bearer access-token" } },
      ),
    );
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "http://127.0.0.1:3002/api/v1/product-taxonomies?kind=category.default&limit=5&page=2",
    );
    await expect(response.json()).resolves.toMatchObject({
      page: 2,
      limit: 5,
      total: 1,
    });
  });

  it("creates through the typed admin gateway operation with idempotency", async () => {
    const fetchMock = jest.fn<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    >(async () =>
      new Response(
        JSON.stringify({
          data: taxonomy(),
          meta: {},
          requestId: "request-taxonomy",
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await createTaxonomy(
      new NextRequest("http://localhost:3000/api/taxonomy/create", {
        method: "POST",
        headers: {
          authorization: "Bearer access-token",
          "content-type": "application/json",
          "idempotency-key": "0123456789abcdef",
        },
        body: JSON.stringify({
          kind: "product_cat",
          title: "Chairs",
          slug: "chairs",
        }),
      }),
    );
    const [url, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(url).toBe(
      "http://127.0.0.1:3002/api/v1/admin/product-taxonomies",
    );
    expect(headers.get("idempotency-key")).toBe("0123456789abcdef");
    expect(JSON.parse(String(init?.body))).toEqual({
      kind: "category.default",
      slug: "chairs",
      title: "Chairs",
    });
  });
});
