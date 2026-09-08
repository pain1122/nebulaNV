/* eslint-disable no-console */
import { PrismaClient } from "./generated/client";
import { AuthorityAuditSigner } from "../src/authority/authority-audit.signer";
import { recordDefaultActorBackfillEvidence } from "../src/authority/default-actor-backfill";

const prisma = new PrismaClient();
const signer = new AuthorityAuditSigner();

recordDefaultActorBackfillEvidence(prisma, signer)
  .then((result) => console.log(`[backfill:f4-default-actors] ${result}`))
  .catch((error: unknown) => {
    console.error("[backfill:f4-default-actors] ERROR:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
