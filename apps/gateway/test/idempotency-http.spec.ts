import {
  Body,
  Controller,
  Get,
  HttpCode,
  type INestApplication,
  Post,
  Req,
} from "@nestjs/common";
import { APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { StructuredLogger } from "@packages/config";
import { gatewayItemEnvelope } from "../src/contracts/api-envelope";
import type { GatewayHttpRequest } from "../src/http/public-client-boundary";
import { configureGatewayHttp } from "../src/http/configure-http";
import {
  GatewayRoutePolicyInterceptor,
  GatewayRoutePolicyRef,
} from "../src/http/gateway-route-policy";
import {
  APPLICATION_REGISTRY,
  StaticApplicationRegistry,
} from "../src/application/application-registry";
import { GatewayIdempotencyService } from "../src/state/gateway-idempotency.service";
import type { GatewayRedisService } from "../src/state/gateway-redis.service";
import {
  TEST_ADMIN_IDENTITY_HEADERS,
  TEST_APPLICATION_REGISTRY_JSON,
} from "./application-fixture";

class FakeRedis {
  readonly values = new Map<string, string>();
  fail = false;
  async set(key: string, value: string): Promise<"OK" | null> {
    if (this.fail) throw new Error("redis_credentials_must_not_escape");
    if (this.values.has(key)) return null;
    this.values.set(key, value);
    return "OK";
  }
  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }
  async eval(
    _script: string,
    _keys: number,
    key: string,
    expected: string,
    replacement: string,
  ): Promise<number> {
    if (this.values.get(key) !== expected) return 0;
    this.values.set(key, replacement);
    return 1;
  }
}

let executions = 0;

@Controller("idempotency-probe")
class IdempotencyProbeController {
  @Post()
  @HttpCode(201)
  @GatewayRoutePolicyRef("auth.register")
  create(
    @Body() body: { email: string; password: string },
    @Req() requestValue: GatewayHttpRequest,
  ) {
    executions += 1;
    return gatewayItemEnvelope(
      { execution: executions, email: body.email },
      requestValue.requestId ?? "missing",
    );
  }

  @Get()
  @GatewayRoutePolicyRef("auth.me")
  safe() {
    return { data: { ok: true } };
  }

  @Post("session")
  @GatewayRoutePolicyRef("auth.login")
  session() {
    return { data: { ok: true } };
  }

