import { createHash, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../../prisma/generated/client";
import { AuthorityAuditSigner } from "./authority-audit.signer";
import {
  appendAuthorityAuditEvent,
  type AuthorityTransaction,
} from "./authority-audit.repository";
import { DEFAULT_DEVELOPMENT_AUTHORITY } from "./default-development-authority.manifest";
import { deriveMembershipEpochRef } from "./membership-epoch-ref";

const BACKFILL_LOCK = "tenant-authority:f4-legacy-role-backfill:v1";
const FIXTURE_LOCK = "tenant-authority:f4-default-role-fixtures:v1";
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const KEY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/;

export type LegacyRoleSource = "user" | "admin" | "root-admin";
type AuthoritySeedSource = LegacyRoleSource | "editor";
export type LegacyRoleBackfillActor = Readonly<{
  userId: string;
  sourceRole: LegacyRoleSource;
}>;
export type LegacyRoleBackfillResult = Readonly<{
  result: "APPLIED" | "ALREADY_CURRENT";
  manifestSha256: string;
  createdMemberships: number;
  existingMemberships: number;
}>;

function record(value: unknown, name: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name}_must_be_an_object`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, name: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${name}_must_be_an_array`);
  return value;
}

function exactDecision(sourceRole: LegacyRoleSource): Record<string, string> {
  if (sourceRole === "root-admin") {
    return {
      sourceRole,
      platformRole: "PLATFORM_ADMIN",
      tenantRole: "TENANT_ADMIN",
    };
  }
  return sourceRole === "admin"
    ? { sourceRole, siteRole: "SITE_ADMIN" }
    : { sourceRole, siteRole: "USER" };
}

export function parseLegacyRoleAuditManifest(
  value: unknown,
): readonly LegacyRoleBackfillActor[] {
  const manifest = record(value, "legacyRoleAudit");
  if (
    manifest.compatibilityMode !== "LEGACY_PRIMARY" ||
    manifest.backfillStatus !== "READY"
  ) {
    throw new Error("legacy_role_audit_not_ready");
  }
  if (array(manifest.blockers, "legacyRoleAudit.blockers").length !== 0) {
    throw new Error("legacy_role_audit_has_blockers");
  }
  if (
    array(manifest.invalidRoles, "legacyRoleAudit.invalidRoles").length !== 0 ||
    array(manifest.invalidUserIds, "legacyRoleAudit.invalidUserIds").length !==
      0
  ) {
    throw new Error("legacy_role_audit_contains_invalid_records");
  }

  const candidates = array(manifest.candidates, "legacyRoleAudit.candidates");
  if (manifest.totalUsers !== candidates.length) {
    throw new Error("legacy_role_audit_total_mismatch");
  }

  const actors: LegacyRoleBackfillActor[] = [];
  const seenUserIds = new Set<string>();
  for (const [index, candidateValue] of candidates.entries()) {
    const candidate = record(
      candidateValue,
      `legacyRoleAudit.candidates[${index}]`,
    );
    if (
      typeof candidate.userId !== "string" ||
      !UUID_V4.test(candidate.userId)
    ) {
      throw new Error("legacy_role_audit_user_id_invalid");
    }
    if (seenUserIds.has(candidate.userId)) {
      throw new Error("legacy_role_audit_user_id_duplicate");
    }
    seenUserIds.add(candidate.userId);

    const decision = record(
      candidate.decision,
      `legacyRoleAudit.candidates[${index}].decision`,
    );
    const sourceRole = decision.sourceRole;
    if (
      sourceRole !== "user" &&
      sourceRole !== "admin" &&
      sourceRole !== "root-admin"
    ) {
      throw new Error("legacy_role_audit_source_role_invalid");
    }
    if (
      JSON.stringify(decision) !== JSON.stringify(exactDecision(sourceRole))
    ) {
      throw new Error("legacy_role_audit_decision_mismatch");
    }
    actors.push({ userId: candidate.userId, sourceRole });
  }

  const calculatedCounts = { user: 0, admin: 0, "root-admin": 0, INVALID: 0 };
  for (const actor of actors) calculatedCounts[actor.sourceRole] += 1;
  const suppliedCounts = record(
    manifest.roleCounts,
    "legacyRoleAudit.roleCounts",
  );
  if (JSON.stringify(suppliedCounts) !== JSON.stringify(calculatedCounts)) {
    throw new Error("legacy_role_audit_count_mismatch");
  }
  if (calculatedCounts["root-admin"] !== 1) {
    throw new Error("legacy_role_audit_requires_exactly_one_root_admin");
  }

  return actors.sort((left, right) => left.userId.localeCompare(right.userId));
}

