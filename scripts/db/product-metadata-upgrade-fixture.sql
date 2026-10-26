INSERT INTO "Product" ("id","slug","title","description","sku","price","currency","category_id","tags","complementaryIds","updatedAt")
VALUES ('fc100000-0000-4000-8000-000000000002','metadata-upgrade-proof','Existing product','description','METADATA-UPGRADE-PROOF',10,'USD','fc100000-0000-4000-8000-000000000099',ARRAY[]::text[],ARRAY[]::text[],now());
INSERT INTO "ProductGalleryImage" ("id","productId","url","alt","sortOrder","updatedAt") VALUES
('fc100000-0000-4000-8000-000000000003','fc100000-0000-4000-8000-000000000002','',NULL,0,now()),
('fc100000-0000-4000-8000-000000000004','fc100000-0000-4000-8000-000000000002','','',1,now()),
('fc100000-0000-4000-8000-000000000005','fc100000-0000-4000-8000-000000000002','','متن قدیمی',2,now());
CREATE TABLE "_product_metadata_snapshot" AS SELECT "id",to_jsonb(p) facts FROM "Product" p;
CREATE TABLE "_gallery_metadata_snapshot" AS SELECT "id",to_jsonb(g) facts FROM "ProductGalleryImage" g;