  @Get("stream/:id")
  @GatewayRoutePolicyRef("media.render")
  stream() {
    return "stream";
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

describe("gateway idempotency HTTP policy", () => {
  let app: INestApplication;
  let redis: FakeRedis;
  const registry = StaticApplicationRegistry.fromJson(
    TEST_APPLICATION_REGISTRY_JSON,
    { nodeEnv: "test" },
  );

  beforeEach(async () => {
    executions = 0;
    redis = new FakeRedis();
    const config = {
      getOrThrow: (key: string) =>
        ({
          GATEWAY_IDEMPOTENCY_TTL_SECONDS: 86_400,
          GATEWAY_IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS: 60,
          GATEWAY_IDEMPOTENCY_MAX_RESPONSE_BYTES: 524_288,
        })[key],
    } as ConfigService;
    const gatewayRedis = {
      client: () => redis,
    } as unknown as GatewayRedisService;
    const idempotency = new GatewayIdempotencyService(config, gatewayRedis);

    const moduleRef = await Test.createTestingModule({
      controllers: [IdempotencyProbeController],
      providers: [
        Reflector,
        { provide: APPLICATION_REGISTRY, useValue: registry },
        { provide: GatewayIdempotencyService, useValue: idempotency },
        {
          provide: APP_INTERCEPTOR,
          useClass: GatewayRoutePolicyInterceptor,
        },
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

  it("requires a valid key only on key-profile routes", async () => {
    const body = { email: "person@example.test", password: "safe-password" };
    const missing = await request(app.getHttpServer())
      .post("/api/v1/idempotency-probe")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .send(body)
      .expect(400);
    expect(missing.body.error.code).toBe("IDEMPOTENCY_KEY_REQUIRED");

    const invalid = await request(app.getHttpServer())
      .post("/api/v1/idempotency-probe")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Idempotency-Key", "short")
      .send(body)
      .expect(400);
    expect(invalid.body.error.code).toBe("IDEMPOTENCY_KEY_INVALID");

    const unsupported = await request(app.getHttpServer())
      .get("/api/v1/idempotency-probe")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Idempotency-Key", "018f6b70-19a2-7b90-a8ab-123456789abc")
      .expect(400);
    expect(unsupported.body.error.code).toBe("IDEMPOTENCY_NOT_SUPPORTED");
  });

  it("replays a completed result without executing the handler again", async () => {
    const key = "018f6b70-19a2-7b90-a8ab-123456789abc";
    const body = { email: "person@example.test", password: "safe-password" };
    const first = await request(app.getHttpServer())
      .post("/api/v1/idempotency-probe")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Idempotency-Key", key)
      .send(body)
      .expect(201);
    const replay = await request(app.getHttpServer())
      .post("/api/v1/idempotency-probe")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Idempotency-Key", key)
      .send(body)
      .expect(201);

    expect(executions).toBe(1);
    expect(first.body.data).toEqual({ execution: 1, email: body.email });
    expect(replay.body.data).toEqual(first.body.data);
    expect(replay.body.requestId).toBe(replay.headers["x-request-id"]);
    expect(replay.body.requestId).not.toBe(first.body.requestId);
  });

  it("rejects key reuse for different request material", async () => {
    const key = "018f6b70-19a2-7b90-a8ab-123456789abc";
    await request(app.getHttpServer())
      .post("/api/v1/idempotency-probe")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Idempotency-Key", key)
      .send({ email: "one@example.test", password: "safe-password" })
      .expect(201);
    const conflict = await request(app.getHttpServer())
      .post("/api/v1/idempotency-probe")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Idempotency-Key", key)
      .send({ email: "two@example.test", password: "safe-password" })
      .expect(409);
    expect(conflict.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(executions).toBe(1);
  });

  it("rejects unsupported input before reserving or executing", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/idempotency-probe")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Idempotency-Key", "018f6b70-19a2-7b90-a8ab-123456789abc")
      .send({
        email: "person@example.test",
        password: "safe-password",
        role: "root-admin",
      })
      .expect(400);
    expect(response.body).toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        details: [{ field: "body.role", code: "unknown_field" }],
      },
    });
    expect(executions).toBe(0);
  });

  it("enforces manifest input profiles on safe, session, and stream routes", async () => {
    redis.fail = true;

    const safe = await request(app.getHttpServer())
      .get("/api/v1/idempotency-probe")
      .query({ includeDeleted: "true" })
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .expect(400);
    expect(safe.body.error).toMatchObject({
      code: "VALIDATION_FAILED",
      details: [{ field: "query.includeDeleted", code: "unknown_field" }],
    });

    const session = await request(app.getHttpServer())
      .post("/api/v1/idempotency-probe/session")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .send({
        identifier: "admin@example.test",
        password: "safe",
        role: "admin",
      })
      .expect(400);
    expect(session.body.error).toMatchObject({
      code: "VALIDATION_FAILED",
      details: [{ field: "body.role", code: "unknown_field" }],
    });

    const stream = await request(app.getHttpServer())
      .get("/api/v1/idempotency-probe/stream/media-id")
      .query({ ownerId: "another-user" })
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .expect(400);
    expect(stream.body.error).toMatchObject({
      code: "VALIDATION_FAILED",
      details: [{ field: "query.ownerId", code: "unknown_field" }],
    });
  });

  it("fails closed with a sanitized error when Redis is unavailable", async () => {
    redis.fail = true;
    const response = await request(app.getHttpServer())
      .post("/api/v1/idempotency-probe")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Idempotency-Key", "018f6b70-19a2-7b90-a8ab-123456789abc")
      .send({ email: "person@example.test", password: "safe-password" })
      .expect(503);

    expect(response.body.error).toEqual({
      code: "IDEMPOTENCY_STORE_UNAVAILABLE",
      message: "Idempotency state is unavailable",
    });
    expect(JSON.stringify(response.body)).not.toContain("redis_credentials");
    expect(executions).toBe(0);
  });
});
