import { Metadata } from "@grpc/grpc-js";
import type { ClientGrpc } from "@nestjs/microservices";
import {
  S2S_PROTOCOL_VERSION_V2,
  S2S_PROTOCOL_VERSION_V3,
  S2S_SIGNATURE_HEADER_DEFAULT,
  X_REQUEST_ID_HEADER,
  X_S2S_BODY_SHA256_HEADER,
  X_S2S_CONTEXT_HEADER,
  X_S2S_CONTEXT_SHA256_HEADER,
  X_S2S_ISSUED_AT_HEADER,
  X_S2S_KEY_ID_HEADER,
  X_S2S_KIND_HEADER,
  X_S2S_METHOD_HEADER,
  X_S2S_NONCE_HEADER,
  X_S2S_PATH_HEADER,
  X_S2S_TARGET_HEADER,
  X_S2S_VERSION_HEADER,
  X_SVC_HEADER,
  decodeS2SSignedContext,
  digestGrpcS2SRequest,
  verifyS2SSignature,
  type S2SSignedEnvelope,
  type S2SSignedContext,
} from "@nebula/grpc-auth";
import { settings, taxonomy } from "@nebula/protos";
import { firstValueFrom, of } from "rxjs";
import { getSettings } from "../src/settings.client";
import { getTaxonomy } from "../src/taxonomy.client";

const SERVICE_KEY = {
  id: "product-settings-v1",
  secret: "product-to-settings-test-secret-0000000001",
};
const GATEWAY_KEY = {
  id: "gateway-settings-v1",
  secret: "gateway-to-settings-test-secret-0000000001",
};
const TAXONOMY_KEY = {
  id: "gateway-taxonomy-v1",
  secret: "gateway-to-taxonomy-test-secret-0000000001",
};

const context: S2SSignedContext = Object.freeze({
  version: "1",
  applicationId: "storefront-web",
  tenantId: "tenant-main",
  siteId: "site-main",
  channelId: "web",
});

function metadataText(metadata: Metadata, key: string): string {
  const values = metadata.get(key);
  expect(values).toHaveLength(1);
  return String(values[0]);
}

function envelopeFromMetadata(metadata: Metadata): S2SSignedEnvelope {
  const base = {
    kind: metadataText(metadata, X_S2S_KIND_HEADER) as "service" | "gateway",
    caller: metadataText(metadata, X_SVC_HEADER),
    target: metadataText(metadata, X_S2S_TARGET_HEADER),
    method: metadataText(metadata, X_S2S_METHOD_HEADER),
    path: metadataText(metadata, X_S2S_PATH_HEADER),
    issuedAtMs: Number(metadataText(metadata, X_S2S_ISSUED_AT_HEADER)),
    nonce: metadataText(metadata, X_S2S_NONCE_HEADER),
    requestId: metadataText(metadata, X_REQUEST_ID_HEADER),
    keyId: metadataText(metadata, X_S2S_KEY_ID_HEADER),
    bodySha256: metadataText(metadata, X_S2S_BODY_SHA256_HEADER),
  };
  const version = metadataText(metadata, X_S2S_VERSION_HEADER);
  return version === S2S_PROTOCOL_VERSION_V3
    ? {
        ...base,
        version,
        contextSha256: metadataText(metadata, X_S2S_CONTEXT_SHA256_HEADER),
      }
    : { ...base, version: S2S_PROTOCOL_VERSION_V2 };
}

function clientFor(service: object): ClientGrpc {
  return {
    getService: jest.fn(() => service),
  } as unknown as ClientGrpc;
}

function unaryMock<T>(response: T) {
  return jest.fn((request: unknown, metadata?: Metadata) => {
    void request;
    void metadata;
    return of(response);
  });
}

function settingsRaw() {
  return {
    GetString: unaryMock({ value: "enabled", found: true }),
    SetString: unaryMock({ value: "enabled" }),
    DeleteString: unaryMock({ deleted: true }),
    EnsureBootstrapString: unaryMock({ value: "enabled" }),
  };
}

function taxonomyRaw() {
  return {
    GetTaxonomy: unaryMock({ data: {} }),
    GetBySlug: unaryMock({ data: {} }),
    EnsureSystemTaxonomy: unaryMock({ data: {} }),
    CreateTaxonomy: unaryMock({ data: {} }),
    UpdateTaxonomy: unaryMock({ data: {} }),
    DeleteTaxonomy: unaryMock({}),
    ListTaxonomies: unaryMock({ data: [], page: 1, limit: 20, total: 0 }),
  };
}

