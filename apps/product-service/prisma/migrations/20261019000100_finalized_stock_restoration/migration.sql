BEGIN;
CREATE TABLE "CheckoutStockRestoration" (
  "intentId" UUID NOT NULL PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CheckoutStockRestoration_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "CheckoutStockIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
COMMIT;
