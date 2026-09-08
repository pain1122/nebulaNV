import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../../prisma/generated/client";
import { AuthorityAuditSigner } from "./authority-audit.signer";
import {
  appendAuthorityAuditEvent,
  type AuthorityTransaction,
} from "./authority-audit.repository";
import { DEFAULT_DEVELOPMENT_AUTHORITY as manifest } from "./default-development-authority.manifest";

const CONTROL_PLANE_LOCK = "tenant-authority:identity-control-plane:v1";
const CONTROL_PLANE_REQUEST_ID = "identity-control-plane-v1";

export type IdentityControlPlaneSeedResult = "CREATED" | "ALREADY_CURRENT";

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

function expectedControlPlaneRows() {
  const control = manifest.identityControlPlane;
  const tenantId = manifest.tenant.id;
  const defaultRealmId = control.realms.defaultConsumer.id;
  const operatorRealmId = control.realms.platformOperator.id;

  const realms = [
    {
      id: defaultRealmId,
      kind: "LICENSED_ROOT_CONSUMER",
      owningCustomerTenantId: tenantId,
      licensedRootTenantId: tenantId,
      isRootDefault: true,
      authRouteRef: control.realms.defaultConsumer.authRouteRef,
      lifecycle: "PROVISIONING",
      revision: 1n,
    },
    {
      id: operatorRealmId,
      kind: "PLATFORM_OPERATOR",
      owningCustomerTenantId: null,
      licensedRootTenantId: null,
      isRootDefault: false,
      authRouteRef: control.realms.platformOperator.authRouteRef,
      lifecycle: "PROVISIONING",
      revision: 1n,
    },
  ] satisfies Prisma.IdentityRealmCreateManyInput[];

  const providers = [
    {
      id: control.providers.defaultLocal.id,
      identityRealmId: defaultRealmId,
      kind: "NEBULA_LOCAL",
      issuerReference: control.providers.defaultLocal.issuerReference,
      lifecycle: "PENDING_VERIFICATION",
      revision: 1n,
    },
    {
      id: control.providers.operatorLocal.id,
      identityRealmId: operatorRealmId,
      kind: "NEBULA_LOCAL",
      issuerReference: control.providers.operatorLocal.issuerReference,
      lifecycle: "PENDING_VERIFICATION",
      revision: 1n,
    },
  ] satisfies Prisma.IdentityProviderRegistrationCreateManyInput[];

  const policyInputs = [
    {
      application: manifest.applications.storefrontWeb,
      policy: control.policies.storefrontWeb,
      acceptedPrincipalClasses: ["CONSUMER"] as const,
    },
    {
      application: manifest.applications.adminWeb,
      policy: control.policies.adminWeb,
      acceptedPrincipalClasses: ["CONSUMER", "PLATFORM_OPERATOR"] as const,
    },
    {
      application: manifest.applications.android,
      policy: control.policies.android,
      acceptedPrincipalClasses: ["CONSUMER"] as const,
    },
    {
      application: manifest.applications.ios,
      policy: control.policies.ios,
      acceptedPrincipalClasses: ["CONSUMER"] as const,
    },
  ];
  const policies = policyInputs.map(
    ({ application, policy, acceptedPrincipalClasses }) => ({
      id: policy.id,
      applicationId: application.id,
      policyVersion: 1,
      audience: policy.audience,
      acceptedPrincipalClasses: [...acceptedPrincipalClasses],
      loginModes: ["LOCAL_LOGIN", "LEGACY_DEFAULT_UPGRADE"],
      legacyDefaultUpgradeEligible: true,
      isCurrent: true,
      lifecycle: "DRAFT",
      revision: 1n,
    }),
  ) satisfies Prisma.ApplicationIdentityPolicyCreateManyInput[];

  const defaultTrustInputs = [
    {
      id: control.trusts.storefrontDefaultLocal,
      policy: policies[0],
    },
    { id: control.trusts.adminDefaultLocal, policy: policies[1] },
    { id: control.trusts.androidDefaultLocal, policy: policies[2] },
    { id: control.trusts.iosDefaultLocal, policy: policies[3] },
  ];
  const trusts = [
    ...defaultTrustInputs.map(({ id, policy }) => ({
      id,
      applicationIdentityPolicyId: policy.id,
      applicationId: policy.applicationId,
      identityRealmId: defaultRealmId,
      providerRegistrationId: control.providers.defaultLocal.id,
      principalClass: "CONSUMER" as const,
      audience: policy.audience,
      mode: "LOCAL_LOGIN" as const,
      lifecycle: "PENDING_VERIFICATION" as const,
      revision: 1n,
    })),
    {
      id: control.trusts.adminOperatorLocal,
      applicationIdentityPolicyId: policies[1].id,
      applicationId: policies[1].applicationId,
      identityRealmId: operatorRealmId,
      providerRegistrationId: control.providers.operatorLocal.id,
      principalClass: "PLATFORM_OPERATOR",
      audience: policies[1].audience,
      mode: "LOCAL_LOGIN",
      lifecycle: "PENDING_VERIFICATION",
      revision: 1n,
    },
  ] satisfies Prisma.FederationTrustCreateManyInput[];

  const aggregates = [
    ...realms.map((row) => ({
      aggregateKind: "IDENTITY_REALM",
      aggregateId: row.id,
      tenantId: row.owningCustomerTenantId ?? null,
      siteId: null,
      referenceId: row.licensedRootTenantId ?? row.id,
      lifecycle: row.lifecycle,
    })),
    ...providers.map((row) => ({
      aggregateKind: "IDENTITY_PROVIDER_REGISTRATION",
      aggregateId: row.id,
      tenantId:
        row.identityRealmId === defaultRealmId
          ? tenantId
          : (null as string | null),
      siteId: null,
      referenceId: row.identityRealmId,
      lifecycle: row.lifecycle,
    })),
    ...policies.map((row) => ({
      aggregateKind: "APPLICATION_IDENTITY_POLICY",
      aggregateId: row.id,
      tenantId,
      siteId: manifest.site.id,
      referenceId: row.applicationId,
      lifecycle: row.lifecycle,
    })),
    ...trusts.map((row) => ({
      aggregateKind: "FEDERATION_TRUST",
      aggregateId: row.id,
      tenantId,
      siteId: manifest.site.id,
      referenceId: row.identityRealmId,
      lifecycle: row.lifecycle,
    })),
  ];
  const outbox = aggregates.map((row) => ({
    ...row,
    revision: 1n,
    payloadVersion: 1,
    state: "PENDING" as const,
  }));

  return { realms, providers, policies, trusts, outbox };
}

