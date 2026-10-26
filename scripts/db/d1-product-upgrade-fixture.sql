INSERT INTO "Product" ("id","slug","title","description","sku","price","currency","category_id","status","deletedAt","thumbnailUrl","discountType","discountValue","discountActive","discountStart","discountEnd","tags","complementaryIds","updatedAt")
SELECT 'fd100000-0000-4000-8000-00000000000'||n,
  'd1-upgrade-'||n, 'Legacy product '||n, 'Preserve legacy description — متن قدیمی',
  'D1-UPGRADE-'||n, 100+n, CASE WHEN n=2 THEN 'EUR' ELSE 'USD' END,
  'fd100000-0000-4000-8000-000000000099'::uuid,
  CASE n WHEN 2 THEN 'DRAFT' WHEN 3 THEN 'ARCHIVED' ELSE 'ACTIVE' END::"ProductStatus",
  CASE WHEN n=4 THEN '2020-01-02'::timestamp END,
  CASE WHEN n=1 THEN 'https://legacy.invalid/product.png' END,
  'PERCENTAGE'::"DiscountType", 25, n=1,
  '2020-01-01'::timestamp, '2099-01-01'::timestamp,
  ARRAY['legacy','قدیمی']::text[], ARRAY[]::text[], '2020-01-01'::timestamp
FROM generate_series(1,4) n;

INSERT INTO "ProductGalleryImage" ("id","productId","url","alt","sortOrder","updatedAt") VALUES
('fd100000-0000-4000-8000-000000000011','fd100000-0000-4000-8000-000000000001','https://legacy.invalid/a.png',NULL,0,'2020-01-01'),
('fd100000-0000-4000-8000-000000000012','fd100000-0000-4000-8000-000000000001','https://legacy.invalid/b.png','',1,'2020-01-01'),
('fd100000-0000-4000-8000-000000000013','fd100000-0000-4000-8000-000000000001','https://legacy.invalid/c.png','نمای قدیمی',2,'2020-01-01');
