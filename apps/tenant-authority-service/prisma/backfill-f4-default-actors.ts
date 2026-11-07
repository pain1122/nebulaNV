import { PrismaClient } from "../src/generated/prisma/client";
import { tenantAuthorityPrismaOptions } from "../src/prisma-options";
import { AuthorityAuditSigner } from "../src/authority/authority-audit.signer";
import { recordDefaultActorBackfillEvidence } from "../src/authority/default-actor-backfill";

const prisma = new PrismaClient(tenantAuthorityPrismaOptions());
const signer = new AuthorityAuditSigner();

async function main(): Promise<void> {
  const result = await recordDefaultActorBackfillEvidence(prisma, signer);
  console.log(`[backfill:f4-default-actors] ${result}`);
}

async function run(): Promise<void> {
  try {
    await main();
  } catch (error: unknown) {
    console.error("[backfill:f4-default-actors] ERROR:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void run().catch((error: unknown) => {
  console.error("[backfill:f4-default-actors] ERROR:", error);
  process.exitCode = 1;
});
