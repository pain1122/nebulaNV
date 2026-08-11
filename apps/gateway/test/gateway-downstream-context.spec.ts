import { Metadata } from "@grpc/grpc-js";
import type { ClientGrpc } from "@nestjs/microservices";
import { getUser } from "@nebula/clients";
import {
  AUTHORIZATION_HEADER,
  USER_SERVICE_TARGET,
  X_REQUEST_ID_HEADER,
  X_S2S_CONTEXT_HEADER,
  X_S2S_KIND_HEADER,
  X_S2S_NONCE_HEADER,
  X_S2S_TARGET_HEADER,
  decodeS2SSignedContext,
} from "@nebula/grpc-auth";
import { firstValueFrom, of } from "rxjs";
import type { GatewayRequestContext } from "../src/application/application.contracts";
import {
  createGatewayDownstreamContext,
  type GatewayOutboundTarget,
} from "../src/downstream/gateway-downstream-context";
import type { GatewayHttpRequest } from "../src/http/application-context";

const USER_KEY = {
  id: "gateway-user-v1",
  secret: "gateway-downstream-user-test-secret-00000001",
};

const requestContext: GatewayRequestContext = Object.freeze({
  requestId: "request-downstream-123",
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

function requestBase(): GatewayHttpRequest {
  return {
    headers: {
      authorization: "Bearer raw-client-value",
      "x-s2s-kind": "service",
      "x-tenant-id": "client-tenant",
    },
    rawHeaders: [
      "Authorization",
      "Bearer raw-client-value",
      "X-Tenant-ID",
      "client-tenant",
    ],
    requestContext,
    actor: { kind: "anonymous" },
  } as GatewayHttpRequest;
}

describe("createGatewayDownstreamContext", () => {
  const originalKeys = process.env.GATEWAY_OUTBOUND_KEYS;

  beforeEach(() => {
    process.env.GATEWAY_OUTBOUND_KEYS = JSON.stringify({
      [USER_SERVICE_TARGET]: USER_KEY,
    });
  });

  afterAll(() => {
    if (originalKeys === undefined) delete process.env.GATEWAY_OUTBOUND_KEYS;
    else process.env.GATEWAY_OUTBOUND_KEYS = originalKeys;
  });

  it("creates anonymous v3 policy from trusted state without copying headers", () => {
    const downstream = createGatewayDownstreamContext(
      requestBase(),
      USER_SERVICE_TARGET,
    );

    expect(downstream.signingPolicy).toMatchObject({
      kind: "gateway",
      serviceName: "gateway",
      key: USER_KEY,
      requestId: "request-downstream-123",
    });
    expect(downstream.signingPolicy.context).toEqual({
      version: "1",
      applicationId: "storefront-web",
      tenantId: "tenant-main",
      siteId: "site-main",
      channelId: "web",
    });
    expect(downstream.metadata.get(AUTHORIZATION_HEADER)).toHaveLength(0);
    expect(downstream.metadata.get("x-tenant-id")).toHaveLength(0);
    expect(downstream.metadata.get(X_S2S_KIND_HEADER)).toHaveLength(0);
  });

  it("forwards only Auth-verified actor/bearer and signs fresh metadata per invocation", async () => {
    const request = requestBase();
    request.actor = {
      kind: "authenticated",
      identity: {
        userId: "user-1",
        role: "user",
        sessionRef: "session-ref-1",
      },
    };
    request.user = request.actor.identity;
    request.accessToken = "auth-verified-opaque-token";
    const downstream = createGatewayDownstreamContext(
      request,
      USER_SERVICE_TARGET,
    );
    const sentMetadata: Metadata[] = [];
    const rawGetUser = jest.fn((input: unknown, metadata?: Metadata) => {
      void input;
      if (metadata) sentMetadata.push(metadata);
      return of({ id: "user-1" });
    });
    const unused = jest.fn();
    const client = {
      getService: jest.fn(() => ({
        GetUser: rawGetUser,
        ListUsers: unused,
        UpdateProfile: unused,
      })),
    } as unknown as ClientGrpc;
    const user = getUser(client, downstream.signingPolicy);

    await firstValueFrom(user.GetUser({ id: "user-1" }, downstream.metadata));
    await firstValueFrom(user.GetUser({ id: "user-1" }, downstream.metadata));

    expect(sentMetadata).toHaveLength(2);
    const first = sentMetadata[0];
    const second = sentMetadata[1];
    expect(metadataText(first, AUTHORIZATION_HEADER)).toBe(
      "Bearer auth-verified-opaque-token",
    );
    expect(metadataText(first, X_S2S_KIND_HEADER)).toBe("gateway");
    expect(metadataText(first, X_S2S_TARGET_HEADER)).toBe(USER_SERVICE_TARGET);
    expect(metadataText(first, X_REQUEST_ID_HEADER)).toBe(
      "request-downstream-123",
    );
    expect(
      decodeS2SSignedContext(metadataText(first, X_S2S_CONTEXT_HEADER)).context,
    ).toEqual({
      version: "1",
      applicationId: "storefront-web",
      tenantId: "tenant-main",
      siteId: "site-main",
      channelId: "web",
      actor: {
        userId: "user-1",
        role: "user",
        sessionRef: "session-ref-1",
      },
    });
    expect(metadataText(first, X_S2S_NONCE_HEADER)).not.toBe(
      metadataText(second, X_S2S_NONCE_HEADER),
    );
  });

  it("fails closed on incomplete actor state, missing context/key, or an undeclared target", () => {
    const authenticated = requestBase();
    authenticated.actor = {
      kind: "authenticated",
      identity: {
        userId: "user-1",
        role: "user",
        sessionRef: "session-ref-1",
      },
    };
    authenticated.user = authenticated.actor.identity;
    expect(() =>
      createGatewayDownstreamContext(authenticated, USER_SERVICE_TARGET),
    ).toThrow("gateway_verified_actor_state_incomplete");

    const inconsistentAnonymous = requestBase();
    inconsistentAnonymous.accessToken = "unverified-token";
    expect(() =>
      createGatewayDownstreamContext(
        inconsistentAnonymous,
        USER_SERVICE_TARGET,
      ),
    ).toThrow("gateway_anonymous_actor_state_inconsistent");

    const missingContext = requestBase();
    delete missingContext.requestContext;
    expect(() =>
      createGatewayDownstreamContext(missingContext, USER_SERVICE_TARGET),
    ).toThrow("gateway_request_context_missing");

    process.env.GATEWAY_OUTBOUND_KEYS = "{}";
    expect(() =>
      createGatewayDownstreamContext(requestBase(), USER_SERVICE_TARGET),
    ).toThrow("gateway_downstream_key_missing_user-service");
    expect(() =>
      createGatewayDownstreamContext(
        requestBase(),
        "database" as GatewayOutboundTarget,
      ),
    ).toThrow("gateway_downstream_target_not_allowed");
  });
});
