SELECT "_d1_upgrade_check_legacy"();
DO $$ BEGIN
  IF (SELECT count(*) FROM "Product")<>4 OR (SELECT count(*) FROM "ProductGalleryImage")<>3 THEN RAISE EXCEPTION 'd1_upgrade_product_counts'; END IF;
  IF EXISTS (SELECT 1 FROM "Product" WHERE "trackInventory" OR "stockQuantity"<>0 OR "version"<>1 OR "selectionMode"<>'BASE' OR "thumbnailMediaId" IS NOT NULL OR "brandId" IS NOT NULL OR cardinality("tagIds")<>0 OR "thumbnailTitle" IS NOT NULL OR "thumbnailAlt" IS NOT NULL) THEN RAISE EXCEPTION 'd1_upgrade_product_defaults'; END IF;
  IF EXISTS (SELECT 1 FROM "ProductGalleryImage" WHERE "mediaId" IS NOT NULL OR "title" IS NOT NULL OR "metadataVersion"<>1) THEN RAISE EXCEPTION 'd1_upgrade_gallery_defaults'; END IF;
  IF (SELECT count(*) FROM "CatalogSku")<>4 OR EXISTS (SELECT 1 FROM "Product" p LEFT JOIN "CatalogSku" s ON s."sku"=p."sku" WHERE s."productId" IS DISTINCT FROM p."id" OR s."variantId" IS NOT NULL) THEN RAISE EXCEPTION 'd1_upgrade_sku_backfill'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Product' AND column_name='currency' AND column_default IS NOT NULL) THEN RAISE EXCEPTION 'd1_upgrade_product_currency_default'; END IF;
END $$;
BEGIN;
DO $$ DECLARE failed_column text; BEGIN
  INSERT INTO "Product" ("id","slug","title","description","sku","price","currency","category_id","tags","complementaryIds","updatedAt") VALUES
  ('fd100000-0000-4000-8000-000000000089','d1-explicit-currency','Explicit currency','','D1-EXPLICIT-CURRENCY',1,'USD','fd100000-0000-4000-8000-000000000099',ARRAY[]::text[],ARRAY[]::text[],now());
  BEGIN
    INSERT INTO "Product" ("id","slug","title","description","sku","price","category_id","tags","complementaryIds","updatedAt") VALUES
    ('fd100000-0000-4000-8000-000000000090','d1-missing-currency','Missing currency','','D1-MISSING-CURRENCY',1,'fd100000-0000-4000-8000-000000000099',ARRAY[]::text[],ARRAY[]::text[],now());
    RAISE EXCEPTION 'd1_upgrade_missing_product_currency_accepted';
  EXCEPTION WHEN not_null_violation THEN
    GET STACKED DIAGNOSTICS failed_column = COLUMN_NAME;
    IF failed_column<>'currency' THEN RAISE EXCEPTION 'd1_upgrade_unexpected_missing_column_%',failed_column; END IF;
  END;
END $$;
ROLLBACK;
