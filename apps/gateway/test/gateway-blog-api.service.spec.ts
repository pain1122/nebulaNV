import type { ClientGrpc } from "@nestjs/microservices";
import { blogv1 } from "@nebula/protos";
import { of } from "rxjs";
import type { GatewayRequestContext } from "../src/application/application.contracts";
import type { GatewayHttpRequest } from "../src/http/public-client-boundary";
import { GatewayBlogApiService } from "../src/blog/gateway-blog-api.service";

const POST_ID = "1ad9e646-cf89-4566-80ff-f1f3d70529d3";
const requestContext: GatewayRequestContext = Object.freeze({
  requestId: "request-blog-api-123",
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
    headers: {},
    rawHeaders: [],
    requestContext,
    actor: {
      kind: "authenticated",
      identity: { userId: "admin-1", role: "admin", sessionRef: "session-1" },
    },
    user: { userId: "admin-1", role: "admin", sessionRef: "session-1" },
    accessToken: "admin-token",
  } as GatewayHttpRequest;
}

function post(overrides: Partial<blogv1.Post> = {}) {
  return blogv1.Post.create({
    id: POST_ID,
    slug: "launch-post",
    title: "Launch",
    body: "Body",
    status: "PUBLISHED",
    createdAt: "2026-08-15T00:00:00.000Z",
    updatedAt: "2026-08-15T00:00:00.000Z",
    ...overrides,
  });
}

function harness(overrides: Record<string, jest.Mock>) {
  const unused = jest.fn(() => of({}));
  const raw = {
    ListPosts: overrides.ListPosts ?? unused,
    GetPost: overrides.GetPost ?? unused,
    CreatePost: overrides.CreatePost ?? unused,
    UpdatePost: overrides.UpdatePost ?? unused,
    DeletePost: overrides.DeletePost ?? unused,
  };
  const client = { getService: jest.fn(() => raw) } as unknown as ClientGrpc;
  return { service: new GatewayBlogApiService(client), raw };
}

describe("GatewayBlogApiService", () => {
  const originalKeys = process.env.GATEWAY_OUTBOUND_KEYS;

  beforeEach(() => {
    process.env.GATEWAY_OUTBOUND_KEYS = JSON.stringify({
      "blog-service": { id: "gateway-blog-v1", secret: "gateway-blog-api-test-secret-000000001" },
    });
  });

  afterAll(() => {
    if (originalKeys === undefined) delete process.env.GATEWAY_OUTBOUND_KEYS;
    else process.env.GATEWAY_OUTBOUND_KEYS = originalKeys;
  });

  it("rejects a non-published row from the public list", async () => {
    const { service } = harness({
      ListPosts: jest.fn(() => of({ data: [post({ status: "DRAFT" })], page: 1, limit: 20, total: 1 })),
    });
    await expect(service.list(gatewayRequest(), {})).rejects.toMatchObject({ status: 502 });
  });

  it("keeps updates sparse and never invents an admin read contract", async () => {
    const updatePost = jest.fn(() => of({ data: post() }));
    const { service, raw } = harness({ UpdatePost: updatePost });
    await service.update(gatewayRequest(), POST_ID, { title: "Renamed", tags: [] });
    expect(updatePost.mock.calls[0]?.[0]).toEqual({
      id: POST_ID,
      patch: { title: "Renamed", tags: [] },
    });
    expect(raw).not.toHaveProperty("AdminListPosts");
    expect(raw).not.toHaveProperty("AdminGetPost");
  });
});
