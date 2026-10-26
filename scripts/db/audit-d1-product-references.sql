-- Read-only inventory. URLs and free-form tags stay out of console output;
-- fingerprints identify rows for a later Media/Taxonomy-backed reconciliation.
BEGIN TRANSACTION READ ONLY;

SELECT 'legacy_thumbnail' AS kind, count(*) AS unresolved_rows
FROM "Product"
WHERE "thumbnailMediaId" IS NULL AND nullif(btrim("thumbnailUrl"), '') IS NOT NULL
UNION ALL
SELECT 'legacy_gallery', count(*)
FROM "ProductGalleryImage"
WHERE "mediaId" IS NULL AND nullif(btrim("url"), '') IS NOT NULL
UNION ALL
SELECT 'freeform_tags', count(*)
FROM "Product"
WHERE cardinality("tags") > 0
ORDER BY kind;

WITH unresolved AS (
  SELECT 'legacy_thumbnail' AS kind, "id" AS product_id,
    '' AS reference_id, md5("thumbnailUrl") AS fingerprint,
    "deletedAt" IS NOT NULL AS deleted
  FROM "Product"
  WHERE "thumbnailMediaId" IS NULL AND nullif(btrim("thumbnailUrl"), '') IS NOT NULL
  UNION ALL
  SELECT 'legacy_gallery', "productId", "id", md5("url"),
    "deletedAt" IS NOT NULL
  FROM "ProductGalleryImage"
  WHERE "mediaId" IS NULL AND nullif(btrim("url"), '') IS NOT NULL
  UNION ALL
  SELECT 'freeform_tags', "id", '', md5(array_to_string("tags", E'\x1f')),
    "deletedAt" IS NOT NULL
  FROM "Product"
  WHERE cardinality("tags") > 0
)
SELECT kind, product_id, reference_id, fingerprint, deleted
FROM unresolved
ORDER BY kind, product_id, reference_id
LIMIT 100;

COMMIT;
