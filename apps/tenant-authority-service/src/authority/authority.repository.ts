import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { AUTHORITY_UUID_V4_PATTERN } from "./authority-domain";

export const AUTHORITY_FOUNDATION_MIGRATION =
  "20260824000100_authority_foundation";
export const AUTHORITY_REGISTRATION_RECORDS_MIGRATION =
  "20260825000100_authority_registration_records";
export const AUTHORITY_ENTITLEMENT_SCOPE_REFERENCE_MIGRATION =
  "20260825000200_entitlement_scope_reference";
export const AUTHORITY_REGISTRATION_AUDIT_MIGRATION =
  "20260826000100_authority_registration_audit";
export const AUTHORITY_MEMBERSHIP_FOUNDATION_MIGRATION =
  "20260826000200_membership_authority_foundation";

type MigrationPresence = Readonly<{
  foundationPresent: boolean;
  registrationRecordsPresent: boolean;
  entitlementScopeReferencePresent: boolean;
  registrationAuditPresent: boolean;
  membershipFoundationPresent: boolean;
}>;

@Injectable()
export class AuthorityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async assertRequiredMigrationsReady(): Promise<void> {
    const rows = await this.prisma.$queryRaw<MigrationPresence[]>`
      SELECT
        EXISTS (
          SELECT 1
          FROM "_prisma_migrations"
          WHERE migration_name = ${AUTHORITY_FOUNDATION_MIGRATION}
            AND finished_at IS NOT NULL
            AND rolled_back_at IS NULL
        ) AS "foundationPresent",
        EXISTS (
          SELECT 1
          FROM "_prisma_migrations"
          WHERE migration_name = ${AUTHORITY_REGISTRATION_RECORDS_MIGRATION}
            AND finished_at IS NOT NULL
            AND rolled_back_at IS NULL
        ) AS "registrationRecordsPresent",
        EXISTS (
          SELECT 1
          FROM "_prisma_migrations"
          WHERE migration_name = ${AUTHORITY_ENTITLEMENT_SCOPE_REFERENCE_MIGRATION}
            AND finished_at IS NOT NULL
            AND rolled_back_at IS NULL
        ) AS "entitlementScopeReferencePresent",
        EXISTS (
          SELECT 1
          FROM "_prisma_migrations"
          WHERE migration_name = ${AUTHORITY_REGISTRATION_AUDIT_MIGRATION}
            AND finished_at IS NOT NULL
            AND rolled_back_at IS NULL
        ) AS "registrationAuditPresent",
        EXISTS (
          SELECT 1
          FROM "_prisma_migrations"
          WHERE migration_name = ${AUTHORITY_MEMBERSHIP_FOUNDATION_MIGRATION}
            AND finished_at IS NOT NULL
            AND rolled_back_at IS NULL
        ) AS "membershipFoundationPresent"
    `;

    if (
      rows.length !== 1 ||
      rows[0]?.foundationPresent !== true ||
      rows[0]?.registrationRecordsPresent !== true ||
      rows[0]?.entitlementScopeReferencePresent !== true ||
      rows[0]?.registrationAuditPresent !== true ||
      rows[0]?.membershipFoundationPresent !== true
    ) {
      throw new Error("authority_required_migration_missing");
    }
  }

  async findApplicationByClientId(clientId: string) {
    const include = {
      channel: { include: { site: { include: { tenant: true } } } },
      webOrigins: {
        where: { verificationState: "VERIFIED" as const, revokedAt: null },
        orderBy: { canonicalOrigin: "asc" as const },
      },
      androidIdentities: {
        where: { verificationState: "VERIFIED" as const, revokedAt: null },
        select: { id: true },
      },
      iosIdentities: {
        where: { verificationState: "VERIFIED" as const, revokedAt: null },
        select: { id: true },
      },
    } as const;

    const handle = await this.prisma.applicationClientHandle.findUnique({
      where: { handle: clientId },
      select: {
        state: true,
        activeFrom: true,
        activeUntil: true,
        application: { include },
      },
    });
    const now = Date.now();
    if (handle) {
      if (
        handle.state !== "ACTIVE" ||
        handle.activeFrom.getTime() > now ||
        (handle.activeUntil !== null && handle.activeUntil.getTime() <= now)
      ) {
        return null;
      }
      return handle.application;
    }

    // Compatibility for pre-handle rows only. Once a handle-history row exists,
    // its active/tombstoned state is authoritative and this path is bypassed.
    return AUTHORITY_UUID_V4_PATTERN.test(clientId)
      ? this.prisma.application.findUnique({ where: { clientId }, include })
      : null;
  }

  async listAllowedWebOrigins(): Promise<readonly string[]> {
    const rows = await this.prisma.webOrigin.findMany({
      where: {
        verificationState: "VERIFIED",
        revokedAt: null,
        application: {
          lifecycle: "ACTIVE",
          channel: {
            kind: "WEB",
            site: { lifecycle: "ACTIVE", tenant: { lifecycle: "ACTIVE" } },
          },
        },
      },
      select: { canonicalOrigin: true },
      orderBy: { canonicalOrigin: "asc" },
    });
    return rows.map(({ canonicalOrigin }) => canonicalOrigin);
  }

  findTenant(tenantId: string) {
    return this.prisma.tenant.findUnique({ where: { id: tenantId } });
  }

  findSite(siteId: string) {
    return this.prisma.site.findUnique({ where: { id: siteId } });
  }

  findEntitlementScopeRef(referenceId: string) {
    return this.prisma.entitlementScopeRef.findUnique({
      where: { id: referenceId },
    });
  }

  findApplicationById(applicationId: string) {
    return this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        channel: { include: { site: { include: { tenant: true } } } },
      },
    });
  }

  findActorMembership(tenantId: string, userId: string, siteId?: string) {
    return this.prisma.membership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      include: {
        tenant: true,
        currentEpoch: {
          include: {
            tenantRoleGrants: {
              where: { state: "ACTIVE" },
              orderBy: { id: "asc" },
            },
            siteRoleGrants: {
              where: {
                state: "ACTIVE",
                ...(siteId ? { siteId } : {}),
              },
              orderBy: { id: "asc" },
            },
          },
        },
      },
    });
  }

  findActivePlatformGrants(userId: string) {
    return this.prisma.platformGrant.findMany({
      where: { userId, role: "PLATFORM_ADMIN", state: "ACTIVE" },
      orderBy: { id: "asc" },
    });
  }

  findCurrentParentRelationship(
    parentTenantId: string,
    subordinateTenantId: string,
  ) {
    return this.prisma.parentRelationship.findFirst({
      where: {
        parentTenantId,
        subordinateTenantId,
        state: { not: "REVOKED" },
      },
      orderBy: { updatedAt: "desc" },
    });
  }
}
