import {
  ConflictException,
  ServiceUnavailableException,
  type INestApplication,
} from "@nestjs/common";
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
      createVariant: jest.fn().mockResolvedValue(product()),
      updateVariant: jest.fn().mockResolvedValue(product()),
      deleteVariant: jest.fn().mockResolvedValue(product()),
      mutateById: jest.fn().mockResolvedValue(product()),
      applyDiscount: jest.fn().mockResolvedValue({ updated: 2 }),
      listGallery: jest.fn().mockResolvedValue([]),
      updateImageMetadata: jest.fn().mockResolvedValue([]),
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
    expect(accepted.body.meta.pagination).toEqual({
      profile: "total-only",
      total: 1,
    });
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

  it("returns stable envelopes for Product outage and version conflict", async () => {
    products.listPublic.mockRejectedValueOnce(
      new ServiceUnavailableException(),
    );
    const unavailable = await request(app.getHttpServer())
      .get("/api/v1/products")
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .expect(503);
    expect(unavailable.body.error.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(unavailable.body.requestId).toBe(
      unavailable.headers["x-request-id"],
    );

    products.update.mockRejectedValueOnce(new ConflictException());
    const conflict = await request(app.getHttpServer())
      .patch(`/api/v1/admin/products/${PRODUCT_ID}`)
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", `${IDEMPOTENCY_KEY}-conflict`)
      .send({ title: "Revised desk", expectedVersion: 1 })
      .expect(409);
    expect(conflict.body.error.code).toBe("CONFLICT");
    expect(conflict.body.requestId).toBe(conflict.headers["x-request-id"]);
  });

  it("requires price, accepts external content, and rejects an empty patch", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/admin/products")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", `${IDEMPOTENCY_KEY}-missing-price`)
      .send({ title: "Desk" })
      .expect(400);
    expect(products.create).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .post("/api/v1/admin/products")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", IDEMPOTENCY_KEY)
      .send({ title: "Desk", price: 100, content: "Solid oak" })
      .expect(201);
    expect(products.create).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        title: "Desk",
        price: 100,
        content: "Solid oak",
      }),
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

  it("rejects caller-selected Product identity and site fields before service calls", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/admin/products")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", `${IDEMPOTENCY_KEY}-caller-site`)
      .send({
        title: "Desk",
        price: 100,
        actorUserId: "caller-selected-user",
        siteId: "caller-selected-site",
      })
      .expect(400);
    expect(products.create).not.toHaveBeenCalled();
  });

  it.each(["model3dUrl", "model3dPosterUrl", "vrPlanImageUrl"])(
    "rejects disabled %s before forwarding create or patch",
    async (field) => {
      const headers = {
        ...TEST_ADMIN_IDENTITY_HEADERS,
        Authorization: "Bearer admin-token",
        "Idempotency-Key": `${IDEMPOTENCY_KEY}-${field}`,
      };
      const created = await request(app.getHttpServer())
        .post("/api/v1/admin/products")
        .set(headers)
        .send({
          title: "Desk",
          price: 100,
          [field]: "https://provider.test/asset",
        })
        .expect(400);
      expect(created.body.error.code).toBe("VALIDATION_FAILED");
      const patched = await request(app.getHttpServer())
        .patch(`/api/v1/admin/products/${PRODUCT_ID}`)
        .set(headers)
        .send({ expectedVersion: 1, [field]: "https://provider.test/asset" })
        .expect(400);
      expect(patched.body.error.code).toBe("VALIDATION_FAILED");
      expect(products.create).not.toHaveBeenCalled();
      expect(products.update).not.toHaveBeenCalled();
    },
  );

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

  it("rejects caller authority in variant create, patch, and delete", async () => {
    const headers = {
      ...TEST_ADMIN_IDENTITY_HEADERS,
      Authorization: "Bearer admin-token",
      "Idempotency-Key": `${IDEMPOTENCY_KEY}-variant-authority`,
    };
    await request(app.getHttpServer())
      .post(`/api/v1/admin/products/${PRODUCT_ID}/variants`)
      .set(headers)
      .send({
        sku: "DESK-BLUE",
        options: { Color: "Blue" },
        expectedVersion: 1,
        actorUserId: "caller",
        tenantId: "caller",
        siteId: "caller",
      })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/products/${PRODUCT_ID}/variants/${IMAGE_ID}`)
      .set(headers)
      .send({ stockQuantity: 0, expectedVersion: 1, siteId: "caller" })
      .expect(400);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/products/${PRODUCT_ID}/variants/${IMAGE_ID}`)
      .set(headers)
      .query({ expectedVersion: 1, actorUserId: "caller" })
      .expect(400);
    expect(products.createVariant).not.toHaveBeenCalled();
    expect(products.updateVariant).not.toHaveBeenCalled();
    expect(products.deleteVariant).not.toHaveBeenCalled();
  });

  it("rejects storage and authority fields inside gallery items before forwarding", async () => {
    const headers = {
      ...TEST_ADMIN_IDENTITY_HEADERS,
      Authorization: "Bearer admin-token",
      "Idempotency-Key": `${IDEMPOTENCY_KEY}-gallery-forgery`,
    };
    await request(app.getHttpServer())
      .post(`/api/v1/admin/products/${PRODUCT_ID}/gallery`)
      .set(headers)
      .send({
        images: [
          {
            mediaId: IMAGE_ID,
            storageKey: "provider/key",
            bucket: "private",
            readUrl: "https://provider.test/asset",
            actorUserId: "caller",
          },
        ],
      })
      .expect(400);
    await request(app.getHttpServer())
      .put(`/api/v1/admin/products/${PRODUCT_ID}/gallery/order`)
      .set(headers)
      .send({ orders: [{ id: IMAGE_ID, sort: 0, siteId: "caller" }] })
      .expect(400);
    expect(products.addImages).not.toHaveBeenCalled();
    expect(products.reorderImages).not.toHaveBeenCalled();
  });

  it("requires versioned admin variant writes and validates their path", async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/admin/products/${PRODUCT_ID}/variants`)
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", `${IDEMPOTENCY_KEY}-variant-invalid`)
      .send({ sku: "SHIRT-M", options: { Size: "M" } })
      .expect(400);
    expect(products.createVariant).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .post(`/api/v1/admin/products/${PRODUCT_ID}/variants`)
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", `${IDEMPOTENCY_KEY}-variant-create`)
      .send({ sku: "SHIRT-M", options: { Size: "M" }, expectedVersion: 1 })
      .expect(201);
    expect(products.createVariant).toHaveBeenCalledWith(
      expect.any(Object),
      PRODUCT_ID,
      expect.objectContaining({ sku: "SHIRT-M", expectedVersion: 1 }),
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/products/${PRODUCT_ID}/variants/${IMAGE_ID}`)
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", `${IDEMPOTENCY_KEY}-variant-patch`)
      .send({ expectedVersion: 2 })
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/products/${PRODUCT_ID}/variants/${IMAGE_ID}`)
      .query({ expectedVersion: 2 })
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", `${IDEMPOTENCY_KEY}-variant-delete`)
      .expect(200);
    expect(products.deleteVariant).toHaveBeenCalledWith(
      expect.any(Object),
      PRODUCT_ID,
      IMAGE_ID,
      2,
    );
  });

  it("preserves null/empty gallery metadata and validates the entry UUID", async () => {
    await request(app.getHttpServer())
      .patch(
        `/api/v1/admin/products/${PRODUCT_ID}/gallery/${IMAGE_ID}/metadata`,
      )
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", IDEMPOTENCY_KEY)
      .send({ expectedVersion: 1, title: null, alt: "" })
      .expect(200);
    expect(products.updateImageMetadata).toHaveBeenCalledWith(
      expect.any(Object),
      PRODUCT_ID,
      IMAGE_ID,
      expect.objectContaining({ expectedVersion: 1, title: null, alt: "" }),
    );
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/products/${PRODUCT_ID}/gallery/not-a-uuid/metadata`)
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", `${IDEMPOTENCY_KEY}-invalid`)
      .send({ expectedVersion: 1, alt: null })
      .expect(400);
  });
});
