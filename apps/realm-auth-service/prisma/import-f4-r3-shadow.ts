/* eslint-disable no-console */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  migrationKeyFromBase64url,
  openMigrationArtifact,
} from "@nebula/migration-artifacts";
import { PrismaClient } from "./generated/client";
import { REALM_AUTH_DEPLOYMENTS } from "../src/config/realm-deployments";
import { importF4R3ShadowArtifacts } from "../src/migration/f4-r3-shadow-import";

function argument(name: string): string {
  const prefix = `--${name}=`;
  const value = process.argv.slice(2).find((item) => item.startsWith(prefix));
  if (!value?.slice(prefix.length))
    throw new Error(`f4_r3_shadow_import_${name}_required`);
  return value.slice(prefix.length);
}

function environment(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(`f4_r3_shadow_import_${name.toLowerCase()}_required`);
  return value;
}

async function main(): Promise<void> {
  if (process.env.REALM_AUTH_DEPLOYMENT !== "DEFAULT") {
    throw new Error("f4_r3_shadow_import_default_deployment_required");
  }
  const deployment = REALM_AUTH_DEPLOYMENTS.DEFAULT;
  const destinationKey = migrationKeyFromBase64url(
    environment("F4_R3_DESTINATION_KEY_ID"),
    environment("F4_R3_DESTINATION_KEY"),
  );
  const userHmacKey = migrationKeyFromBase64url(
    environment("F4_R3_USER_HMAC_KEY_ID"),
    environment("F4_R3_USER_HMAC_KEY"),
  );
  const authHmacKey = migrationKeyFromBase64url(
    environment("F4_R3_AUTH_HMAC_KEY_ID"),
    environment("F4_R3_AUTH_HMAC_KEY"),
  );
  const bridgeKey = migrationKeyFromBase64url(
    environment("F4_R3_LEGACY_BRIDGE_KEY_ID"),
    environment("F4_R3_LEGACY_BRIDGE_KEY"),
  );
  const now = new Date();
  const common = {
    expectedDestinationRealmId: deployment.identityRealmId,
    destinationKey,
    now,
  };
  const user = openMigrationArtifact(
    readFileSync(resolve(argument("user-artifact"))),
    {
      ...common,
      expectedSourceOwner: "USER_SERVICE",
      recordHmacKey: userHmacKey,
    },
  );
  const auth = openMigrationArtifact(
    readFileSync(resolve(argument("auth-artifact"))),
    {
      ...common,
      expectedSourceOwner: "AUTH_SERVICE",
      recordHmacKey: authHmacKey,
    },
  );
  const concurrentProof = process.argv
    .slice(2)
    .includes("--verify-concurrent-idempotency");
  const clients = Array.from(
    { length: concurrentProof ? 2 : 1 },
    () => new PrismaClient(),
  );
  try {
    const results = await Promise.all(
      clients.map((prisma) =>
        importF4R3ShadowArtifacts(prisma, {
          user,
          auth,
          bridgeKey,
          now,
        }),
      ),
    );
    if (concurrentProof) {
      console.log(
        JSON.stringify({
          status: "CONCURRENTLY_IMPORTED",
          importStatuses: results.map((result) => result.status).sort(),
        }),
      );
    } else {
      console.log(JSON.stringify(results[0]));
    }
  } finally {
    await Promise.all(clients.map((prisma) => prisma.$disconnect()));
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  console.error(`f4_r3_shadow_import_failed:${message}`);
  process.exitCode = 1;
});