function backfillConfig(): {
  integrityKeyId: string;
  integrityKey: string;
} {
  const integrityKeyId =
    process.env.AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY_ID?.trim() ?? "";
  const integrityKey = process.env.AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY ?? "";
  if (!KEY_ID_PATTERN.test(integrityKeyId)) {
    throw new Error("membership_epoch_integrity_key_id_invalid");
  }
  if (Buffer.byteLength(integrityKey, "utf8") < 32) {
    throw new Error("membership_epoch_integrity_key_too_short");
  }
  return { integrityKeyId, integrityKey };
}

function manifestSha256(actors: readonly LegacyRoleBackfillActor[]): string {
  return createHash("sha256")
    .update(
      JSON.stringify(
        actors.map(({ userId, sourceRole }) => [userId, sourceRole]),
      ),
    )
    .digest("hex");
}

async function assertExistingActor(
  tx: AuthorityTransaction,
  actor: Readonly<{ userId: string; sourceRole: AuthoritySeedSource }>,
  membership: NonNullable<
    Awaited<ReturnType<AuthorityTransaction["membership"]["findUnique"]>>
  >,
  config: ReturnType<typeof backfillConfig>,
): Promise<void> {
  const epoch = await tx.membershipEpoch.findUnique({
    where: { id: membership.currentEpochId ?? "" },
    include: {
      tenantRoleGrants: { where: { state: "ACTIVE" } },
      siteRoleGrants: { where: { state: "ACTIVE" } },
    },
  });
  if (
    membership.state !== "ACTIVE" ||
    epoch === null ||
    epoch.membershipId !== membership.id ||
    epoch.generation !== 1 ||
    epoch.closedAt !== null ||
    epoch.integrityKeyId !== config.integrityKeyId ||
    epoch.membershipEpochRef !==
      deriveMembershipEpochRef({
        membershipId: membership.id,
        generation: 1,
        integrityKey: config.integrityKey,
      })
  ) {
    throw new Error("legacy_role_backfill_existing_membership_mismatch");
  }

  const tenantRoles = epoch.tenantRoleGrants.map(({ role }) => role).sort();
  const siteRoles = epoch.siteRoleGrants
    .map(({ role, tenantId, siteId }) => ({ role, tenantId, siteId }))
    .sort((left, right) => left.role.localeCompare(right.role));
  const expectedTenantRoles =
    actor.sourceRole === "root-admin" ? ["TENANT_ADMIN"] : [];
  const expectedSiteRoles =
    actor.sourceRole === "root-admin"
      ? []
      : [
          {
            role:
              actor.sourceRole === "admin"
                ? "SITE_ADMIN"
                : actor.sourceRole === "editor"
                  ? "EDITOR"
                  : "USER",
            tenantId: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
            siteId: DEFAULT_DEVELOPMENT_AUTHORITY.site.id,
          },
        ];
  if (
    JSON.stringify(tenantRoles) !== JSON.stringify(expectedTenantRoles) ||
    JSON.stringify(siteRoles) !== JSON.stringify(expectedSiteRoles)
  ) {
    throw new Error("legacy_role_backfill_existing_grant_mismatch");
  }

  const platformGrants = await tx.platformGrant.findMany({
    where: { userId: actor.userId, state: "ACTIVE" },
    select: { role: true },
  });
  const expectedPlatformRoles =
    actor.sourceRole === "root-admin" ? ["PLATFORM_ADMIN"] : [];
  if (
    JSON.stringify(platformGrants.map(({ role }) => role).sort()) !==
    JSON.stringify(expectedPlatformRoles)
  ) {
    throw new Error("legacy_role_backfill_existing_platform_grant_mismatch");
  }
}

