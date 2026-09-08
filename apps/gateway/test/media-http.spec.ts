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
import { GatewayMediaApiService } from "../src/media/gateway-media-api.service";
import { GatewayMediaAdminController } from "../src/media/gateway-media-admin.controller";
import { GatewayMediaOwnedController } from "../src/media/gateway-media-owned.controller";
import { GatewayMediaProtectedController } from "../src/media/gateway-media-protected.controller";
import { GatewayMediaPublicController } from "../src/media/gateway-media-public.controller";
import { GatewayMediaStrictController } from "../src/media/gateway-media-strict.controller";
import { GatewayIdempotencyService } from "../src/state/gateway-idempotency.service";
import { TEST_ADMIN_IDENTITY_HEADERS, TEST_APPLICATION_REGISTRY_JSON } from "./application-fixture";

const ID = "8a73870a-ea95-47b7-a289-48ef65855c60";
const KEY = "018f6b70-19a2-7b90-a8ab-123456789abc";
function quietLogger(): StructuredLogger { return { debug: jest.fn(), error: jest.fn(), log: jest.fn(), warn: jest.fn() }; }

describe("gateway Media JSON routes", () => {
  let app: INestApplication;
  let actorRole: "user" | "admin";
  let mediaApi: Record<string, jest.Mock>;
  const registry = StaticApplicationRegistry.fromJson(TEST_APPLICATION_REGISTRY_JSON, { nodeEnv: "test" });

  beforeEach(async () => {
    actorRole = "admin";
    mediaApi = {
      get: jest.fn(), list: jest.fn().mockResolvedValue([]), listOwned: jest.fn().mockResolvedValue([]),
      presign: jest.fn().mockResolvedValue({ uploadUrl: "http://storage/upload" }), finalize: jest.fn(),
      readUrl: jest.fn(), readOwnedUrl: jest.fn(), deleteLane: jest.fn(),
      previewPublicDelete: jest.fn().mockResolvedValue({ confirmToken: "token" }),
      confirmPublicDelete: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [GatewayMediaPublicController, GatewayMediaProtectedController, GatewayMediaStrictController, GatewayMediaOwnedController, GatewayMediaAdminController],
      providers: [
        Reflector, { provide: GatewayMediaApiService, useValue: mediaApi },
        {
          provide: GatewayAuthResolver,
          useValue: { resolve: jest.fn().mockImplementation(() => Promise.resolve({
            kind: "authenticated", identity: { userId: "user-1", role: actorRole, sessionRef: "session-1" },
          })) },
        },
        { provide: GatewayIdempotencyService, useValue: {
          begin: jest.fn().mockResolvedValue({ kind: "started", lease: { storageKey: "key", requestHash: "a".repeat(64), serializedInFlight: "state" } }),
          complete: jest.fn().mockResolvedValue(undefined),
        } },
        { provide: APP_GUARD, useClass: GatewayBearerAuthGuard },
        { provide: APP_INTERCEPTOR, useClass: GatewayRoutePolicyInterceptor },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false, logger: false });
    configureGatewayHttp(app, { applicationRegistry: registry, jsonLimitBytes: 262_144, logger: quietLogger(), nodeEnv: "test" });
    await app.init();
  });

  afterEach(async () => app.close());

  it("forbids owner selection in the public library but permits the protected admin filter", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/admin/media/public-library")
      .query({ ownerId: ID })
      .set(TEST_ADMIN_IDENTITY_HEADERS).set("Authorization", "Bearer admin-token")
      .expect(400);
    await request(app.getHttpServer())
      .get("/api/v1/admin/media/protected-library")
      .query({ ownerId: ID })
      .set(TEST_ADMIN_IDENTITY_HEADERS).set("Authorization", "Bearer admin-token")
      .expect(200);
    expect(mediaApi.list).toHaveBeenCalledWith(expect.any(Object), "protected", expect.objectContaining({ ownerId: ID }));
  });

  it("keeps owned protected media user-only with no owner override", async () => {
    actorRole = "user";
    await request(app.getHttpServer())
      .get("/api/v1/media/my/protected-library")
      .set({ "X-Nebula-Client-ID": "mobile-local" }).set("Authorization", "Bearer user-token")
      .expect(200);
    await request(app.getHttpServer())
      .get("/api/v1/media/my/protected-library")
      .query({ ownerId: "victim" })
      .set({ "X-Nebula-Client-ID": "mobile-local" }).set("Authorization", "Bearer user-token")
      .expect(400);
    actorRole = "admin";
    await request(app.getHttpServer())
      .get("/api/v1/media/my/protected-library")
      .set({ "X-Nebula-Client-ID": "mobile-local" }).set("Authorization", "Bearer admin-token")
      .expect(403);
  });

  it("rejects client-selected lane authority and omits one-step public deletion", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/admin/media/public-library/presign")
      .set(TEST_ADMIN_IDENTITY_HEADERS).set("Authorization", "Bearer admin-token").set("Idempotency-Key", KEY)
      .send({ filename: "file.jpg", mimeType: "image/jpeg", accessClass: "STRICT" })
      .expect(400);
    expect(mediaApi.presign).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/media/public-library/${ID}`)
      .set(TEST_ADMIN_IDENTITY_HEADERS).set("Authorization", "Bearer admin-token").set("Idempotency-Key", KEY)
      .expect(404);
  });
});
