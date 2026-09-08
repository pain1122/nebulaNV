import {
  type INestApplication,
  ServiceUnavailableException,
} from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import type { StructuredLogger } from "@packages/config";
import request from "supertest";
import { StaticApplicationRegistry } from "../src/application/application-registry";
import { GatewayAuthApiService } from "../src/auth/gateway-auth-api.service";
import { GatewayBearerAuthGuard } from "../src/auth/gateway-bearer-auth.guard";
import { GatewayAuthResolver } from "../src/auth/gateway-auth-resolver";
import { GatewayBrowserSessionService } from "../src/auth/browser-session";
import { GatewayAuthController } from "../src/auth/gateway-auth.controller";
import { GatewaySessionTransportGuard } from "../src/auth/gateway-session-transport.guard";
import type { GatewayStoredResponse } from "../src/contracts/idempotency";
import { configureGatewayHttp } from "../src/http/configure-http";
import { GatewayRoutePolicyInterceptor } from "../src/http/gateway-route-policy";
import { GatewayIdempotencyService } from "../src/state/gateway-idempotency.service";
import {
  TEST_ADMIN_IDENTITY_HEADERS,
  TEST_APPLICATION_REGISTRY_JSON,
} from "./application-fixture";

const tokenResult = Object.freeze({
  accessToken: "access-token-value",
  refreshToken: "refresh-token-value",
  accessExpiresInSeconds: 900,
  refreshExpiresInSeconds: 604800,
});

const actor = Object.freeze({
  kind: "authenticated" as const,
  identity: Object.freeze({
    userId: "user-1",
    role: "user" as const,
    sessionRef: "session-ref-1",
  }),
});

function quietLogger(): StructuredLogger {
  return {
    debug: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
  };
}

function refreshCookie(headers: Record<string, unknown>): string {
  const values = headers["set-cookie"] as unknown as string[];
  expect(values).toHaveLength(1);
  return values[0];
}

