-- Settings owns the shop currency. Product writes it explicitly, so a
-- database-local fallback would create a second currency authority.
ALTER TABLE "Product" ALTER COLUMN "currency" DROP DEFAULT;
