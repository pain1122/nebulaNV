import { PrismaClient } from "./generated";

const prisma = new PrismaClient();

async function main() {
  // Intentionally empty:
  // Taxonomy data is owned and seeded by domain services (product, blog, ...),
  // NOT by taxonomy-service itself.
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
