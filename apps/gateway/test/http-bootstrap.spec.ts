import {
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
import { GatewayReadinessService } from "../src/gateway-readiness.service";
import { HealthController } from "../src/health.controller";
import { configureGatewayHttp } from "../src/http/configure-http";

class ProbeDto {
  @IsString()
  @MaxLength(2000)
  value!: string;
}

type RequestWithId = Request & { requestId?: string };

@Controller("probe")
class ProbeController {
  @Get()
  requestId(@Req() requestValue: RequestWithId): { requestId?: string } {
    return { requestId: requestValue.requestId };
  }

  @Post()
  body(@Body() body: ProbeDto): ProbeDto {
    return body;
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

  async function createApp(jsonLimitBytes = 1024): Promise<void> {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController, HealthController],
      providers: [GatewayReadinessService],
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false, logger: false });
    configureGatewayHttp(app, {
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

    await request(app.getHttpServer()).get("/api/v1/probe").expect(200);
    await request(app.getHttpServer()).get("/probe").expect(404);
    await request(app.getHttpServer())
      .get("/health/live")
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ status: "ok", service: "gateway" });
      });
    await request(app.getHttpServer()).get("/api/v1/health/live").expect(404);
  });

  it("generates a trusted ingress request ID and ignores the supplied header", async () => {
    await createApp();

    const response = await request(app.getHttpServer())
      .get("/api/v1/probe")
      .set("x-request-id", "client-controlled")
      .expect(200);

    expect(response.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(response.headers["x-request-id"]).not.toBe("client-controlled");
    expect(response.body.requestId).toBe(response.headers["x-request-id"]);
  });

  it("uses strict DTO validation and shared security headers", async () => {
    await createApp();

    await request(app.getHttpServer())
      .post("/api/v1/probe")
      .send({ value: "ok", unexpected: true })
      .expect(400);
    const response = await request(app.getHttpServer())
      .post("/api/v1/probe")
      .send({ value: "ok" })
      .expect(201);
    expect(response.body).toEqual({ value: "ok" });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("rejects JSON bodies over the explicit byte limit", async () => {
    await createApp(1024);

    await request(app.getHttpServer())
      .post("/api/v1/probe")
      .send({ value: "x".repeat(1100) })
      .expect(413);
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
      });
  });
});
