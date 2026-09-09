import { PrismaClient } from "./generated/client";
import { realmAuthDeployment } from "../src/config/realm-deployments";
import { seedShadowBoundary } from "../src/migration/shadow-boundary.seed";

async function main(): Promise<void> {
  const name = process.argv[2] ?? process.env.REALM_AUTH_DEPLOYMENT;
  realmAuthDeployment(name);
  const prisma = new PrismaClient();
  try {
    const result = await seedShadowBoundary(
      prisma,
      name as "DEFAULT" | "OPERATOR",
    );
    process.stdout.write(`${result}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  process.stderr.write(`realm_auth_shadow_boundary_seed_failed:${message}\n`);
  process.exitCode = 1;
});
