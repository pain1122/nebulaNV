import { NextRequest } from "next/server";
import { PATCH as updateProduct } from "../app/api/products/[id]/route";
import { POST as createProduct } from "../app/api/products/route";

function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      authorization: "Bearer access-token",
      "content-type": "application/json",
      "idempotency-key": "0123456789abcdef",
    },
    body: JSON.stringify(body),
  });
}

function productEnvelope(description: string) {
  return {
    data: { id: "product-1", title: "Desk", description },
    meta: {},
    requestId: "request-product",
  };
}

describe("current web product BFF gateway mapping", () => {
  beforeEach(() => {
    process.env.NEBULA_GATEWAY_API_BASE_URL = "http://127.0.0.1:3002";
    process.env.NEBULA_PUBLIC_CLIENT_ID = "admin-web-local";
    process.env.NEBULA_APPLICATION_ORIGIN = "http://localhost:3000";
  });

  afterEach(() => jest.restoreAllMocks());

  it("unwraps the existing create data envelope for the external gateway DTO", async () => {
    const fetchMock = jest.fn<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    >(async () =>
      new Response(JSON.stringify(productEnvelope("Solid oak")), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    const response = await createProduct(
      request("/api/products", {
        data: { title: "Desk", content: "Solid oak" },
      }),
    );
    const call = fetchMock.mock.calls[0];
    const headers = new Headers(call[1]?.headers);
    expect(call[0]).toBe("http://127.0.0.1:3002/api/v1/admin/products");
    expect(JSON.parse(String(call[1]?.body))).toEqual({
      title: "Desk",
      content: "Solid oak",
    });
    expect(headers.get("authorization")).toBe("Bearer access-token");
    expect(headers.get("idempotency-key")).toBe("0123456789abcdef");
    await expect(response.json()).resolves.toMatchObject({
      data: { content: "Solid oak", description: "Solid oak" },
    });
  });

  it("unwraps the patch envelope and targets only the gateway update route", async () => {
    const fetchMock = jest.fn<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    >(async () =>
      new Response(JSON.stringify(productEnvelope("Updated")), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    await updateProduct(
      request("/api/products/product-1", {
        patch: { content: "Updated", promoActive: false },
      }),
      { params: Promise.resolve({ id: "product-1" }) },
    );
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe(
      "http://127.0.0.1:3002/api/v1/admin/products/product-1",
    );
    expect(JSON.parse(String(call[1]?.body))).toEqual({
      content: "Updated",
      promoActive: false,
    });
  });
});