async function inspectControlPlaneSeed(tx: AuthorityTransaction) {
  const expected = expectedControlPlaneRows();
  const realmIds = expected.realms.map((row) => row.id);
  const routeRefs = expected.realms.map((row) => row.authRouteRef);
  const providerIds = expected.providers.map((row) => row.id);
  const issuerReferences = expected.providers.map((row) => row.issuerReference);
  const policyIds = expected.policies.map((row) => row.id);
  const applicationIds = expected.policies.map((row) => row.applicationId);
  const trustIds = expected.trusts.map((row) => row.id);
  const aggregateIds = expected.outbox.map((row) => row.aggregateId);

  const [realms, providers, policies, trusts, outbox, seedAudit] =
    await Promise.all([
      tx.identityRealm.findMany({
        where: {
          OR: [
            { id: { in: realmIds } },
            { authRouteRef: { in: routeRefs } },
            {
              kind: "PLATFORM_OPERATOR",
              lifecycle: { not: "REVOKED" },
            },
            {
              licensedRootTenantId: manifest.tenant.id,
              isRootDefault: true,
              lifecycle: { not: "REVOKED" },
            },
          ],
        },
        select: {
          id: true,
          kind: true,
          owningCustomerTenantId: true,
          licensedRootTenantId: true,
          isRootDefault: true,
          authRouteRef: true,
          lifecycle: true,
          revision: true,
        },
      }),
      tx.identityProviderRegistration.findMany({
        where: {
          OR: [
            { id: { in: providerIds } },
            { issuerReference: { in: issuerReferences } },
            {
              identityRealmId: { in: realmIds },
              kind: "NEBULA_LOCAL",
              lifecycle: { not: "REVOKED" },
            },
          ],
        },
        select: {
          id: true,
          identityRealmId: true,
          kind: true,
          issuerReference: true,
          lifecycle: true,
          revision: true,
        },
      }),
      tx.applicationIdentityPolicy.findMany({
        where: {
          OR: [
            { id: { in: policyIds } },
            { applicationId: { in: applicationIds }, isCurrent: true },
          ],
        },
        select: {
          id: true,
          applicationId: true,
          policyVersion: true,
          audience: true,
          acceptedPrincipalClasses: true,
          loginModes: true,
          legacyDefaultUpgradeEligible: true,
          isCurrent: true,
          lifecycle: true,
          revision: true,
        },
      }),
      tx.federationTrust.findMany({
        where: {
          OR: [
            { id: { in: trustIds } },
            {
              applicationIdentityPolicyId: { in: policyIds },
              identityRealmId: { in: realmIds },
            },
          ],
        },
        select: {
          id: true,
          applicationIdentityPolicyId: true,
          applicationId: true,
          identityRealmId: true,
          providerRegistrationId: true,
          principalClass: true,
          audience: true,
          mode: true,
          lifecycle: true,
          revision: true,
        },
      }),
      tx.authorityInvalidationOutbox.findMany({
        where: { aggregateId: { in: aggregateIds }, revision: 1n },
        select: {
          aggregateKind: true,
          aggregateId: true,
          tenantId: true,
          siteId: true,
          referenceId: true,
          revision: true,
          payloadVersion: true,
          state: true,
        },
      }),
      tx.authorityAuditEvent.findFirst({
        where: {
          operation: "IDENTITY_CONTROL_PLANE.SEED",
          targetResourceId:
            manifest.identityControlPlane.realms.defaultConsumer.id,
          result: "SUCCEEDED",
          reasonCode: "CREATED_INACTIVE",
        },
        select: { id: true },
      }),
    ]);

  const comparableOutbox = expected.outbox.map((row) => ({
    aggregateKind: row.aggregateKind,
    aggregateId: row.aggregateId,
    tenantId: row.tenantId,
    siteId: row.siteId,
    referenceId: row.referenceId,
    revision: row.revision,
    payloadVersion: row.payloadVersion,
    state: row.state,
  }));
  const found =
    realms.length +
    providers.length +
    policies.length +
    trusts.length +
    outbox.length +
    (seedAudit ? 1 : 0);
  const exact =
    sameRows(realms, expected.realms) &&
    sameRows(providers, expected.providers) &&
    sameRows(policies, expected.policies) &&
    sameRows(trusts, expected.trusts) &&
    sameRows(outbox, comparableOutbox) &&
    seedAudit !== null;

  return { found, exact, expected };
}

