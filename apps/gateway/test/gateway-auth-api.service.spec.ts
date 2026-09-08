import { Metadata, status } from "@grpc/grpc-js";
import { HttpException } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import {
  AUTHORIZATION_HEADER,
  X_REQUEST_ID_HEADER,
  X_S2S_CONTEXT_HEADER,
  X_S2S_KIND_HEADER,
  X_S2S_NONCE_HEADER,
  decodeS2SSignedContext,
} from "@nebula/grpc-auth";
import { of, throwError } from "rxjs";
import type { GatewayRequestContext } from "../src/application/application.contracts";
import { GatewayAuthApiService } from "../src/auth/gateway-auth-api.service";
import type { GatewayHttpRequest } from "../src/http/public-client-boundary";

const AUTH_KEY = {
  id: "gateway-auth-v1",
  secret: "gateway-auth-api-test-secret-0000000000001",
};

const requestContext: GatewayRequestContext = Object.freeze({
  requestId: "request-auth-api-123",
  applicationId: "admin-web-local",
  applicationProfile: "admin-web",
  tenantId: "single-site-tenant",
  siteId: "single-site",
  channelId: "admin-web",
  channelKind: "web",
  rateLimitProfile: "default",
});

function anonymousRequest(): GatewayHttpRequest {
  return {
    headers: {},
    rawHeaders: [],
    requestContext,
    actor: { kind: "anonymous" },
  } as GatewayHttpRequest;
}

function authenticatedRequest(): GatewayHttpRequest {
  const request = anonymousRequest();
  request.actor = {
    kind: "authenticated",
    identity: {
      userId: "user-1",
      role: "user",
      sessionRef: "session-ref-1",
    },
  };
  request.user = request.actor.identity;
  request.accessToken = "verified-access-token";
  return request;
}

function metadataText(metadata: Metadata, name: string): string {
  const values = metadata.get(name);
  expect(values).toHaveLength(1);
  return String(values[0]);
}

function createHarness(overrides: Record<string, jest.Mock> = {}) {
  const unused = jest.fn(() => of({}));
  const raw = {
    Register: overrides.Register ?? unused,
    ValidateUser: overrides.ValidateUser ?? unused,
    GetTokens: overrides.GetTokens ?? unused,
    RefreshTokens: overrides.RefreshTokens ?? unused,
    Logout: overrides.Logout ?? unused,
    ValidateToken: overrides.ValidateToken ?? unused,
    GetProfile: overrides.GetProfile ?? unused,
  };
  const client = {
    getService: jest.fn((serviceName: string) => {
      expect(serviceName).toBe("AuthService");
      return raw;
    }),
  } as unknown as ClientGrpc;
  return { service: new GatewayAuthApiService(client), raw };
}

describe("GatewayAuthApiService", () => {
  const originalKeys = process.env.GATEWAY_OUTBOUND_KEYS;

  beforeEach(() => {
    process.env.GATEWAY_OUTBOUND_KEYS = JSON.stringify({
      "auth-service": AUTH_KEY,
    });
  });

  afterAll(() => {
    if (originalKeys === undefined) delete process.env.GATEWAY_OUTBOUND_KEYS;
    else process.env.GATEWAY_OUTBOUND_KEYS = originalKeys;
  });

  it("performs login as two separately signed gateway calls with one causal context", async () => {
    const validate = jest.fn((body: unknown, metadata?: Metadata) => {
      void body;
      void metadata;
      return of({ isValid: true, userId: "user-1" });
    });
    const tokens = jest.fn((body: unknown, metadata?: Metadata) => {
      void body;
      void metadata;
      return of({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        accessExpiresInSeconds: 900,
        refreshExpiresInSeconds: 604800,
      });
    });
    const { service } = createHarness({
      ValidateUser: validate,
      GetTokens: tokens,
    });

    await expect(
      service.login(anonymousRequest(), {
        identifier: "person@example.test",
        password: "secret-password",
      }),
    ).resolves.toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      accessExpiresInSeconds: 900,
      refreshExpiresInSeconds: 604800,
    });

    expect(tokens.mock.calls[0]?.[0]).toEqual({ userId: "user-1" });
    const first = validate.mock.calls[0]?.[1] as Metadata;
    const second = tokens.mock.calls[0]?.[1] as Metadata;
    for (const metadata of [first, second]) {
      expect(metadataText(metadata, X_S2S_KIND_HEADER)).toBe("gateway");
      expect(metadataText(metadata, X_REQUEST_ID_HEADER)).toBe(
        requestContext.requestId,
      );
      expect(
        decodeS2SSignedContext(
          metadataText(metadata, X_S2S_CONTEXT_HEADER),
        ).context,
      ).toEqual({
        version: "1",
        applicationId: "admin-web-local",
        tenantId: "single-site-tenant",
        siteId: "single-site",
        channelId: "admin-web",
      });
    }
    expect(metadataText(first, X_S2S_NONCE_HEADER)).not.toBe(
      metadataText(second, X_S2S_NONCE_HEADER),
    );
  });

  it("forwards only the verified bearer/actor for profile and rejects identity drift", async () => {
    const getProfile = jest.fn((body: unknown, metadata?: Metadata) => {
      void body;
      void metadata;
      return of({
        id: "different-user",
        email: "other@example.test",
        role: "user",
      });
    });
    const { service } = createHarness({ GetProfile: getProfile });

    await expect(
      service.profile(authenticatedRequest(), "user-1"),
    ).rejects.toMatchObject({ status: 502 });

    const metadata = getProfile.mock.calls[0]?.[1] as Metadata;
    expect(metadataText(metadata, AUTHORIZATION_HEADER)).toBe(
      "Bearer verified-access-token",
    );
    expect(
      decodeS2SSignedContext(
        metadataText(metadata, X_S2S_CONTEXT_HEADER),
      ).context.actor,
    ).toEqual({
      userId: "user-1",
      role: "user",
      sessionRef: "session-ref-1",
    });
  });

  it("maps invalid credentials and upstream outages through stable HTTP statuses", async () => {
    const invalid = createHarness({
      ValidateUser: jest.fn(() => of({ isValid: false, userId: "" })),
    });
    await expect(
      invalid.service.login(anonymousRequest(), {
        identifier: "person@example.test",
        password: "wrong-password",
      }),
    ).rejects.toMatchObject({ status: 401 });

    const unavailable = createHarness({
      RefreshTokens: jest.fn(() =>
        throwError(() => ({
          code: status.UNAVAILABLE,
          details: "redis_credentials_must_not_escape",
        })),
      ),
    });
    try {
      await unavailable.service.refresh(anonymousRequest(), "refresh-token");
      throw new Error("expected_http_exception");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(503);
    }
  });
});
