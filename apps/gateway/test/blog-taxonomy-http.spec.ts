import { type INestApplication } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import type { StructuredLogger } from "@packages/config";
import request from "supertest";
import { StaticApplicationRegistry } from "../src/application/application-registry";
import { GatewayAuthResolver } from "../src/auth/gateway-auth-resolver";
import { GatewayBearerAuthGuard } from "../src/auth/gateway-bearer-auth.guard";
import { GatewayBlogApiService } from "../src/blog/gateway-blog-api.service";
import { GatewayBlogController } from "../src/blog/gateway-blog.controller";
import { configureGatewayHttp } from "../src/http/configure-http";
import { GatewayRoutePolicyInterceptor } from "../src/http/gateway-route-policy";
import { GatewayIdempotencyService } from "../src/state/gateway-idempotency.service";
import { GatewayBlogTaxonomyController } from "../src/taxonomy/gateway-blog-taxonomy.controller";
import { GatewayProductTaxonomyController } from "../src/taxonomy/gateway-product-taxonomy.controller";
import { GatewayTaxonomyApiService } from "../src/taxonomy/gateway-taxonomy-api.service";
import { TEST_ADMIN_IDENTITY_HEADERS, TEST_APPLICATION_REGISTRY_JSON } from "./application-fixture";

const ID = "ce85ed1f-b5cc-40e2-9f5a-b5ee7f82c145";
const KEY = "018f6b70-19a2-7b90-a8ab-123456789abc";

function quietLogger(): StructuredLogger {
  return { debug: jest.fn(), error: jest.fn(), log: jest.fn(), warn: jest.fn() };
}

describe("gateway Blog and scoped Taxonomy HTTP routes", () => {
  let app: INestApplication;
  let actorRole: "user" | "admin";
  let blog: Record<string, jest.Mock>;
  let taxonomy: Record<string, jest.Mock>;
  const registry = StaticApplicationRegistry.fromJson(TEST_APPLICATION_REGISTRY_JSON, { nodeEnv: "test" });

  beforeEach(async () => {
    actorRole = "admin";
    blog = {
      list: jest.fn().mockResolvedValue({ data: [], page: 1, limit: 20, total: 0 }),
      get: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
    };
    taxonomy = {
      list: jest.fn().mockResolvedValue({ data: [], page: 1, limit: 50, total: 0 }),
      get: jest.fn(), create: jest.fn().mockResolvedValue({ id: ID, scope: "product" }),
      update: jest.fn(), delete: jest.fn().mockResolvedValue({ success: true }),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [GatewayBlogController, GatewayProductTaxonomyController, GatewayBlogTaxonomyController],
      providers: [
        Reflector,
        { provide: GatewayBlogApiService, useValue: blog },
        { provide: GatewayTaxonomyApiService, useValue: taxonomy },
        {
          provide: GatewayAuthResolver,
          useValue: { resolve: jest.fn().mockImplementation(() => Promise.resolve({
            kind: "authenticated",
            identity: { userId: "admin-1", role: actorRole, sessionRef: "session-1" },
          })) },
        },
        {
          provide: GatewayIdempotencyService,
          useValue: {
            begin: jest.fn().mockResolvedValue({
              kind: "started",
              lease: { storageKey: "key", requestHash: "a".repeat(64), serializedInFlight: "state" },
            }),
            complete: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: APP_GUARD, useClass: GatewayBearerAuthGuard },
        { provide: APP_INTERCEPTOR, useClass: GatewayRoutePolicyInterceptor },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false, logger: false });
    configureGatewayHttp(app, {
      applicationRegistry: registry,
      jsonLimitBytes: 262_144,
      logger: quietLogger(),
      nodeEnv: "test",
    });
    await app.init();
  });

  afterEach(async () => app.close());

  it("exposes only published public Blog shapes and no invented admin reads", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/blog/posts")
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .expect(200);
    expect(response.body.meta.pagination).toEqual({ profile: "page-limit-total", page: 1, limit: 20, total: 0 });
    await request(app.getHttpServer())
      .get("/api/v1/admin/blog/posts")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .expect(404);
  });

  it("requires taxonomy kind and rejects caller-selected scope/system authority", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/product-taxonomies")
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .expect(400);
    await request(app.getHttpServer())
      .post("/api/v1/admin/product-taxonomies")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", KEY)
      .send({ kind: "category.default", slug: "desks", title: "Desks", scope: "blog" })
      .expect(400);
    expect(taxonomy.create).not.toHaveBeenCalled();
  });

  it("fixes product/blog facade selection in the route and retains admin policy", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/blog-taxonomies")
      .query({ kind: "tag.default" })
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .expect(200);
    expect(taxonomy.list).toHaveBeenCalledWith(expect.any(Object), "blog", expect.objectContaining({ kind: "tag.default" }));

    actorRole = "user";
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/product-taxonomies/${ID}`)
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer user-token")
      .set("Idempotency-Key", KEY)
      .expect(403);
    expect(taxonomy.delete).not.toHaveBeenCalled();
  });
});
