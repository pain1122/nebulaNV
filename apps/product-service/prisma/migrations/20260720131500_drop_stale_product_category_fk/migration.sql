-- Product categories are owned by taxonomy-service. Product.category_id stores
-- the remote taxonomy UUID, so it must not reference the obsolete local
-- product_category table left behind by the initial product migration.
ALTER TABLE "Product"
DROP CONSTRAINT IF EXISTS "Product_category_id_fkey";
