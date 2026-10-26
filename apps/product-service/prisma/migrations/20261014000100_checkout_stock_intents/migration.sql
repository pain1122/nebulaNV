BEGIN;

CREATE TYPE "CheckoutStockState" AS ENUM ('HELD', 'FINALIZED', 'CANCELLED');
CREATE TABLE "CheckoutStockIntent" (
  "id" UUID NOT NULL PRIMARY KEY,
  "payloadHash" CHAR(64) NOT NULL,
  "state" "CheckoutStockState" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CheckoutStockIntent_hash_check" CHECK ("payloadHash" ~ '^[0-9a-f]{64}$')
);
CREATE TABLE "CheckoutStockLine" (
  "id" UUID NOT NULL PRIMARY KEY,
  "intentId" UUID NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "selectionKey" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "tracked" BOOLEAN NOT NULL,
  "heldProductId" TEXT,
  "heldVariantId" TEXT,
  CONSTRAINT "CheckoutStockLine_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "CheckoutStockLine_selection_check" CHECK (
    "selectionKey" = "productId" || ':' || COALESCE("variantId", 'base')
  ),
  CONSTRAINT "CheckoutStockLine_hold_check" CHECK (
    ("heldProductId" IS NULL AND "heldVariantId" IS NULL) OR
    ("heldProductId" = "productId" AND "heldProductId" IS NOT NULL AND
      (("variantId" IS NULL AND "heldVariantId" IS NULL) OR
       ("variantId" IS NOT NULL AND "heldVariantId" IS NOT NULL AND "heldVariantId" = "variantId")))
  ),
  CONSTRAINT "CheckoutStockLine_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "CheckoutStockIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CheckoutStockLine_heldProductId_fkey" FOREIGN KEY ("heldProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CheckoutStockLine_heldVariantId_fkey" FOREIGN KEY ("heldVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CheckoutStockLine_intentId_selectionKey_key" ON "CheckoutStockLine"("intentId", "selectionKey");
CREATE INDEX "CheckoutStockLine_heldProductId_idx" ON "CheckoutStockLine"("heldProductId");
CREATE INDEX "CheckoutStockLine_heldVariantId_idx" ON "CheckoutStockLine"("heldVariantId");

COMMIT;
