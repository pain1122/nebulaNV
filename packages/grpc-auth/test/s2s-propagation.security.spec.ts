import { Metadata } from "@grpc/grpc-js";
import {
  createVerifiedServiceDownstreamContext,
  type ContextCarrier,
  type MetadataWithContext,
} from "../index";

const requestContext = Object.freeze({
  applicationId: "admin-web",
  tenantId: "tenant-main",
  siteId: "site-main",
  channelId: "browser",
});
const actor = Object.freeze({
  userId: "user-1",
  role: "admin" as const,
  sessionRef: "session-1",
});

function verifiedMetadata(): MetadataWithContext {
  const metadata = new Metadata() as MetadataWithContext;
  metadata.svc = "gateway";
  metadata.svcKind = "gateway";
  metadata.requestId = "req-ingress-1";
  metadata.requestContext = requestContext;
  metadata.signedActor = actor;
  metadata.user = actor;
  metadata.set("authorization", "Bearer verified-token");
  metadata.set("x-s2s-target", "attacker-target");
  metadata.set("x-untrusted", "discard-me");
  return metadata;
}

describe("verified service downstream context", () => {
  it("projects verified v3 context and only the verified bearer", () => {
    const metadata = verifiedMetadata();
    const call: ContextCarrier = {
      svc: "gateway",
      svcKind: "gateway",
      requestId: "req-ingress-1",
      requestContext,
      signedActor: actor,
      user: actor,
    };

    const downstream = createVerifiedServiceDownstreamContext(metadata, call);

    expect(downstream.signingPolicy).toEqual({
      requestId: "req-ingress-1",
      context: { version: "1", ...requestContext, actor },
    });
    expect(downstream.metadata.getMap()).toEqual({
      authorization: "Bearer verified-token",
    });
    expect(downstream.signingPolicy).not.toHaveProperty("kind");
    expect(downstream.signingPolicy).not.toHaveProperty("serviceName");
    expect(downstream.signingPolicy).not.toHaveProperty("key");
  });

  it("preserves a verified v2 request ID without inventing context", () => {
    const metadata = new Metadata() as MetadataWithContext;
    metadata.svc = "auth-service";
    metadata.svcKind = "service";
    metadata.requestId = "req-v2-1";

    const downstream = createVerifiedServiceDownstreamContext(metadata);

    expect(downstream.signingPolicy).toEqual({ requestId: "req-v2-1" });
    expect(downstream.metadata.getMap()).toEqual({});
  });

  it("never propagates a resolution context", () => {
    const metadata = new Metadata() as MetadataWithContext;
    metadata.svc = "gateway";
    metadata.svcKind = "gateway";
    metadata.requestId = "req-resolution-1";
    metadata.resolutionContext = {
      version: "2",
      purpose: "RESOLUTION",
      resolutionStage: "AUTHORITY",
      actor: { userId: "user-1", sessionRef: "session-1" },
    };

    expect(() => createVerifiedServiceDownstreamContext(metadata)).toThrow(
      "s2s_resolution_context_not_propagatable",
    );
  });

  it.each([
    [
      "missing verified ingress",
      (metadata: MetadataWithContext) => delete metadata.svc,
    ],
    [
      "duplicate authorization",
      (metadata: MetadataWithContext) =>
        metadata.add("authorization", "Bearer second"),
    ],
    [
      "missing actor bearer",
      (metadata: MetadataWithContext) => metadata.remove("authorization"),
    ],
    [
      "mismatched verified user",
      (metadata: MetadataWithContext) => {
        metadata.user = { ...actor, userId: "user-2" };
      },
    ],
  ])("rejects %s", (_label, mutate) => {
    const metadata = verifiedMetadata();
    mutate(metadata);
    expect(() => createVerifiedServiceDownstreamContext(metadata)).toThrow(
      /^s2s_propagation_/,
    );
  });
});
