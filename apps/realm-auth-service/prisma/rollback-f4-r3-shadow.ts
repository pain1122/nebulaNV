/* eslint-disable no-console */
import { PrismaClient } from "./generated/client";
import { rollbackF4R3ShadowImport } from "../src/migration/f4-r3-shadow-import";

function argument(name: string): string {
  const prefix = `--${name}=`;
  const value = process.argv.slice(2).find((item) => item.startsWith(prefix));
  if (!value?.slice(prefix.length)) {
    throw new Error(`f4_r3_shadow_rollback_${name}_required`);
  }
  return value.slice(prefix.length);
}

async function main(): Promise<void> {
  if (process.env.REALM_AUTH_DEPLOYMENT !== "DEFAULT") {
    throw new Error("f4_r3_shadow_rollback_default_deployment_required");
  }
  const prisma = new PrismaClient();
  try {
    const result = await rollbackF4R3ShadowImport(prisma, {
      migrationId: argument("migration-id"),
    });
    console.log(JSON.stringify(result));
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  console.error(`f4_r3_shadow_rollback_failed:${message}`);
  process.exitCode = 1;
});
