import {
  BadRequestException,
  Body,
  Controller,
  Get,
  type INestApplication,
  Post,
  Req,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { IsString, MaxLength } from "class-validator";
import type { Request } from "express";
import request from "supertest";
import type { StructuredLogger } from "@packages/config";
import type { GatewayRequestContext } from "../src/application/application.contracts";
import {
  APPLICATION_REGISTRY,
  StaticApplicationRegistry,
} from "../src/application/application-registry";
import { GatewayReadinessService } from "../src/gateway-readiness.service";
import { HealthController } from "../src/health.controller";
import { configureGatewayHttp } from "../src/http/configure-http";
import {
  TEST_ADMIN_IDENTITY_HEADERS,
  TEST_APPLICATION_REGISTRY_JSON,
} from "./application-fixture";

class ProbeDto {
  @IsString()
  @MaxLength(2000)
  value!: string;
}

type RequestWithId = Request & {
  requestId?: string;
  requestContext?: GatewayRequestContext;
};

@Controller("probe")
class ProbeController {
  @Get()
  requestId(@Req() requestValue: RequestWithId): {
    requestId?: string;
    requestContext?: GatewayRequestContext;
    rawTenantHeader?: string | string[];
  } {
    return {
      requestId: requestValue.requestId,
      requestContext: requestValue.requestContext,
      rawTenantHeader: requestValue.headers["x-tenant-id"],
    };
  }

  @Post()
  body(@Body() body: ProbeDto): ProbeDto {
    return body;
  }

  @Get("upstream-error")
  upstreamError(): never {
    throw new BadRequestException("raw_upstream_internal_message");
  }
}

function quietLogger(): StructuredLogger {
  return {
    debug: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
  };
}

describe("gateway HTTP bootstrap", () => {
  let app: INestApplication;
  const applicationRegistry = StaticApplicationRegistry.fromJson(
    TEST_APPLICATION_REGISTRY_JSON,
    { nodeEnv: "test" },
  );

  async function createApp(jsonLimitBytes = 1024): Promise<void> {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController, HealthController],
      providers: [
        {
          provide: GatewayReadinessService,
          useValue: {
            probes: () => [
              { name: "configuration", check: () => "ok" },
              {
                name: "applicationRegistry",
                check: () => applicationRegistry.readiness(),
              },
              { name: "authTransport", check: () => "ok" },
              { name: "gatewayRedis", check: () => "ok" },
            ],
          },
        },
        { provide: APPLICATION_REGISTRY, useValue: applicationRegistry },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false, logger: false });
    configureGatewayHttp(app, {
      applicationRegistry,
      jsonLimitBytes,
      logger: quietLogger(),
      nodeEnv: "test",
    });
    await app.init();
  }

  afterEach(async () => {
    await app?.close();
  });

  it("mounts API routes under /api/v1 and keeps operational health unprefixed", async () => {
    await createApp();

    await request(app.getHttpServer())
      .get("/api/v1/probe")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .expect(200);
    await request(app.getHttpServer()).get("/probe").expect(404);
    await request(app.getHttpServer())
      .get("/health/live")
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ status: "ok", service: "gateway" });
      });
    await request(app.getHttpServer())
      .get("/api/v1/health/live")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .expect(404);
  });

  it("generates a trusted ingress request ID and ignores the supplied header", async () => {
    await createApp();

    const response = await request(app.getHttpServer())
      .get("/api/v1/probe")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("x-request-id", "client-controlled")
      .expect(200);

    expect(response.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(response.headers["x-request-id"]).not.toBe("client-controlled");
    expect(response.body.requestId).toBe(response.headers["x-request-id"]);
    expect(response.body.requestContext).toMatchObject({
      requestId: response.headers["x-request-id"],
      applicationId: "admin-web-local",
      applicationProfile: "admin-web",
      tenantId: "single-site-tenant",
      siteId: "single-site",
      channelId: "admin-web",
      channelKind: "web",
    });
  });

  it("uses strict DTO validation and shared security headers", async () => {
    await createApp();

    const invalid = await request(app.getHttpServer())
      .post("/api/v1/probe")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .send({ value: "ok", unexpected: true })
      .expect(400);
    expect(invalid.body).toEqual({
      error: {
        code: "VALIDATION_FAILED",
        message: "Request validation failed",
        details: [{ field: "unexpected", code: "unknown_field" }],
      },
      requestId: invalid.headers["x-request-id"],
    });
    const response = await request(app.getHttpServer())
      .post("/api/v1/probe")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .send({ value: "ok" })
      .expect(201);
    expect(response.body).toEqual({ value: "ok" });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("rejects JSON bodies over the explicit byte limit", async () => {
    await createApp(1024);

    const response = await request(app.getHttpServer())
      .post("/api/v1/probe")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .send({ value: "x".repeat(1100) })
      .expect(413);
    expect(response.body).toEqual({
      error: {
        code: "REQUEST_TOO_LARGE",
        message: "Request body is too large",
      },
      requestId: response.headers["x-request-id"],
    });
  });

  it("uses the shared sanitized readiness shape", async () => {
    await createApp();

    await request(app.getHttpServer())
      .get("/health/ready")
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: "ok",
          service: "gateway",
          checks: { configuration: { status: "ok" } },
        });
        expect(body.checks.applicationRegistry).toEqual({ status: "ok" });
        expect(body.checks.authTransport).toEqual({ status: "ok" });
        expect(body.checks.gatewayRedis).toEqual({ status: "ok" });
      });
  });

  it("derives exact CORS preflight policy from registered browser origins", async () => {
    await createApp();

    const allowed = await request(app.getHttpServer())
      .options("/api/v1/probe")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "POST")
      .set(
        "Access-Control-Request-Headers",
        "authorization,content-type,x-nebula-client-id,idempotency-key,x-request-id",
      )
      .expect(204);

    expect(allowed.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
    expect(allowed.headers.vary).toContain("Origin");
    expect(allowed.headers["access-control-allow-credentials"]).toBeUndefined();
    expect(allowed.headers["access-control-allow-headers"].toLowerCase()).toBe(
      "authorization,content-type,x-nebula-client-id,idempotency-key,x-request-id",
    );

    const actual = await request(app.getHttpServer())
      .get("/api/v1/probe")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .expect(200);
    expect(actual.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
    expect(actual.headers["access-control-expose-headers"]).toBe(
      "X-Request-ID",
    );

    const denied = await request(app.getHttpServer())
      .options("/api/v1/probe")
      .set("Origin", "http://localhost:3999")
      .set("Access-Control-Request-Method", "GET");
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("requires an exact registered ID/origin pair and accepts originless mobile", async () => {
    await createApp();

    await request(app.getHttpServer()).get("/api/v1/probe").expect(400);
    await request(app.getHttpServer())
      .get("/api/v1/probe")
      .set("X-Nebula-Client-ID", "admin-web-local")
      .set("Origin", "http://localhost:3008")
      .expect(403);
    await request(app.getHttpServer())
      .get("/api/v1/probe")
      .set("X-Nebula-Client-ID", "admin-web-local")
      .set("Origin", "http://127.0.0.1:3000")
      .expect(403);
    const mobile = await request(app.getHttpServer())
      .get("/api/v1/probe")
      .set("X-Nebula-Client-ID", "mobile-local")
      .expect(200);
    expect(mobile.body.requestContext).toMatchObject({
      applicationId: "mobile-local",
      applicationProfile: "mobile",
      channelKind: "mobile",
    });
  });

  it("ignores raw authoritative context headers and keeps the fixed registry mapping", async () => {
    await createApp();

    const response = await request(app.getHttpServer())
      .get("/api/v1/probe")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("X-Tenant-ID", "attacker-tenant")
      .set("X-Site-ID", "attacker-site")
      .set("X-Channel-ID", "attacker-channel")
      .set("X-Application-ID", "attacker-app")
      .set("X-User-Role", "root-admin")
      .set("X-S2S-Context", "attacker-context")
      .expect(200);

    expect(response.body.requestContext).toMatchObject({
      applicationId: "admin-web-local",
      tenantId: "single-site-tenant",
      siteId: "single-site",
      channelId: "admin-web",
    });
    expect(response.body.rawTenantHeader).toBeUndefined();
  });

  it("rejects ambiguous public identity carriers", async () => {
    await createApp();

    const response = await request(app.getHttpServer())
      .get("/api/v1/probe")
      .set("Origin", "http://localhost:3000")
      .set("X-Nebula-Client-ID", ["admin-web-local", "mobile-local"])
      .expect(400);
    expect(response.body).toEqual({
      error: {
        code: "CLIENT_ID_REQUIRED",
        message: "A valid client identifier is required",
      },
      requestId: response.headers["x-request-id"],
    });
  });

  it("does not expose raw upstream exception messages", async () => {
    await createApp();

    const response = await request(app.getHttpServer())
      .get("/api/v1/probe/upstream-error")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .expect(400);

    expect(response.body).toEqual({
      error: { code: "BAD_REQUEST", message: "Request is invalid" },
      requestId: response.headers["x-request-id"],
    });
    expect(JSON.stringify(response.body)).not.toContain(
      "raw_upstream_internal_message",
    );
  });
});
