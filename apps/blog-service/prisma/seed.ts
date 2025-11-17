import { PrismaClient } from "./generated/client";

const prisma = new PrismaClient();

// helper to upsert by slug
async function upsertPost(params: {
  slug: string;
  title: string;
  body: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  tags?: string[];
  categories?: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  publishedAt?: Date | null;
}) {
  const {
    slug,
    title,
    body,
    excerpt = null,
    coverImageUrl = null,
    status = "PUBLISHED",
    tags = [],
    categories = [],
    metaTitle = null,
    metaDescription = null,
    metaKeywords = null,
    publishedAt,
  } = params;

  const pubAt =
    publishedAt !== undefined
      ? publishedAt
      : status === "PUBLISHED"
      ? new Date()
      : null;

  return prisma.blogPost.upsert({
    where: { slug },
    update: {
      title,
      body,
      excerpt,
      coverImageUrl,
      status,
      tags,
      categories,
      metaTitle,
      metaDescription,
      metaKeywords,
      publishedAt: pubAt,
    },
    create: {
      slug,
      title,
      body,
      excerpt,
      coverImageUrl,
      status,
      tags,
      categories,
      metaTitle,
      metaDescription,
      metaKeywords,
      publishedAt: pubAt,
    },
  });
}

async function main() {
  await upsertPost({
    slug: "welcome-to-nebulanv",
    title: "Welcome to NebulaNV",
    body:
      "This is the first official blog post for NebulaNV. " +
      "Here we share release notes, architectural deep dives, and roadmap updates.",
    excerpt: "Introducing NebulaNV and what this project is about.",
    status: "PUBLISHED",
    tags: ["announcement", "release"],
    categories: ["general"],
    metaTitle: "Welcome to NebulaNV",
    metaDescription: "First official NebulaNV blog post.",
  });

  await upsertPost({
    slug: "e2e-testing-strategy",
    title: "Our End-to-End Testing Strategy",
    body:
      "In this article we describe how we wired gRPC + HTTP + Prisma into a realistic E2E harness, " +
      "including service-to-service metadata, seeders, and shadow databases.",
    excerpt: "How NebulaNV approaches realistic end-to-end tests.",
    status: "PUBLISHED",
    tags: ["testing", "backend"],
    categories: ["engineering"],
    metaTitle: "NebulaNV E2E Testing",
    metaDescription: "Deep dive into NebulaNV's E2E testing setup.",
  });

  await upsertPost({
    slug: "draft-upcoming-features",
    title: "Upcoming Features (Draft)",
    body:
      "This draft outlines upcoming modules like order-service, admin dashboard, and more.",
    excerpt: "Preview of upcoming NebulaNV features.",
    status: "DRAFT",
    tags: ["roadmap"],
    categories: ["product"],
    metaTitle: "Upcoming NebulaNV Features",
    metaDescription: "Draft roadmap for future NebulaNV work.",
  });

  console.log("[seed:blog-service] Seeded blog posts");
}

main()
  .catch((e) => {
    console.error("[seed:blog-service] ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
