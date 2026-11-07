import { PrismaClient } from "../src/generated/prisma/client";
import { tenantAuthorityPrismaOptions } from "../src/prisma-options";
import {
  parseDefaultDevelopmentRoleFixture,
  seedDefaultDevelopmentRoleFixtures,
} from "../src/authority/legacy-role-backfill";

async function readStandardInput(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    const value: unknown = chunk;
    if (typeof value === "string") {
      chunks.push(Buffer.from(value));
    } else if (value instanceof Uint8Array) {
      chunks.push(Buffer.from(value));
    } else {
      throw new Error("default_role_fixture_input_chunk_invalid");
    }
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const raw = await readStandardInput();
  if (raw.trim() === "") throw new Error("default_role_fixture_input_required");
  const fixture = parseDefaultDevelopmentRoleFixture(
    JSON.parse(raw) as unknown,
  );
  const prisma = new PrismaClient(tenantAuthorityPrismaOptions());
  try {
    console.log(await seedDefaultDevelopmentRoleFixtures(prisma, fixture));
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error("[seed:f4-default-role-fixtures] ERROR", error);
  process.exitCode = 1;
});