describe("existing client wrapper signing policy", () => {
  const originalServiceName = process.env.SERVICE_NAME;
  const originalServiceNameAlt = process.env.SVC_NAME;
  const originalOutboundKeys = process.env.S2S_OUTBOUND_KEYS;

  afterEach(() => {
    if (originalServiceName === undefined) delete process.env.SERVICE_NAME;
    else process.env.SERVICE_NAME = originalServiceName;
    if (originalServiceNameAlt === undefined) delete process.env.SVC_NAME;
    else process.env.SVC_NAME = originalServiceNameAlt;
    if (originalOutboundKeys === undefined)
      delete process.env.S2S_OUTBOUND_KEYS;
    else process.env.S2S_OUTBOUND_KEYS = originalOutboundKeys;
  });

  it("preserves the current ordinary-service defaults and blocks reserved overrides", async () => {
    process.env.SERVICE_NAME = "product-service";
    delete process.env.SVC_NAME;
    process.env.S2S_OUTBOUND_KEYS = JSON.stringify({
      "settings-service": SERVICE_KEY,
    });
    const raw = settingsRaw();
    const proxy = getSettings(clientFor(raw));
    const application = new Metadata();
    application.set(X_S2S_KIND_HEADER, "gateway");
    application.set(X_REQUEST_ID_HEADER, "attacker-request");
    application.set("x-client-test", "preserved");

    await firstValueFrom(
      proxy.GetString(
        { namespace: "product", key: "feature.enabled" },
        application,
      ),
    );

    const sent = raw.GetString.mock.calls[0]?.[1] as Metadata;
    expect(metadataText(sent, X_S2S_VERSION_HEADER)).toBe(
      S2S_PROTOCOL_VERSION_V2,
    );
    expect(metadataText(sent, X_S2S_KIND_HEADER)).toBe("service");
    expect(metadataText(sent, X_SVC_HEADER)).toBe("product-service");
    expect(metadataText(sent, X_S2S_TARGET_HEADER)).toBe("settings-service");
    expect(metadataText(sent, X_S2S_KEY_ID_HEADER)).toBe(SERVICE_KEY.id);
    expect(metadataText(sent, X_REQUEST_ID_HEADER)).not.toBe(
      "attacker-request",
    );
    expect(metadataText(sent, "x-client-test")).toBe("preserved");
    expect(sent.get(X_S2S_CONTEXT_HEADER)).toHaveLength(0);
  });

  it("uses injected gateway identity, context, key, and ingress request ID with a fresh nonce", async () => {
    const raw = settingsRaw();
    const proxy = getSettings(clientFor(raw), {
      kind: "gateway",
      serviceName: "gateway",
      key: GATEWAY_KEY,
      requestId: "ingress-request-123",
      context,
    });
    const request = {
      namespace: "public",
      key: "store.enabled",
      value: "enabled",
    };

    await firstValueFrom(proxy.SetString(request));
    await firstValueFrom(proxy.SetString(request));

    const first = raw.SetString.mock.calls[0]?.[1] as Metadata;
    const second = raw.SetString.mock.calls[1]?.[1] as Metadata;
    expect(metadataText(first, X_S2S_VERSION_HEADER)).toBe(
      S2S_PROTOCOL_VERSION_V3,
    );
    expect(metadataText(first, X_S2S_KIND_HEADER)).toBe("gateway");
    expect(metadataText(first, X_SVC_HEADER)).toBe("gateway");
    expect(metadataText(first, X_REQUEST_ID_HEADER)).toBe(
      "ingress-request-123",
    );
    expect(metadataText(first, X_S2S_KEY_ID_HEADER)).toBe(GATEWAY_KEY.id);
    expect(
      decodeS2SSignedContext(metadataText(first, X_S2S_CONTEXT_HEADER)).context,
    ).toEqual(context);
    expect(metadataText(first, X_S2S_BODY_SHA256_HEADER)).toBe(
      digestGrpcS2SRequest(settings.SettingsServiceService.setString, request),
    );
    expect(
      verifyS2SSignature(
        GATEWAY_KEY.secret,
        envelopeFromMetadata(first),
        metadataText(first, S2S_SIGNATURE_HEADER_DEFAULT),
      ),
    ).toBe(true);
    expect(metadataText(first, X_S2S_NONCE_HEADER)).not.toBe(
      metadataText(second, X_S2S_NONCE_HEADER),
    );
  });

  it("signs taxonomy's actual wrapped request and keeps the fixed target", async () => {
    const raw = taxonomyRaw();
    const proxy = getTaxonomy(clientFor(raw), {
      kind: "gateway",
      serviceName: "gateway",
      key: TAXONOMY_KEY,
      requestId: "ingress-taxonomy-123",
      context,
    });
    const application = new Metadata();
    application.set(X_S2S_TARGET_HEADER, "auth-service");
    application.set(X_REQUEST_ID_HEADER, "attacker-request");
    const request = {
      scope: "product",
      kind: "category",
      slug: "hardware",
      title: "Hardware",
      path: "/hardware",
    };

    await firstValueFrom(proxy.CreateTaxonomy(request, application));

    const sentRequest = raw.CreateTaxonomy.mock.calls[0]?.[0];
    const sent = raw.CreateTaxonomy.mock.calls[0]?.[1] as Metadata;
    expect(sentRequest).toEqual({ data: request });
    expect(metadataText(sent, X_S2S_TARGET_HEADER)).toBe("taxonomy-service");
    expect(metadataText(sent, X_REQUEST_ID_HEADER)).toBe(
      "ingress-taxonomy-123",
    );
    expect(metadataText(sent, X_S2S_BODY_SHA256_HEADER)).toBe(
      digestGrpcS2SRequest(
        taxonomy.TaxonomyServiceService.createTaxonomy,
        sentRequest,
      ),
    );
    expect(
      verifyS2SSignature(
        TAXONOMY_KEY.secret,
        envelopeFromMetadata(sent),
        metadataText(sent, S2S_SIGNATURE_HEADER_DEFAULT),
      ),
    ).toBe(true);
  });

  it("fails closed when gateway signing is requested without context", () => {
    const raw = settingsRaw();
    const proxy = getSettings(clientFor(raw), {
      kind: "gateway",
      serviceName: "gateway",
      key: GATEWAY_KEY,
      requestId: "ingress-request-123",
    });

    expect(() =>
      proxy.GetString({ namespace: "public", key: "store.enabled" }),
    ).toThrow("s2s_context_required_for_gateway");
    expect(raw.GetString).not.toHaveBeenCalled();
  });
});
