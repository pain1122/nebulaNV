BEGIN;
INSERT INTO "Product" ("id","slug","title","description","sku","price","currency","category_id","tags","complementaryIds","updatedAt")
VALUES ('fc100000-0000-4000-8000-000000000006','metadata-contract-proof','Contract product','','METADATA-CONTRACT-PROOF',10,'USD','fc100000-0000-4000-8000-000000000099',ARRAY[]::text[],ARRAY[]::text[],now());
INSERT INTO "ProductGalleryImage" ("id","productId","url","updatedAt") VALUES ('fc100000-0000-4000-8000-000000000007','fc100000-0000-4000-8000-000000000006','',now());
DO $$ BEGIN
  BEGIN UPDATE "Product" SET "thumbnailTitle"=repeat('x',201) WHERE "id"='fc100000-0000-4000-8000-000000000006'; RAISE EXCEPTION 'thumbnail_title_limit_missing'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE "Product" SET "thumbnailAlt"=repeat('x',181) WHERE "id"='fc100000-0000-4000-8000-000000000006'; RAISE EXCEPTION 'thumbnail_alt_limit_missing'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE "ProductGalleryImage" SET "title"=repeat('x',201) WHERE "id"='fc100000-0000-4000-8000-000000000007'; RAISE EXCEPTION 'gallery_title_limit_missing'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE "ProductGalleryImage" SET "metadataVersion"=0 WHERE "id"='fc100000-0000-4000-8000-000000000007'; RAISE EXCEPTION 'gallery_revision_limit_missing'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