async function createActor(
  tx: AuthorityTransaction,
  actor: Readonly<{ userId: string; sourceRole: AuthoritySeedSource }>,
  config: ReturnType<typeof backfillConfig>,
): Promise<void> {
  const membershipId = randomUUID();
  const membershipEpochId = randomUUID();
  await tx.membership.create({
    data: {
      id: membershipId,
      tenantId: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
      userId: actor.userId,
      state: "PENDING",
    },
  });
  await tx.membershipEpoch.create({
    data: {
      id: membershipEpochId,
      membershipId,
      generation: 1,
      membershipEpochRef: deriveMembershipEpochRef({
        membershipId,
        generation: 1,
        integrityKey: config.integrityKey,
      }),
      integrityKeyId: config.integrityKeyId,
    },
  });

  if (actor.sourceRole === "root-admin") {
    await tx.tenantRoleGrant.create({
      data: {
        id: randomUUID(),
        membershipEpochId,
        role: "TENANT_ADMIN",
      },
    });
    await tx.platformGrant.create({
      data: {
        id: randomUUID(),
        userId: actor.userId,
        role: "PLATFORM_ADMIN",
      },
    });
  } else {
    await tx.siteRoleGrant.create({
      data: {
        id: randomUUID(),
        membershipEpochId,
        tenantId: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
        siteId: DEFAULT_DEVELOPMENT_AUTHORITY.site.id,
        role:
          actor.sourceRole === "admin"
            ? "SITE_ADMIN"
            : actor.sourceRole === "editor"
              ? "EDITOR"
              : "USER",
      },
    });
  }

  await tx.membership.update({
    where: { id: membershipId },
    data: { state: "ACTIVE", currentEpochId: membershipEpochId, revision: 2n },
  });
  await tx.authorityInvalidationOutbox.create({
    data: {
      id: randomUUID(),
      aggregateKind: "MEMBERSHIP",
      aggregateId: membershipId,
      tenantId: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
      siteId: DEFAULT_DEVELOPMENT_AUTHORITY.site.id,
      referenceId: actor.userId,
      revision: 2n,
      payload: {
        aggregateKind: "MEMBERSHIP",
        aggregateId: membershipId,
        tenantId: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
        siteId: DEFAULT_DEVELOPMENT_AUTHORITY.site.id,
        revision: "2",
      } satisfies Prisma.InputJsonValue,
    },
  });
}

