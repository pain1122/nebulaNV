/* eslint-disable no-console */
import { PrismaClient } from "./generated/client";
import { AuthorityAuditSigner } from "../src/authority/authority-audit.signer";
import { seedDefaultDevelopmentAuthority } from "../src/authority/default-development-authority.seed";
import { seedIdentityControlPlane } from "../src/authority/identity-control-plane.seed";

const prisma = new PrismaClient();

const signer = new AuthorityAuditSigner();

seedDefaultDevelopmentAuthority(prisma, signer)
  .then(async (result) => {
    console.log(`[seed:tenant-authority] ${result}`);
    const controlPlaneResult = await seedIdentityControlPlane(prisma, signer);
    console.log(
      `[seed:tenant-authority:identity-control-plane] ${controlPlaneResult}`,
    );
  })
  .catch((error: unknown) => {
    console.error("[seed:tenant-authority] ERROR:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
