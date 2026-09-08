import { Metadata, status } from "@grpc/grpc-js";
import { HttpException } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import {
  AUTHORIZATION_HEADER,
  X_REQUEST_ID_HEADER,
  X_S2S_CONTEXT_HEADER,
  decodeS2SSignedContext,
} from "@nebula/grpc-auth";
import { of, throwError } from "rxjs";
import type { GatewayRequestContext } from "../src/application/application.contracts";
import { GatewayUserApiService } from "../src/user/gateway-user-api.service";
import type { GatewayHttpRequest } from "../src/http/public-client-boundary";

const USER_ID = "123e4567-e89b-42d3-a456-426614174000";
const USER_KEY = {
  id: "gateway-user-v1",
  secret: "gateway-user-api-test-secret-0000000000001",
};

const requestContext: GatewayRequestContext = Object.freeze({
  requestId: "request-user-api-123",
  applicationId: "admin-web-local",
  applicationProfile: "admin-web",
  tenantId: "single-site-tenant",
  siteId: "single-site",
  channelId: "admin-web",
  channelKind: "web",
  rateLimitProfile: "default",
});

function authenticatedRequest(role: "user" | "admin" = "user") {
  const identity = {
    userId: USER_ID,
    role,
    sessionRef: "session-ref-1",
  } as const;
  return {
    headers: {},
    rawHeaders: [],
    requestContext,
    actor: { kind: "authenticated", identity },
    user: identity,
    accessToken: "verified-access-token",
  } as GatewayHttpRequest;
}

function metadataText(metadata: Metadata, name: string): string {
  const values = metadata.get(name);
  expect(values).toHaveLength(1);
  return String(values[0]);
}

function createHarness(overrides: Record<string, jest.Mock>) {
  const unused = jest.fn(() => of({}));
  const raw = {
    GetUser: overrides.GetUser ?? unused,
    ListUsers: overrides.ListUsers ?? unused,
    UpdateProfile: overrides.UpdateProfile ?? unused,
  };
  const client = {
    getService: jest.fn(() => raw),
  } as unknown as ClientGrpc;
  return new GatewayUserApiService(client);
}

describe("GatewayUserApiService", () => {
  const originalKeys = process.env.GATEWAY_OUTBOUND_KEYS;

  beforeEach(() => {
    process.env.GATEWAY_OUTBOUND_KEYS = JSON.stringify({
      "user-service": USER_KEY,
    });
  });

  afterAll(() => {
    if (originalKeys === undefined) delete process.env.GATEWAY_OUTBOUND_KEYS;
    else process.env.GATEWAY_OUTBOUND_KEYS = originalKeys;
  });

  it("forwards verified actor/bearer context and preserves only public user fields", async () => {
    const getUser = jest.fn((body: unknown, metadata?: Metadata) => {
      void body;
      void metadata;
      return of({ id: USER_ID, email: "person@example.test", role: "user" });
    });
    const service = createHarness({ GetUser: getUser });

    await expect(service.get(authenticatedRequest(), USER_ID)).resolves.toEqual({
      id: USER_ID,
      email: "person@example.test",
      role: "user",
    });
    const metadata = getUser.mock.calls[0]?.[1] as Metadata;
    expect(metadataText(metadata, AUTHORIZATION_HEADER)).toBe(
      "Bearer verified-access-token",
    );
    expect(metadataText(metadata, X_REQUEST_ID_HEADER)).toBe(
      requestContext.requestId,
    );
    expect(
      decodeS2SSignedContext(
        metadataText(metadata, X_S2S_CONTEXT_HEADER),
      ).context.actor,
    ).toEqual({
      userId: USER_ID,
      role: "user",
      sessionRef: "session-ref-1",
    });
  });

  it("maps the current list as explicitly unpaginated-safe items", async () => {
    const service = createHarness({
      ListUsers: jest.fn(() =>
        of({
          users: [
            {
              id: USER_ID,
              email: "person@example.test",
              phone: "",
              role: "user",
              createdAt: "2026-08-15T10:00:00.000Z",
              passwordHash: "must-not-map",
            },
          ],
        }),
      ),
    });

    const users = await service.list(authenticatedRequest("admin"));
    expect(users).toEqual([
      {
        id: USER_ID,
        email: "person@example.test",
        role: "user",
        createdAt: "2026-08-15T10:00:00.000Z",
      },
    ]);
    expect(users[0]).not.toHaveProperty("passwordHash");
    expect(users[0]).not.toHaveProperty("phone");
  });

  it("rejects identity drift and translates service outages", async () => {
    const drift = createHarness({
      UpdateProfile: jest.fn(() =>
        of({ id: "different-user", email: "other@example.test", role: "user" }),
      ),
    });
    await expect(
      drift.update(authenticatedRequest(), {
        id: USER_ID,
        email: "changed@example.test",
        newPassword: "",
        currentPassword: "",
      }),
    ).rejects.toMatchObject({ status: 502 });

    const unavailable = createHarness({
      GetUser: jest.fn(() =>
        throwError(() => ({ code: status.UNAVAILABLE, details: "db-secret" })),
      ),
    });
    try {
      await unavailable.get(authenticatedRequest(), USER_ID);
      throw new Error("expected_http_exception");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(503);
    }
  });
});
