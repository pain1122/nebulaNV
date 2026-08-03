import { Controller, Get, INestApplication, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import * as Joi from "joi";
import type { AddressInfo } from "node:net";
import {
  HTTP_CORS_ALLOWED_HEADERS,
  HTTP_CORS_METHODS,
  classifyHttpSurface,
  createHttpCorsOptionsDelegate,
  createHttpSecurityHeadersMiddleware,
  httpPolicyEnvSchema,
  parseHttpCorsOrigins,
} from "../src/http-policy";

@Controller()
class PolicyTestController {
  @Get("api")
  api() {
    return { status: "ok" };
  }

  @Get("health")
  health() {
    return { status: "ok" };
  }

  @Get("media/render/example")
  render() {
    return "example";
  }
}

@Module({ controllers: [PolicyTestController] })
class PolicyTestModule {}

describe("HTTP CORS and security-header policy", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(PolicyTestModule, { logger: false });
    app.use(createHttpSecurityHeadersMiddleware("test"));
    app.enableCors(
      createHttpCorsOptionsDelegate({
        origins: "http://localhost:3000, https://admin.example.test/",
        publicRenderPaths: ["/media/render"],
      }),
    );
    await app.listen(0, "127.0.0.1");

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it("normalizes exact origins and rejects wildcard or path values", () => {
    expect(
      parseHttpCorsOrigins(
        "http://localhost:3000, https://admin.example.test/",
      ),
    ).toEqual(["http://localhost:3000", "https://admin.example.test"]);

    expect(() => parseHttpCorsOrigins("*")).toThrow(/exact/i);
    expect(() =>
      parseHttpCorsOrigins("https://admin.example.test/panel"),
    ).toThrow(/invalid/i);
  });

  it("validates the shared origin environment field before bootstrap", () => {
    const schema = Joi.object(httpPolicyEnvSchema);

    expect(
      schema.validate({
        HTTP_CORS_ORIGINS: "http://localhost:3000,https://admin.example.test",
      }).error,
    ).toBeUndefined();
    expect(
      schema.validate({ HTTP_CORS_ORIGINS: "https://example.test/path" }).error,
    ).toBeDefined();
  });

  it("classifies API, health, and public-render surfaces separately", () => {
    expect(classifyHttpSurface("/products")).toBe("browser-api");
    expect(classifyHttpSurface("/health")).toBe("internal");
    expect(classifyHttpSurface("/health/dependencies")).toBe("internal");
    expect(classifyHttpSurface("/media/render/id", ["/media/render"])).toBe(
      "public-render",
    );
  });

  it("answers an allowed API preflight with exact, non-credentialed policy", async () => {
    const response = await fetch(`${baseUrl}/api`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "PATCH",
        "Access-Control-Request-Headers": "authorization,content-type",
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3000",
    );
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(response.headers.get("access-control-allow-methods")).toBe(
      HTTP_CORS_METHODS.join(","),
    );
    expect(response.headers.get("access-control-allow-headers")).toBe(
      HTTP_CORS_ALLOWED_HEADERS.join(","),
    );
    expect(response.headers.get("vary")).toContain("Origin");
  });

  it("does not grant browser CORS to denied, health, or public-render preflights", async () => {
    const probes = [
      ["/api", "https://evil.example"],
      ["/health", "http://localhost:3000"],
      ["/media/render/example", "http://localhost:3000"],
    ] as const;

    for (const [path, origin] of probes) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "GET",
        },
      });

      expect(response.headers.get("access-control-allow-origin")).toBeNull();
      expect(
        response.headers.get("access-control-allow-credentials"),
      ).toBeNull();
    }
  });

  it("sets the shared Helmet baseline without local-development HSTS", async () => {
    const response = await fetch(`${baseUrl}/api`);

    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(response.headers.get("cross-origin-resource-policy")).toBe(
      "same-origin",
    );
    expect(response.headers.get("strict-transport-security")).toBeNull();
  });

  it("never exposes internal trust headers through browser CORS", () => {
    expect(HTTP_CORS_ALLOWED_HEADERS).toEqual([
      "Authorization",
      "Content-Type",
    ]);
    expect(HTTP_CORS_ALLOWED_HEADERS.join(",").toLowerCase()).not.toMatch(
      /x-s2s|x-svc|x-user|x-tenant|x-site|gateway/,
    );
  });
});
