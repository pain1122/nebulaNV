BEGIN;

CREATE FUNCTION pg_temp.expect_product_constraint(
  statement text,
  expected_constraint text
) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  actual_constraint text;
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
    IF actual_constraint = expected_constraint THEN
      RETURN;
    END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'product_constraint_denial_missing: %', expected_constraint;
END $$;

INSERT INTO "Product" (
  "id", "slug", "title", "description", "sku", "price", "currency",
  "category_id", "tags", "complementaryIds", "updatedAt"
) VALUES (
  'd1-inventory-verification', 'd1-inventory-verification',
  'D1 inventory verification', '', 'D1-INVENTORY-VERIFY', 10, 'USD',
  'd1000000-0000-4000-8000-000000000001'::uuid,
  ARRAY[]::text[], ARRAY[]::text[], now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Product"
    WHERE "id" = 'd1-inventory-verification'
      AND "trackInventory" = false
      AND "stockQuantity" = 0
      AND "version" = 1
  ) THEN
    RAISE EXCEPTION 'product_inventory_defaults_mismatch';
  END IF;
END $$;

SELECT pg_temp.expect_product_constraint(
  'UPDATE "Product" SET "stockQuantity" = 1 WHERE "id" = ''d1-inventory-verification''',
  'Product_untracked_stock_zero'
);

UPDATE "Product"
SET "trackInventory" = true
WHERE "id" = 'd1-inventory-verification';

SELECT pg_temp.expect_product_constraint(
  'UPDATE "Product" SET "stockQuantity" = -1 WHERE "id" = ''d1-inventory-verification''',
  'Product_stockQuantity_nonnegative'
);

SELECT pg_temp.expect_product_constraint(
  'UPDATE "Product" SET "version" = 0 WHERE "id" = ''d1-inventory-verification''',
  'Product_version_positive'
);

UPDATE "Product"
SET "stockQuantity" = 5, "version" = 2
WHERE "id" = 'd1-inventory-verification';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Product"
    WHERE "id" = 'd1-inventory-verification'
      AND "trackInventory" = true
      AND "stockQuantity" = 5
      AND "version" = 2
  ) THEN
    RAISE EXCEPTION 'product_inventory_valid_transition_missing';
  END IF;
END $$;

ROLLBACK;
