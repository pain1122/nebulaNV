/* eslint-disable no-console */
import { randomUUID } from "node:crypto";
import { PrismaClient } from "./generated/client";
import { AuthorityRepository } from "../src/authority/authority.repository";
import { AuthorityService } from "../src/authority/authority.service";
import { DEFAULT_DEVELOPMENT_AUTHORITY as manifest } from "../src/authority/default-development-authority.manifest";
import type { PrismaService } from "../src/prisma.service";

const prisma = new PrismaClient();
const authority = new AuthorityService(
  new AuthorityRepository(prisma as PrismaService),
);

async function resolveSiteRole(role: "SITE_ADMIN" | "EDITOR" | "USER") {
  const grant = await prisma.siteRoleGrant.findFirst({
    where: {
      tenantId: manifest.tenant.id,
      siteId: manifest.site.id,
      role,
      state: "ACTIVE",
      membershipEpoch: {
        closedAt: null,
        currentFor: { is: { state: "ACTIVE" } },
      },
    },
    select: {
      membershipEpoch: {
        select: { currentFor: { select: { userId: true } } },
      },
    },
  });
  const userId = grant?.membershipEpoch.currentFor?.userId;
  if (!userId) throw new Error(`actor_resolution_${role}_fixture_missing`);
  return authority.resolveActorAuthorization({
    actorUserId: userId,
    actorTenantId: manifest.tenant.id,
    targetTenantId: manifest.tenant.id,
    targetSiteId: manifest.site.id,
    applicationId: manifest.applications.adminWeb.id,
    authorizationPath: "APPLICATION",
    normalizedOperation: "PRODUCT.UPDATE",
  });
}

async function main(): Promise<void> {
  const siteDecisions = await Promise.all(
    (["SITE_ADMIN", "EDITOR", "USER"] as const).map(async (role) => ({
      role,
      result: await resolveSiteRole(role),
    })),
  );
  for (const { role, result } of siteDecisions) {
    if (
      result.status !== "RESOLVED" ||
      result.decision?.actorAuthority.kind !== "MEMBERSHIP" ||
      result.decision.actorAuthority.effectiveRole !== role ||
      !result.decision.actorAuthority.membershipEpochRef.startsWith("meg1_") ||
      !result.decision.authorityRevision.startsWith("ar1_")
    ) {
      throw new Error(`actor_resolution_${role}_decision_mismatch`);
    }
  }

  const tenantAdminGrant = await prisma.tenantRoleGrant.findFirst({
    where: {
      role: "TENANT_ADMIN",
      state: "ACTIVE",
      membershipEpoch: {
        closedAt: null,
        currentFor: { is: { state: "ACTIVE" } },
      },
    },
    select: {
      membershipEpoch: {
        select: { currentFor: { select: { userId: true } } },
      },
    },
  });
  const tenantAdminUserId =
    tenantAdminGrant?.membershipEpoch.currentFor?.userId;
  if (!tenantAdminUserId) {
    throw new Error("actor_resolution_tenant_admin_fixture_missing");
  }
  const tenantDecision = await authority.resolveActorAuthorization({
    actorUserId: tenantAdminUserId,
    actorTenantId: manifest.tenant.id,
    targetTenantId: manifest.tenant.id,
    authorizationPath: "TENANT_MANAGEMENT",
    normalizedOperation: "TENANT.UPDATE",
  });
  const platformDecision = await authority.resolveActorAuthorization({
    actorUserId: tenantAdminUserId,
    targetTenantId: manifest.tenant.id,
    authorizationPath: "PLATFORM_MANAGEMENT",
    normalizedOperation: "TENANT.RECOVER",
  });
  if (
    tenantDecision.status !== "RESOLVED" ||
    tenantDecision.decision?.actorAuthority.effectiveRole !== "TENANT_ADMIN" ||
    platformDecision.status !== "RESOLVED" ||
    platformDecision.decision?.actorAuthority.effectiveRole !== "PLATFORM_ADMIN"
  ) {
    throw new Error("actor_resolution_admin_path_mismatch");
  }

  const missingMembership = await authority.resolveActorAuthorization({
    actorUserId: randomUUID(),
    actorTenantId: manifest.tenant.id,
    targetTenantId: manifest.tenant.id,
    targetSiteId: manifest.site.id,
    applicationId: manifest.applications.adminWeb.id,
    authorizationPath: "APPLICATION",
    normalizedOperation: "PRODUCT.UPDATE",
  });
  if (missingMembership.status !== "DENIED") {
    throw new Error("actor_resolution_missing_membership_not_denied");
  }

  console.log(
    "[verify:tenant-authority-batch3-actor-resolution] exact SITE_ADMIN/EDITOR/USER, TENANT_ADMIN, and PLATFORM_ADMIN paths resolved; missing membership denied",
  );
}

void main()
  .catch((error: unknown) => {
    console.error(
      "[verify:tenant-authority-batch3-actor-resolution] ERROR:",
      error,
    );
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
