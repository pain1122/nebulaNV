/* eslint-disable no-console */
import { PrismaClient } from "./generated/client";
import {
  backfillLegacyRoles,
  parseLegacyRoleAuditManifest,
} from "../src/authority/legacy-role-backfill";

async function readStandardInput(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const raw = await readStandardInput();
  if (raw.trim() === "") throw new Error("legacy_role_audit_input_required");
  const actors = parseLegacyRoleAuditManifest(JSON.parse(raw) as unknown);
  const prisma = new PrismaClient();
  try {
    console.log(
      JSON.stringify(await backfillLegacyRoles(prisma, actors), null, 2),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error("[backfill:f4-legacy-roles] ERROR", error);
  process.exitCode = 1;
});
