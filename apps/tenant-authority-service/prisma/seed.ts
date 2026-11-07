import { PrismaClient } from "../src/generated/prisma/client";
import { tenantAuthorityPrismaOptions } from "../src/prisma-options";
import { AuthorityAuditSigner } from "../src/authority/authority-audit.signer";
import { seedDefaultDevelopmentAuthority } from "../src/authority/default-development-authority.seed";
import { seedIdentityControlPlane } from "../src/authority/identity-control-plane.seed";

const prisma = new PrismaClient(tenantAuthorityPrismaOptions());

const signer = new AuthorityAuditSigner();

async function main(): Promise<void> {
  const result = await seedDefaultDevelopmentAuthority(prisma, signer);
  console.log(`[seed:tenant-authority] ${result}`);
  const controlPlaneResult = await seedIdentityControlPlane(prisma, signer);
  console.log(
    `[seed:tenant-authority:identity-control-plane] ${controlPlaneResult}`,
  );
}

async function run(): Promise<void> {
  try {
    await main();
  } catch (error: unknown) {
    console.error("[seed:tenant-authority] ERROR:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void run().catch((error: unknown) => {
  console.error("[seed:tenant-authority] ERROR:", error);
  process.exitCode = 1;
});
