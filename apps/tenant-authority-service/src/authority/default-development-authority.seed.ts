import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../../prisma/generated/client";
import { AuthorityAuditSigner } from "./authority-audit.signer";
import {
  appendAuthorityAuditEvent,
  type AuthorityTransaction,
} from "./authority-audit.repository";
import { DEFAULT_DEVELOPMENT_AUTHORITY as manifest } from "./default-development-authority.manifest";

const SEED_LOCK = "tenant-authority:default-development:v1";
const SEED_REQUEST_ID = "default-development-authority-v1";

export type DefaultAuthoritySeedResult = "CREATED" | "ALREADY_CURRENT";

function sameRows(
  actual: readonly Record<string, unknown>[],
  expected: readonly Record<string, unknown>[],
): boolean {
  const normalize = (rows: readonly Record<string, unknown>[]) =>
    rows
      .map((row) =>
        JSON.stringify(
          Object.fromEntries(
            Object.entries(row)
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([key, value]) => [
                key,
                typeof value === "bigint" ? value.toString() : value,
              ]),
          ),
        ),
      )
      .sort();
  return (
    JSON.stringify(normalize(actual)) === JSON.stringify(normalize(expected))
  );
}

async function inspectSeed(tx: AuthorityTransaction) {
  const tenantId = manifest.tenant.id;
  const siteId = manifest.site.id;
  const channelIds = Object.values(manifest.channels);
  const applications = Object.values(manifest.applications);
  const applicationIds = applications.map((application) => application.id);
  const clientIds = applications.map((application) => application.clientId);
  const handleIds = [
    "a6000000-0000-4000-8000-000000000001",
    "a6000000-0000-4000-8000-000000000002",
    "a6000000-0000-4000-8000-000000000003",
    "a6000000-0000-4000-8000-000000000004",
    "a6000000-0000-4000-8000-000000000005",
    "a6000000-0000-4000-8000-000000000006",
    "a6000000-0000-4000-8000-000000000007",
    "a6000000-0000-4000-8000-000000000008",
  ];
  const handles = [
    applications[0].clientId,
    manifest.applications.storefrontWeb.legacyHandle,
    applications[1].clientId,
    manifest.applications.adminWeb.legacyHandle,
    applications[2].clientId,
    manifest.applications.android.developmentHandle,
    applications[3].clientId,
    manifest.applications.ios.developmentHandle,
  ];

  const [
    tenants,
    sites,
    channels,
    storedApplications,
    storedHandles,
    webOrigins,
    androidIdentities,
    iosIdentities,
    outbox,
    seedAudit,
  ] = await Promise.all([
    tx.tenant.findMany({
      where: { id: tenantId },
      select: { id: true, displayName: true, lifecycle: true, revision: true },
    }),
    tx.site.findMany({
      where: { OR: [{ id: siteId }, { tenantId, isPrimary: true }] },
      select: {
        id: true,
        tenantId: true,
        displayName: true,
        lifecycle: true,
        isPrimary: true,
        revision: true,
      },
    }),
    tx.channel.findMany({
      where: {
        OR: [
          { id: { in: channelIds } },
          { siteId, kind: { in: ["WEB", "ANDROID", "IOS"] } },
        ],
      },
      select: { id: true, tenantId: true, siteId: true, kind: true },
    }),
    tx.application.findMany({
      where: {
        OR: [{ id: { in: applicationIds } }, { clientId: { in: clientIds } }],
      },
      select: {
        id: true,
        clientId: true,
        tenantId: true,
        siteId: true,
        channelId: true,
        displayName: true,
        profile: true,
        lifecycle: true,
        revision: true,
      },
    }),
    tx.applicationClientHandle.findMany({
      where: { OR: [{ id: { in: handleIds } }, { handle: { in: handles } }] },
      select: {
        id: true,
        applicationId: true,
        handle: true,
        kind: true,
        state: true,
        activeUntil: true,
        tombstonedAt: true,
      },
    }),
    tx.webOrigin.findMany({
      where: {
        OR: [
          {
            id: {
              in: [
                "a7000000-0000-4000-8000-000000000001",
                "a7000000-0000-4000-8000-000000000002",
              ],
            },
          },
          {
            canonicalOrigin: {
              in: [
                manifest.applications.storefrontWeb.origin,
                manifest.applications.adminWeb.origin,
              ],
            },
          },
        ],
      },
      select: {
        id: true,
        applicationId: true,
        tenantId: true,
        siteId: true,
        scheme: true,
        hostname: true,
        port: true,
        canonicalOrigin: true,
        verificationState: true,
        evidenceType: true,
        evidenceReference: true,
        evidenceDigest: true,
        isNonProductionSeed: true,
        revokedAt: true,
      },
    }),
    tx.androidIdentity.findMany({
      where: {
        OR: [
          { id: "a8000000-0000-4000-8000-000000000001" },
          { packageId: manifest.applications.android.packageId },
        ],
      },
      select: {
        id: true,
        applicationId: true,
        tenantId: true,
        siteId: true,
        packageId: true,
        signingCertificateSha256: true,
        verificationState: true,
        evidenceType: true,
        evidenceReference: true,
        evidenceDigest: true,
        isNonProductionSeed: true,
        revokedAt: true,
      },
    }),
    tx.iosIdentity.findMany({
      where: {
        OR: [
          { id: "a9000000-0000-4000-8000-000000000001" },
          {
            teamId: manifest.applications.ios.teamId,
            bundleId: manifest.applications.ios.bundleId,
          },
        ],
      },
      select: {
        id: true,
        applicationId: true,
        tenantId: true,
        siteId: true,
        teamId: true,
        bundleId: true,
        appStoreId: true,
        verificationState: true,
        evidenceType: true,
        evidenceReference: true,
        evidenceDigest: true,
        isNonProductionSeed: true,
        revokedAt: true,
      },
    }),
    tx.authorityInvalidationOutbox.findMany({
      where: {
        aggregateId: {
          in: [tenantId, siteId, ...channelIds, ...applicationIds],
        },
        revision: 1n,
      },
      select: {
        aggregateKind: true,
        aggregateId: true,
        revision: true,
      },
    }),
    tx.authorityAuditEvent.findFirst({
      where: {
        operation: "DEFAULT_AUTHORITY.SEED",
        targetResourceId: tenantId,
        result: "SUCCEEDED",
        reasonCode: "CREATED",
      },
      select: { id: true },
    }),
  ]);

  const expectedTenants = [
    {
      id: tenantId,
      displayName: manifest.tenant.displayName,
      lifecycle: "ACTIVE",
      revision: 1n,
    },
  ];
  const expectedSites = [
    {
      id: siteId,
      tenantId,
      displayName: manifest.site.displayName,
      lifecycle: "ACTIVE",
      isPrimary: true,
      revision: 1n,
    },
  ];
  const expectedChannels: Prisma.ChannelCreateManyInput[] = [
    { id: manifest.channels.web, tenantId, siteId, kind: "WEB" },
    { id: manifest.channels.android, tenantId, siteId, kind: "ANDROID" },
    { id: manifest.channels.ios, tenantId, siteId, kind: "IOS" },
  ];
  const expectedApplications: Prisma.ApplicationCreateManyInput[] = [
    {
      ...manifest.applications.storefrontWeb,
      channelId: manifest.channels.web,
      profile: "STOREFRONT_WEB",
    },
    {
      ...manifest.applications.adminWeb,
      channelId: manifest.channels.web,
      profile: "ADMIN_WEB",
    },
    {
      ...manifest.applications.android,
      channelId: manifest.channels.android,
      profile: "MOBILE",
    },
    {
      ...manifest.applications.ios,
      channelId: manifest.channels.ios,
      profile: "MOBILE",
    },
  ].map(({ id, clientId, displayName, channelId, profile }) => ({
    id,
    clientId,
    tenantId,
    siteId,
    channelId,
    displayName,
    profile: profile as Prisma.ApplicationCreateManyInput["profile"],
    lifecycle: "ACTIVE",
    revision: 1n,
  }));
  const expectedHandles: Prisma.ApplicationClientHandleCreateManyInput[] =
    handles.map((handle, index) => ({
      id: handleIds[index],
      applicationId: applications[Math.floor(index / 2)].id,
      handle,
      kind: index % 2 === 0 ? "CANONICAL" : "LEGACY_ALIAS",
      state: "ACTIVE",
      activeUntil: null,
      tombstonedAt: null,
    }));
  const identityBase = {
    tenantId,
    siteId,
    verificationState: "VERIFIED",
    evidenceType: "CONTROLLED_NON_PRODUCTION_SEED",
    evidenceReference: manifest.evidenceReference,
    evidenceDigest: manifest.evidenceDigest,
    isNonProductionSeed: true,
    revokedAt: null,
  } as const;
  const expectedWebOrigins: Omit<
    Prisma.WebOriginCreateManyInput,
    "verifiedAt"
  >[] = [
    {
      id: "a7000000-0000-4000-8000-000000000001",
      applicationId: manifest.applications.storefrontWeb.id,
      scheme: "HTTP",
      hostname: "localhost",
      port: 3008,
      canonicalOrigin: manifest.applications.storefrontWeb.origin,
    },
    {
      id: "a7000000-0000-4000-8000-000000000002",
      applicationId: manifest.applications.adminWeb.id,
      scheme: "HTTP",
      hostname: "localhost",
      port: 3000,
      canonicalOrigin: manifest.applications.adminWeb.origin,
    },
  ].map((origin) => ({
    ...origin,
    scheme: origin.scheme as Prisma.WebOriginCreateManyInput["scheme"],
    ...identityBase,
  }));
  const expectedAndroid: Omit<
    Prisma.AndroidIdentityCreateManyInput,
    "verifiedAt"
  >[] = [
    {
      id: "a8000000-0000-4000-8000-000000000001",
      applicationId: manifest.applications.android.id,
      packageId: manifest.applications.android.packageId,
      signingCertificateSha256:
        manifest.applications.android.signingCertificateSha256,
      ...identityBase,
    },
  ];
  const expectedIos: Omit<Prisma.IosIdentityCreateManyInput, "verifiedAt">[] = [
    {
      id: "a9000000-0000-4000-8000-000000000001",
      applicationId: manifest.applications.ios.id,
      teamId: manifest.applications.ios.teamId,
      bundleId: manifest.applications.ios.bundleId,
      appStoreId: null,
      ...identityBase,
    },
  ];
  const expectedOutbox = [
    { aggregateKind: "TENANT", aggregateId: tenantId, revision: 1n },
    { aggregateKind: "SITE", aggregateId: siteId, revision: 1n },
    ...channelIds.map((aggregateId) => ({
      aggregateKind: "CHANNEL",
      aggregateId,
      revision: 1n,
    })),
    ...applicationIds.map((aggregateId) => ({
      aggregateKind: "APPLICATION",
      aggregateId,
      revision: 1n,
    })),
  ];

  const found =
    tenants.length +
    sites.length +
    channels.length +
    storedApplications.length +
    storedHandles.length +
    webOrigins.length +
    androidIdentities.length +
    iosIdentities.length +
    outbox.length +
    (seedAudit ? 1 : 0);
  const exact =
    sameRows(tenants, expectedTenants) &&
    sameRows(sites, expectedSites) &&
    sameRows(channels, expectedChannels) &&
    sameRows(storedApplications, expectedApplications) &&
    sameRows(storedHandles, expectedHandles) &&
    sameRows(webOrigins, expectedWebOrigins) &&
    sameRows(androidIdentities, expectedAndroid) &&
    sameRows(iosIdentities, expectedIos) &&
    sameRows(outbox, expectedOutbox) &&
    seedAudit !== null;

  return {
    found,
    exact,
    tenantId,
    siteId,
    expectedChannels,
    expectedApplications,
    expectedHandles,
    expectedWebOrigins,
    expectedAndroid,
    expectedIos,
    expectedOutbox,
  };
}

