import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type {
  ActorAuthorizationDecision,
  ActorAuthorizationResolution,
  ApplicationResolution,
  EntitlementScopeResolution,
  MembershipAuthorityFact,
  ResolveActorAuthorizationInput,
  TargetScopeResolution,
} from "./authority-read.types";
import { AuthorityRepository } from "./authority.repository";

function opaqueAuthorityRevision(
  parts: ReadonlyArray<string | number | bigint | undefined>,
): string {
  const canonical = parts.map((part) =>
    part === undefined ? null : String(part),
  );
  return `ar1_${createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("base64url")}`;
}

function resolvedActorAuthorization(
  decision: Omit<ActorAuthorizationDecision, "resolvedAtMs">,
): ActorAuthorizationResolution {
  return {
    status: "RESOLVED",
    decision: { ...decision, resolvedAtMs: Date.now() },
  };
}

@Injectable()
export class AuthorityService {
  constructor(private readonly repository: AuthorityRepository) {}

  checkReadiness(): Promise<void> {
    return this.repository.assertRequiredMigrationsReady();
  }

  async resolveApplicationRegistration(
    clientHandle: string,
    canonicalOrigin?: string,
  ): Promise<ApplicationResolution> {
    const application =
      await this.repository.findApplicationByClientId(clientHandle);
    if (!application) return { status: "NOT_FOUND" };

    const site = application.channel.site;
    const tenant = site.tenant;
    if (
      application.tenantId !== tenant.id ||
      application.siteId !== site.id ||
      application.channel.tenantId !== tenant.id ||
      application.channel.siteId !== site.id
    ) {
      return { status: "CONTRADICTORY" };
    }
    if (
      application.lifecycle !== "ACTIVE" ||
      site.lifecycle !== "ACTIVE" ||
      tenant.lifecycle !== "ACTIVE"
    ) {
      return { status: "INACTIVE" };
    }

    const isWebProfile =
      application.profile === "STOREFRONT_WEB" ||
      application.profile === "ADMIN_WEB";
    const channelKind = application.channel.kind;
    if (
      (channelKind === "WEB" && !isWebProfile) ||
      (channelKind !== "WEB" && application.profile !== "MOBILE")
    ) {
      return { status: "CONTRADICTORY" };
    }

    const origins = application.webOrigins.map(
      ({ canonicalOrigin: value }) => value,
    );
    if (channelKind === "WEB") {
      if (!canonicalOrigin || !origins.includes(canonicalOrigin)) {
        return { status: "IDENTITY_MISMATCH" };
      }
    } else {
      const verifiedNativeIdentity =
        channelKind === "ANDROID"
          ? application.androidIdentities.length > 0
          : application.iosIdentities.length > 0;
      if (canonicalOrigin !== undefined || !verifiedNativeIdentity) {
        return { status: "IDENTITY_MISMATCH" };
      }
    }

    const profile =
      application.profile === "STOREFRONT_WEB"
        ? "storefront-web"
        : application.profile === "ADMIN_WEB"
          ? "admin-web"
          : "mobile";
    return {
      status: "RESOLVED",
      registration: {
        applicationId: application.id,
        tenantId: tenant.id,
        siteId: site.id,
        channelId: application.channel.id,
        channelKind,
        profile,
        allowedWebOrigins: origins,
        applicationRevision: application.revision.toString(),
        tenantRevision: tenant.revision.toString(),
        siteRevision: site.revision.toString(),
      },
    };
  }

  listAllowedWebOrigins(): Promise<readonly string[]> {
    return this.repository.listAllowedWebOrigins();
  }

  async validateTargetScope(
    tenantId: string,
    siteId?: string,
  ): Promise<TargetScopeResolution> {
    const tenant = await this.repository.findTenant(tenantId);
    if (!tenant) return { status: "NOT_FOUND" };
    if (tenant.lifecycle !== "ACTIVE") return { status: "INACTIVE" };

    if (!siteId) {
      return {
        status: "RESOLVED",
        tenantRevision: tenant.revision.toString(),
      };
    }
    const site = await this.repository.findSite(siteId);
    if (!site) return { status: "NOT_FOUND" };
    if (site.tenantId !== tenantId) return { status: "SCOPE_MISMATCH" };
    if (site.lifecycle !== "ACTIVE") return { status: "INACTIVE" };
    return {
      status: "RESOLVED",
      tenantRevision: tenant.revision.toString(),
      siteRevision: site.revision.toString(),
    };
  }

