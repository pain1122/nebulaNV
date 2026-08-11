import { Controller, Get, type INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import request from "supertest";
import { gatewayRateLimitTracker } from "../src/http/rate-limit";

@Controller("limited")
class LimitedController {
  @Get()
  get(): { status: "ok" } {
    return { status: "ok" };
  }
}

describe("gateway rate limiting", () => {
  it("keys verified applications and actors independently", () => {
    expect(
      gatewayRateLimitTracker({
        requestContext: { applicationId: "storefront" },
        user: { userId: "user-1" },
        socket: { remoteAddress: "10.0.0.5" },
      }),
    ).toBe('["application","storefront","actor","user-1"]');
    expect(
      gatewayRateLimitTracker({
        requestContext: { applicationId: "storefront" },
        socket: { remoteAddress: "10.0.0.5" },
      }),
    ).toBe('["application","storefront","anonymous"]');
  });

  it("falls back only to the direct peer and ignores forwarded headers", () => {
    const requestWithSpoofedForwarding = {
      headers: {
        "x-forwarded-for": "203.0.113.10",
        "x-nebula-client-id": "copied-client",
      },
      ip: "203.0.113.10",
      socket: { remoteAddress: "::ffff:10.0.0.8" },
    };

    expect(gatewayRateLimitTracker(requestWithSpoofedForwarding)).toBe(
      '["peer","10.0.0.8"]',
    );
  });

  it("does not trust malformed context fields", () => {
    expect(
      gatewayRateLimitTracker({
        requestContext: { applicationId: " unsafe " },
        user: { userId: "user-1" },
        socket: { remoteAddress: "127.0.0.1" },
      }),
    ).toBe('["peer","127.0.0.1"]');
  });

  describe("guard integration", () => {
    let app: INestApplication;

    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ThrottlerModule.forRoot({
            getTracker: gatewayRateLimitTracker,
            throttlers: [{ name: "gateway", ttl: 60_000, limit: 2 }],
          }),
        ],
        controllers: [LimitedController],
        providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
      }).compile();
      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it("returns 429 after the configured baseline is exhausted", async () => {
      await request(app.getHttpServer()).get("/limited").expect(200);
      await request(app.getHttpServer()).get("/limited").expect(200);
      await request(app.getHttpServer()).get("/limited").expect(429);
    });
  });
});