export async function seedDefaultDevelopmentAuthority(
  prisma: PrismaClient,
  signer = new AuthorityAuditSigner(),
): Promise<DefaultAuthoritySeedResult> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("development_authority_seed_refused_in_production");
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${SEED_LOCK}, 0)) IS NULL
        AS "lockAcquired"
    `;
      const state = await inspectSeed(tx);
      if (state.exact) return "ALREADY_CURRENT";
      if (state.found !== 0) {
        throw new Error("default_development_authority_seed_conflict");
      }

      const verifiedAt = new Date();
      await tx.tenant.create({
        data: {
          id: state.tenantId,
          displayName: manifest.tenant.displayName,
          lifecycle: "ACTIVE",
        },
      });
      await tx.site.create({
        data: {
          id: state.siteId,
          tenantId: state.tenantId,
          displayName: manifest.site.displayName,
          lifecycle: "ACTIVE",
          isPrimary: true,
        },
      });
      await tx.channel.createMany({ data: state.expectedChannels });
      await tx.application.createMany({ data: state.expectedApplications });
      await tx.applicationClientHandle.createMany({
        data: state.expectedHandles,
      });
      await tx.webOrigin.createMany({
        data: state.expectedWebOrigins.map((row) => ({ ...row, verifiedAt })),
      });
      await tx.androidIdentity.createMany({
        data: state.expectedAndroid.map((row) => ({ ...row, verifiedAt })),
      });
      await tx.iosIdentity.createMany({
        data: state.expectedIos.map((row) => ({ ...row, verifiedAt })),
      });
      await tx.authorityInvalidationOutbox.createMany({
        data: state.expectedOutbox.map((row) => ({
          id: randomUUID(),
          aggregateKind: row.aggregateKind,
          aggregateId: row.aggregateId,
          tenantId: state.tenantId,
          siteId: row.aggregateKind === "TENANT" ? null : state.siteId,
          referenceId: row.aggregateId,
          revision: row.revision,
          payload: {
            manifestVersion: manifest.version,
            aggregateKind: row.aggregateKind,
            aggregateId: row.aggregateId,
            revision: row.revision.toString(),
          } as Prisma.InputJsonValue,
        })),
      });
      await appendAuthorityAuditEvent(tx, signer, {
        authorizationPath: "RECOVERY",
        operation: "DEFAULT_AUTHORITY.SEED",
        tenantId: state.tenantId,
        siteId: state.siteId,
        targetResourceType: "TENANT",
        targetResourceId: state.tenantId,
        requestId: SEED_REQUEST_ID,
        result: "SUCCEEDED",
        reasonCode: "CREATED",
        revision: "1",
        change: {
          manifestVersion: manifest.version,
          channels: 3,
          applications: 4,
          controlledNonProductionIdentities: 4,
        },
      });
      return "CREATED";
    },
    { isolationLevel: "Serializable" },
  );
}
