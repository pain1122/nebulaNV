import type { ClientGrpc } from "@nestjs/microservices";
import { of } from "rxjs";
import type { GatewayRequestContext } from "../src/application/application.contracts";
import type { GatewayHttpRequest } from "../src/http/public-client-boundary";
import { GatewayTaxonomyApiService } from "../src/taxonomy/gateway-taxonomy-api.service";

const TAXONOMY_ID = "ce85ed1f-b5cc-40e2-9f5a-b5ee7f82c145";
const requestContext: GatewayRequestContext = Object.freeze({
  requestId: "request-taxonomy-api-123",
  applicationId: "admin-web-local",
  applicationProfile: "admin-web",
  tenantId: "single-site-tenant",
  siteId: "single-site",
  channelId: "admin-web",
  channelKind: "web",
  rateLimitProfile: "default",
});

function gatewayRequest(): GatewayHttpRequest {
  return {
    headers: {}, rawHeaders: [], requestContext,
    actor: { kind: "authenticated", identity: { userId: "admin-1", role: "admin", sessionRef: "session-1" } },
    user: { userId: "admin-1", role: "admin", sessionRef: "session-1" },
    accessToken: "admin-token",
  } as GatewayHttpRequest;
}

function record(scope: "product" | "blog") {
  return {
    id: TAXONOMY_ID, scope, kind: "category.default", slug: "desks", title: "Desks",
    description: "", parentId: "", path: "desks", isHidden: false, isSystem: false,
    sortOrder: 0, hasChildren: false, createdAt: "", updatedAt: "",
  };
}

function rawFacade(overrides: Record<string, jest.Mock>) {
  const unused = jest.fn(() => of({}));
  return {
    List: overrides.List ?? unused,
    Get: overrides.Get ?? unused,
    Create: overrides.Create ?? unused,
    Update: overrides.Update ?? unused,
    Delete: overrides.Delete ?? unused,
  };
}

describe("GatewayTaxonomyApiService", () => {
  const originalKeys = process.env.GATEWAY_OUTBOUND_KEYS;

  beforeEach(() => {
    process.env.GATEWAY_OUTBOUND_KEYS = JSON.stringify({
      "product-service": { id: "gateway-product-v1", secret: "gateway-product-taxonomy-secret-0000001" },
      "blog-service": { id: "gateway-blog-v1", secret: "gateway-blog-taxonomy-secret-0000000001" },
    });
  });

  afterAll(() => {
    if (originalKeys === undefined) delete process.env.GATEWAY_OUTBOUND_KEYS;
    else process.env.GATEWAY_OUTBOUND_KEYS = originalKeys;
  });

  it("uses the domain facade and never accepts scope from input", async () => {
    const productRaw = rawFacade({
      Create: jest.fn(() => of({ data: record("product") })),
    });
    const blogRaw = rawFacade({});
    const productClient = { getService: jest.fn(() => productRaw) } as unknown as ClientGrpc;
    const blogClient = { getService: jest.fn(() => blogRaw) } as unknown as ClientGrpc;
    const service = new GatewayTaxonomyApiService(productClient, blogClient);

    await service.create(gatewayRequest(), "product", {
      kind: "category.default", slug: "desks", title: "Desks",
    });
    expect(productClient.getService).toHaveBeenCalledWith("ProductTaxonomyService");
    expect(blogClient.getService).not.toHaveBeenCalled();
    expect(productRaw.Create.mock.calls[0]?.[0]).not.toHaveProperty("scope");
  });

  it("rejects a facade response with the wrong fixed scope", async () => {
    const productClient = {
      getService: jest.fn(() => rawFacade({ Get: jest.fn(() => of({ data: record("blog") })) })),
    } as unknown as ClientGrpc;
    const blogClient = { getService: jest.fn(() => rawFacade({})) } as unknown as ClientGrpc;
    const service = new GatewayTaxonomyApiService(productClient, blogClient);
    await expect(service.get(gatewayRequest(), "product", TAXONOMY_ID)).rejects.toMatchObject({ status: 502 });
  });
});
