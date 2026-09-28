BEGIN;

CREATE FUNCTION pg_temp.expect_variant_constraint(statement text, expected_constraint text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual_constraint text;
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN check_violation OR unique_violation THEN
    GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
    IF actual_constraint = expected_constraint THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'variant_constraint_denial_missing: %', expected_constraint;
END $$;

INSERT INTO "Product" (
  "id", "slug", "title", "description", "sku", "price", "currency",
  "category_id", "tags", "complementaryIds", "updatedAt", "selectionMode", "trackInventory"
) VALUES (
  'd1-variant-verification', 'd1-variant-verification', 'D1 variant verification',
  '', 'D1-BASE-VERIFY', 100, 'USD',
  'd1000000-0000-4000-8000-000000000002'::uuid,
  ARRAY[]::text[], ARRAY[]::text[], now(), 'VARIANT', true
);

INSERT INTO "CatalogSku" ("sku", "productId") VALUES ('D1-BASE-VERIFY', 'd1-variant-verification');

INSERT INTO "ProductVariant" (
  "id", "productId", "sku", "options", "optionKey", "stockQuantity", "updatedAt"
) VALUES (
  'd1-variant-verification-1', 'd1-variant-verification', 'D1-BLUE-M-VERIFY',
  '{"Color":"Blue","Size":"M"}'::jsonb, '[["color","blue"],["size","m"]]', 3, now()
);

INSERT INTO "CatalogSku" ("sku", "variantId") VALUES ('D1-BLUE-M-VERIFY', 'd1-variant-verification-1');

SELECT pg_temp.expect_variant_constraint(
  'INSERT INTO "CatalogSku" ("sku", "productId") VALUES (''D1-BASE-VERIFY'', ''d1-nonexistent-product'')',
  'CatalogSku_pkey'
);
SELECT pg_temp.expect_variant_constraint(
  'UPDATE "ProductVariant" SET "stockQuantity" = -1 WHERE "id" = ''d1-variant-verification-1''',
  'ProductVariant_stockQuantity_nonnegative'
);
SELECT pg_temp.expect_variant_constraint(
  'UPDATE "ProductVariant" SET "priceOverride" = -1 WHERE "id" = ''d1-variant-verification-1''',
  'ProductVariant_priceOverride_nonnegative'
);
SELECT pg_temp.expect_variant_constraint(
  'UPDATE "ProductVariant" SET "options" = ''[]''::jsonb WHERE "id" = ''d1-variant-verification-1''',
  'ProductVariant_options_object'
);
SELECT pg_temp.expect_variant_constraint(
  'INSERT INTO "ProductVariant" ("id", "productId", "sku", "options", "optionKey", "updatedAt") VALUES (''d1-variant-verification-2'', ''d1-variant-verification'', ''D1-RED-M-VERIFY'', ''{}''::jsonb, ''[["color","blue"],["size","m"]]'', now())',
  'ProductVariant_productId_optionKey_key'
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "ProductVariant" v
    JOIN "CatalogSku" s ON s."variantId" = v."id" AND s."sku" = v."sku"
    WHERE v."id" = 'd1-variant-verification-1' AND v."active" = true
  ) THEN RAISE EXCEPTION 'variant_registry_or_default_missing'; END IF;
END $$;

ROLLBACK;
