CREATE TYPE "ProductSelectionMode" AS ENUM ('BASE', 'VARIANT');

ALTER TABLE "Product"
ADD COLUMN "selectionMode" "ProductSelectionMode" NOT NULL DEFAULT 'BASE';

CREATE TABLE "ProductVariant" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "options" JSONB NOT NULL,
  "optionKey" TEXT NOT NULL,
  "priceOverride" DECIMAL(18,2),
  "stockQuantity" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductVariant_stockQuantity_nonnegative" CHECK ("stockQuantity" >= 0),
  CONSTRAINT "ProductVariant_sortOrder_nonnegative" CHECK ("sortOrder" >= 0),
  CONSTRAINT "ProductVariant_priceOverride_nonnegative" CHECK ("priceOverride" IS NULL OR "priceOverride" >= 0),
  CONSTRAINT "ProductVariant_options_object" CHECK (jsonb_typeof("options") = 'object'),
  CONSTRAINT "ProductVariant_optionKey_nonempty" CHECK (length("optionKey") > 0)
);

CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
CREATE UNIQUE INDEX "ProductVariant_productId_optionKey_key" ON "ProductVariant"("productId", "optionKey");
CREATE INDEX "ProductVariant_productId_active_sortOrder_idx" ON "ProductVariant"("productId", "active", "sortOrder");

ALTER TABLE "ProductVariant"
ADD CONSTRAINT "ProductVariant_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CatalogSku" (
  "sku" TEXT NOT NULL,
  "productId" TEXT,
  "variantId" TEXT,
  CONSTRAINT "CatalogSku_pkey" PRIMARY KEY ("sku"),
  CONSTRAINT "CatalogSku_one_owner" CHECK (("productId" IS NULL) <> ("variantId" IS NULL))
);

CREATE UNIQUE INDEX "CatalogSku_productId_key" ON "CatalogSku"("productId");
CREATE UNIQUE INDEX "CatalogSku_variantId_key" ON "CatalogSku"("variantId");

ALTER TABLE "CatalogSku"
ADD CONSTRAINT "CatalogSku_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CatalogSku"
ADD CONSTRAINT "CatalogSku_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CatalogSku" ("sku", "productId")
SELECT "sku", "id" FROM "Product";
