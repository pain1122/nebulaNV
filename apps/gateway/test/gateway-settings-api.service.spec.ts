import { Metadata, status } from "@grpc/grpc-js";
import { HttpException } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import {
  AUTHORIZATION_HEADER,
  X_REQUEST_ID_HEADER,
} from "@nebula/grpc-auth";
import { of, throwError } from "rxjs";
import type { GatewayRequestContext } from "../src/application/application.contracts";
import {
  GATEWAY_SETTINGS_ENVIRONMENT,
  GatewaySettingsApiService,
} from "../src/settings/gateway-settings-api.service";
import type { GatewayHttpRequest } from "../src/http/public-client-boundary";

const SETTINGS_KEY = {
  id: "gateway-settings-v1",
  secret: "gateway-settings-api-test-secret-000000001",
};

const requestContext: GatewayRequestContext = Object.freeze({
  requestId: "request-settings-api-123",
  applicationId: "admin-web-local",
  applicationProfile: "admin-web",
  tenantId: "single-site-tenant",
  siteId: "single-site",
  channelId: "admin-web",
  channelKind: "web",
  rateLimitProfile: "default",
});

function gatewayRequest(authenticated: boolean): GatewayHttpRequest {
  const request = {
    headers: {},
    rawHeaders: [],
    requestContext,
    actor: { kind: "anonymous" },
  } as GatewayHttpRequest;
  if (authenticated) {
    request.actor = {
      kind: "authenticated",
      identity: {
        userId: "admin-1",
        role: "admin",
        sessionRef: "session-ref-1",
      },
    };
    request.user = request.actor.identity;
    request.accessToken = "verified-admin-token";
  }
  return request;
}

function createHarness(overrides: Record<string, jest.Mock>) {
  const unused = jest.fn(() => of({}));
  const raw = {
    GetString: overrides.GetString ?? unused,
    SetString: overrides.SetString ?? unused,
    DeleteString: overrides.DeleteString ?? unused,
    EnsureBootstrapString: overrides.EnsureBootstrapString ?? unused,
  };
  const client = { getService: jest.fn(() => raw) } as unknown as ClientGrpc;
  return { service: new GatewaySettingsApiService(client), raw };
}

describe("GatewaySettingsApiService", () => {
  const originalKeys = process.env.GATEWAY_OUTBOUND_KEYS;

  beforeEach(() => {
    process.env.GATEWAY_OUTBOUND_KEYS = JSON.stringify({
      "settings-service": SETTINGS_KEY,
    });
  });

  afterAll(() => {
    if (originalKeys === undefined) delete process.env.GATEWAY_OUTBOUND_KEYS;
    else process.env.GATEWAY_OUTBOUND_KEYS = originalKeys;
  });

  it("derives the fixed environment and never uses the bootstrap RPC", async () => {
    const getString = jest.fn((body: unknown, metadata?: Metadata) => {
      void body;
      void metadata;
      return of({ value: "USD", found: true });
    });
    const ensure = jest.fn();
    const { service } = createHarness({
      GetString: getString,
      EnsureBootstrapString: ensure,
    });

    await expect(
      service.get(gatewayRequest(false), "pricing", "default_currency"),
    ).resolves.toEqual({ value: "USD", found: true });
    expect(getString.mock.calls[0]?.[0]).toEqual({
      namespace: "pricing",
      key: "default_currency",
      environment: GATEWAY_SETTINGS_ENVIRONMENT,
    });
    expect(ensure).not.toHaveBeenCalled();
    expect(
      (getString.mock.calls[0]?.[1] as Metadata).get(AUTHORIZATION_HEADER),
    ).toHaveLength(0);
  });

  it("forwards the verified admin bearer on writes with one request ID", async () => {
    const setString = jest.fn((body: unknown, metadata?: Metadata) => {
      void body;
      void metadata;
      return of({ value: "60" });
    });
    const { service } = createHarness({ SetString: setString });

    await expect(
      service.set(
        gatewayRequest(true),
        "order",
        "cart_ttl_minutes",
        "60",
      ),
    ).resolves.toEqual({ value: "60" });
    const metadata = setString.mock.calls[0]?.[1] as Metadata;
    expect(metadata.get(AUTHORIZATION_HEADER)).toEqual([
      "Bearer verified-admin-token",
    ]);
    expect(metadata.get(X_REQUEST_ID_HEADER)).toEqual([
      requestContext.requestId,
    ]);
  });

  it("rejects malformed replies and translates downstream outages", async () => {
    const invalid = createHarness({
      DeleteString: jest.fn(() => of({ deleted: "yes" })),
    });
    await expect(
      invalid.service.delete(
        gatewayRequest(true),
        "order",
        "cart_ttl_minutes",
      ),
    ).rejects.toMatchObject({ status: 502 });

    const unavailable = createHarness({
      GetString: jest.fn(() =>
        throwError(() => ({
          code: status.UNAVAILABLE,
          details: "database_credentials",
        })),
      ),
    });
    try {
      await unavailable.service.get(
        gatewayRequest(false),
        "pricing",
        "default_currency",
      );
      throw new Error("expected_http_exception");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(503);
    }
  });
});
