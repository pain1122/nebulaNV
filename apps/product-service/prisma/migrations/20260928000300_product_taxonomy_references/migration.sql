-- Keep legacy free-form tags for explicit reconciliation. New public records
-- expose only Taxonomy-validated IDs.
ALTER TABLE "Product" ADD COLUMN "brandId" UUID;
ALTER TABLE "Product" ADD COLUMN "tagIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];

CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");
