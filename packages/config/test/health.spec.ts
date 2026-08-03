import { Controller, INestApplication, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { AddressInfo } from "node:net";
import { type HealthProbe, StandardHealthController } from "../src/health";

let databaseAvailable = true;

@Controller("health")
class TestHealthController extends StandardHealthController {
  constructor() {
    super("test-service");
  }

  protected readinessProbes(): readonly HealthProbe[] {
    return [
      {
        name: "database",
        check: () => {
          if (!databaseAvailable) {
            throw new Error("secret_database_error");
          }
        },
      },
      { name: "optional", check: () => "skipped" },
    ];
  }
}

@Module({ controllers: [TestHealthController] })
class TestHealthModule {}

describe("standard health contract", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(TestHealthModule, { logger: false });
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    databaseAvailable = true;
  });

  it("keeps liveness independent from dependencies", async () => {
    databaseAvailable = false;

    const response = await fetch(`${baseUrl}/health/live`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "test-service",
      time: expect.any(String),
    });
  });

  it.each(["/health", "/health/ready"])(
    "returns ready on %s when required probes pass",
    async (path) => {
      const response = await fetch(`${baseUrl}${path}`);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        status: "ok",
        service: "test-service",
        time: expect.any(String),
        checks: {
          database: { status: "ok" },
          optional: { status: "skipped" },
        },
      });
    },
  );

  it("returns sanitized 503 readiness without leaking probe errors", async () => {
    databaseAvailable = false;

    const response = await fetch(`${baseUrl}/health/ready`);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      status: "degraded",
      service: "test-service",
      time: expect.any(String),
      checks: {
        database: { status: "error" },
        optional: { status: "skipped" },
      },
    });
    expect(JSON.stringify(body)).not.toContain("secret_database_error");
  });

  it("returns to ready after a dependency recovers", async () => {
    databaseAvailable = false;
    await fetch(`${baseUrl}/health/ready`).then((response) => {
      expect(response.status).toBe(503);
    });

    databaseAvailable = true;
    const response = await fetch(`${baseUrl}/health/ready`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      service: "test-service",
      checks: {
        database: { status: "ok" },
      },
    });
  });
});
