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
import { GatewaySettingsApiService } from "../src/settings/gateway-settings-api.service";
import { GatewaySettingsController } from "../src/settings/gateway-settings.controller";
import { GatewayIdempotencyService } from "../src/state/gateway-idempotency.service";
import {
  TEST_ADMIN_IDENTITY_HEADERS,
  TEST_APPLICATION_REGISTRY_JSON,
} from "./application-fixture";

function quietLogger(): StructuredLogger {
  return {
    debug: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
  };
}

describe("gateway Settings HTTP routes", () => {
  let app: INestApplication;
  let actorRole: "user" | "admin";
  let settings: {
    get: jest.Mock;
    set: jest.Mock;
    delete: jest.Mock;
  };
  let idempotency: { begin: jest.Mock; complete: jest.Mock };
  const registry = StaticApplicationRegistry.fromJson(
    TEST_APPLICATION_REGISTRY_JSON,
    { nodeEnv: "test" },
  );

  beforeEach(async () => {
    actorRole = "admin";
    settings = {
      get: jest.fn().mockResolvedValue({ value: "USD", found: true }),
      set: jest.fn().mockImplementation((_request, _ns, _key, value) =>
        Promise.resolve({ value }),
      ),
      delete: jest.fn().mockResolvedValue({ deleted: true }),
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
      controllers: [GatewaySettingsController],
      providers: [
        Reflector,
        { provide: GatewaySettingsApiService, useValue: settings },
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
      jsonLimitBytes: 8192,
      logger: quietLogger(),
      nodeEnv: "test",
    });
    await app.init();
  });

  afterEach(async () => app.close());

  it("allows only the exact public key without client-selected environment", async () => {
    const accepted = await request(app.getHttpServer())
      .get("/api/v1/settings/pricing/default_currency")
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .expect(200);
    expect(accepted.body.data).toEqual({ value: "USD", found: true });
    expect(settings.get).toHaveBeenCalledWith(
      expect.any(Object),
      "pricing",
      "default_currency",
    );

    await request(app.getHttpServer())
      .get("/api/v1/settings/order/cart_ttl_minutes")
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .expect(400);
    await request(app.getHttpServer())
      .get("/api/v1/settings/pricing/default_currency")
      .query({ environment: "production" })
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .expect(400);
    expect(settings.get).toHaveBeenCalledTimes(1);
  });

  it("enforces admin application/role and the exact non-secret write allowlist", async () => {
    const key = "018f6b70-19a2-7b90-a8ab-123456789abc";
    await request(app.getHttpServer())
      .put("/api/v1/admin/settings/trust/gateway_keys")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", key)
      .send({ value: "copied-secret" })
      .expect(400);
    expect(settings.set).not.toHaveBeenCalled();
    expect(idempotency.begin).not.toHaveBeenCalled();

    actorRole = "user";
    await request(app.getHttpServer())
      .put("/api/v1/admin/settings/order/cart_ttl_minutes")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer user-token")
      .set("Idempotency-Key", key)
      .send({ value: "60" })
      .expect(403);

    actorRole = "admin";
    await request(app.getHttpServer())
      .put("/api/v1/admin/settings/order/cart_ttl_minutes")
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", key)
      .send({ value: "60" })
      .expect(403);

    const accepted = await request(app.getHttpServer())
      .put("/api/v1/admin/settings/order/cart_ttl_minutes")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", key)
      .send({ value: "60" })
      .expect(200);
    expect(accepted.body.data).toEqual({ value: "60" });
  });

  it("deletes only allowlisted settings and returns the action result", async () => {
    const response = await request(app.getHttpServer())
      .delete("/api/v1/admin/settings/blog/default_blog_category")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", "018f6b70-19a2-7b90-a8ab-123456789abc")
      .expect(200);
    expect(response.body.data).toEqual({ deleted: true });
    expect(settings.delete).toHaveBeenCalledWith(
      expect.any(Object),
      "blog",
      "default_blog_category",
    );
  });
});