describe("gateway Auth HTTP routes", () => {
  let app: INestApplication;
  let auth: {
    register: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    profile: jest.Mock;
  };
  let idempotency: {
    begin: jest.Mock;
    complete: jest.Mock;
  };
  const registry = StaticApplicationRegistry.fromJson(
    TEST_APPLICATION_REGISTRY_JSON,
    { nodeEnv: "test" },
  );
  const mobileHeaders = { "X-Nebula-Client-ID": "mobile-local" };
  const browserCsrfHeaders = {
    ...TEST_ADMIN_IDENTITY_HEADERS,
    "Sec-Fetch-Site": "same-origin",
  };

  beforeEach(async () => {
    auth = {
      register: jest.fn().mockResolvedValue({
        id: "user-1",
        email: "person@example.test",
        role: "user",
      }),
      login: jest.fn().mockResolvedValue(tokenResult),
      refresh: jest.fn().mockResolvedValue(tokenResult),
      logout: jest.fn().mockResolvedValue({ success: true }),
      profile: jest.fn().mockResolvedValue({
        id: "user-1",
        email: "person@example.test",
        role: "user",
      }),
    };
    let storedResponse: GatewayStoredResponse | undefined;
    idempotency = {
      begin: jest.fn().mockImplementation(() =>
        Promise.resolve(
          storedResponse
            ? { kind: "replay", response: storedResponse }
            : {
                kind: "started",
                lease: {
                  storageKey: "test-key",
                  requestHash: "a".repeat(64),
                  serializedInFlight: "test-state",
                },
              },
        ),
      ),
      complete: jest.fn().mockImplementation((_lease, response) => {
        void _lease;
        storedResponse = response as GatewayStoredResponse;
        return Promise.resolve();
      }),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [GatewayAuthController],
      providers: [
        Reflector,
        GatewayBrowserSessionService,
        { provide: ConfigService, useValue: { get: () => "test" } },
        { provide: GatewayAuthApiService, useValue: auth },
        {
          provide: GatewayAuthResolver,
          useValue: { resolve: jest.fn().mockResolvedValue(actor) },
        },
        { provide: GatewayIdempotencyService, useValue: idempotency },
        { provide: APP_GUARD, useClass: GatewayBearerAuthGuard },
        { provide: APP_GUARD, useClass: GatewaySessionTransportGuard },
        { provide: APP_INTERCEPTOR, useClass: GatewayRoutePolicyInterceptor },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false, logger: false });
    configureGatewayHttp(app, {
      applicationRegistry: registry,
      jsonLimitBytes: 4096,
      logger: quietLogger(),
      nodeEnv: "test",
    });
    await app.init();
  });

  afterEach(async () => app.close());

  it("registers through the manifest-owned 201 route and stable envelope", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Idempotency-Key", "018f6b70-19a2-7b90-a8ab-123456789abc")
      .send({ email: "person@example.test", password: "secret-password" })
      .expect(201);

    expect(response.body.data).toEqual({
      id: "user-1",
      email: "person@example.test",
      role: "user",
    });
    expect(response.body.requestId).toBe(response.headers["x-request-id"]);
    expect(response.body).not.toHaveProperty("password");
    expect(auth.register).toHaveBeenCalledWith(
      expect.objectContaining({
        requestContext: expect.objectContaining({
          applicationId: "admin-web-local",
        }),
      }),
      { email: "person@example.test", password: "secret-password" },
    );
  });

  it("keeps browser refresh material HttpOnly while native mobile receives JSON", async () => {
    const browser = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .send({ identifier: "person@example.test", password: "secret-password" })
      .expect(200);
    expect(browser.body.data).toEqual({
      accessToken: "access-token-value",
      accessExpiresInSeconds: 900,
      refreshExpiresInSeconds: 604800,
    });
    const cookie = refreshCookie(browser.headers);
    expect(cookie).toContain("refreshToken=refresh-token-value");
    expect(cookie).toContain("Max-Age=604800");
    expect(cookie).toContain("Path=/api/auth");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
    expect(cookie).not.toContain("Domain=");

    const mobile = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set(mobileHeaders)
      .send({ identifier: "person@example.test", password: "secret-password" })
      .expect(200);
    expect(mobile.body.data.refreshToken).toBe("refresh-token-value");
    expect(mobile.headers).not.toHaveProperty("set-cookie");
  });

  it("requires browser Fetch Metadata before consuming or rotating the cookie", async () => {
    const denied = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Cookie", "refreshToken=old-refresh-token")
      .expect(403);
    expect(denied.body.error.code).toBe("ACCESS_DENIED");
    expect(denied.headers).not.toHaveProperty("set-cookie");
    expect(auth.refresh).not.toHaveBeenCalled();
    expect(idempotency.begin).not.toHaveBeenCalled();

    const accepted = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set(browserCsrfHeaders)
      .set("Cookie", "refreshToken=old-refresh-token")
      .expect(200);
    expect(auth.refresh).toHaveBeenCalledWith(
      expect.any(Object),
      "old-refresh-token",
    );
    expect(accepted.body.data).not.toHaveProperty("refreshToken");
    expect(refreshCookie(accepted.headers)).toContain(
      "refreshToken=refresh-token-value",
    );
  });

  it("rejects browser JSON refresh material and clears a failed rotation", async () => {
    const wrongTransport = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set(browserCsrfHeaders)
      .set("Cookie", "refreshToken=old-refresh-token")
      .send({ refreshToken: "copied-into-javascript" })
      .expect(400);
    expect(wrongTransport.body.error).toMatchObject({
      code: "VALIDATION_FAILED",
      details: [
        { field: "body.refreshToken", code: "unsupported_combination" },
      ],
    });

    auth.refresh.mockRejectedValueOnce(new ServiceUnavailableException());
    const failed = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set(browserCsrfHeaders)
      .set("Cookie", "refreshToken=old-refresh-token")
      .expect(503);
    expect(failed.body.error.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(refreshCookie(failed.headers)).toContain("refreshToken=;");
  });

  it("requires native refresh material and returns each rotated token in JSON", async () => {
    const missing = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set(mobileHeaders)
      .expect(400);
    expect(missing.body.error).toMatchObject({
      code: "VALIDATION_FAILED",
      details: [{ field: "body.refreshToken", code: "required_field" }],
    });

    const accepted = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set(mobileHeaders)
      .send({ refreshToken: "native-refresh-token" })
      .expect(200);
    expect(auth.refresh).toHaveBeenCalledWith(
      expect.any(Object),
      "native-refresh-token",
    );
    expect(accepted.body.data).toEqual(tokenResult);
    expect(accepted.headers).not.toHaveProperty("set-cookie");
  });

  it("requires native current-session material unless all-device logout is selected", async () => {
    const key = "018f6b70-19a2-7b90-a8ab-123456789abc";
    const missing = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set(mobileHeaders)
      .set("Authorization", "Bearer access-token")
      .set("Idempotency-Key", key)
      .expect(400);
    expect(missing.body.error).toMatchObject({
      code: "VALIDATION_FAILED",
      details: [
        { field: "body.refreshToken|allDevices", code: "required_field" },
      ],
    });

    await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set(mobileHeaders)
      .set("Authorization", "Bearer access-token")
      .set("Idempotency-Key", key)
      .send({ allDevices: true })
      .expect(200);
    expect(auth.logout).toHaveBeenCalledWith(expect.any(Object), {
      allDevices: true,
      refreshToken: "",
    });
  });

  it("derives logout/profile identity from verified auth and clears browser state", async () => {
    const logout = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set(browserCsrfHeaders)
      .set("Authorization", "Bearer access-token")
      .set("Idempotency-Key", "018f6b70-19a2-7b90-a8ab-123456789abc")
      .set("Cookie", "refreshToken=current-refresh-token")
      .send({ allDevices: false })
      .expect(200);
    expect(auth.logout).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ userId: "user-1" }),
      }),
      { allDevices: false, refreshToken: "current-refresh-token" },
    );
    expect(refreshCookie(logout.headers)).toContain("refreshToken=;");

    const replay = await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set(browserCsrfHeaders)
      .set("Authorization", "Bearer access-token")
      .set("Idempotency-Key", "018f6b70-19a2-7b90-a8ab-123456789abc")
      .set("Cookie", "refreshToken=current-refresh-token")
      .send({ allDevices: false })
      .expect(200);
    expect(refreshCookie(replay.headers)).toContain("refreshToken=;");
    expect(auth.logout).toHaveBeenCalledTimes(1);

    const profile = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer access-token")
      .expect(200);
    expect(auth.profile).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ userId: "user-1" }),
      }),
      "user-1",
    );
    expect(profile.body.data.id).toBe("user-1");
  });

  it("rejects unauthenticated logout and duplicate refresh cookies", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set(browserCsrfHeaders)
      .set("Idempotency-Key", "018f6b70-19a2-7b90-a8ab-123456789abc")
      .expect(401);
    expect(auth.logout).not.toHaveBeenCalled();

    const duplicate = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set(browserCsrfHeaders)
      .set("Cookie", "refreshToken=one; refreshToken=two")
      .expect(400);
    expect(duplicate.body.error.code).toBe("BAD_REQUEST");
    expect(auth.refresh).not.toHaveBeenCalled();
  });
});
