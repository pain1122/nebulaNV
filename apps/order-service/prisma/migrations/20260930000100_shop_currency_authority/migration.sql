-- Order must supply the Settings-backed currency explicitly for every new cart.
-- Existing carts and orders are preserved for explicit checkout reconciliation.
ALTER TABLE "Cart" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "currency" DROP DEFAULT;
