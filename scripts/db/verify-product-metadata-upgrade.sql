DO $$ BEGIN
  IF (SELECT count(*) FROM "Product")<>1 OR EXISTS (SELECT 1 FROM "_product_metadata_snapshot" s FULL JOIN "Product" p USING ("id")
    WHERE s."id" IS NULL OR p."id" IS NULL OR (to_jsonb(p)-'thumbnailTitle'-'thumbnailAlt') IS DISTINCT FROM s.facts) THEN RAISE EXCEPTION 'product_metadata_upgrade_changed_product'; END IF;
  IF (SELECT count(*) FROM "ProductGalleryImage")<>3 OR EXISTS (SELECT 1 FROM "_gallery_metadata_snapshot" s FULL JOIN "ProductGalleryImage" g USING ("id")
    WHERE s."id" IS NULL OR g."id" IS NULL OR (to_jsonb(g)-'title'-'metadataVersion') IS DISTINCT FROM s.facts) THEN RAISE EXCEPTION 'product_metadata_upgrade_changed_gallery'; END IF;
END $$;
