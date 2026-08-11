import { Metadata, status } from "@grpc/grpc-js";
import { HttpException } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import {
  X_REQUEST_ID_HEADER,
  X_S2S_CONTEXT_HEADER,
  X_S2S_KEY_ID_HEADER,
  X_S2S_KIND_HEADER,
  X_S2S_TARGET_HEADER,
  decodeS2SSignedContext,
} from "@nebula/grpc-auth";
import { of, throwError } from "rxjs";
import type { GatewayRequestContext } from "../src/application/application.contracts";
import { GatewayAuthResolver } from "../src/auth/gateway-auth-resolver";

const AUTH_KEY = {
  id: "gateway-auth-v1",
  secret: "gateway-auth-resolver-test-secret-000000001",
};

const requestContext: GatewayRequestContext = Object.freeze({
  requestId: "request-auth-123",
  applicationId: "storefront-web",
  applicationProfile: "storefront-web",
  tenantId: "tenant-main",
  siteId: "site-main",
  channelId: "web",
  channelKind: "web",
  rateLimitProfile: "default",
});

function metadataText(metadata: Metadata, key: string): string {
  const values = metadata.get(key);
  expect(values).toHaveLength(1);
  return String(values[0]);
}

function createHarness(validateToken: jest.Mock) {
  const unused = jest.fn();
  const raw = {
    Register: unused,
    ValidateUser: unused,
    GetTokens: unused,
    RefreshTokens: unused,
    Logout: unused,
    ValidateToken: validateToken,
    GetProfile: unused,
  };
  const client = {
    getService: jest.fn((serviceName: string) => {
      expect(serviceName).toBe("AuthService");
      return raw;
    }),
  } as unknown as ClientGrpc;
  return new GatewayAuthResolver(client);
}

describe("GatewayAuthResolver", () => {
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

  it("gets actor truth through a gateway-v3 signed ValidateToken request", async () => {
    const validateToken = jest.fn((request: unknown, metadata?: Metadata) => {
      expect(request).toEqual({ token: "opaque-access-token" });
      expect(metadata).toBeInstanceOf(Metadata);
      return of({
        isValid: true,
        userId: "user-1",
        role: "user",
        sessionRef: "session-ref-1",
      });
    });
    const resolver = createHarness(validateToken);

    await expect(
      resolver.resolve("opaque-access-token", requestContext),
    ).resolves.toEqual({
      kind: "authenticated",
      identity: {
        userId: "user-1",
        role: "user",
        sessionRef: "session-ref-1",
      },
    });

    const sent = validateToken.mock.calls[0]?.[1] as Metadata;
    expect(metadataText(sent, X_S2S_KIND_HEADER)).toBe("gateway");
    expect(metadataText(sent, X_S2S_TARGET_HEADER)).toBe("auth-service");
    expect(metadataText(sent, X_S2S_KEY_ID_HEADER)).toBe(AUTH_KEY.id);
    expect(metadataText(sent, X_REQUEST_ID_HEADER)).toBe("request-auth-123");
    expect(
      decodeS2SSignedContext(metadataText(sent, X_S2S_CONTEXT_HEADER)).context,
    ).toEqual({
      version: "1",
      applicationId: "storefront-web",
      tenantId: "tenant-main",
      siteId: "site-main",
      channelId: "web",
    });
  });

  it("returns anonymous failure only from Auth's invalid result", async () => {
    const resolver = createHarness(
      jest.fn(() =>
        of({
          isValid: false,
          userId: "",
          role: "",
          sessionRef: "",
        }),
      ),
    );

    await expect(
      resolver.resolve("expired-token", requestContext),
    ).resolves.toBeNull();
  });

  it("rejects malformed successful identity truth", async () => {
    const resolver = createHarness(
      jest.fn(() =>
        of({
          isValid: true,
          userId: "user-1",
          role: "copied-admin",
          sessionRef: "session-ref-1",
        }),
      ),
    );

    await expect(
      resolver.resolve("opaque-access-token", requestContext),
    ).rejects.toMatchObject({ message: "auth_identity_invalid" });
  });

  it("uses shared safe gRPC-to-HTTP translation for Auth outages", async () => {
    const resolver = createHarness(
      jest.fn(() =>
        throwError(() => ({
          code: status.UNAVAILABLE,
          details: "auth_temporarily_unavailable",
        })),
      ),
    );

    try {
      await resolver.resolve("opaque-access-token", requestContext);
      throw new Error("expected_http_exception");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(503);
      expect((error as Error).message).toBe("auth_temporarily_unavailable");
    }
  });
});
