BEGIN;

-- Preserve legacy rows, including their original commercial facts. Ambiguous
-- duplicates/invalid quantities intentionally stop the migration, never merge.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "CartItem" WHERE quantity < 1 OR "unitPrice" < 0) THEN
    RAISE EXCEPTION 'd2_cart_legacy_invalid_item';
  END IF;
  IF EXISTS (SELECT 1 FROM "CartItem" GROUP BY "cartId", "productId" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'd2_cart_legacy_duplicate_selection';
  END IF;
END $$;

ALTER TABLE "CartItem"
  ADD COLUMN "variantId" UUID,
  ADD COLUMN "selectionKey" TEXT,
  ADD COLUMN "selectedOptions" JSONB NOT NULL DEFAULT '{}';
UPDATE "CartItem" SET "selectionKey" = 'base:' || "productId"::text;
ALTER TABLE "CartItem" ALTER COLUMN "selectionKey" SET NOT NULL;
CREATE UNIQUE INDEX "CartItem_cartId_selectionKey_key" ON "CartItem"("cartId", "selectionKey");
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_selection_check" CHECK (
  "selectionKey" = CASE WHEN "variantId" IS NULL THEN 'base:' || "productId"::text ELSE 'variant:' || "variantId"::text END
  AND jsonb_typeof("selectedOptions") = 'object'
  AND ("variantId" IS NOT NULL OR "selectedOptions" = '{}'::jsonb)
);
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_quantity_check" CHECK (quantity >= 1);
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_price_check" CHECK ("unitPrice" >= 0 AND "unitPrice" <> 'NaN'::numeric);

ALTER TABLE "CartItem" ALTER COLUMN "unitPrice" TYPE DECIMAL(18,2);
ALTER TABLE "OrderItem" ALTER COLUMN "unitPrice" TYPE DECIMAL(18,2), ALTER COLUMN "lineTotal" TYPE DECIMAL(18,2);
ALTER TABLE "Order" ALTER COLUMN subtotal TYPE DECIMAL(18,2), ALTER COLUMN "discountTotal" TYPE DECIMAL(18,2),
  ALTER COLUMN "taxTotal" TYPE DECIMAL(18,2), ALTER COLUMN total TYPE DECIMAL(18,2);

COMMIT;
