import { Metadata, status } from "@grpc/grpc-js";
import { RpcException } from "@nestjs/microservices";
import type { MetadataWithContext } from "@nebula/grpc-auth";
import { tenantauthorityv1 } from "@nebula/protos";
import { AuthorityGrpcController } from "../src/authority/authority-grpc.controller";
import type { AuthorityService } from "../src/authority/authority.service";

const actorUserId = "10000000-0000-4000-8000-000000000001";
const tenantId = "20000000-0000-4000-8000-000000000001";
const siteId = "30000000-0000-4000-8000-000000000001";
const applicationId = "40000000-0000-4000-8000-000000000001";
const membershipId = "50000000-0000-4000-8000-000000000001";
const siteGrantId = "60000000-0000-4000-8000-000000000001";

function verifiedMetadata(): MetadataWithContext {
  const metadata = new Metadata() as MetadataWithContext;
  metadata.user = {
    userId: actorUserId,
    role: "admin",
    sessionRef: "verified-session",
  };
  metadata.resolutionContext = {
    version: "2",
    purpose: "RESOLUTION",
    resolutionStage: "AUTHORITY",
    application: {
      applicationId,
      applicationProfile: "admin-web",
      tenantId,
      siteId,
      channelId: "70000000-0000-4000-8000-000000000001",
      channelKind: "WEB",
    },
    actor: { userId: actorUserId, sessionRef: "verified-session" },
  };
  metadata.signedActor = metadata.resolutionContext.actor;
  return metadata;
}

function request() {
  return tenantauthorityv1.ResolveActorAuthorizationRequest.create({
    actorUserId,
    actorTenantId: tenantId,
    targetTenantId: tenantId,
    targetSiteId: siteId,
    applicationId,
    authorizationPath:
      tenantauthorityv1.AuthorizationPath.AUTHORIZATION_PATH_APPLICATION,
    normalizedOperation: "PRODUCT.UPDATE",
  });
}

async function rpcError(promise: Promise<unknown>) {
  try {
    await promise;
    throw new Error("expected_rpc_error");
  } catch (error) {
    if (!(error instanceof RpcException)) throw error;
    return error.getError() as { code: number; message: string };
  }
}

describe("actor authorization RPC", () => {
  it("maps one exact membership authority decision", async () => {
    const resolveActorAuthorization = jest.fn().mockResolvedValue({
      status: "RESOLVED",
      decision: {
        actorUserId,
        authorizationPath: "APPLICATION",
        normalizedOperation: "PRODUCT.UPDATE",
        targetTenantId: tenantId,
        targetSiteId: siteId,
        actorAuthority: {
          kind: "MEMBERSHIP",
          actorTenantId: tenantId,
          membershipId,
          membershipEpochRef: "meg1_key_ref_digest",
          effectiveRole: "EDITOR",
          siteId,
          siteRoleGrantId: siteGrantId,
        },
        authorityRevision: "ar1_opaque-revision",
        resolvedAtMs: 1_775_000_000_000,
      },
    });
    const controller = new AuthorityGrpcController({
      resolveActorAuthorization,
    } as unknown as AuthorityService);

    const response = await controller.resolveActorAuthorization(
      request(),
      verifiedMetadata(),
    );
    expect(response.status).toBe(
      tenantauthorityv1.ResolutionStatus.RESOLUTION_STATUS_RESOLVED,
    );
    expect(response.decision).toMatchObject({
      actorUserId,
      normalizedOperation: "PRODUCT.UPDATE",
      platformAuthority: undefined,
    });
    const membershipAuthority = response.decision?.membershipAuthority;
    expect(membershipAuthority?.membershipId).toBe(membershipId);
    expect(membershipAuthority?.membershipEpochRef).toBe("meg1_key_ref_digest");
    expect(membershipAuthority?.effectiveRole).toBe(
      tenantauthorityv1.ScopedAuthorityRole.SCOPED_AUTHORITY_ROLE_EDITOR,
    );
    expect(membershipAuthority?.siteRoleGrantId).toBe(siteGrantId);
    expect(resolveActorAuthorization).toHaveBeenCalledWith({
      actorUserId,
      actorTenantId: tenantId,
      targetTenantId: tenantId,
      targetSiteId: siteId,
      applicationId,
      authorizationPath: "APPLICATION",
      normalizedOperation: "PRODUCT.UPDATE",
    });
  });

  it("rejects actor and application disagreement before repository access", async () => {
    const resolveActorAuthorization = jest.fn();
    const controller = new AuthorityGrpcController({
      resolveActorAuthorization,
    } as unknown as AuthorityService);
    const actorMismatch = verifiedMetadata();
    actorMismatch.user = { ...actorMismatch.user!, userId: tenantId };
    expect(
      (
        await rpcError(
          controller.resolveActorAuthorization(request(), actorMismatch),
        )
      ).code,
    ).toBe(status.UNAUTHENTICATED);

    const applicationMismatch = verifiedMetadata();
    applicationMismatch.resolutionContext = {
      ...applicationMismatch.resolutionContext!,
      application: {
        ...applicationMismatch.resolutionContext!.application!,
        siteId: tenantId,
      },
    };
    expect(
      (
        await rpcError(
          controller.resolveActorAuthorization(request(), applicationMismatch),
        )
      ).code,
    ).toBe(status.PERMISSION_DENIED);
    expect(resolveActorAuthorization).not.toHaveBeenCalled();
  });

  it("rejects unknown paths and non-normalized operations", async () => {
    const controller = new AuthorityGrpcController({
      resolveActorAuthorization: jest.fn(),
    } as unknown as AuthorityService);
    const unknownPath = request();
    unknownPath.authorizationPath =
      tenantauthorityv1.AuthorizationPath.AUTHORIZATION_PATH_UNSPECIFIED;
    expect(
      (
        await rpcError(
          controller.resolveActorAuthorization(unknownPath, verifiedMetadata()),
        )
      ).code,
    ).toBe(status.INVALID_ARGUMENT);

    const badOperation = request();
    badOperation.normalizedOperation = "product.update";
    expect(
      (
        await rpcError(
          controller.resolveActorAuthorization(
            badOperation,
            verifiedMetadata(),
          ),
        )
      ).code,
    ).toBe(status.INVALID_ARGUMENT);
  });
});