export async function backfillLegacyRoles(
  prisma: PrismaClient,
  actors: readonly LegacyRoleBackfillActor[],
  signer = new AuthorityAuditSigner(),
): Promise<LegacyRoleBackfillResult> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("legacy_role_backfill_refused_in_production");
  }
  const config = backfillConfig();
  const checksum = manifestSha256(actors);

  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtextextended(${BACKFILL_LOCK}, 0))
          IS NULL AS "lockAcquired"
      `;
      const [tenant, site] = await Promise.all([
        tx.tenant.findUnique({
          where: { id: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id },
          select: { lifecycle: true },
        }),
        tx.site.findUnique({
          where: { id: DEFAULT_DEVELOPMENT_AUTHORITY.site.id },
          select: { tenantId: true, lifecycle: true, isPrimary: true },
        }),
      ]);
      if (
        tenant?.lifecycle !== "ACTIVE" ||
        site?.tenantId !== DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id ||
        site.lifecycle !== "ACTIVE" ||
        !site.isPrimary
      ) {
        throw new Error("legacy_role_backfill_default_scope_not_active");
      }

      let createdMemberships = 0;
      let existingMemberships = 0;
      for (const actor of actors) {
        const membership = await tx.membership.findUnique({
          where: {
            tenantId_userId: {
              tenantId: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
              userId: actor.userId,
            },
          },
        });
        if (membership === null) {
          await createActor(tx, actor, config);
          createdMemberships += 1;
        } else {
          await assertExistingActor(tx, actor, membership, config);
          existingMemberships += 1;
        }
      }

      if (createdMemberships > 0) {
        const counts = {
          user: actors.filter(({ sourceRole }) => sourceRole === "user").length,
          admin: actors.filter(({ sourceRole }) => sourceRole === "admin")
            .length,
          rootAdmin: actors.filter(
            ({ sourceRole }) => sourceRole === "root-admin",
          ).length,
        };
        await appendAuthorityAuditEvent(tx, signer, {
          authorizationPath: "RECOVERY",
          operation: "LEGACY_ROLE.BACKFILL",
          tenantId: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
          siteId: DEFAULT_DEVELOPMENT_AUTHORITY.site.id,
          targetResourceType: "TENANT",
          targetResourceId: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
          requestId: `f4-legacy-role-backfill-${checksum.slice(0, 16)}`,
          result: "SUCCEEDED",
          reasonCode: "APPLIED",
          revision: checksum,
          change: {
            compatibilityMode: "LEGACY_PRIMARY",
            manifestSha256: checksum,
            createdMemberships,
            counts,
          },
        });
      }

      return {
        result: createdMemberships > 0 ? "APPLIED" : "ALREADY_CURRENT",
        manifestSha256: checksum,
        createdMemberships,
        existingMemberships,
      };
    },
    { isolationLevel: "Serializable" },
  );
}

export type DefaultDevelopmentRoleFixture = Readonly<{
  version: 1;
  rootAdminUserId: string;
  siteAdminUserId: string;
  editorUserId: string;
  userId: string;
}>;

export function parseDefaultDevelopmentRoleFixture(
  value: unknown,
): DefaultDevelopmentRoleFixture {
  const fixture = record(value, "defaultRoleFixture");
  if (fixture.version !== 1)
    throw new Error("default_role_fixture_version_invalid");
  const keys = [
    "rootAdminUserId",
    "siteAdminUserId",
    "editorUserId",
    "userId",
  ] as const;
  const ids = keys.map((key) => fixture[key]);
  if (ids.some((id) => typeof id !== "string" || !UUID_V4.test(id))) {
    throw new Error("default_role_fixture_user_id_invalid");
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error("default_role_fixture_users_must_be_distinct");
  }
  return {
    version: 1,
    rootAdminUserId: ids[0] as string,
    siteAdminUserId: ids[1] as string,
    editorUserId: ids[2] as string,
    userId: ids[3] as string,
  };
}

export async function seedDefaultDevelopmentRoleFixtures(
  prisma: PrismaClient,
  fixture: DefaultDevelopmentRoleFixture,
  signer = new AuthorityAuditSigner(),
): Promise<"CREATED" | "ALREADY_CURRENT"> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("development_role_fixture_seed_refused_in_production");
  }
  const config = backfillConfig();
  const actors: ReadonlyArray<{
    userId: string;
    sourceRole: AuthoritySeedSource;
  }> = [
    { userId: fixture.rootAdminUserId, sourceRole: "root-admin" },
    { userId: fixture.siteAdminUserId, sourceRole: "admin" },
    { userId: fixture.editorUserId, sourceRole: "editor" },
    { userId: fixture.userId, sourceRole: "user" },
  ];

  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtextextended(${FIXTURE_LOCK}, 0))
          IS NULL AS "lockAcquired"
      `;
      let created = false;
      for (const actor of actors) {
        const membership = await tx.membership.findUnique({
          where: {
            tenantId_userId: {
              tenantId: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
              userId: actor.userId,
            },
          },
        });
        if (membership === null) {
          if (actor.sourceRole !== "editor") {
            throw new Error("default_role_fixture_migrated_actor_missing");
          }
          await createActor(tx, actor, config);
          created = true;
        } else {
          await assertExistingActor(tx, actor, membership, config);
        }
      }

      const activePlatformAdmins = await tx.platformGrant.findMany({
        where: { role: "PLATFORM_ADMIN", state: "ACTIVE" },
        select: { userId: true },
      });
      if (
        activePlatformAdmins.length !== 1 ||
        activePlatformAdmins[0]?.userId !== fixture.rootAdminUserId
      ) {
        throw new Error("default_role_fixture_platform_admin_mismatch");
      }

      if (created) {
        await appendAuthorityAuditEvent(tx, signer, {
          authorizationPath: "RECOVERY",
          operation: "DEFAULT_ROLE_FIXTURES.SEED",
          tenantId: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
          siteId: DEFAULT_DEVELOPMENT_AUTHORITY.site.id,
          targetResourceType: "SITE",
          targetResourceId: DEFAULT_DEVELOPMENT_AUTHORITY.site.id,
          requestId: "f4-default-role-fixtures-v1",
          result: "SUCCEEDED",
          reasonCode: "CREATED",
          revision: "1",
          change: {
            fixtureVersion: fixture.version,
            roles: [
              "PLATFORM_ADMIN",
              "TENANT_ADMIN",
              "SITE_ADMIN",
              "EDITOR",
              "USER",
            ],
            platformAdminCount: 1,
          },
        });
      }
      return created ? "CREATED" : "ALREADY_CURRENT";
    },
    { isolationLevel: "Serializable" },
  );
}
