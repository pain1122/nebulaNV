-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Taxonomy" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isTree" BOOLEAN NOT NULL DEFAULT false,
    "parentId" UUID,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "path" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Taxonomy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Taxonomy_scope_kind_idx" ON "public"."Taxonomy"("scope", "kind");

-- CreateIndex
CREATE INDEX "Taxonomy_scope_kind_parentId_idx" ON "public"."Taxonomy"("scope", "kind", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Taxonomy_scope_kind_slug_key" ON "public"."Taxonomy"("scope", "kind", "slug");

-- AddForeignKey
ALTER TABLE "public"."Taxonomy" ADD CONSTRAINT "Taxonomy_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Taxonomy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
