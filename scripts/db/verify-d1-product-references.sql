BEGIN;

INSERT INTO "Product" (
  "id", "slug", "title", "description", "sku", "price", "currency",
  "category_id", "brandId", "tagIds", "thumbnailMediaId",
  "thumbnailUrl", "tags", "complementaryIds", "updatedAt"
) VALUES (
  'd1-reference-verification', 'd1-reference-verification', 'D1 reference verification',
  '', 'D1-REFERENCE-VERIFY', 10, 'USD',
  'd1000000-0000-4000-8000-000000000002'::uuid,
  'd1000000-0000-4000-8000-000000000003'::uuid,
  ARRAY['d1000000-0000-4000-8000-000000000004'::uuid],
  'd1000000-0000-4000-8000-000000000005'::uuid,
  'https://legacy.example/thumbnail.jpg', ARRAY['legacy-tag']::text[],
  ARRAY[]::text[], now()
);

INSERT INTO "ProductGalleryImage" (
  "id", "productId", "url", "mediaId", "updatedAt"
) VALUES (
  'd1-reference-image-verification', 'd1-reference-verification', '',
  'd1000000-0000-4000-8000-000000000006'::uuid, now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Product"
    WHERE "id" = 'd1-reference-verification'
      AND "brandId" = 'd1000000-0000-4000-8000-000000000003'::uuid
      AND "tagIds" = ARRAY['d1000000-0000-4000-8000-000000000004'::uuid]
      AND "thumbnailMediaId" = 'd1000000-0000-4000-8000-000000000005'::uuid
      AND "thumbnailUrl" = 'https://legacy.example/thumbnail.jpg'
      AND "tags" = ARRAY['legacy-tag']::text[]
  ) OR NOT EXISTS (
    SELECT 1 FROM "ProductGalleryImage"
    WHERE "id" = 'd1-reference-image-verification'
      AND "mediaId" = 'd1000000-0000-4000-8000-000000000006'::uuid
  ) THEN
    RAISE EXCEPTION 'd1_product_reference_migration_invalid';
  END IF;
END $$;

ROLLBACK;
