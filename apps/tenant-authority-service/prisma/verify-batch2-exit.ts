/* eslint-disable no-console */
import { PrismaClient } from "./generated/client";
import { AuthorityRepository } from "../src/authority/authority.repository";
import { AuthorityService } from "../src/authority/authority.service";
import { DEFAULT_DEVELOPMENT_AUTHORITY as manifest } from "../src/authority/default-development-authority.manifest";
import type { PrismaService } from "../src/prisma.service";

const prisma = new PrismaClient();
const authority = new AuthorityService(
  new AuthorityRepository(prisma as PrismaService),
);

function requireStatus(label: string, actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`${label}_expected_${expected}_received_${actual}`);
  }
}

async function main(): Promise<void> {
  await authority.checkReadiness();

  const cases: readonly Readonly<{
    label: string;
    handle: string;
    origin?: string;
    channelKind: "WEB" | "ANDROID" | "IOS";
  }>[] = [
    {
      label: "storefront_web",
      handle: manifest.applications.storefrontWeb.legacyHandle,
      origin: manifest.applications.storefrontWeb.origin,
      channelKind: "WEB",
    },
    {
      label: "admin_web",
      handle: manifest.applications.adminWeb.legacyHandle,
      origin: manifest.applications.adminWeb.origin,
      channelKind: "WEB",
    },
    {
      label: "android",
      handle: manifest.applications.android.developmentHandle,
      channelKind: "ANDROID",
    },
    {
      label: "ios",
      handle: manifest.applications.ios.developmentHandle,
      channelKind: "IOS",
    },
  ];

  for (const probe of cases) {
    const result = await authority.resolveApplicationRegistration(
      probe.handle,
      probe.origin,
    );
    if (result.status !== "RESOLVED" || !result.registration) {
      throw new Error(
        `${probe.label}_expected_RESOLVED_received_${result.status}`,
      );
    }
    if (
      result.registration.tenantId !== manifest.tenant.id ||
      result.registration.siteId !== manifest.site.id ||
      result.registration.channelKind !== probe.channelKind
    ) {
      throw new Error(`${probe.label}_scope_mismatch`);
    }
  }

  requireStatus(
    "unknown_registration",
    (await authority.resolveApplicationRegistration("unregistered-client"))
      .status,
    "NOT_FOUND",
  );
  requireStatus(
    "cross_application_origin",
    (
      await authority.resolveApplicationRegistration(
        manifest.applications.adminWeb.legacyHandle,
        manifest.applications.storefrontWeb.origin,
      )
    ).status,
    "IDENTITY_MISMATCH",
  );
  requireStatus(
    "native_browser_origin",
    (
      await authority.resolveApplicationRegistration(
        manifest.applications.android.developmentHandle,
        manifest.applications.adminWeb.origin,
      )
    ).status,
    "IDENTITY_MISMATCH",
  );

  const origins = await authority.listAllowedWebOrigins();
  const expectedOrigins = [
    manifest.applications.adminWeb.origin,
    manifest.applications.storefrontWeb.origin,
  ].sort();
  if (JSON.stringify(origins) !== JSON.stringify(expectedOrigins)) {
    throw new Error("allowed_web_origins_mismatch");
  }

  const [seedAudits, seededOutbox] = await Promise.all([
    prisma.authorityAuditEvent.count({
      where: {
        operation: "DEFAULT_AUTHORITY.SEED",
        targetResourceId: manifest.tenant.id,
        result: "SUCCEEDED",
      },
    }),
    prisma.authorityInvalidationOutbox.count({
      where: {
        tenantId: manifest.tenant.id,
        revision: 1n,
      },
    }),
  ]);
  if (seedAudits !== 1 || seededOutbox !== 9) {
    throw new Error("seed_observability_mismatch");
  }

  console.log(
    "[verify:tenant-authority-batch2-exit] 4 registrations resolved; unknown/cross-bound/native-origin denied; readiness/audit/outbox verified",
  );
}

main()
  .catch((error: unknown) => {
    console.error("[verify:tenant-authority-batch2-exit] ERROR:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
