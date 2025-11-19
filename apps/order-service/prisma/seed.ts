import { PrismaClient } from "./generated/client"; // adjust path to your generated client

const prisma = new PrismaClient();

async function main() {
  // For now, nothing to seed by default.
  // If you want a sample order, you can create it here.
  console.log("[order-service] seed: nothing to do");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