  async resolveEntitlementScopeRef(
    referenceId: string,
    expectedTenantId: string,
    expectedSiteId?: string,
  ): Promise<EntitlementScopeResolution> {
    const reference =
      await this.repository.findEntitlementScopeRef(referenceId);
    if (!reference) return { status: "NOT_FOUND" };
    const contradictory =
      (reference.scopeKind === "TENANT" && reference.siteId !== null) ||
      (reference.scopeKind === "SITE" && reference.siteId === null);
    if (contradictory) return { status: "CONTRADICTORY" };
    if (
      reference.tenantId !== expectedTenantId ||
      (reference.siteId ?? undefined) !== expectedSiteId
    ) {
      return { status: "SCOPE_MISMATCH" };
    }
    return {
      status: "RESOLVED",
      scopeKind: reference.scopeKind,
      tenantId: reference.tenantId,
      siteId: reference.siteId ?? undefined,
      referenceRevision: reference.revision.toString(),
    };
  }

  async resolveActorAuthorization(
    input: ResolveActorAuthorizationInput,
  ): Promise<ActorAuthorizationResolution> {
    const targetTenant = await this.repository.findTenant(input.targetTenantId);
    if (!targetTenant) return { status: "NOT_FOUND" };
    if (targetTenant.lifecycle !== "ACTIVE") return { status: "INACTIVE" };

    const targetSite = input.targetSiteId
      ? await this.repository.findSite(input.targetSiteId)
      : undefined;
    if (input.targetSiteId && !targetSite) return { status: "NOT_FOUND" };
    if (targetSite && targetSite.tenantId !== targetTenant.id) {
      return { status: "SCOPE_MISMATCH" };
    }
    if (targetSite && targetSite.lifecycle !== "ACTIVE") {
      return { status: "INACTIVE" };
    }

    if (input.authorizationPath === "SERVICE_OPERATION") {
      return { status: "DENIED" };
    }

    let applicationRevision: string | undefined;
    if (input.authorizationPath === "APPLICATION") {
      if (!input.applicationId || !targetSite) {
        return { status: "SCOPE_MISMATCH" };
      }
      const application = await this.repository.findApplicationById(
        input.applicationId,
      );
      if (!application) return { status: "NOT_FOUND" };
      const applicationSite = application.channel.site;
      const applicationTenant = applicationSite.tenant;
      if (
        application.tenantId !== applicationTenant.id ||
        application.siteId !== applicationSite.id ||
        application.channel.tenantId !== applicationTenant.id ||
        application.channel.siteId !== applicationSite.id
      ) {
        return { status: "CONTRADICTORY" };
      }
      if (
        application.tenantId !== targetTenant.id ||
        application.siteId !== targetSite.id
      ) {
        return { status: "SCOPE_MISMATCH" };
      }
      if (
        application.lifecycle !== "ACTIVE" ||
        applicationSite.lifecycle !== "ACTIVE" ||
        applicationTenant.lifecycle !== "ACTIVE"
      ) {
        return { status: "INACTIVE" };
      }
      applicationRevision = application.revision.toString();
    } else if (input.applicationId !== undefined) {
      return { status: "CONTRADICTORY" };
    }

    if (input.authorizationPath === "PLATFORM_MANAGEMENT") {
      if (input.actorTenantId !== undefined) {
        return { status: "CONTRADICTORY" };
      }
      const platformGrants = await this.repository.findActivePlatformGrants(
        input.actorUserId,
      );
      if (platformGrants.length === 0) return { status: "DENIED" };
      if (platformGrants.length !== 1) return { status: "CONTRADICTORY" };
      const platformGrant = platformGrants[0];
      if (!platformGrant || platformGrant.role !== "PLATFORM_ADMIN") {
        return { status: "CONTRADICTORY" };
      }
      return resolvedActorAuthorization({
        actorUserId: input.actorUserId,
        authorizationPath: input.authorizationPath,
        normalizedOperation: input.normalizedOperation,
        targetTenantId: targetTenant.id,
        targetSiteId: targetSite?.id,
        actorAuthority: {
          kind: "PLATFORM",
          platformGrantId: platformGrant.id,
          effectiveRole: "PLATFORM_ADMIN",
        },
        authorityRevision: opaqueAuthorityRevision([
          input.authorizationPath,
          input.normalizedOperation,
          targetTenant.id,
          targetTenant.revision,
          targetSite?.id,
          targetSite?.revision,
          platformGrant.id,
          platformGrant.revision,
          platformGrant.state,
        ]),
      });
    }

    const actorTenantId =
      input.authorizationPath === "PARENT_MANAGEMENT"
        ? input.actorTenantId
        : input.targetTenantId;
    if (!actorTenantId) return { status: "SCOPE_MISMATCH" };
    if (
      input.authorizationPath !== "PARENT_MANAGEMENT" &&
      input.actorTenantId !== undefined &&
      input.actorTenantId !== input.targetTenantId
    ) {
      return { status: "SCOPE_MISMATCH" };
    }
    if (
      input.authorizationPath === "PARENT_MANAGEMENT" &&
      actorTenantId === input.targetTenantId
    ) {
      return { status: "SCOPE_MISMATCH" };
    }

    const membership = await this.repository.findActorMembership(
      actorTenantId,
      input.actorUserId,
      input.targetSiteId,
    );
    if (!membership) return { status: "DENIED" };
    if (
      membership.tenantId !== actorTenantId ||
      membership.userId !== input.actorUserId ||
      membership.tenant.id !== actorTenantId
    ) {
      return { status: "CONTRADICTORY" };
    }
    if (
      membership.state !== "ACTIVE" ||
      membership.tenant.lifecycle !== "ACTIVE"
    ) {
      return { status: "INACTIVE" };
    }
    const epoch = membership.currentEpoch;
    if (
      !epoch ||
      membership.currentEpochId !== epoch.id ||
      epoch.membershipId !== membership.id
    ) {
      return { status: "CONTRADICTORY" };
    }
    if (epoch.closedAt !== null) return { status: "INACTIVE" };

    let actorAuthority: MembershipAuthorityFact;
    let relationshipId: string | undefined;
    let relationshipRevision: bigint | undefined;
    let grantState: string;

    if (input.authorizationPath === "APPLICATION") {
      if (epoch.siteRoleGrants.length === 0) return { status: "DENIED" };
      if (epoch.siteRoleGrants.length !== 1) {
        return { status: "CONTRADICTORY" };
      }
      const grant = epoch.siteRoleGrants[0];
      if (
        !grant ||
        grant.tenantId !== targetTenant.id ||
        grant.siteId !== targetSite?.id
      ) {
        return { status: "CONTRADICTORY" };
      }
      actorAuthority = {
        kind: "MEMBERSHIP",
        actorTenantId,
        membershipId: membership.id,
        membershipEpochRef: epoch.membershipEpochRef,
        effectiveRole: grant.role,
        siteId: grant.siteId,
        siteRoleGrantId: grant.id,
      };
      grantState = `${grant.id}:${grant.role}:${grant.state}`;
    } else {
      if (epoch.tenantRoleGrants.length === 0) return { status: "DENIED" };
      if (epoch.tenantRoleGrants.length !== 1) {
        return { status: "CONTRADICTORY" };
      }
      const grant = epoch.tenantRoleGrants[0];
      if (!grant) return { status: "CONTRADICTORY" };
      const expectedRole =
        input.authorizationPath === "TENANT_MANAGEMENT"
          ? "TENANT_ADMIN"
          : "PARENT_MANAGER";
      if (grant.role !== expectedRole) return { status: "DENIED" };

      if (input.authorizationPath === "PARENT_MANAGEMENT") {
        const relationship =
          await this.repository.findCurrentParentRelationship(
            actorTenantId,
            targetTenant.id,
          );
        if (!relationship) return { status: "DENIED" };
        if (relationship.state !== "ACTIVE") return { status: "INACTIVE" };
        if (
          relationship.parentTenantId !== actorTenantId ||
          relationship.subordinateTenantId !== targetTenant.id
        ) {
          return { status: "CONTRADICTORY" };
        }
        relationshipId = relationship.id;
        relationshipRevision = relationship.revision;
      }

      actorAuthority = {
        kind: "MEMBERSHIP",
        actorTenantId,
        membershipId: membership.id,
        membershipEpochRef: epoch.membershipEpochRef,
        effectiveRole: grant.role,
        tenantRoleGrantId: grant.id,
      };
      grantState = `${grant.id}:${grant.role}:${grant.state}`;
    }

    return resolvedActorAuthorization({
      actorUserId: input.actorUserId,
      authorizationPath: input.authorizationPath,
      normalizedOperation: input.normalizedOperation,
      targetTenantId: targetTenant.id,
      targetSiteId: targetSite?.id,
      actorAuthority,
      relationshipId,
      authorityRevision: opaqueAuthorityRevision([
        input.authorizationPath,
        input.normalizedOperation,
        applicationRevision,
        targetTenant.id,
        targetTenant.revision,
        targetSite?.id,
        targetSite?.revision,
        membership.id,
        membership.revision,
        epoch.membershipEpochRef,
        grantState,
        relationshipId,
        relationshipRevision,
      ]),
    });
  }
}