export async function seedIdentityControlPlane(
  prisma: PrismaClient,
  signer = new AuthorityAuditSigner(),
): Promise<IdentityControlPlaneSeedResult> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("identity_control_plane_seed_refused_in_production");
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtextextended(${CONTROL_PLANE_LOCK}, 0))
          IS NULL AS "lockAcquired"
      `;
      const state = await inspectControlPlaneSeed(tx);
      if (state.exact) return "ALREADY_CURRENT";
      if (state.found !== 0) {
        throw new Error("identity_control_plane_seed_conflict");
      }

      await tx.identityRealm.createMany({ data: state.expected.realms });
      await tx.identityProviderRegistration.createMany({
        data: state.expected.providers,
      });
      await tx.applicationIdentityPolicy.createMany({
        data: state.expected.policies,
      });
      await tx.federationTrust.createMany({ data: state.expected.trusts });
      await tx.authorityInvalidationOutbox.createMany({
        data: state.expected.outbox.map((row) => ({
          id: randomUUID(),
          aggregateKind: row.aggregateKind,
          aggregateId: row.aggregateId,
          tenantId: row.tenantId,
          siteId: row.siteId,
          referenceId: row.referenceId,
          revision: row.revision,
          payloadVersion: row.payloadVersion,
          payload: {
            manifestVersion: manifest.identityControlPlane.version,
            aggregateKind: row.aggregateKind,
            aggregateId: row.aggregateId,
            referenceId: row.referenceId,
            lifecycle: row.lifecycle,
            revision: row.revision.toString(),
            admitting: false,
          } as Prisma.InputJsonValue,
        })),
      });
      await appendAuthorityAuditEvent(tx, signer, {
        authorizationPath: "RECOVERY",
        operation: "IDENTITY_CONTROL_PLANE.SEED",
        targetResourceType: "IDENTITY_CONTROL_PLANE_MANIFEST",
        targetResourceId:
          manifest.identityControlPlane.realms.defaultConsumer.id,
        requestId: CONTROL_PLANE_REQUEST_ID,
        result: "SUCCEEDED",
        reasonCode: "CREATED_INACTIVE",
        revision: "1",
        change: {
          manifestVersion: manifest.identityControlPlane.version,
          realms: state.expected.realms.length,
          providers: state.expected.providers.length,
          policies: state.expected.policies.length,
          trusts: state.expected.trusts.length,
          admittingRecords: 0,
        },
      });
      return "CREATED";
    },
    { isolationLevel: "Serializable" },
  );
}
