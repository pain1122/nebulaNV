import { type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import type { StructuredLogger } from "@packages/config";
import { createServer, type Server } from "node:http";
import request from "supertest";
import { StaticApplicationRegistry } from "../src/application/application-registry";
import { configureGatewayHttp } from "../src/http/configure-http";
import { GatewayRoutePolicyInterceptor } from "../src/http/gateway-route-policy";
import { GatewayMediaRenderController } from "../src/media/gateway-media-render.controller";
import { GatewayMediaRenderProxy } from "../src/media/gateway-media-render.proxy";
import { GatewayIdempotencyService } from "../src/state/gateway-idempotency.service";
import { TEST_APPLICATION_REGISTRY_JSON } from "./application-fixture";

const MEDIA_ID = "8a73870a-ea95-47b7-a289-48ef65855c60";
function quietLogger(): StructuredLogger { return { debug: jest.fn(), error: jest.fn(), log: jest.fn(), warn: jest.fn() }; }

describe("gateway Media render stream", () => {
  let app: INestApplication;
  let upstream: Server;
  let observedUrl = "";
  let observedRequestId = "";
  let mode: "ok" | "redirect";

  beforeEach(async () => {
    mode = "ok";
    upstream = createServer((req, res) => {
      observedUrl = req.url ?? "";
      observedRequestId = String(req.headers["x-request-id"] ?? "");
      if (mode === "redirect") {
        res.statusCode = 302;
        res.setHeader("location", "http://internal-secret/other");
        res.end("redirect blocked");
        return;
      }
      const body = Buffer.from("media-bytes");
      res.statusCode = 200;
      res.setHeader("content-type", "image/jpeg");
      res.setHeader("content-length", String(body.length));
      res.setHeader("content-disposition", 'inline; filename="file.jpg"');
      res.setHeader("cache-control", "public, max-age=60");
      res.setHeader("etag", '"etag-1"');
      res.setHeader("x-content-type-options", "nosniff");
      res.end(body);
    });
    await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
    const address = upstream.address();
    if (!address || typeof address === "string") throw new Error("test_upstream_address_missing");

    const moduleRef = await Test.createTestingModule({
      controllers: [GatewayMediaRenderController],
      providers: [
        Reflector,
        GatewayMediaRenderProxy,
        { provide: ConfigService, useValue: { getOrThrow: () => `http://127.0.0.1:${address.port}` } },
        { provide: GatewayIdempotencyService, useValue: {} },
        { provide: APP_INTERCEPTOR, useClass: GatewayRoutePolicyInterceptor },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false, logger: false });
    configureGatewayHttp(app, {
      applicationRegistry: StaticApplicationRegistry.fromJson(TEST_APPLICATION_REGISTRY_JSON, { nodeEnv: "test" }),
      jsonLimitBytes: 262_144,
      logger: quietLogger(),
      nodeEnv: "test",
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    await new Promise<void>((resolve, reject) => upstream.close((error) => error ? reject(error) : resolve()));
  });

  it("streams bytes from only the fixed path and preserves selected headers", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/media/render/${MEDIA_ID}`)
      .query({ variant: "web" })
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .buffer(true)
      .expect(200);
    expect(observedUrl).toBe(`/media/render/${MEDIA_ID}?variant=web`);
    expect(observedRequestId).toBeTruthy();
    expect(response.headers["content-type"]).toContain("image/jpeg");
    expect(response.headers.etag).toBe('"etag-1"');
    expect(response.body).toEqual(Buffer.from("media-bytes"));
  });

  it("does not follow redirects or expose their internal location", async () => {
    mode = "redirect";
    const response = await request(app.getHttpServer())
      .get(`/api/v1/media/render/${MEDIA_ID}`)
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .redirects(0)
      .expect(302);
    expect(response.headers).not.toHaveProperty("location");
    expect(observedUrl).toBe(`/media/render/${MEDIA_ID}`);
  });

  it("rejects unsupported variants and caller-selected upstream controls", async () => {
    observedUrl = "";
    await request(app.getHttpServer())
      .get(`/api/v1/media/render/${MEDIA_ID}`)
      .query({ variant: "original" })
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .expect(400);
    await request(app.getHttpServer())
      .get(`/api/v1/media/render/${MEDIA_ID}`)
      .query({ upstreamUrl: "http://attacker.test" })
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .expect(400);
    expect(observedUrl).toBe("");
  });
});
