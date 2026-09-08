import { type INestApplication, NotFoundException } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import type { StructuredLogger } from "@packages/config";
import request from "supertest";
import { StaticApplicationRegistry } from "../src/application/application-registry";
import { GatewayAuthResolver } from "../src/auth/gateway-auth-resolver";
import { GatewayBearerAuthGuard } from "../src/auth/gateway-bearer-auth.guard";
import type { GatewayStoredResponse } from "../src/contracts/idempotency";
import { configureGatewayHttp } from "../src/http/configure-http";
import { GatewayRoutePolicyInterceptor } from "../src/http/gateway-route-policy";
import { GatewayIdempotencyService } from "../src/state/gateway-idempotency.service";
import { GatewayUserApiService } from "../src/user/gateway-user-api.service";
import { GatewayUserController } from "../src/user/gateway-user.controller";
import {
  TEST_ADMIN_IDENTITY_HEADERS,
  TEST_APPLICATION_REGISTRY_JSON,
} from "./application-fixture";

const USER_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_USER_ID = "123e4567-e89b-42d3-a456-426614174001";

function quietLogger(): StructuredLogger {
  return {
    debug: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
  };
}

describe("gateway User HTTP routes", () => {
  let app: INestApplication;
  let actorRole: "user" | "admin" | "root-admin";
  let users: {
    get: jest.Mock;
    update: jest.Mock;
    list: jest.Mock;
  };
  let idempotency: { begin: jest.Mock; complete: jest.Mock };
  const registry = StaticApplicationRegistry.fromJson(
    TEST_APPLICATION_REGISTRY_JSON,
    { nodeEnv: "test" },
  );

  beforeEach(async () => {
    actorRole = "user";
    users = {
      get: jest.fn().mockImplementation((_request, id: string) =>
        Promise.resolve({ id, email: "person@example.test", role: "user" }),
      ),
      update: jest.fn().mockResolvedValue({
        id: USER_ID,
        email: "changed@example.test",
        role: "user",
      }),
      list: jest.fn().mockResolvedValue([
        {
          id: USER_ID,
          email: "person@example.test",
          role: "user",
          createdAt: "2026-08-15T10:00:00.000Z",
        },
      ]),
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
      complete: jest.fn().mockImplementation((lease, response) => {
        void lease;
        storedResponse = response as GatewayStoredResponse;
        return Promise.resolve();
      }),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [GatewayUserController],
      providers: [
        Reflector,
        { provide: GatewayUserApiService, useValue: users },
        {
          provide: GatewayAuthResolver,
          useValue: {
            resolve: jest.fn().mockImplementation(() =>
              Promise.resolve({
                kind: "authenticated",
                identity: {
                  userId: USER_ID,
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
      jsonLimitBytes: 4096,
      logger: quietLogger(),
      nodeEnv: "test",
    });
    await app.init();
  });

  afterEach(async () => app.close());

  it("derives self read/update identity and never accepts actor fields", async () => {
    const self = await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .set("Authorization", "Bearer access-token")
      .expect(200);
    expect(users.get).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ userId: USER_ID }) }),
      USER_ID,
    );
    expect(self.body.data.id).toBe(USER_ID);

    const rejected = await request(app.getHttpServer())
      .put("/api/v1/users/me")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer access-token")
      .set("Idempotency-Key", "018f6b70-19a2-7b90-a8ab-123456789abc")
      .send({ email: "changed@example.test", role: "root-admin" })
      .expect(400);
    expect(rejected.body.error).toMatchObject({
      code: "VALIDATION_FAILED",
      details: [{ field: "body.role", code: "unknown_field" }],
    });
    expect(idempotency.begin).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .put("/api/v1/users/me")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer access-token")
      .set("Idempotency-Key", "018f6b70-19a2-7b90-a8ab-123456789abc")
      .send({
        newPassword: "new-password",
        currentPassword: "old-password",
      })
      .expect(200);
    expect(users.update).toHaveBeenCalledWith(expect.any(Object), {
      id: USER_ID,
      email: "",
      newPassword: "new-password",
      currentPassword: "old-password",
    });
  });

  it("keeps admin listing admin-web-only, role-protected, and unpaginated", async () => {
    actorRole = "admin";
    const listed = await request(app.getHttpServer())
      .get("/api/v1/admin/users")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-access-token")
      .expect(200);
    expect(listed.body).toMatchObject({
      data: [
        {
          id: USER_ID,
          email: "person@example.test",
          role: "user",
        },
      ],
      meta: { pagination: { profile: "unpaginated" } },
    });
    expect(listed.body.data[0]).not.toHaveProperty("passwordHash");

    actorRole = "user";
    await request(app.getHttpServer())
      .get("/api/v1/admin/users")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer user-access-token")
      .expect(403);

    actorRole = "admin";
    await request(app.getHttpServer())
      .get("/api/v1/admin/users")
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .set("Authorization", "Bearer admin-access-token")
      .expect(403);
  });

  it("validates admin IDs and preserves downstream not-found status", async () => {
    actorRole = "admin";
    await request(app.getHttpServer())
      .get("/api/v1/admin/users/not-a-uuid")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-access-token")
      .expect(400);
    expect(users.get).not.toHaveBeenCalled();

    users.get.mockRejectedValueOnce(new NotFoundException());
    const missing = await request(app.getHttpServer())
      .get(`/api/v1/admin/users/${OTHER_USER_ID}`)
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-access-token")
      .expect(404);
    expect(missing.body.error).toEqual({
      code: "NOT_FOUND",
      message: "Resource was not found",
    });
    expect(missing.body.requestId).toBe(missing.headers["x-request-id"]);
  });
});
