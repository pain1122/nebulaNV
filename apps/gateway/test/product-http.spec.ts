import { type INestApplication } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import type { StructuredLogger } from "@packages/config";
import request from "supertest";
import { StaticApplicationRegistry } from "../src/application/application-registry";
import { GatewayAuthResolver } from "../src/auth/gateway-auth-resolver";
import { GatewayBearerAuthGuard } from "../src/auth/gateway-bearer-auth.guard";
import { configureGatewayHttp } from "../src/http/configure-http";
import { GatewayRoutePolicyInterceptor } from "../src/http/gateway-route-policy";
import { GatewayProductApiService } from "../src/product/gateway-product-api.service";
import { GatewayProductController } from "../src/product/gateway-product.controller";
import { GatewayIdempotencyService } from "../src/state/gateway-idempotency.service";
import {
  TEST_ADMIN_IDENTITY_HEADERS,
  TEST_APPLICATION_REGISTRY_JSON,
} from "./application-fixture";

const PRODUCT_ID = "d90a947b-3717-44f3-aa21-f6a92767f65c";
const IMAGE_ID = "5b16245d-b3e1-4a50-92cb-b67a6014b30a";
const IDEMPOTENCY_KEY = "018f6b70-19a2-7b90-a8ab-123456789abc";

function quietLogger(): StructuredLogger {
  return {
    debug: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
  };
}

function product() {
  return { id: PRODUCT_ID, title: "Desk", status: "ACTIVE", deletedAt: "" };
}

describe("gateway Product HTTP routes", () => {
  let app: INestApplication;
  let actorRole: "user" | "admin";
  let products: Record<string, jest.Mock>;
  let idempotency: { begin: jest.Mock; complete: jest.Mock };
  const registry = StaticApplicationRegistry.fromJson(
    TEST_APPLICATION_REGISTRY_JSON,
    { nodeEnv: "test" },
  );

  beforeEach(async () => {
    actorRole = "admin";
    products = {
      listPublic: jest.fn().mockResolvedValue({ data: [product()], total: 1 }),
      getPublic: jest.fn().mockResolvedValue(product()),
      listAdmin: jest.fn().mockResolvedValue({ data: [product()], total: 1 }),
      getAdmin: jest.fn().mockResolvedValue(product()),
      create: jest.fn().mockResolvedValue(product()),
      update: jest.fn().mockResolvedValue(product()),
      mutateById: jest.fn().mockResolvedValue(product()),
      applyDiscount: jest.fn().mockResolvedValue({ updated: 2 }),
      listGallery: jest.fn().mockResolvedValue([]),
      addImages: jest.fn().mockResolvedValue([]),
      reorderImages: jest.fn().mockResolvedValue([]),
      removeImage: jest.fn().mockResolvedValue([]),
    };
    idempotency = {
      begin: jest.fn().mockResolvedValue({
        kind: "started",
        lease: {
          storageKey: "test-key",
          requestHash: "a".repeat(64),
          serializedInFlight: "test-state",
        },
      }),
      complete: jest.fn().mockResolvedValue(undefined),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [GatewayProductController],
      providers: [
        Reflector,
        { provide: GatewayProductApiService, useValue: products },
        {
          provide: GatewayAuthResolver,
          useValue: {
            resolve: jest.fn().mockImplementation(() =>
              Promise.resolve({
                kind: "authenticated",
                identity: {
                  userId: "admin-1",
                  role: actorRole,
                  sessionRef: "session-ref-1",
                },
              }),
            ),
          },
        },
        { provide: GatewayIdempotencyService, useValue: idempotency },
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

  it("keeps lifecycle controls out of public reads", async () => {
    const accepted = await request(app.getHttpServer())
      .get("/api/v1/products")
      .query({ page: 1, limit: 20 })
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .expect(200);
    expect(accepted.body.meta.pagination).toEqual({ profile: "total-only", total: 1 });
    expect(products.listPublic).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ page: 1, limit: 20 }),
    );

    await request(app.getHttpServer())
      .get("/api/v1/products")
      .query({ status: "DRAFT" })
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .expect(400);
    await request(app.getHttpServer())
      .get(`/api/v1/products/${PRODUCT_ID}/gallery`)
      .query({ includeDeleted: true })
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .expect(400);
    expect(products.listPublic).toHaveBeenCalledTimes(1);
  });

  it("requires both the admin application and admin actor", async () => {
    actorRole = "user";
    await request(app.getHttpServer())
      .get("/api/v1/admin/products")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer user-token")
      .expect(403);

    actorRole = "admin";
    await request(app.getHttpServer())
      .get("/api/v1/admin/products")
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .set("Authorization", "Bearer admin-token")
      .expect(403);

    await request(app.getHttpServer())
      .get("/api/v1/admin/products")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .expect(200);
    expect(products.listAdmin).toHaveBeenCalledTimes(1);
  });

  it("accepts external content on create and rejects an empty patch before dispatch", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/admin/products")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", IDEMPOTENCY_KEY)
      .send({ title: "Desk", content: "Solid oak" })
      .expect(201);
    expect(products.create).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ title: "Desk", content: "Solid oak" }),
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/products/${PRODUCT_ID}`)
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", `${IDEMPOTENCY_KEY}-patch`)
      .send({})
      .expect(400);
    expect(products.update).not.toHaveBeenCalled();
  });

  it("enforces gallery bounds and fixed action identifiers", async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/admin/products/${PRODUCT_ID}/gallery`)
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", IDEMPOTENCY_KEY)
      .send({
        images: Array.from({ length: 51 }, (_, index) => ({
          url: `https://cdn.example/${index}.jpg`,
        })),
      })
      .expect(400);
    expect(products.addImages).not.toHaveBeenCalled();

    const response = await request(app.getHttpServer())
      .delete(`/api/v1/admin/products/${PRODUCT_ID}/gallery/${IMAGE_ID}`)
      .query({ hardDelete: true })
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", `${IDEMPOTENCY_KEY}-remove`)
      .expect(200);
    expect(response.body.meta.pagination).toEqual({ profile: "unpaginated" });
    expect(products.removeImage).toHaveBeenCalledWith(
      expect.any(Object),
      PRODUCT_ID,
      IMAGE_ID,
      true,
    );
  });
});
